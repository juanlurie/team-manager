using System.ComponentModel.DataAnnotations;

namespace TeamManager.Api.Domain.Entities;

public class ApiRequestConfig
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Action { get; set; } = "";
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public bool Enabled { get; set; }
    public string Url { get; set; } = "";
    public string Method { get; set; } = "POST";
    public bool IsFormUrlEncoded { get; set; }
    public string BodyFormat { get; set; } = "urlencoded";
    public string HeadersJson { get; set; } = "{}";
    public string BodyTemplate { get; set; } = "";
    public string MappingJson { get; set; } = "{}";
    public string ParametersJson { get; set; } = "{}";
    public string? StoredCookie { get; set; }
    public int RetryCount { get; set; } = 0;
    public string? SuccessCriteriaJson { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
