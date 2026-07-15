namespace TeamManager.Api.Application.Realtime;

/// <summary>
/// Publishes RetroBoard realtime (<c>rb_*</c>) events. Abstracts the transport (the WebSocket
/// presence group) away from the Application layer so <see cref="Services.RetroBoardService"/>
/// has no compile-time dependency on the middleware and can be unit-tested without it.
/// </summary>
public interface IRetroBroadcaster
{
    /// <summary>Broadcast an event to everyone in a session's presence group. Fire-and-forget.</summary>
    void ToSession(Guid sessionId, string type, object? data = null);

    /// <summary>Broadcast a global event to all connected clients (e.g. session deletion). Fire-and-forget.</summary>
    void Global(string type, object data, bool guestAllowed = false);
}
