using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Timesheet;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class TimesheetApprovalService(AppDbContext db, ITimesheetApprovalFetcher fetcher) : ITimesheetApprovalService
{
    public async Task<IReadOnlyList<TimesheetApprovalMemberDto>> FetchOutstandingAsync(FetchTimesheetApprovalsRequest request)
    {
        var entries = await fetcher.FetchAsync(request);

        var members = await db.TeamMembers
            .Where(m => m.IsActive)
            .Select(m => new { m.Id, FullName = (m.FirstName + " " + m.LastName).ToLower() })
            .ToListAsync();
        // Group instead of ToDictionary — two active members can share a full name (e.g. test
        // data), and matching is by name alone here, so an ambiguous name is left unresolved
        // (null TeamMemberId) rather than throwing.
        var memberLookup = members
            .GroupBy(m => m.FullName)
            .Where(g => g.Count() == 1)
            .ToDictionary(g => g.Key, g => g.First().Id);

        var violationsByEntry = TimesheetApprovalRules.Evaluate(entries);

        var result = new List<TimesheetApprovalMemberDto>();
        foreach (var memberGroup in entries.GroupBy(e => e.MemberName))
        {
            var entryDtos = memberGroup
                .Select(e => new TimesheetApprovalEntryDto(
                    e.Date, e.Project, e.Category, e.Hours, e.Minutes, e.Billable,
                    e.WorkedFrom, e.Description, e.TicketNumber, e.ExternalId,
                    violationsByEntry[e]))
                .OrderBy(e => e.Date)
                .ToList();

            var violationCount = entryDtos.Sum(e => e.Violations.Count);
            if (violationCount == 0) continue;

            memberLookup.TryGetValue(memberGroup.Key.ToLower(), out var teamMemberId);

            result.Add(new TimesheetApprovalMemberDto(
                teamMemberId == default ? null : teamMemberId,
                memberGroup.Key,
                entryDtos,
                violationCount
            ));
        }

        return result.OrderBy(m => m.MemberName).ToList();
    }
}
