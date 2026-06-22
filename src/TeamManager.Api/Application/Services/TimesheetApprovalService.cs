using Microsoft.EntityFrameworkCore;
using TeamManager.Api.Application.DTOs.Timesheet;
using TeamManager.Api.Application.Services.Interfaces;
using TeamManager.Api.Infrastructure.Data;

namespace TeamManager.Api.Application.Services;

public class TimesheetApprovalService(AppDbContext db, ITimesheetApprovalFetcher fetcher) : ITimesheetApprovalService
{
    public async Task<TimesheetApprovalFetchResultDto> FetchOutstandingAsync(FetchTimesheetApprovalsRequest request)
    {
        var entries = await fetcher.FetchAsync(request);

        var members = await db.TeamMembers
            .Where(m => m.IsActive)
            .Select(m => new { m.Id, m.FirstName, m.LastName, FullName = (m.FirstName + " " + m.LastName).ToLower() })
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

        var missingByWeek = BuildMissingByWeek(entries, members.Select(m => $"{m.FirstName} {m.LastName}").ToList(), request);

        return new TimesheetApprovalFetchResultDto(
            result.OrderBy(m => m.MemberName).ToList(),
            missingByWeek
        );
    }

    // For each Monday-Sunday week overlapping the requested range, flags active members who
    // logged zero hours anywhere in that week. Weeks (or the trailing part of one) that haven't
    // happened yet are skipped — nothing to expect there. Doesn't account for leave/public
    // holidays, so someone fully on leave for a week will still show up as missing.
    private static IReadOnlyList<MissingTimesheetWeekDto> BuildMissingByWeek(
        IReadOnlyList<ImportedTimesheetEntry> entries, IReadOnlyList<string> activeMemberNames, FetchTimesheetApprovalsRequest request)
    {
        if (!DateOnly.TryParse(request.Start, out var rangeStart) || !DateOnly.TryParse(request.End, out var rangeEnd))
            return [];

        var today = DateOnly.FromDateTime(DateTimeOffset.UtcNow.Date);
        var loggedByNameLower = entries
            .GroupBy(e => e.MemberName.ToLower())
            .ToDictionary(g => g.Key, g => g.Select(e => e.Date).ToHashSet());

        var weeks = new List<MissingTimesheetWeekDto>();
        var daysSinceMonday = rangeStart.DayOfWeek == DayOfWeek.Sunday ? 6 : (int)rangeStart.DayOfWeek - 1;
        var cursor = rangeStart.AddDays(-daysSinceMonday);

        while (cursor <= rangeEnd)
        {
            var weekStart = cursor;
            var weekEnd = cursor.AddDays(6);
            cursor = cursor.AddDays(7);

            var clippedStart = weekStart < rangeStart ? rangeStart : weekStart;
            var clippedEnd = weekEnd > rangeEnd ? rangeEnd : weekEnd;
            if (clippedEnd > today) clippedEnd = today;
            if (clippedStart > clippedEnd) continue; // entirely in the future

            var weekdays = Enumerable.Range(0, clippedEnd.DayNumber - clippedStart.DayNumber + 1)
                .Select(clippedStart.AddDays)
                .Where(d => d.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday)
                .ToList();
            if (weekdays.Count == 0) continue;

            var missing = activeMemberNames
                .Where(name =>
                {
                    var logged = loggedByNameLower.GetValueOrDefault(name.ToLower());
                    return logged is null || !weekdays.Any(logged.Contains);
                })
                .OrderBy(name => name)
                .ToList();

            if (missing.Count > 0)
                weeks.Add(new MissingTimesheetWeekDto(weekStart, weekEnd, missing));
        }

        return weeks;
    }
}
