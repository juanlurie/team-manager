namespace TeamManager.Api.Application.Realtime;

/// <summary>
/// Publishes Win of the Week realtime events. Mirrors <see cref="IRetroBroadcaster"/>: it abstracts
/// the WebSocket transport away from the Application layer so <see cref="Services.WinOfTheWeekService"/>
/// and <see cref="Services.GuestWinOfTheWeekService"/> have no compile-time dependency on the
/// middleware and can be unit-tested without a live socket server.
///
/// Kept separate from IRetroBroadcaster because WoW addresses sessions by string token (a week's
/// guest token) where retro uses a session Guid.
/// </summary>
public interface IWowNotifier
{
    /// <summary>Broadcast to all connected clients. Fire-and-forget.</summary>
    /// <param name="guestAllowed">When true, guest (non-member) connections receive it too.</param>
    void Broadcast(string type, object data, bool guestAllowed = false);

    /// <summary>Broadcast to everyone joined to a session key (a week's guest token). Fire-and-forget.</summary>
    void BroadcastToSession(string type, string sessionKey, object data);
}
