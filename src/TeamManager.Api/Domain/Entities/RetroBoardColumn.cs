namespace TeamManager.Api.Domain.Entities;

/// <summary>A theme/category column on a RetroBoard (e.g. "What Went Well"). Editable and
/// ordered per session; notes reference it by id.</summary>
public class RetroBoardColumn
{
    public Guid Id { get; set; }
    public Guid RetroBoardSessionId { get; set; }

    /// <summary>Stable short key used by clients/carry-forward (e.g. "well", "better").</summary>
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Color { get; set; } = string.Empty;
    /// <summary>Icon identifier (e.g. "spark", "tri", "quest", "star").</summary>
    public string Icon { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public RetroBoardSession? Session { get; set; }
    public ICollection<RetroBoardNote> Notes { get; set; } = [];
}
