namespace TeamManager.Api.Domain.Entities;

/// <summary>One member's rating of a check-in question. Rating is better|same|worse|na.</summary>
public class FunRetroCheckinResponse
{
    public Guid Id { get; set; }
    public Guid QuestionId { get; set; }
    public Guid MemberId { get; set; }
    public string Rating { get; set; } = "na";

    public FunRetroCheckinQuestion Question { get; set; } = null!;
}
