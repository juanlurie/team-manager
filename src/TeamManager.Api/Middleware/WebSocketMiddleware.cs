using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;

namespace TeamManager.Api.Middleware;

public class WebSocketMiddleware
{
    private sealed class ConnectionEntry
    {
        public required WebSocket Socket { get; init; }
        public Guid? MemberId { get; init; }
        public string? WowSession { get; set; }
        public string? RetroSessionId { get; set; }
        public string? RetroMemberName { get; set; }
        // Generic room for board-style features that don't need retro's presence/member-name
        // tracking (process flows, and personal maps once built) -- kept separate from
        // RetroSessionId rather than generalizing that field, so retro's presence semantics don't
        // have to be threaded through every future board type.
        public string? BoardSessionId { get; set; }
    }

    private static readonly ConcurrentDictionary<Guid, ConnectionEntry> _connections = new();
    private static readonly SemaphoreSlim _broadcastLock = new(1, 1);
    private static readonly TimeSpan SendTimeout = TimeSpan.FromSeconds(5);
    private static ILogger? _logger;

    // Every outgoing broadcast carries a strictly-increasing sequence number. A single WebSocket
    // already delivers messages in order, so this isn't about reordering the socket -- it lets a
    // client dedupe/discard anything it has already applied (e.g. an event that also landed in a
    // post-reconnect snapshot refetch) and reject a stale straggler, without a DB schema change.
    // It's an in-memory counter because delivery itself is in-memory per instance (see _connections):
    // a broadcast only ever reaches sockets on the same process, so that process's counter is the
    // single ordering authority for every client it serves. (A multi-replica deployment would need
    // a shared backplane -- e.g. Redis pub/sub -- for cross-instance delivery *and* ordering; that
    // is a separate, larger change and is called out in the PR.)
    private static long _seq;

