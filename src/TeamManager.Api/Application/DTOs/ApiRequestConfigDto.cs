namespace TeamManager.Api.Application.DTOs;

public record ApiRequestConfigDto(
    Guid? Id = null,
    string Name = "",
    string? Description = null,
    bool Enabled = false,
    string Url = "",
    string Method = "POST",
    bool IsFormUrlEncoded = true,
    Dictionary<string, string>? Headers = null,
    string BodyTemplate = "",
    MappingConfigDto? Mapping = null
);

public record MappingConfigDto(
    string ArrayPath = "",
    string NamePath = "title",
    string StartPath = "start",
    string EndPath = "end",
    string TypePath = "type",
    string DaysPath = "totalDays",
    string StatusPath = "status",
    string NameTransform = "ExtractBeforeDash"
);
