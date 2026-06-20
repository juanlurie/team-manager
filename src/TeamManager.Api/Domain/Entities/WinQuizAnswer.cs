namespace TeamManager.Api.Domain.Entities;

public class WinQuizAnswer
{
    public Guid Id { get; set; }
    public Guid WinWeekId { get; set; }
    public Guid MemberId { get; set; }
    public int SelectedIndex { get; set; }
    public bool IsCorrect { get; set; }
    public DateTimeOffset AnsweredAt { get; set; } = DateTimeOffset.UtcNow;

    public WinWeek? WinWeek { get; set; }
}
