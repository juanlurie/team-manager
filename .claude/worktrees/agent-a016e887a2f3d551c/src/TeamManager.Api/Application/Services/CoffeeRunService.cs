using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.CoffeeRun;
using TeamManager.Api.Application.DTOs.Shared;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Entities;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public record SizeOption(string Name, decimal PriceAdjust);

public class CoffeeRunService(AppDbContext db) : ICoffeeRunService
{
    public async Task<PagedResult<CoffeeRunListDto>> GetAllAsync(int page = 1, int pageSize = 20, string? status = null, Guid? initiatorId = null, DateTime? from = null, DateTime? to = null, Guid? currentUserId = null)
    {
        var query = db.CoffeeRuns
            .Include(r => r.Initiator)
            .Include(r => r.MenuItems)
            .Include(r => r.Orders)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (Enum.TryParse<CoffeeRunStatus>(status, true, out var parsedStatus))
                query = query.Where(r => r.Status == parsedStatus);
        }
        if (initiatorId.HasValue)
            query = query.Where(r => r.InitiatorId == initiatorId.Value);
        if (from.HasValue)
            query = query.Where(r => r.CreatedAt >= from.Value);
        if (to.HasValue)
            query = query.Where(r => r.CreatedAt <= to.Value);

        // Hide closed/cancelled runs from non-initiators
        if (currentUserId.HasValue)
            query = query.Where(r => r.Status != CoffeeRunStatus.Closed && r.Status != CoffeeRunStatus.Cancelled || r.InitiatorId == currentUserId.Value);

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

        var runs = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = runs.Select(r => new CoffeeRunListDto
        {
            Id = r.Id,
            InitiatorName = $"{r.Initiator.FirstName} {r.Initiator.LastName}",
            Title = r.Title,
            Status = r.Status.ToString(),
            MenuItemCount = r.MenuItems.Count,
            OrderCount = r.Orders.Count,
            TotalAmount = r.Orders.Sum(o => o.TotalAmount),
            CreatedAt = r.CreatedAt,
            OrderDeadline = r.OrderDeadline,
            ClosedAt = r.ClosedAt,
            Location = r.Location
        }).ToList();

