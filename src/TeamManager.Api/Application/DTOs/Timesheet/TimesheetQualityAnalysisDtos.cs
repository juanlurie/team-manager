namespace TeamManager.Api.Application.DTOs.Timesheet;

public record AnalyzeTimesheetQualityRequest(int LookbackDays = 90);

public record TimesheetQualityAnalysisDto(bool Configured, string? Analysis, string Status);

// Used by the Timesheet Approval screen to analyze exactly the people currently visible there
// (after team/needs-review filtering) — the caller already has the fetched entries in memory,
// so this takes the data directly instead of re-querying anything server-side.
public record QualityEntryInput(
    DateOnly Date, string Project, string Category, int Hours, int Minutes, bool Billable, string? Description
);

public record MemberQualityInput(string MemberName, decimal TotalHours, IReadOnlyList<QualityEntryInput> Entries);

public record AnalyzeApprovalQualityRequest(IReadOnlyList<MemberQualityInput> Members);
