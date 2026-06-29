namespace TeamManager.Api.Domain.Entities;

public class RetroCardReaction
{
    public Guid Id { get; set; }
    public Guid CardId { get; set; }
    public Guid SprintId { get; set; }
    public Guid MemberId { get; set; }
    public string MemberName { get; set; } = string.Empty;
    public string Emoji { get; set; } = string.Empty;
}