        return new PagedResult<CoffeeRunListDto>(items, totalCount, page, pageSize, totalPages);
    }

    public async Task<CoffeeRunDetailDto> CreateAsync(Guid initiatorId, CreateRunRequest? request = null)
    {
        var run = new CoffeeRun
        {
            InitiatorId = initiatorId,
            Status = CoffeeRunStatus.Draft,
            Title = request?.Title,
            Description = request?.Description,
            Location = request?.Location,
            OrderDeadline = request?.OrderDeadline
        };

        if (request?.TemplateId.HasValue == true)
        {
            var sourceItems = await db.CoffeeRunMenuTemplateItems
                .Where(i => i.TemplateId == request.TemplateId.Value)
                .OrderBy(i => i.SortOrder)
                .ToListAsync();

            run.MenuItems = sourceItems.Select(m => new CoffeeRunMenuItem
            {
                Name = m.Name,
                Price = m.Price ?? 0,
                Category = m.Category,
                SortOrder = m.SortOrder,
                Sizes = m.Sizes,
                Additions = m.Additions
            }).ToList();
        }
        else if (request?.CopyMenuFromRunId.HasValue == true)
        {
            var sourceMenu = await db.CoffeeRunMenuItems
                .Where(m => m.CoffeeRunId == request.CopyMenuFromRunId.Value)
                .OrderBy(m => m.SortOrder)
                .ToListAsync();

            run.MenuItems = sourceMenu.Select(m => new CoffeeRunMenuItem
            {
                Name = m.Name,
                Price = m.Price,
                Category = m.Category,
                MaxQuantity = m.MaxQuantity,
                SortOrder = m.SortOrder,
                Sizes = m.Sizes,
                Additions = m.Additions
            }).ToList();
        }

        db.CoffeeRuns.Add(run);
        await db.SaveChangesAsync();

        return await BuildDetailDto(run.Id, initiatorId);
    }

    public async Task<CoffeeRunDetailDto?> GetByIdAsync(Guid id, Guid currentUserId)
    {
        return await BuildDetailDto(id, currentUserId);
    }

    public async Task<CoffeeRunDetailDto?> UpdateAsync(Guid id, UpdateRunRequest request, Guid currentUserId, bool isTeamLead)
    {
        var run = await db.CoffeeRuns.FindAsync(id);
        if (run is null) return null;
        if (run.InitiatorId != currentUserId && !isTeamLead) return null;
        if (run.Status == CoffeeRunStatus.Closed || run.Status == CoffeeRunStatus.Cancelled) return null;

        if (request.Title is not null) run.Title = request.Title;
        if (request.Description is not null) run.Description = request.Description;
        if (request.Location is not null) run.Location = request.Location;
        if (request.OrderDeadline is not null) run.OrderDeadline = request.OrderDeadline;

        await db.SaveChangesAsync();
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

    public async Task<CoffeeRunDetailDto?> PublishAsync(Guid id, Guid currentUserId)
    {
        var run = await db.CoffeeRuns.FindAsync(id);
        if (run is null) return null;
        if (run.InitiatorId != currentUserId) return null;
        if (run.Status != CoffeeRunStatus.Draft) return null;

        run.Status = CoffeeRunStatus.Open;
        await db.SaveChangesAsync();
        return await BuildDetailDto(id, currentUserId);
    }

    public async Task<CoffeeRunDetailDto?> CloseAsync(Guid id, Guid currentUserId)
    {
        var run = await db.CoffeeRuns.FindAsync(id);
        if (run is null) return null;
        if (run.InitiatorId != currentUserId) return null;
        if (run.Status == CoffeeRunStatus.Closed) return await BuildDetailDto(id, currentUserId);
        if (run.Status == CoffeeRunStatus.Cancelled) return null;

        run.Status = CoffeeRunStatus.Closed;
        run.ClosedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return await BuildDetailDto(id, currentUserId);
    }

    public async Task<CoffeeRunDetailDto?> CancelAsync(Guid id, Guid currentUserId, bool isTeamLead)
    {
        var run = await db.CoffeeRuns.FindAsync(id);
        if (run is null) return null;
        if (run.InitiatorId != currentUserId && !isTeamLead) return null;
        if (run.Status == CoffeeRunStatus.Closed || run.Status == CoffeeRunStatus.Cancelled) return null;

        run.Status = CoffeeRunStatus.Cancelled;
        run.CancelledAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return await BuildDetailDto(id, currentUserId);
    }

    public async Task<RunSummaryDetail?> GetSummaryAsync(Guid id, Guid currentUserId)
    {
        var run = await db.CoffeeRuns
            .Include(r => r.Initiator)
            .Include(r => r.Orders).ThenInclude(o => o.TeamMember)
            .Include(r => r.Orders).ThenInclude(o => o.Items).ThenInclude(i => i.MenuItem)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (run is null) return null;
        if (run.InitiatorId != currentUserId) return null;
        if (run.Status != CoffeeRunStatus.Closed) return null;

        var people = run.Orders.Select(o => new PersonSummary(
            o.TeamMemberId,
            $"{o.TeamMember.FirstName} {o.TeamMember.LastName}",
            o.TotalAmount,
            o.Items.Sum(i => i.Quantity)
        )).ToList();

        var items = run.Orders
            .SelectMany(o => o.Items)
            .GroupBy(i => new { i.MenuItem.Name, i.MenuItem.Category })
            .Select(g => new ItemSummary(
                g.Key.Name,
                g.Key.Category,
                g.Sum(i => i.Quantity),
                g.Sum(i => i.LineTotal)
            ))
            .OrderByDescending(i => i.TotalQuantity)
            .ToList();

        return new RunSummaryDetail(
            run.Id,
            run.Orders.Sum(o => o.TotalAmount),
            run.Orders.Sum(o => o.Items.Sum(i => i.Quantity)),
            people,
            items
        );
    }

    public async Task<CoffeeRunDetailDto?> AddMenuItemAsync(Guid runId, CreateMenuItemRequest request, Guid currentUserId)
    {
        var run = await db.CoffeeRuns.FindAsync(runId);
        if (run is null || run.Status == CoffeeRunStatus.Closed || run.Status == CoffeeRunStatus.Cancelled) return null;
        if (run.InitiatorId != currentUserId) return null;

        var maxSortOrder = await db.CoffeeRunMenuItems
            .Where(m => m.CoffeeRunId == runId)
            .MaxAsync(m => (int?)m.SortOrder) ?? 0;

        var item = new CoffeeRunMenuItem
        {
            CoffeeRunId = runId,
            Name = request.Name,
            Price = request.Price,
            Category = request.Category,
            MaxQuantity = request.MaxQuantity,
            SortOrder = request.SortOrder > 0 ? request.SortOrder : maxSortOrder + 1,
            Sizes = request.Sizes,
            Additions = request.Additions
        };
        db.CoffeeRunMenuItems.Add(item);
        await db.SaveChangesAsync();
        return await BuildDetailDto(runId, currentUserId);
    }

    public async Task<CoffeeRunDetailDto?> UpdateMenuItemAsync(Guid runId, Guid itemId, UpdateMenuItemRequest request, Guid currentUserId)
    {
        var run = await db.CoffeeRuns.FindAsync(runId);
        if (run is null || run.Status == CoffeeRunStatus.Closed || run.Status == CoffeeRunStatus.Cancelled) return null;
        if (run.InitiatorId != currentUserId) return null;

        var item = await db.CoffeeRunMenuItems.FirstOrDefaultAsync(m => m.Id == itemId && m.CoffeeRunId == runId);
        if (item is null) return null;

        if (request.Name is not null) item.Name = request.Name;
        if (request.Price is not null) item.Price = request.Price.Value;
        if (request.Category is not null) item.Category = request.Category;
        if (request.MaxQuantity is not null) item.MaxQuantity = request.MaxQuantity;
        if (request.IsAvailable is not null) item.IsAvailable = request.IsAvailable.Value;
        if (request.SortOrder is not null) item.SortOrder = request.SortOrder.Value;
        if (request.Sizes is not null) item.Sizes = request.Sizes;
        if (request.Additions is not null) item.Additions = request.Additions;

        await db.SaveChangesAsync();
        return await BuildDetailDto(runId, currentUserId);
    }

    public async Task<CoffeeRunDetailDto?> ToggleMenuItemAvailabilityAsync(Guid runId, Guid itemId, Guid currentUserId)
    {
        var run = await db.CoffeeRuns.FindAsync(runId);
        if (run is null || run.Status == CoffeeRunStatus.Closed || run.Status == CoffeeRunStatus.Cancelled) return null;
        if (run.InitiatorId != currentUserId) return null;

        var item = await db.CoffeeRunMenuItems.FirstOrDefaultAsync(m => m.Id == itemId && m.CoffeeRunId == runId);
        if (item is null) return null;

        item.IsAvailable = !item.IsAvailable;
        await db.SaveChangesAsync();
        return await BuildDetailDto(runId, currentUserId);
    }

    public async Task<DeleteMenuItemResult> DeleteMenuItemAsync(Guid runId, Guid itemId, Guid currentUserId)
    {
        var run = await db.CoffeeRuns.FindAsync(runId);
        if (run is null || run.Status == CoffeeRunStatus.Closed || run.Status == CoffeeRunStatus.Cancelled) return DeleteMenuItemResult.NotFound;
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
        if (run is null) return (null, false);
        if (run.Status == CoffeeRunStatus.Closed || run.Status == CoffeeRunStatus.Cancelled) return (null, false);
        if (run.Status == CoffeeRunStatus.Draft) return (null, false);

        // Check deadline
        if (run.OrderDeadline.HasValue && run.OrderDeadline.Value <= DateTimeOffset.UtcNow)
        {
            run.Status = CoffeeRunStatus.Closed;
            run.ClosedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
            return (null, false);
        }

        var existing = await db.CoffeeRunOrders
            .FirstOrDefaultAsync(o => o.CoffeeRunId == runId && o.TeamMemberId == currentUserId);
        if (existing is not null) return (null, true);

        // Wrap stock check + order creation in a transaction to prevent race conditions
        using var transaction = await db.Database.BeginTransactionAsync();
        try
        {
            // Build order items with price snapshots
            var orderItems = new List<CoffeeRunOrderItem>();
            decimal totalAmount = 0;

            foreach (var entry in request.Items)
            {
                var menuItem = await db.CoffeeRunMenuItems.FindAsync(entry.MenuItemId);
                if (menuItem is null || !menuItem.IsAvailable) continue;

                var unitPrice = menuItem.Price;
                if (!string.IsNullOrWhiteSpace(menuItem.Sizes) && !string.IsNullOrWhiteSpace(entry.Size))
                {
                    var sizes = System.Text.Json.JsonSerializer.Deserialize<List<SizeOption>>(menuItem.Sizes);
                    var selectedSize = sizes?.FirstOrDefault(s => s.Name == entry.Size);
                    if (selectedSize != null)
                        unitPrice = menuItem.Price + selectedSize.PriceAdjust;
                }

                // Check stock limits
                if (menuItem.MaxQuantity.HasValue)
                {
                    var orderedQty = await db.CoffeeRunOrderItems
                        .Where(oi => oi.CoffeeRunMenuItemId == menuItem.Id)
                        .SumAsync(oi => (int?)oi.Quantity) ?? 0;

                    var remaining = menuItem.MaxQuantity.Value - orderedQty;
                    if (remaining <= 0) continue;

                    var adjustedQty = Math.Min(entry.Quantity, remaining);
                    var lineTotal = unitPrice * adjustedQty;

                    orderItems.Add(new CoffeeRunOrderItem
                    {
                        CoffeeRunMenuItemId = menuItem.Id,
                        Quantity = adjustedQty,
                        UnitPrice = unitPrice,
                        LineTotal = lineTotal,
                        SelectedSize = entry.Size,
                        SelectedAdditions = entry.Additions != null ? System.Text.Json.JsonSerializer.Serialize(entry.Additions) : null
                    });
                    totalAmount += lineTotal;
                }
                else
                {
                    var lineTotal = unitPrice * entry.Quantity;

                    orderItems.Add(new CoffeeRunOrderItem
                    {
                        CoffeeRunMenuItemId = menuItem.Id,
                        Quantity = entry.Quantity,
                        UnitPrice = unitPrice,
                        LineTotal = lineTotal,
                        SelectedSize = entry.Size,
                        SelectedAdditions = entry.Additions != null ? System.Text.Json.JsonSerializer.Serialize(entry.Additions) : null
                    });
                    totalAmount += lineTotal;
                }
            }

            if (orderItems.Count == 0)
            {
                await transaction.RollbackAsync();
                return (null, false);
            }

            var now = DateTimeOffset.UtcNow;
            var order = new CoffeeRunOrder
            {
                CoffeeRunId = runId,
                TeamMemberId = currentUserId,
                Notes = request.Notes,
                TotalAmount = totalAmount,
                CreatedAt = now,
                UpdatedAt = now,
                Items = orderItems
            };
            db.CoffeeRunOrders.Add(order);
            await db.SaveChangesAsync();
            await transaction.CommitAsync();
            return (await BuildDetailDto(runId, currentUserId), false);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<CoffeeRunDetailDto?> UpdateOrderAsync(Guid runId, Guid orderId, UpdateOrderRequest request, Guid currentUserId)
    {
        var run = await db.CoffeeRuns.FindAsync(runId);
        if (run is null || run.Status == CoffeeRunStatus.Closed || run.Status == CoffeeRunStatus.Cancelled) return null;

        var order = await db.CoffeeRunOrders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.CoffeeRunId == runId);
        if (order is null) return null;
        if (order.TeamMemberId != currentUserId) return null;

        if (request.Notes is not null) order.Notes = request.Notes;

        if (request.Items is not null)
        {
            db.CoffeeRunOrderItems.RemoveRange(order.Items);

            var newItems = new List<CoffeeRunOrderItem>();
            decimal totalAmount = 0;

            foreach (var entry in request.Items)
            {
                var menuItem = await db.CoffeeRunMenuItems.FindAsync(entry.MenuItemId);
                if (menuItem is null || !menuItem.IsAvailable) continue;

                var unitPrice = menuItem.Price;
                if (!string.IsNullOrWhiteSpace(menuItem.Sizes) && !string.IsNullOrWhiteSpace(entry.Size))
                {
                    var sizes = System.Text.Json.JsonSerializer.Deserialize<List<SizeOption>>(menuItem.Sizes);
                    var selectedSize = sizes?.FirstOrDefault(s => s.Name == entry.Size);
                    if (selectedSize != null)
                        unitPrice = menuItem.Price + selectedSize.PriceAdjust;
                }

                if (menuItem.MaxQuantity.HasValue)
                {
                    var orderedQty = await db.CoffeeRunOrderItems
                        .Where(oi => oi.CoffeeRunMenuItemId == menuItem.Id && oi.CoffeeRunOrderId != orderId)
                        .SumAsync(oi => (int?)oi.Quantity) ?? 0;

                    var remaining = menuItem.MaxQuantity.Value - orderedQty;
                    if (remaining <= 0) continue;

                    var adjustedQty = Math.Min(entry.Quantity, remaining);
                    var lineTotal = unitPrice * adjustedQty;

                    newItems.Add(new CoffeeRunOrderItem
                    {
                        CoffeeRunOrderId = orderId,
                        CoffeeRunMenuItemId = menuItem.Id,
                        Quantity = adjustedQty,
                        UnitPrice = unitPrice,
                        LineTotal = lineTotal,
                        SelectedSize = entry.Size,
                        SelectedAdditions = entry.Additions != null ? System.Text.Json.JsonSerializer.Serialize(entry.Additions) : null
                    });
                    totalAmount += lineTotal;
                }
                else
                {
                    var lineTotal = unitPrice * entry.Quantity;

                    newItems.Add(new CoffeeRunOrderItem
                    {
                        CoffeeRunOrderId = orderId,
                        CoffeeRunMenuItemId = menuItem.Id,
                        Quantity = entry.Quantity,
                        UnitPrice = unitPrice,
                        LineTotal = lineTotal,
                        SelectedSize = entry.Size,
                        SelectedAdditions = entry.Additions != null ? System.Text.Json.JsonSerializer.Serialize(entry.Additions) : null
                    });
                    totalAmount += lineTotal;
                }
            }

            order.Items = newItems;
            order.TotalAmount = totalAmount;
            order.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync();
        return await BuildDetailDto(runId, currentUserId);
    }

    public async Task<CoffeeRunDetailDto?> DeleteOrderAsync(Guid runId, Guid orderId, Guid currentUserId)
    {
        var run = await db.CoffeeRuns.FindAsync(runId);
        if (run is null || run.Status == CoffeeRunStatus.Closed || run.Status == CoffeeRunStatus.Cancelled) return null;

        var order = await db.CoffeeRunOrders
            .FirstOrDefaultAsync(o => o.Id == orderId && o.CoffeeRunId == runId);
        if (order is null) return null;
        if (order.TeamMemberId != currentUserId) return null;

        db.CoffeeRunOrders.Remove(order);
        await db.SaveChangesAsync();
        return await BuildDetailDto(runId, currentUserId);
    }

    public async Task<CoffeeRunDetailDto?> UpdateOrderStatusAsync(Guid runId, Guid orderId, UpdateOrderStatusRequest request, Guid currentUserId)
    {
        var run = await db.CoffeeRuns.FindAsync(runId);
        if (run is null) return null;
        if (run.InitiatorId != currentUserId) return null;

        var order = await db.CoffeeRunOrders.FindAsync(orderId);
        if (order is null || order.CoffeeRunId != runId) return null;

        if (Enum.TryParse<OrderStatus>(request.Status, true, out var status))
        {
            order.Status = status;
            order.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
        }

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
        var isInitiator = run.InitiatorId == currentUserId;

        return new CoffeeRunDetailDto
        {
            Id = run.Id,
            InitiatorId = run.InitiatorId,
            InitiatorName = $"{run.Initiator.FirstName} {run.Initiator.LastName}",
            Title = run.Title,
            Description = run.Description,
            Location = run.Location,
            Status = run.Status.ToString(),
            CurrentUserOrderId = currentOrder?.Id,
            CreatedAt = run.CreatedAt,
            OrderDeadline = run.OrderDeadline,
            ClosedAt = run.ClosedAt,
            CancelledAt = run.CancelledAt,
            MenuItems = run.MenuItems
                .OrderBy(m => m.SortOrder)
                .ThenBy(m => m.CreatedAt)
                .Select(m =>
                {
                    int? remaining = null;
                    if (m.MaxQuantity.HasValue)
                    {
                        var ordered = m.OrderItems.Sum(oi => oi.Quantity);
                        remaining = m.MaxQuantity.Value - ordered;
                    }
                    return new CoffeeRunMenuItemDto(
                        m.Id, m.Name, m.Price, m.Category,
                        m.MaxQuantity, remaining, m.IsAvailable, m.SortOrder, m.Sizes, m.Additions
                    );
                }).ToList(),
            Orders = run.Orders.OrderBy(o => o.CreatedAt).Select(o =>
            {
                var isOwnOrder = o.TeamMemberId == currentUserId;
                return new CoffeeRunOrderDto
                {
                    Id = o.Id,
                    TeamMemberId = o.TeamMemberId,
                    TeamMemberName = $"{o.TeamMember.FirstName} {o.TeamMember.LastName}",
                    Status = o.Status.ToString(),
                    Notes = isInitiator || isOwnOrder ? o.Notes : null,
                    TotalAmount = o.TotalAmount,
                    CreatedAt = o.CreatedAt,
                    UpdatedAt = o.UpdatedAt,
                    Items = isInitiator || isOwnOrder
                        ? o.Items.Select(i => new CoffeeRunOrderItemDto
                        {
                            Id = i.Id,
                            MenuItemId = i.MenuItem.Id,
                            MenuItemName = i.MenuItem.Name,
                            UnitPrice = i.UnitPrice,
                            Quantity = i.Quantity,
                            LineTotal = i.LineTotal,
                            SelectedSize = i.SelectedSize,
                            SelectedAdditions = i.SelectedAdditions
                        }).ToList()
                        : []
                };
            }).ToList()
        };
    }

    public async Task<PagedResult<CoffeeRunMenuTemplateListDto>> GetTemplatesAsync(int page = 1, int pageSize = 20, string? scope = null, bool? includeArchived = null)
    {
        var query = db.CoffeeRunMenuTemplates
            .Include(t => t.CreatedBy)
            .Include(t => t.Items)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(scope))
            query = query.Where(t => t.Scope == scope);
        if (includeArchived == false)
            query = query.Where(t => !t.IsArchived);

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

        var templates = await query
            .OrderByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = templates.Select(t => new CoffeeRunMenuTemplateListDto(
            t.Id,
            t.Name,
            t.Scope,
            t.Items.Count,
            $"{t.CreatedBy.FirstName} {t.CreatedBy.LastName}",
            t.CreatedAt,
            t.IsArchived
        )).ToList();

        return new PagedResult<CoffeeRunMenuTemplateListDto>(items, totalCount, page, pageSize, totalPages);
    }

    public async Task<CoffeeRunMenuTemplateDetailDto> CreateTemplateAsync(Guid memberId, CreateMenuTemplateRequest request)
    {
        var template = new CoffeeRunMenuTemplate
        {
            Name = request.Name,
            CreatedByMemberId = memberId,
            Scope = request.Scope
        };

        if (request.CopyFromRunId.HasValue)
        {
            var sourceItems = await db.CoffeeRunMenuItems
                .Where(m => m.CoffeeRunId == request.CopyFromRunId.Value)
                .OrderBy(m => m.SortOrder)
                .ToListAsync();

            template.Items = sourceItems.Select(m => new CoffeeRunMenuTemplateItem
            {
                Name = m.Name,
                Price = m.Price,
                Category = m.Category,
                SortOrder = m.SortOrder,
                Sizes = m.Sizes,
                Additions = m.Additions
            }).ToList();
        }
        else if (request.CopyFromTemplateId.HasValue)
        {
            var sourceItems = await db.CoffeeRunMenuTemplateItems
                .Where(i => i.TemplateId == request.CopyFromTemplateId.Value)
                .OrderBy(i => i.SortOrder)
                .ToListAsync();

            template.Items = sourceItems.Select(i => new CoffeeRunMenuTemplateItem
            {
                Name = i.Name,
                Price = i.Price,
                Category = i.Category,
                SortOrder = i.SortOrder,
                Sizes = i.Sizes,
                Additions = i.Additions
            }).ToList();
        }

        db.CoffeeRunMenuTemplates.Add(template);
        await db.SaveChangesAsync();

        return await BuildTemplateDetail(template.Id);
    }

    public async Task<bool> DeleteTemplateAsync(Guid templateId, Guid memberId, bool isTeamLead)
    {
        var template = await db.CoffeeRunMenuTemplates.FindAsync(templateId);
        if (template is null) return false;
        if (template.CreatedByMemberId != memberId && !isTeamLead) return false;

        db.CoffeeRunMenuTemplates.Remove(template);
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ArchiveTemplateAsync(Guid templateId, Guid memberId, bool isTeamLead)
    {
        var template = await db.CoffeeRunMenuTemplates.FindAsync(templateId);
        if (template is null) return false;
        if (template.CreatedByMemberId != memberId && !isTeamLead) return false;

        template.IsArchived = true;
        template.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RestoreTemplateAsync(Guid templateId, Guid memberId, bool isTeamLead)
    {
        var template = await db.CoffeeRunMenuTemplates.FindAsync(templateId);
        if (template is null) return false;
        if (template.CreatedByMemberId != memberId && !isTeamLead) return false;

        template.IsArchived = false;
        template.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<CoffeeRunMenuTemplateDetailDto> GetTemplateDetailAsync(Guid templateId, Guid memberId)
    {
        var template = await db.CoffeeRunMenuTemplates
            .Include(t => t.CreatedBy)
            .Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == templateId);

        if (template is null) throw new KeyNotFoundException("Template not found.");

        return new CoffeeRunMenuTemplateDetailDto(
            template.Id,
            template.Name,
            template.Scope,
            $"{template.CreatedBy.FirstName} {template.CreatedBy.LastName}",
            template.CreatedAt,
            template.UpdatedAt,
            template.Items.OrderBy(i => i.SortOrder).ThenBy(i => i.Name).Select(i => new TemplateItemDto(i.Id, i.Name, i.Price, i.Category, i.SortOrder, i.Sizes, i.Additions)).ToList()
        );
    }

    public async Task<CoffeeRunMenuTemplateDetailDto> ImportTemplateAsync(Guid memberId, ImportMenuTemplateRequest request)
    {
        var template = new CoffeeRunMenuTemplate
        {
            Name = request.Name,
            CreatedByMemberId = memberId,
            Items = request.Items.Select((i, idx) => new CoffeeRunMenuTemplateItem
            {
                Name = i.Name,
                Price = i.Price,
                SortOrder = idx
            }).ToList()
        };

        db.CoffeeRunMenuTemplates.Add(template);
        await db.SaveChangesAsync();

        return await BuildTemplateDetail(template.Id);
    }

    public async Task<CoffeeRunMenuTemplateDetailDto> UpdateTemplateAsync(Guid templateId, Guid memberId, UpdateMenuTemplateRequest request)
    {
        var template = await db.CoffeeRunMenuTemplates
            .Include(t => t.Items)
            .FirstOrDefaultAsync(t => t.Id == templateId);

        if (template is null) throw new KeyNotFoundException("Template not found.");
        if (template.CreatedByMemberId != memberId) throw new UnauthorizedAccessException("Not the template owner.");

        if (request.Name is not null)
            template.Name = request.Name;
        if (request.Scope is not null)
            template.Scope = request.Scope;

        template.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();

        return new CoffeeRunMenuTemplateDetailDto(
            template.Id,
            template.Name,
            template.Scope,
            $"{template.CreatedBy.FirstName} {template.CreatedBy.LastName}",
            template.CreatedAt,
            template.UpdatedAt,
            template.Items.OrderBy(i => i.SortOrder).ThenBy(i => i.Name).Select(i => new TemplateItemDto(i.Id, i.Name, i.Price, i.Category, i.SortOrder, i.Sizes, i.Additions)).ToList()
        );
    }

    public async Task<CoffeeRunMenuTemplateDetailDto> AddTemplateItemAsync(Guid templateId, Guid memberId, CreateTemplateItemRequest request)
    {
        var template = await db.CoffeeRunMenuTemplates.FindAsync(templateId);
        if (template is null) throw new KeyNotFoundException("Template not found.");
        if (template.CreatedByMemberId != memberId) throw new UnauthorizedAccessException("Not the template owner.");

        var maxSortOrder = await db.CoffeeRunMenuTemplateItems
            .Where(i => i.TemplateId == templateId)
            .MaxAsync(i => (int?)i.SortOrder) ?? 0;

        var item = new CoffeeRunMenuTemplateItem
        {
            TemplateId = templateId,
            Name = request.Name,
            Price = request.Price,
            Category = request.Category,
            SortOrder = request.SortOrder > 0 ? request.SortOrder : maxSortOrder + 1,
            Sizes = request.Sizes,
            Additions = request.Additions
        };

        db.CoffeeRunMenuTemplateItems.Add(item);
        await db.SaveChangesAsync();

        return await BuildTemplateDetail(templateId);
    }

    public async Task<CoffeeRunMenuTemplateDetailDto> UpdateTemplateItemAsync(Guid templateId, Guid itemId, Guid memberId, UpdateTemplateItemRequest request)
    {
        var template = await db.CoffeeRunMenuTemplates.FindAsync(templateId);
        if (template is null) throw new KeyNotFoundException("Template not found.");
        if (template.CreatedByMemberId != memberId) throw new UnauthorizedAccessException("Not the template owner.");

        var item = await db.CoffeeRunMenuTemplateItems.FirstOrDefaultAsync(i => i.Id == itemId && i.TemplateId == templateId);
        if (item is null) throw new KeyNotFoundException("Item not found.");

        if (request.Name is not null) item.Name = request.Name;
        if (request.Price.HasValue) item.Price = request.Price;
        if (request.Category is not null) item.Category = request.Category;
        if (request.SortOrder is not null) item.SortOrder = request.SortOrder.Value;
        if (request.Sizes is not null) item.Sizes = request.Sizes;
        if (request.Additions is not null) item.Additions = request.Additions;

        await db.SaveChangesAsync();

        return await BuildTemplateDetail(templateId);
    }

    public async Task<bool> DeleteTemplateItemAsync(Guid templateId, Guid itemId, Guid memberId)
    {
        var template = await db.CoffeeRunMenuTemplates.FindAsync(templateId);
        if (template is null) return false;
        if (template.CreatedByMemberId != memberId) return false;

        var item = await db.CoffeeRunMenuTemplateItems.FirstOrDefaultAsync(i => i.Id == itemId && i.TemplateId == templateId);
        if (item is null) return false;

        db.CoffeeRunMenuTemplateItems.Remove(item);
        await db.SaveChangesAsync();
        return true;
    }

    private async Task<CoffeeRunMenuTemplateDetailDto> BuildTemplateDetail(Guid templateId)
    {
        var template = await db.CoffeeRunMenuTemplates
            .Include(t => t.CreatedBy)
            .Include(t => t.Items)
            .FirstAsync(t => t.Id == templateId);

        return new CoffeeRunMenuTemplateDetailDto(
            template.Id,
            template.Name,
            template.Scope,
            $"{template.CreatedBy.FirstName} {template.CreatedBy.LastName}",
            template.CreatedAt,
            template.UpdatedAt,
            template.Items.OrderBy(i => i.SortOrder).ThenBy(i => i.Name).Select(i => new TemplateItemDto(i.Id, i.Name, i.Price, i.Category, i.SortOrder, i.Sizes, i.Additions)).ToList()
        );
    }
}
