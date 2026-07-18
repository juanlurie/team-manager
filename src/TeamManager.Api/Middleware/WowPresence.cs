using TeamManager.Api.Application.Realtime;

namespace TeamManager.Api.Middleware;

/// <summary>Default <see cref="IWowPresence"/> implementation, reading live connection state from
/// <see cref="WebSocketMiddleware"/>'s static registry.</summary>
public sealed class WowPresence : IWowPresence
{
    public bool IsMemberConnected(Guid memberId) => WebSocketMiddleware.IsMemberConnected(memberId);

    public int GetSessionCount(string sessionKey) => WebSocketMiddleware.GetSessionCount(sessionKey);
}
