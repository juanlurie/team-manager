using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace TeamManager.Api.Middleware;

public class WebSocketMiddleware
{
    private static readonly ConcurrentDictionary<Guid, (WebSocket Socket, Guid? MemberId, string? WowSession)> _connections = new();
    private static readonly SemaphoreSlim _broadcastLock = new(1, 1);
    private static ILogger? _logger;

    private readonly RequestDelegate _next;

    public WebSocketMiddleware(RequestDelegate next, ILogger<WebSocketMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.WebSockets.IsWebSocketRequest)
        {
            await _next(context);
            return;
        }

        Guid? memberId = null;
        if (Guid.TryParse(context.User.FindFirst("TMID")?.Value, out var parsedId))
            memberId = parsedId;

        var connectionId = Guid.NewGuid();
        var ws = await context.WebSockets.AcceptWebSocketAsync();
        _connections[connectionId] = (ws, memberId, null);

        try
        {
            await ListenAsync(ws, connectionId);
        }
        finally
        {
            _connections.TryRemove(connectionId, out var removed);
            if (removed.WowSession != null)
                _ = BroadcastToSessionAsync("presence_changed", removed.WowSession, new { connectedCount = GetSessionCount(removed.WowSession) });
        }
    }

    public static int GetSessionCount(string sessionKey) =>
        _connections.Values.Count(c => c.WowSession == sessionKey);

    public static int GetConnectedMemberCount() =>
        _connections.Values.Count(c => c.MemberId.HasValue);

    public static int GetTotalConnectionCount() => _connections.Count;

    public static bool IsMemberConnected(Guid memberId) =>
        _connections.Values.Any(c => c.MemberId == memberId);

    private static async Task ListenAsync(WebSocket ws, Guid connectionId)
    {
        var buffer = new byte[1024 * 4];
        try
        {
            while (ws.State == WebSocketState.Open)
            {
                var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                if (result.MessageType == WebSocketMessageType.Close)
                    break;

                if (result.MessageType == WebSocketMessageType.Text)
                {
                    var text = Encoding.UTF8.GetString(buffer, 0, result.Count);
                    HandleClientMessage(connectionId, text);
                }
            }
        }
        catch
        {
            // Connection dropped
        }
        finally
        {
            if (ws.State is WebSocketState.Open or WebSocketState.CloseReceived)
                await ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closing", CancellationToken.None);
        }
    }

    private static void HandleClientMessage(Guid connectionId, string text)
    {
        try
        {
            using var doc = JsonDocument.Parse(text);
            var root = doc.RootElement;
            if (!root.TryGetProperty("type", out var typeProp)) return;

            if (typeProp.GetString() == "join_wow")
            {
                if (!root.TryGetProperty("sessionKey", out var keyProp)) return;
                var sessionKey = keyProp.GetString();
                if (string.IsNullOrEmpty(sessionKey)) return;

                if (_connections.TryGetValue(connectionId, out var entry))
                {
                    var oldSession = entry.WowSession;
                    _connections[connectionId] = (entry.Socket, entry.MemberId, sessionKey);

                    // Notify the old session someone left
                    if (oldSession != null && oldSession != sessionKey)
                        _ = BroadcastToSessionAsync("presence_changed", oldSession, new { connectedCount = GetSessionCount(oldSession) });

                    // Notify the new session someone joined
                    _ = BroadcastToSessionAsync("presence_changed", sessionKey, new { connectedCount = GetSessionCount(sessionKey) });
                }
            }
        }
        catch { }
    }

    public static async Task BroadcastToSessionAsync(string type, string sessionKey, object data)
    {
        var message = JsonSerializer.Serialize(new { type, data });
        var bytes = Encoding.UTF8.GetBytes(message);

        await _broadcastLock.WaitAsync();
        try
        {
            var dead = new List<Guid>();
            foreach (var (id, entry) in _connections)
            {
                if (entry.WowSession != sessionKey) continue;
                if (entry.Socket.State != WebSocketState.Open) { dead.Add(id); continue; }
                try { await entry.Socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None); }
                catch { dead.Add(id); }
            }
            foreach (var id in dead) _connections.TryRemove(id, out _);
        }
        finally { _broadcastLock.Release(); }
    }

    public static async Task BroadcastAsync(string type, object data, bool guestAllowed = false)
    {
        var message = JsonSerializer.Serialize(new { type, data });
        var bytes = Encoding.UTF8.GetBytes(message);

        await _broadcastLock.WaitAsync();
        try
        {
            var dead = new List<Guid>();
            var sent = 0;
            var skipped = 0;
            foreach (var (id, entry) in _connections)
            {
                if (entry.Socket.State != WebSocketState.Open) { dead.Add(id); continue; }
                if (entry.MemberId == null && !guestAllowed) { skipped++; continue; }
                try
                {
                    await entry.Socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
                    sent++;
                }
                catch { dead.Add(id); }
            }
            foreach (var id in dead) _connections.TryRemove(id, out _);
            _logger?.LogInformation("WS broadcast [{Type}] guestAllowed={GuestAllowed} total={Total} sent={Sent} skipped={Skipped} dead={Dead}",
                type, guestAllowed, _connections.Count, sent, skipped, dead.Count);
        }
        finally { _broadcastLock.Release(); }
    }
}
