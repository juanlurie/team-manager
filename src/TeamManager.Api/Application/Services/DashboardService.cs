using AutoMapper;
using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Dashboard;
using TeamManager.Api.Application.DTOs.Feature;
using TeamManager.Api.Application.DTOs.LeaveRecord;
using TeamManager.Api.Application.DTOs.Sprint;
using TeamManager.Api.Application.DTOs.WorkItem;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Domain.Enums;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class DashboardService(AppDbContext db, IMapper mapper) : IDashboardService
{
    public async Task<SprintDashboardDto?> GetSprintDashboardAsync(Guid sprintId, Guid? teamLeadId = null)
    {
        var sprint = await db.Sprints.Include(s => s.PI).FirstOrDefaultAsync(s => s.Id == sprintId);
        if (sprint is null) return null;

        var features = await db.Features
            .Where(f => f.SprintId == sprintId)
            .OrderBy(f => f.Title)
            .ToListAsync();

        var membersQuery = db.SprintMembers
            .Where(sm => sm.SprintId == sprintId)
            .Include(sm => sm.TeamMember).ThenInclude(m => m.TeamLead)
            .Include(sm => sm.WorkItems).ThenInclude(w => w.Feature)
            .AsQueryable();

        if (teamLeadId.HasValue)
            membersQuery = membersQuery.Where(sm =>
                sm.TeamMember.TeamLeadId == teamLeadId || sm.TeamMember.Id == teamLeadId);

        var members = await membersQuery
            .OrderBy(sm => sm.TeamMember.LastName)
            .ThenBy(sm => sm.TeamMember.FirstName)
            .ToListAsync();

        var memberIds = members.Select(sm => sm.TeamMemberId).ToList();
        var leaveRecords = await db.LeaveRecords
            .Include(l => l.TeamMember)
            .Where(l =>
                memberIds.Contains(l.TeamMemberId) &&
                l.StartDate <= sprint.EndDate &&
                l.EndDate >= sprint.StartDate)
            .ToListAsync();

        var leaveByMember = leaveRecords.GroupBy(l => l.TeamMemberId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var cards = members.Select(sm => new MemberSprintCardDto
        {
            SprintMemberId = sm.Id,
            TeamMemberId = sm.TeamMemberId,
            FullName = $"{sm.TeamMember.FirstName} {sm.TeamMember.LastName}",
            Role = sm.TeamMember.Role.ToString(),
            TeamLeadName = sm.TeamMember.TeamLead is not null
                ? $"{sm.TeamMember.TeamLead.FirstName} {sm.TeamMember.TeamLead.LastName}"
                : null,
            Crafts = sm.TeamMember.Crafts,
            Notes = sm.Notes,
            Capacity = sm.Capacity,
            WorkItems = sm.WorkItems.Select(w => new WorkItemDto
            {
                Id = w.Id,
                Title = w.Title,
                Description = w.Description,
                Type = w.Type.ToString(),
                Status = w.Status.ToString(),
                SprintMemberId = w.SprintMemberId,
                FeatureId = w.FeatureId,
                FeatureTitle = w.Feature?.Title,
                ExternalTicketRef = w.ExternalTicketRef,
                EstimatedPoints = w.EstimatedPoints,
                ActualPoints = w.ActualPoints,
                CompletedDate = w.CompletedDate
            }).ToList(),
            LeaveRecords = leaveByMember.TryGetValue(sm.TeamMemberId, out var leave)
                ? leave.Select(l => new LeaveRecordDto
                {
                    Id = l.Id,
                    TeamMemberId = l.TeamMemberId,
                    MemberName = $"{l.TeamMember.FirstName} {l.TeamMember.LastName}",
                    StartDate = l.StartDate,
                    EndDate = l.EndDate,
                    Type = l.Type.ToString(),
                    DaysCount = l.DaysCount,
                    Notes = l.Notes
                }).ToList()
                : []
        }).ToList();

        return new SprintDashboardDto
        {
            Sprint = mapper.Map<SprintDto>(sprint),
            Features = features.Select(f => new FeatureDto
            {
                Id = f.Id,
                SprintId = f.SprintId,
                Title = f.Title,
                Description = f.Description,
                ExternalTicketRef = f.ExternalTicketRef,
                Status = f.Status.ToString(),
                IsActive = f.IsActive
            }).ToList(),
            Members = cards
        };
    }

    public async Task<SprintSummaryDto?> GetSprintSummaryAsync(Guid sprintId)
    {
        var sprint = await db.Sprints.FindAsync(sprintId);
        if (sprint is null) return null;

        var members = await db.SprintMembers
            .Where(sm => sm.SprintId == sprintId)
            .Include(sm => sm.WorkItems)
            .ToListAsync();

        var memberIds = members.Select(sm => sm.TeamMemberId).ToList();
        var totalLeaveDays = await db.LeaveRecords
            .Where(l =>
                memberIds.Contains(l.TeamMemberId) &&
                l.StartDate <= sprint.EndDate &&
                l.EndDate >= sprint.StartDate)
            .SumAsync(l => l.DaysCount);

        return new SprintSummaryDto
        {
            TotalMembers = members.Count,
            PlannedCount = members.SelectMany(m => m.WorkItems).Count(w => w.Status == WorkItemStatus.Planned),
            InProgressCount = members.SelectMany(m => m.WorkItems).Count(w => w.Status == WorkItemStatus.InProgress),
            BlockedCount = members.SelectMany(m => m.WorkItems).Count(w => w.Status == WorkItemStatus.Blocked),
            CompletedCount = members.SelectMany(m => m.WorkItems).Count(w => w.Status == WorkItemStatus.Completed),
            TotalLeaveDays = totalLeaveDays
        };
    }

    public async Task<IReadOnlyList<BlockerDto>> GetBlockersAsync(Guid sprintId)
    {
        var now = DateTimeOffset.UtcNow;
        var sprintMemberIds = await db.SprintMembers
            .Where(sm => sm.SprintId == sprintId)
            .Select(sm => new { sm.Id, sm.TeamMemberId, sm.TeamMember.FirstName, sm.TeamMember.LastName })
            .ToListAsync();

        var memberMap = sprintMemberIds.ToDictionary(
            sm => sm.Id,
            sm => new { sm.TeamMemberId, Name = $"{sm.FirstName} {sm.LastName}" });

        var blockedItems = await db.WorkItems
            .Include(w => w.Feature)
            .Where(w => sprintMemberIds.Select(sm => sm.Id).Contains(w.SprintMemberId)
                     && w.Status == WorkItemStatus.Blocked
                     && w.BlockedAt != null)
            .ToListAsync();

        return blockedItems
            .Select(w => new BlockerDto
            {
                WorkItemId = w.Id,
                Title = w.Title,
                FeatureTitle = w.Feature?.Title,
                ExternalTicketRef = w.ExternalTicketRef,
                MemberId = memberMap[w.SprintMemberId].TeamMemberId,
                MemberName = memberMap[w.SprintMemberId].Name,
                BlockedAt = w.BlockedAt!.Value,
                DaysBlocked = (int)Math.Floor((now - w.BlockedAt!.Value).TotalDays)
            })
            .OrderByDescending(b => b.DaysBlocked)
            .ThenBy(b => b.MemberName)
            .ToList();
    }
}
