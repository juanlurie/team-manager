using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.CoffeeRun;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class CoffeeRunService(AppDbContext db) : ICoffeeRunService
{
    public async Task<IReadOnlyList<CoffeeRunListDto>> GetAllAsync()
    {
        var runs = await db.CoffeeRuns
            .Include(r => r.Initiator)
            .Include(r => r.MenuItems)
            .Include(r => r.Orders)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return runs.Select(r => new CoffeeRunListDto
        {
            Id = r.Id,
            InitiatorName = $"{r.Initiator.FirstName} {r.Initiator.LastName}",
            Status = r.Status.ToString(),
            MenuItemCount = r.MenuItems.Count,
            OrderCount = r.Orders.Count,
            CreatedAt = r.CreatedAt,
            ClosedAt = r.ClosedAt
        }).ToList();
    }

    public async Task<CoffeeRunDetailDto> CreateAsync(Guid initiatorId, Guid? copyMenuFromRunId = null, Guid? fromTemplateId = null)
    {
        var run = new CoffeeRun { InitiatorId = initiatorId };

        if (fromTemplateId.HasValue)
        {
            var sourceItems = await db.CoffeeRunMenuTemplateItems
                .Where(i => i.TemplateId == fromTemplateId.Value)
                .ToListAsync();

            run.MenuItems = sourceItems.Select(m => new CoffeeRunMenuItem
            {
                Name = m.Name,
                Price = m.Price
            }).ToList();
        }
        else if (copyMenuFromRunId.HasValue)
        {
            var sourceMenu = await db.CoffeeRunMenuItems
                .Where(m => m.CoffeeRunId == copyMenuFromRunId.Value)
                .ToListAsync();

            run.MenuItems = sourceMenu.Select(m => new CoffeeRunMenuItem
            {
                Name = m.Name,
                Price = m.Price
            }).ToList();
        }

        db.CoffeeRuns.Add(run);
        await db.SaveChangesAsync();

        var initiator = await db.TeamMembers.FindAsync(initiatorId);
        return new CoffeeRunDetailDto
        {
            Id = run.Id,
            InitiatorId = initiatorId,
            InitiatorName = initiator != null ? $"{initiator.FirstName} {initiator.LastName}" : "",
            Status = run.Status.ToString(),
            CreatedAt = run.CreatedAt
        };
    }

    public async Task<CoffeeRunDetailDto?> GetByIdAsync(Guid id, Guid currentUserId)
    {
        return await BuildDetailDto(id, currentUserId);
    }

    public async Task<bool> DeleteAsync(Guid id, Guid currentUserId, bool isTeamLead)
    {
        var run = await db.CoffeeRuns.FindAsync(id);
        if (run is null) return false;
        if (run.InitiatorId != currentUserId && !isTeamLead) return false;
        db.CoffeeRuns.Remove(run);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<CoffeeRunDetailDto?> CloseAsync(Guid id, Guid currentUserId)
    {
        var run = await db.CoffeeRuns.FindAsync(id);
        if (run is null) return null;
        if (run.InitiatorId != currentUserId) return null;
        if (run.Status == CoffeeRunStatus.Closed) return await BuildDetailDto(id, currentUserId);

        run.Status = CoffeeRunStatus.Closed;
        run.ClosedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return await BuildDetailDto(id, currentUserId);
    }

    public async Task<CoffeeRunDetailDto?> AddMenuItemAsync(Guid runId, CreateMenuItemRequest request, Guid currentUserId)
    {
        var run = await db.CoffeeRuns.FindAsync(runId);
        if (run is null || run.Status == CoffeeRunStatus.Closed) return null;
        if (run.InitiatorId != currentUserId) return null;

        var item = new CoffeeRunMenuItem
        {
            CoffeeRunId = runId,
            Name = request.Name,
            Price = request.Price
        };
        db.CoffeeRunMenuItems.Add(item);
        await db.SaveChangesAsync();
        return await BuildDetailDto(runId, currentUserId);
    }

    public async Task<CoffeeRunDetailDto?> UpdateMenuItemAsync(Guid runId, Guid itemId, UpdateMenuItemRequest request, Guid currentUserId)
    {
        var run = await db.CoffeeRuns.FindAsync(runId);
        if (run is null || run.Status == CoffeeRunStatus.Closed) return null;
        if (run.InitiatorId != currentUserId) return null;

        var item = await db.CoffeeRunMenuItems.FirstOrDefaultAsync(m => m.Id == itemId && m.CoffeeRunId == runId);
        if (item is null) return null;

        if (request.Name is not null) item.Name = request.Name;
        if (request.Price is not null) item.Price = request.Price.Value;
        await db.SaveChangesAsync();
        return await BuildDetailDto(runId, currentUserId);
    }

    public async Task<DeleteMenuItemResult> DeleteMenuItemAsync(Guid runId, Guid itemId, Guid currentUserId)
    {
        var run = await db.CoffeeRuns.FindAsync(runId);
        if (run is null || run.Status == CoffeeRunStatus.Closed) return DeleteMenuItemResult.NotFound;
        if (run.InitiatorId != currentUserId) return DeleteMenuItemResult.NotFound;

        var item = await db.CoffeeRunMenuItems
            .Include(m => m.OrderItems)
            .FirstOrDefaultAsync(m => m.Id == itemId && m.CoffeeRunId == runId);
        if (item is null) return DeleteMenuItemResult.NotFound;

        if (item.OrderItems.Count > 0) return DeleteMenuItemResult.HasOrders;

        db.CoffeeRunMenuItems.Remove(item);
        await db.SaveChangesAsync();
        return DeleteMenuItemResult.Success;
    }

    public async Task<(CoffeeRunDetailDto? Result, bool IsDuplicate)> CreateOrderAsync(Guid runId, CreateOrderRequest request, Guid currentUserId)
    {
        var run = await db.CoffeeRuns.FindAsync(runId);
        if (run is null || run.Status == CoffeeRunStatus.Closed) return (null, false);

        var existing = await db.CoffeeRunOrders
            .FirstOrDefaultAsync(o => o.CoffeeRunId == runId && o.TeamMemberId == currentUserId);
        if (existing is not null) return (null, true);

        var order = new CoffeeRunOrder
        {
            CoffeeRunId = runId,
            TeamMemberId = currentUserId,
            Notes = request.Notes,
            Items = request.Items.Select(i => new CoffeeRunOrderItem
            {
                CoffeeRunMenuItemId = i.MenuItemId,
                Quantity = i.Quantity
            }).ToList()
        };
        db.CoffeeRunOrders.Add(order);
        await db.SaveChangesAsync();
        return (await BuildDetailDto(runId, currentUserId), false);
    }

    public async Task<CoffeeRunDetailDto?> UpdateOrderAsync(Guid runId, Guid orderId, UpdateOrderRequest request, Guid currentUserId)
    {
        var run = await db.CoffeeRuns.FindAsync(runId);
        if (run is null || run.Status == CoffeeRunStatus.Closed) return null;

        var order = await db.CoffeeRunOrders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.CoffeeRunId == runId);
        if (order is null) return null;
        if (order.TeamMemberId != currentUserId) return null;

        if (request.Notes is not null) order.Notes = request.Notes;

        if (request.Items is not null)
        {
            db.CoffeeRunOrderItems.RemoveRange(order.Items);
            order.Items = request.Items.Select(i => new CoffeeRunOrderItem
            {
                CoffeeRunOrderId = orderId,
                CoffeeRunMenuItemId = i.MenuItemId,
                Quantity = i.Quantity
            }).ToList();
        }

        await db.SaveChangesAsync();
        return await BuildDetailDto(runId, currentUserId);
    }

    public async Task<CoffeeRunDetailDto?> DeleteOrderAsync(Guid runId, Guid orderId, Guid currentUserId)
    {
        var run = await db.CoffeeRuns.FindAsync(runId);
        if (run is null || run.Status == CoffeeRunStatus.Closed) return null;

        var order = await db.CoffeeRunOrders
            .FirstOrDefaultAsync(o => o.Id == orderId && o.CoffeeRunId == runId);
        if (order is null) return null;
        if (order.TeamMemberId != currentUserId) return null;

        db.CoffeeRunOrders.Remove(order);
        await db.SaveChangesAsync();
        return await BuildDetailDto(runId, currentUserId);
    }

    private async Task<CoffeeRunDetailDto?> BuildDetailDto(Guid runId, Guid currentUserId)
    {
        var run = await db.CoffeeRuns
            .Include(r => r.Initiator)
            .Include(r => r.MenuItems)
            .Include(r => r.Orders).ThenInclude(o => o.TeamMember)
            .Include(r => r.Orders).ThenInclude(o => o.Items).ThenInclude(i => i.MenuItem)
            .FirstOrDefaultAsync(r => r.Id == runId);

        if (run is null) return null;

        var currentOrder = run.Orders.FirstOrDefault(o => o.TeamMemberId == currentUserId);

        return new CoffeeRunDetailDto
        {
            Id = run.Id,
            InitiatorId = run.InitiatorId,
            InitiatorName = $"{run.Initiator.FirstName} {run.Initiator.LastName}",
            Status = run.Status.ToString(),
            CurrentUserOrderId = currentOrder?.Id,
            MenuItems = run.MenuItems.OrderBy(m => m.CreatedAt).Select(m => new CoffeeRunMenuItemDto(m.Id, m.Name, m.Price)).ToList(),
            Orders = run.Orders.OrderBy(o => o.CreatedAt).Select(o => new CoffeeRunOrderDto
            {
                Id = o.Id,
                TeamMemberId = o.TeamMemberId,
                TeamMemberName = $"{o.TeamMember.FirstName} {o.TeamMember.LastName}",
                Notes = o.Notes,
                Items = o.Items.Select(i => new CoffeeRunOrderItemDto
                {
                    Id = i.Id,
                    MenuItemId = i.MenuItem.Id,
                    MenuItemName = i.MenuItem.Name,
                    MenuItemPrice = i.MenuItem.Price,
                    Quantity = i.Quantity,
                    LineTotal = i.MenuItem.Price * i.Quantity
                }).ToList(),
                Total = o.Items.Sum(i => i.MenuItem.Price * i.Quantity),
                CreatedAt = o.CreatedAt
            }).ToList(),
            CreatedAt = run.CreatedAt,
            ClosedAt = run.ClosedAt
        };
    }

    public async Task<IReadOnlyList<CoffeeRunMenuTemplateListDto>> GetTemplatesAsync()
    {
        return await db.CoffeeRunMenuTemplates
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new CoffeeRunMenuTemplateListDto(
                t.Id,
                t.Name,
                t.Items.Count,
                t.CreatedAt
            ))
            .ToListAsync();
    }

    public async Task<CoffeeRunMenuTemplateDetailDto> CreateTemplateAsync(Guid memberId, CreateMenuTemplateRequest request)
    {
        var sourceItems = await db.CoffeeRunMenuItems
            .Where(m => m.CoffeeRunId == request.CopyFromRunId)
            .ToListAsync();

        var template = new CoffeeRunMenuTemplate
        {
            Name = request.Name,
            CreatedByMemberId = memberId,
            Items = sourceItems.Select(m => new CoffeeRunMenuTemplateItem
            {
                Name = m.Name,
                Price = m.Price
            }).ToList()
        };

        db.CoffeeRunMenuTemplates.Add(template);
        await db.SaveChangesAsync();

        return new CoffeeRunMenuTemplateDetailDto(
            template.Id,
            template.Name,
            template.Items.Select(i => new CoffeeRunMenuItemDto(i.Id, i.Name, i.Price)).ToList(),
            template.CreatedAt
        );
    }

    public async Task<bool> DeleteTemplateAsync(Guid templateId, Guid memberId)
    {
        var template = await db.CoffeeRunMenuTemplates.FindAsync(templateId);
        if (template is null) return false;
        if (template.CreatedByMemberId != memberId) return false;

        db.CoffeeRunMenuTemplates.Remove(template);
        await db.SaveChangesAsync();
        return true;
    }
}
