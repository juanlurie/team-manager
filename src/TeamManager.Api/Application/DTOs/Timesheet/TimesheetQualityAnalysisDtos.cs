namespace TeamManager.Api.Application.DTOs.Timesheet;

public record AnalyzeTimesheetQualityRequest(int LookbackDays = 90);

public record TimesheetQualityAnalysisDto(bool Configured, string? Analysis, string Status);
