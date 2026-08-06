namespace TeamManager.Api.Application.DTOs.Team;

public enum TeamSaveOutcome
{
    Success,
    NotFound,
    /// <summary>Another team already uses this name (Team.Name carries a unique index).</summary>
    DuplicateName
}

public record TeamSaveResult(TeamSaveOutcome Outcome, TeamDto? Team = null)
{
    public static TeamSaveResult Ok(TeamDto team) => new(TeamSaveOutcome.Success, team);
    public static readonly TeamSaveResult NotFound = new(TeamSaveOutcome.NotFound);
    public static readonly TeamSaveResult DuplicateName = new(TeamSaveOutcome.DuplicateName);
}
