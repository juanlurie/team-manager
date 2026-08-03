namespace TeamManager.Api.Application.DTOs.Squad;

public enum SquadSaveOutcome
{
    Success,
    NotFound,
    /// <summary>
    /// The requested TeamId does not exist. Without this the id reached the FK and surfaced as a
    /// 500 rather than a 400 -- the caller's mistake reported as the server's.
    /// </summary>
    TeamNotFound
}

public record SquadSaveResult(SquadSaveOutcome Outcome, SquadDto? Squad = null)
{
    public static SquadSaveResult Ok(SquadDto squad) => new(SquadSaveOutcome.Success, squad);
    public static readonly SquadSaveResult NotFound = new(SquadSaveOutcome.NotFound);
    public static readonly SquadSaveResult TeamNotFound = new(SquadSaveOutcome.TeamNotFound);
}
