using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.Timesheet;

public record FetchTimesheetApprovalsRequest(
    // Optional — falls back to the integration's stored cookie (captured via the browser
    // extension) when blank, same as other sync-queue-backed actions. Not length-limited:
    // real session cookies routinely exceed a couple thousand characters.
    string? Cookie,
    [Required][MaxLength(10)] string Start,
    [Required][MaxLength(10)] string End,
    // Named credentials (e.g. {entelectCookie}) referenced in the config's URL/headers/body —
    // same mechanism ApiSyncController uses, since configs aren't limited to the generic
    // {cookie} placeholder.
    Dictionary<string, string>? Credentials = null
);

// Everything the fetcher pulled from the external system for the period — EmployeeNames is the
// full roster encountered while walking Teams/Employees, independent of whether each employee
// logged any entries, so "missing timesheet" checks can be done from the source data itself
// rather than cross-referencing our own TeamMembers table.
//
// PresentDays is every (member, date) pair where a day object appeared in the response at all,
// regardless of whether its entries array was empty. A day that's simply absent from the
// response was already signed off elsewhere and isn't part of this dataset — only a day that's
// present with zero entries represents a genuine gap (nothing captured).
// EmployeeTeams maps a member's name to their team (only for members whose team name could be
// read off the response) — lets the approval screen filter out whole teams client-side.
public record TimesheetFetchResult(
    IReadOnlyList<ImportedTimesheetEntry> Entries,
    IReadOnlyList<string> EmployeeNames,
    IReadOnlyList<MemberDay> PresentDays,
    IReadOnlyDictionary<string, string> EmployeeTeams
);

public record MemberDay(string MemberName, DateOnly Date);

public record ImportedTimesheetEntry(
    string MemberName,
    DateOnly Date,
    string Project,
    string Category,
    int Hours,
    int Minutes,
    bool Billable,
    string WorkedFrom,
    string? Description,
    string? TicketNumber,
    string? ExternalId
);

public record TimesheetApprovalEntryDto(
    DateOnly Date,
    string Project,
    string Category,
    int Hours,
    int Minutes,
    bool Billable,
    string WorkedFrom,
    string? Description,
    string? TicketNumber,
    string? ExternalId,
    IReadOnlyList<string> Violations
);

public record TimesheetApprovalMemberDto(
    string MemberName,
    IReadOnlyList<TimesheetApprovalEntryDto> Entries,
    int ViolationCount
);

public record MemberWeekHoursDto(string MemberName, decimal Hours);

public record WeeklyTimesheetSummaryDto(
    DateOnly WeekStart,
    DateOnly WeekEnd,
    // Every employee in the external roster, with their total hours for the week (0 if missing),
    // sorted lowest hours first so gaps surface at the top.
    IReadOnlyList<MemberWeekHoursDto> MemberHours,
    IReadOnlyList<string> MissingMemberNames
);

public record TimesheetApprovalFetchResultDto(
    IReadOnlyList<TimesheetApprovalMemberDto> Members,
    IReadOnlyList<WeeklyTimesheetSummaryDto> WeeklySummary,
    IReadOnlyList<string> Teams,
    IReadOnlyDictionary<string, string> MemberTeams
);
