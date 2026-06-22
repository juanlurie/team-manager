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
    Guid? TeamMemberId,
    string MemberName,
    IReadOnlyList<TimesheetApprovalEntryDto> Entries,
    int ViolationCount
);

public record MissingTimesheetWeekDto(
    DateOnly WeekStart,
    DateOnly WeekEnd,
    IReadOnlyList<string> MissingMemberNames
);

public record TimesheetApprovalFetchResultDto(
    IReadOnlyList<TimesheetApprovalMemberDto> Members,
    IReadOnlyList<MissingTimesheetWeekDto> MissingByWeek
);
