using TeamManager.Api.Application.Realtime;

namespace TeamManager.Api.Middleware;

/// <summary>
/// Default <see cref="IWowNotifier"/> implementation, publishing over <see cref="WebSocketMiddleware"/>.
/// Fire-and-forget, matching <see cref="RetroBroadcaster"/> — a dropped socket must never fail the
/// originating request.
/// </summary>
public sealed class WowNotifier : IWowNotifier
{
    public void Broadcast(string type, object data, bool guestAllowed = false) =>
        _ = WebSocketMiddleware.BroadcastAsync(type, data, guestAllowed);

    public void BroadcastToSession(string type, string sessionKey, object data) =>
        _ = WebSocketMiddleware.BroadcastToSessionAsync(type, sessionKey, data);
}
