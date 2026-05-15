namespace TeamManager.Api.Application.DTOs.LeaveRecord;

public class LeaveFetchConfig
{
    public bool Enabled { get; set; }
    public string Url { get; set; } = "";
    public string Method { get; set; } = "POST";
    public Dictionary<string, string> Headers { get; set; } = new();
    public string BodyTemplate { get; set; } = "";
    public bool IsFormUrlEncoded { get; set; }
    public MappingConfig Mapping { get; set; } = new();
}

public class MappingConfig
{
    public string NamePath { get; set; } = "title";
    public string StartPath { get; set; } = "start";
    public string EndPath { get; set; } = "end";
    public string TypePath { get; set; } = "type";
    public string DaysPath { get; set; } = "totalDays";
    public string StatusPath { get; set; } = "status";
    public string NameTransform { get; set; } = "ExtractBeforeDash";
}
