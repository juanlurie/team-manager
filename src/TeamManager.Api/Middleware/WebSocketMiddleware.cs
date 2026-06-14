using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace TeamManager.Api.Middleware;

public class WebSocketMiddleware
{
    private static readonly ConcurrentDictionary<Guid, (WebSocket Socket, Guid? MemberId)> _connections = new();
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
        _connections[connectionId] = (ws, memberId);
        _ = BroadcastAsync("presence_changed", new { connectedCount = GetConnectedMemberCount() }, guestAllowed: true);

        try
        {
            await WaitForClose(ws);
        }
        finally
        {
            _connections.TryRemove(connectionId, out _);
            _ = BroadcastAsync("presence_changed", new { connectedCount = GetConnectedMemberCount() }, guestAllowed: true);
        }
    }

    public static int GetConnectedMemberCount() =>
        _connections.Values.Count(c => c.MemberId.HasValue);

    public static int GetTotalConnectionCount() => _connections.Count;

    private static async Task WaitForClose(WebSocket ws)
    {
        var buffer = new byte[1024 * 4];
        try
        {
            while (ws.State == WebSocketState.Open)
            {
                var result = await ws.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
                if (result.MessageType == WebSocketMessageType.Close)
                    break;
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
                if (entry.Socket.State != WebSocketState.Open)
                {
                    dead.Add(id);
                    continue;
                }
                if (entry.MemberId == null && !guestAllowed)
                {
                    skipped++;
                    continue;
                }
                try
                {
                    await entry.Socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
                    sent++;
                }
                catch
                {
                    dead.Add(id);
                }
            }
            foreach (var id in dead)
                _connections.TryRemove(id, out _);
            _logger?.LogInformation("WS broadcast [{Type}] guestAllowed={GuestAllowed} total={Total} sent={Sent} skipped={Skipped} dead={Dead}",
                type, guestAllowed, _connections.Count, sent, skipped, dead.Count);
        }
        finally
        {
            _broadcastLock.Release();
        }
    }
}
