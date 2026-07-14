using TeamManager.Api.Application.Realtime;

namespace TeamManager.Api.Middleware;

/// <summary>
/// Default <see cref="IRetroBroadcaster"/> implementation that publishes over the WebSocket
/// presence group via <see cref="WebSocketMiddleware"/>. Fire-and-forget, matching the rest of
/// the realtime features — a dropped socket must never fail the originating request.
/// </summary>
public sealed class RetroBroadcaster : IRetroBroadcaster
{
    public void ToSession(Guid sessionId, string type, object? data = null) =>
        _ = WebSocketMiddleware.BroadcastToRetroSessionAsync(type, sessionId.ToString(), data ?? new { sessionId });

    public void Global(string type, object data, bool guestAllowed = false) =>
        _ = WebSocketMiddleware.BroadcastAsync(type, data, guestAllowed);
}
