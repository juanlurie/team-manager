using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Application.DTOs.Timesheet;

public record TimesheetConfigDto(
    string[] ExtraProjects,
    Dictionary<string, string[]> ExtraCategories,
    QuickActionConfigDto[] QuickActions,
    string[] WorkLocationOptions,
    string[] BillableProjects,
    Dictionary<string, string> WorkWeek,
    bool MergeEntriesEnabled,
    Dictionary<string, string> LocationIcons,
    Dictionary<string, string> CategoryCorrelationIds,
    string? ExternalEmployeeId = null,
    Dictionary<string, string>? WorkLocationCorrelationIds = null,
    bool DeduplicatePendingEditSync = false
);

public record QuickActionConfigDto(
    string Label,
    string Project,
    string Category,
    string? Note,
    int? DurationMins,
    string Color,
    string Bg
);

public record UpsertTimesheetConfigRequest(
    string[]? ExtraProjects,
    Dictionary<string, string[]>? ExtraCategories,
    QuickActionConfigRequest[]? QuickActions,
    string[]? WorkLocationOptions,
    string[]? BillableProjects,
    Dictionary<string, string>? WorkWeek,
    bool? MergeEntriesEnabled,
    Dictionary<string, string>? LocationIcons,
    Dictionary<string, string>? CategoryCorrelationIds = null,
    string? ExternalEmployeeId = null,
    Dictionary<string, string>? WorkLocationCorrelationIds = null,
    bool? DeduplicatePendingEditSync = null
);

public record QuickActionConfigRequest(
    [Required][MaxLength(50)] string Label,
    [Required][MaxLength(200)] string Project,
    [Required][MaxLength(200)] string Category,
    [MaxLength(500)] string? Note,
    [Range(1, 1440)] int? DurationMins,
    [Required][MaxLength(20)] string Color,
    [Required][MaxLength(50)] string Bg
);
