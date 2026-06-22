using TeamManager.Api.Application.DTOs.Timesheet;
using TeamManager.Api.Application.Services.Interfaces;

namespace TeamManager.Api.Application.Services;

// Builds the approval screen entirely from what the external timesheet system reports — no
// cross-referencing against our own TeamMembers table. The two rosters can legitimately differ
// (someone removed from this app may still need sign-off there, or vice versa), so matching
// against our internal list produced wrong/missing results.
public class TimesheetApprovalService(ITimesheetApprovalFetcher fetcher) : ITimesheetApprovalService
{
    public async Task<TimesheetApprovalFetchResultDto> FetchOutstandingAsync(FetchTimesheetApprovalsRequest request)
    {
        var fetched = await fetcher.FetchAsync(request);
        var entries = fetched.Entries;

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

            result.Add(new TimesheetApprovalMemberDto(
                memberGroup.Key,
                entryDtos,
                violationCount
            ));
        }

        var weeklySummary = BuildWeeklySummary(entries, fetched.EmployeeNames, fetched.PresentDays, request);
        var teams = fetched.EmployeeTeams.Values.Distinct().OrderBy(t => t).ToList();

        return new TimesheetApprovalFetchResultDto(
            result.OrderBy(m => m.MemberName).ToList(),
            weeklySummary,
            teams,
            fetched.EmployeeTeams
        );
    }

    // For each Monday-Sunday week overlapping the requested range, totals each employee's hours
    // (per the external system's own roster) for that week, and flags them missing if any day
    // that's actually present in the response (PresentDays) has zero entries for them — a day
    // present with an empty entries array means nothing was captured; a day absent entirely means
    // it was already signed off elsewhere and isn't part of this dataset, so it's excluded rather
    // than counted as missing. If the integration isn't configured with DayDatePath (no
    // day-level data available), falls back to the cruder "0 hours that week = missing".
    // Weeks (or the trailing part of one) that haven't happened yet are skipped. Doesn't account
    // for leave/public holidays, so someone fully on leave for a present day will still show up.
    private static IReadOnlyList<WeeklyTimesheetSummaryDto> BuildWeeklySummary(
        IReadOnlyList<ImportedTimesheetEntry> entries, IReadOnlyList<string> employeeNames,
        IReadOnlyList<MemberDay> presentDays, FetchTimesheetApprovalsRequest request)
    {
        if (!DateOnly.TryParse(request.Start, out var rangeStart) || !DateOnly.TryParse(request.End, out var rangeEnd))
            return [];

        var today = DateOnly.FromDateTime(DateTimeOffset.UtcNow.Date);
        var entriesByNameLower = entries.GroupBy(e => e.MemberName.ToLower()).ToDictionary(g => g.Key, g => g.ToList());
        var loggedDatesByNameLower = entries.GroupBy(e => e.MemberName.ToLower()).ToDictionary(g => g.Key, g => g.Select(e => e.Date).ToHashSet());
        var presentDaysByNameLower = presentDays.GroupBy(d => d.MemberName.ToLower()).ToDictionary(g => g.Key, g => g.Select(d => d.Date).ToHashSet());
        var hasPresentDayData = presentDays.Count > 0;

        var weeks = new List<WeeklyTimesheetSummaryDto>();
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

            var hasWeekday = Enumerable.Range(0, clippedEnd.DayNumber - clippedStart.DayNumber + 1)
                .Select(clippedStart.AddDays)
                .Any(d => d.DayOfWeek is not DayOfWeek.Saturday and not DayOfWeek.Sunday);
            if (!hasWeekday) continue;

            var memberHours = employeeNames
                .Select(name => new MemberWeekHoursDto(
                    name,
                    entriesByNameLower.GetValueOrDefault(name.ToLower())?
                        .Where(e => e.Date >= clippedStart && e.Date <= clippedEnd)
                        .Sum(e => e.Hours + e.Minutes / 60m) ?? 0m))
                .OrderBy(m => m.Hours)
                .ThenBy(m => m.MemberName)
                .ToList();

            var missing = employeeNames
                .Where(name =>
                {
                    var nameLower = name.ToLower();
                    if (!hasPresentDayData)
                        return (entriesByNameLower.GetValueOrDefault(nameLower)?
                            .Where(e => e.Date >= clippedStart && e.Date <= clippedEnd)
                            .Sum(e => e.Hours + e.Minutes / 60m) ?? 0m) == 0m;

                    var present = presentDaysByNameLower.GetValueOrDefault(nameLower);
                    if (present is null) return false; // nothing outstanding for them this week
                    var logged = loggedDatesByNameLower.GetValueOrDefault(nameLower);
                    return present.Any(d => d >= clippedStart && d <= clippedEnd && (logged is null || !logged.Contains(d)));
                })
                .OrderBy(name => name)
                .ToList();

            weeks.Add(new WeeklyTimesheetSummaryDto(weekStart, weekEnd, memberHours, missing));
        }

        return weeks;
    }
}
