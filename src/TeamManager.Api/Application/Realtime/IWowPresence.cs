namespace TeamManager.Api.Application.Realtime;

/// <summary>
/// Who is connected right now. Win of the Week's Quiz Duel gates on this (every tied nominee must be
/// online), so it needs to be substitutable in tests — otherwise eligibility can only be exercised
/// against a live socket server.
/// </summary>
public interface IWowPresence
{
    /// <summary>True when the member has at least one live connection.</summary>
    bool IsMemberConnected(Guid memberId);

    /// <summary>How many connections are joined to a session key (a week's guest token).</summary>
    int GetSessionCount(string sessionKey);
}
