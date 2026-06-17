namespace TeamManager.Api.Application.DTOs;

public record ApiRequestConfigDto(
    Guid? Id = null,
    string Action = "",
    string Name = "",
    string? Description = null,
    bool Enabled = false,
    string Url = "",
    string Method = "POST",
    bool IsFormUrlEncoded = true,
    string BodyFormat = "urlencoded",
    Dictionary<string, string>? Headers = null,
    string BodyTemplate = "",
    MappingConfigDto? Mapping = null,
    Dictionary<string, string>? Parameters = null,
    string? StoredCookie = null,
    Dictionary<string, string>? SecretHeaders = null,
    int RetryCount = 0,
    SuccessCriteriaDto? SuccessCriteria = null,
    bool AutoSync = false
);

public record SuccessCriteriaDto(
    int? RequiredStatus = null,
    string? JsonPath = null,
    string? JsonValue = null
);

public record MappingConfigDto(
    string ArrayPath = "",
    string NamePath = "title",
    string StartPath = "start",
    string EndPath = "end",
    string TypePath = "type",
    string DaysPath = "totalDays",
    string StatusPath = "status",
    string NameTransform = "ExtractBeforeDash",
    string ExternalIdPath = "",
    // Project/category sync mapping
    string ProjectsPath = "",
    string ProjectNamePath = "",
    string ProjectIdPath = "",
    string ProjectCategoriesPath = "",
    string CategoryNamePath = "",
    string CategoryIdPath = "",
    // Response format: "json" (default) or "html"
    string ResponseFormat = "json",
    // For HTML responses: marker text before the JSON array, e.g. "new timesheet("
    string HtmlJsonMarker = "",
    // Regex to extract external employee ID from response, e.g. "employeeId:\s*(\d+)"
    string EmployeeIdPattern = "",
    // For AI chat actions: dot-separated path to the text string in the response
    string TextResponsePath = "",
    // For FetchCalendarEvents: calendar-specific mapping fields
    string SubjectPath = "subject",
    string IsAllDayPath = "isAllDay",
    string LocationPath = "location",
    // Extra project/category fields beyond the defaults above — label -> path
    // (relative to the project or category object). Extracted per project/category
    // and exposed as {label} template variables on AddTimesheetEntry, same as categoryId.
    Dictionary<string, string>? CustomFields = null
);