    private static readonly JsonSerializerOptions WsJson = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    // Single place every send goes through: stamps the envelope with the next seq and serializes
    // camelCase so DTO payloads (e.g. a card object) match the frontend's field names.
    private static byte[] Envelope(string type, object data)
    {
        var seq = Interlocked.Increment(ref _seq);
        return Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new { type, seq, data }, WsJson));
    }

    // All three broadcast methods below serialize through the single _broadcastLock, so a send
    // that never completes -- e.g. a phone whose screen locked or a laptop that slept, where the
    // OS never told us the socket closed and WebSocketState still reads Open -- would hold that
    // lock forever and silently freeze every real-time update for every user until the process
    // restarted. Bounding each send lets a stale peer get pruned instead of wedging the lock.
    private static async Task<bool> TrySendAsync(WebSocket socket, byte[] bytes)
    {
        using var cts = new CancellationTokenSource(SendTimeout);
        try
        {
            await socket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, cts.Token);
            return true;
        }
        catch
        {
            return false;
        }
    }

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
        _connections[connectionId] = new ConnectionEntry { Socket = ws, MemberId = memberId };

        try
        {
            await ListenAsync(ws, connectionId);
        }
        finally
        {
            _connections.TryRemove(connectionId, out var removed);
            if (removed?.WowSession != null)
                _ = BroadcastToSessionAsync("presence_changed", removed.WowSession, new { connectedCount = GetSessionCount(removed.WowSession) });
            if (removed?.RetroSessionId != null)
                _ = BroadcastRetroPresenceAsync(removed.RetroSessionId);
        }
    }

    public static int GetSessionCount(string sessionKey) =>
        _connections.Values.Count(c => c.WowSession == sessionKey);

    public static int GetConnectedMemberCount() =>
        _connections.Values.Count(c => c.MemberId.HasValue);

    public static int GetTotalConnectionCount() => _connections.Count;

    public static bool IsMemberConnected(Guid memberId) =>
        _connections.Values.Any(c => c.MemberId == memberId);

    public static List<(Guid MemberId, string MemberName)> GetRetroPresence(string sessionId) =>
        _connections.Values
            .Where(c => c.RetroSessionId == sessionId && c.MemberId.HasValue && c.RetroMemberName != null)
            .GroupBy(c => c.MemberId!.Value)
            .Select(g => (g.Key, g.First().RetroMemberName!))
            .ToList();

    private static async Task BroadcastRetroPresenceAsync(string sessionId)
    {
        var members = GetRetroPresence(sessionId)
            .Select(m => new { memberId = m.MemberId, memberName = m.MemberName })
            .ToList();
        await BroadcastToRetroSessionAsync("fun_retro_presence", sessionId,
            new { sessionId, members });
    }

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

            switch (typeProp.GetString())
            {
                case "ping":
                {
                    // Client liveness probe -- reply on this socket only so the client can tell a
                    // live connection from a zombie one (TCP dead but no close ever delivered).
                    if (_connections.TryGetValue(connectionId, out var entry))
                        _ = SendToSocketAsync(entry.Socket, "pong", new { });
                    break;
                }

                case "join_wow":
                {
                    if (!root.TryGetProperty("sessionKey", out var keyProp)) return;
                    var sessionKey = keyProp.GetString();
                    if (string.IsNullOrEmpty(sessionKey)) return;

                    if (!_connections.TryGetValue(connectionId, out var entry)) return;
                    var oldSession = entry.WowSession;
                    entry.WowSession = sessionKey;

                    if (oldSession != null && oldSession != sessionKey)
                        _ = BroadcastToSessionAsync("presence_changed", oldSession, new { connectedCount = GetSessionCount(oldSession) });
                    _ = BroadcastToSessionAsync("presence_changed", sessionKey, new { connectedCount = GetSessionCount(sessionKey) });
                    break;
                }

                case "join_retro":
                {
                    if (!root.TryGetProperty("sessionId", out var sidProp)) return;
                    var sessionId = sidProp.GetString();
                    if (string.IsNullOrEmpty(sessionId)) return;
                    var memberName = root.TryGetProperty("memberName", out var nameProp) ? nameProp.GetString() : null;

                    if (!_connections.TryGetValue(connectionId, out var entry)) return;
                    var oldRetro = entry.RetroSessionId;
                    entry.RetroSessionId = sessionId;
                    entry.RetroMemberName = memberName;

                    if (oldRetro != null && oldRetro != sessionId)
                        _ = BroadcastRetroPresenceAsync(oldRetro);
                    _ = BroadcastRetroPresenceAsync(sessionId);
                    break;
                }

                case "leave_retro":
                {
                    if (!_connections.TryGetValue(connectionId, out var entry)) return;
                    var oldRetro = entry.RetroSessionId;
                    entry.RetroSessionId = null;
                    entry.RetroMemberName = null;
                    if (oldRetro != null)
                        _ = BroadcastRetroPresenceAsync(oldRetro);
                    break;
                }

                case "join_board":
                {
                    if (!root.TryGetProperty("sessionId", out var boardSidProp)) return;
                    var boardSessionId = boardSidProp.GetString();
                    if (string.IsNullOrEmpty(boardSessionId)) return;
                    if (!_connections.TryGetValue(connectionId, out var boardEntry)) return;
                    boardEntry.BoardSessionId = boardSessionId;
                    break;
                }

                case "leave_board":
                {
                    if (!_connections.TryGetValue(connectionId, out var boardEntry)) return;
                    boardEntry.BoardSessionId = null;
                    break;
                }
            }
        }
        catch { }
    }

    // Targeted single-socket send (e.g. a pong). Goes through the same _broadcastLock as the
    // broadcasts: WebSocket.SendAsync is not safe to call concurrently on one socket, so a pong
    // racing a broadcast to the same peer could interleave frames and corrupt the stream.
    private static async Task SendToSocketAsync(WebSocket socket, string type, object data)
    {
        var bytes = Envelope(type, data);
        await _broadcastLock.WaitAsync();
        try
        {
            if (socket.State == WebSocketState.Open)
                await TrySendAsync(socket, bytes);
        }
        finally { _broadcastLock.Release(); }
    }

    public static async Task BroadcastToRetroSessionAsync(string type, string sessionId, object data)
    {
        await _broadcastLock.WaitAsync();
        try
        {
            // Assign the seq inside the lock so seq order == on-the-wire send order. Assigning it
            // before the lock would let a broadcast with a higher seq win the lock and be sent
            // first, making a client drop the lower-seq one that arrives second as "stale".
            var bytes = Envelope(type, data);
            var dead = new List<Guid>();
            foreach (var (id, entry) in _connections)
            {
                if (entry.RetroSessionId != sessionId) continue;
                if (entry.Socket.State != WebSocketState.Open) { dead.Add(id); continue; }
                if (!await TrySendAsync(entry.Socket, bytes)) dead.Add(id);
            }
            foreach (var id in dead) _connections.TryRemove(id, out _);
        }
        finally { _broadcastLock.Release(); }
    }

    // Generic room broadcast for board-style features (process flows, personal maps) -- same
    // shape as BroadcastToRetroSessionAsync but keyed on BoardSessionId, so a new board type never
    // needs another copy of this method or another WS message pair.
    public static async Task BroadcastToBoardSessionAsync(string type, string sessionId, object data)
    {
        await _broadcastLock.WaitAsync();
        try
        {
            var bytes = Envelope(type, data);
            var dead = new List<Guid>();
            foreach (var (id, entry) in _connections)
            {
                if (entry.BoardSessionId != sessionId) continue;
                if (entry.Socket.State != WebSocketState.Open) { dead.Add(id); continue; }
                if (!await TrySendAsync(entry.Socket, bytes)) dead.Add(id);
            }
            foreach (var id in dead) _connections.TryRemove(id, out _);
        }
        finally { _broadcastLock.Release(); }
    }

    public static async Task BroadcastToSessionAsync(string type, string sessionKey, object data)
    {
        await _broadcastLock.WaitAsync();
        try
        {
            // Assign the seq inside the lock so seq order == on-the-wire send order. Assigning it
            // before the lock would let a broadcast with a higher seq win the lock and be sent
            // first, making a client drop the lower-seq one that arrives second as "stale".
            var bytes = Envelope(type, data);
            var dead = new List<Guid>();
            foreach (var (id, entry) in _connections)
            {
                if (entry.WowSession != sessionKey) continue;
                if (entry.Socket.State != WebSocketState.Open) { dead.Add(id); continue; }
                if (!await TrySendAsync(entry.Socket, bytes)) dead.Add(id);
            }
            foreach (var id in dead) _connections.TryRemove(id, out _);
        }
        finally { _broadcastLock.Release(); }
    }

    public static async Task BroadcastAsync(string type, object data, bool guestAllowed = false)
    {
        await _broadcastLock.WaitAsync();
        try
        {
            // Assign the seq inside the lock so seq order == on-the-wire send order. Assigning it
            // before the lock would let a broadcast with a higher seq win the lock and be sent
            // first, making a client drop the lower-seq one that arrives second as "stale".
            var bytes = Envelope(type, data);
            var dead = new List<Guid>();
            var sent = 0;
            var skipped = 0;
            foreach (var (id, entry) in _connections)
            {
                if (entry.Socket.State != WebSocketState.Open) { dead.Add(id); continue; }
                if (entry.MemberId == null && !guestAllowed) { skipped++; continue; }
                if (await TrySendAsync(entry.Socket, bytes)) sent++;
                else dead.Add(id);
            }
            foreach (var id in dead) _connections.TryRemove(id, out _);
            _logger?.LogInformation("WS broadcast [{Type}] guestAllowed={GuestAllowed} total={Total} sent={Sent} skipped={Skipped} dead={Dead}",
                type, guestAllowed, _connections.Count, sent, skipped, dead.Count);
        }
        finally { _broadcastLock.Release(); }
    }
}
