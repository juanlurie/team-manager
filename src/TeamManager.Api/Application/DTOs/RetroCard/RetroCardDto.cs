namespace TeamManager.Api.Application.DTOs.RetroCard;

public record RetroCardDto
{
    public Guid Id { get; init; }
    public Guid SprintId { get; init; }
    public string Column { get; init; } = string.Empty;
    public string Text { get; init; } = string.Empty;
    public string AuthorName { get; init; } = string.Empty;
    public Guid? AuthorId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public int VoteCount { get; init; }
    public int MyVoteCount { get; init; }
}
