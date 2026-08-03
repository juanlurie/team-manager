namespace TeamManager.Api.Application.DTOs.TeamMember;

public enum RoleChangeOutcome
{
    Success,
    NotFound,
    /// <summary>Caller is not an Admin and tried to grant Admin, or to change an Admin's role.</summary>
    Forbidden,
    /// <summary>The change would leave the system with no Admin at all.</summary>
    LastAdmin
}

public record RoleChangeResult(RoleChangeOutcome Outcome, TeamMemberDto? Member = null)
{
    public static RoleChangeResult Ok(TeamMemberDto member) => new(RoleChangeOutcome.Success, member);
    public static readonly RoleChangeResult NotFound = new(RoleChangeOutcome.NotFound);
    public static readonly RoleChangeResult Forbidden = new(RoleChangeOutcome.Forbidden);
    public static readonly RoleChangeResult LastAdmin = new(RoleChangeOutcome.LastAdmin);
}
