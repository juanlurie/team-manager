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
    bool AutoSync = false,
    bool IsAiConnection = false
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
    // For FetchTimesheetApprovals: per-entry mapping fields (ArrayPath/ExternalIdPath above are reused).
    // ArrayPath is the top-level array (e.g. teams). EmployeesPath/DaysArrayPath/EntriesPath are each
    // optional and relative to the previous level, letting the response be nested arbitrarily deep
    // (Teams -> Employees -> Days -> TimesheetEntries) or left flat (a single array of entries) by
    // leaving the lower-level paths empty.
    string EmployeesPath = "",
    string DaysArrayPath = "",
    string EntriesPath = "",
    string MemberIdPath = "",
    string MemberNamePath = "employeeName",
    // Relative to the top-level item under ArrayPath (the team, not the employee) — lets the
    // approval screen offer a per-team include/exclude filter.
    string TeamNamePath = "",
    // Relative to the day object (one level up from each entry). A day appearing in the
    // response at all — even with an empty entries array — means it's still outstanding;
    // a day missing from the response entirely means it's already been signed off elsewhere
    // and isn't part of this dataset. Distinguishing those two needs the day's own date,
    // separate from DatePath (which is read off each entry).
    string DayDatePath = "",
    string DatePath = "date",
    string ProjectPath = "project",
    string CategoryPath = "category",
    string HoursPath = "hours",
    string MinutesPath = "minutes",
    string BillablePath = "billable",
    string WorkedFromPath = "workedFrom",
    string DescriptionPath = "description",
    string TicketNumberPath = "ticketNumber",
    // Extra project/category fields beyond the defaults above — label -> path
    // (relative to the project or category object). Extracted per project/category
    // and exposed as {label} template variables on AddTimesheetEntry, same as categoryId.
    Dictionary<string, string>? CustomFields = null
);
