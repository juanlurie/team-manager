using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace TeamManager.Api.Middleware;

public class WebSocketMiddleware
{
    private static readonly ConcurrentDictionary<string, WebSocket> _connections = new();
    private static readonly SemaphoreSlim _broadcastLock = new(1, 1);

    private readonly RequestDelegate _next;

    public WebSocketMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        if (!context.WebSockets.IsWebSocketRequest)
        {
            await _next(context);
            return;
        }

        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? context.User.FindFirst("sub")?.Value
            ?? "anonymous";

        var ws = await context.WebSockets.AcceptWebSocketAsync();
        _connections[userId] = ws;

        try
        {
            await WaitForClose(ws);
        }
        finally
        {
            _connections.TryRemove(userId, out _);
        }
    }

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

    public static async Task BroadcastAsync(string type, object data)
    {
        var message = JsonSerializer.Serialize(new { type, data });
        var bytes = Encoding.UTF8.GetBytes(message);

        await _broadcastLock.WaitAsync();
        try
        {
            var dead = new List<string>();
            foreach (var (id, ws) in _connections)
            {
                if (ws.State != WebSocketState.Open)
                {
                    dead.Add(id);
                    continue;
                }
                try
                {
                    await ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
                }
                catch
                {
                    dead.Add(id);
                }
            }
            foreach (var id in dead)
                _connections.TryRemove(id, out _);
        }
        finally
        {
            _broadcastLock.Release();
        }
    }
}
