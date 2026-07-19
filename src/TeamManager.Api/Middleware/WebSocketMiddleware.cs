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

        // The rooms this connection is currently subscribed to, as a set of opaque namespaced
        // keys (e.g. "retro:{id}", "wow:{key}", "board:{id}"). Session-platform primitive: one
        // generic room model replaces the per-feature slots this used to carry (RetroSessionId /
        // WowSession / BoardSessionId), so a new realtime feature never needs another field here.
        // Concurrent because a broadcast on another thread reads it while this connection's own
        // receive loop mutates it. See docs/session-platform.md.
        public ConcurrentDictionary<string, byte> Rooms { get; } = new();

        // Display name for member-presence rooms (retro's "who's here" list). Only rooms that opt
        // into member presence read it; count-only rooms (wow) and silent rooms (board) ignore it.
        public string? DisplayName { get; set; }
    }

    // Room-key namespaces. Keeping each feature's keys prefixed means two features can use the same
    // underlying id without their sockets colliding in one shared room.
    private const string WowPrefix = "wow:";
    private const string RetroPrefix = "retro:";
    private const string BoardPrefix = "board:";
    private static string WowRoom(string key) => WowPrefix + key;
    private static string RetroRoom(string id) => RetroPrefix + id;
    private static string BoardRoom(string id) => BoardPrefix + id;

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

    // All sends below serialize through the single _broadcastLock, so a send that never completes --
    // e.g. a phone whose screen locked or a laptop that slept, where the OS never told us the socket
    // closed and WebSocketState still reads Open -- would hold that lock forever and silently freeze
    // every real-time update for every user until the process restarted. Bounding each send lets a
    // stale peer get pruned instead of wedging the lock.
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
            // Re-emit presence for every room this connection was in so the people still there see
            // it leave. Removal happened above, so the counts/members below already exclude it.
            if (removed != null)
            {
                foreach (var room in removed.Rooms.Keys)
                {
                    if (room.StartsWith(WowPrefix, StringComparison.Ordinal))
                        _ = BroadcastToRoomAsync("presence_changed", room, new { connectedCount = RoomCount(room) });
                    else if (room.StartsWith(RetroPrefix, StringComparison.Ordinal))
                        _ = BroadcastRetroPresenceAsync(room[RetroPrefix.Length..]);
                    // board + generic rooms carry no presence
                }
            }
        }
    }

    // ---- Room membership queries ----

    public static int RoomCount(string roomKey) =>
        _connections.Values.Count(c => c.Rooms.ContainsKey(roomKey));

    public static int GetSessionCount(string sessionKey) => RoomCount(WowRoom(sessionKey));

    public static int GetConnectedMemberCount() =>
        _connections.Values.Count(c => c.MemberId.HasValue);

    public static int GetTotalConnectionCount() => _connections.Count;

    public static bool IsMemberConnected(Guid memberId) =>
        _connections.Values.Any(c => c.MemberId == memberId);

    // Distinct signed-in members present in a room, with the display name they joined under. Used by
    // any room that shows a "who's here" list (retro today).
    public static List<(Guid MemberId, string MemberName)> RoomMembers(string roomKey) =>
        _connections.Values
            .Where(c => c.Rooms.ContainsKey(roomKey) && c.MemberId.HasValue && c.DisplayName != null)
            .GroupBy(c => c.MemberId!.Value)
            .Select(g => (g.Key, g.First().DisplayName!))
            .ToList();

    public static List<(Guid MemberId, string MemberName)> GetRetroPresence(string sessionId) =>
        RoomMembers(RetroRoom(sessionId));

    private static async Task BroadcastRetroPresenceAsync(string sessionId)
    {
        var members = RoomMembers(RetroRoom(sessionId))
            .Select(m => new { memberId = m.MemberId, memberName = m.MemberName })
            .ToList();
        await BroadcastToRoomAsync("fun_retro_presence", RetroRoom(sessionId),
            new { sessionId, members });
    }

    // Drop every room this connection holds under a prefix (except one to keep), returning the last
    // one removed so the caller can re-emit its presence. Enforces the "one room per feature per
    // connection" invariant that join_wow / join_retro / join_board rely on.
    private static string? RemoveRoomsWithPrefix(ConnectionEntry entry, string prefix, string? keep)
    {
        string? removed = null;
        foreach (var key in entry.Rooms.Keys)
        {
            if (!key.StartsWith(prefix, StringComparison.Ordinal) || key == keep) continue;
            if (entry.Rooms.TryRemove(key, out _)) removed = key;
        }
        return removed;
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

                // Generic room join/leave -- the session-platform primitive. A new realtime feature
                // sends { type: "join_room", room: "myfeature:{id}" } and broadcasts via
                // BroadcastToRoomAsync; it never needs a bespoke case here. The feature-specific
                // handlers below predate this and stay as-is because they also drive presence events.
                case "join_room":
                {
                    if (!root.TryGetProperty("room", out var roomProp)) return;
                    var room = roomProp.GetString();
                    if (string.IsNullOrEmpty(room)) return;
                    if (!_connections.TryGetValue(connectionId, out var entry)) return;
                    entry.Rooms[room] = 1;
                    if (root.TryGetProperty("displayName", out var dnProp))
                        entry.DisplayName = dnProp.GetString();
                    break;
                }

                case "leave_room":
                {
                    if (!root.TryGetProperty("room", out var roomProp)) return;
                    var room = roomProp.GetString();
                    if (string.IsNullOrEmpty(room)) return;
                    LeaveRoom(connectionId, room);
                    break;
                }

                case "join_wow":
                {
                    if (!root.TryGetProperty("sessionKey", out var keyProp)) return;
                    var sessionKey = keyProp.GetString();
                    if (string.IsNullOrEmpty(sessionKey)) return;

                    if (!_connections.TryGetValue(connectionId, out var entry)) return;
                    var newRoom = WowRoom(sessionKey);
                    var oldRoom = RemoveRoomsWithPrefix(entry, WowPrefix, keep: newRoom);
                    entry.Rooms[newRoom] = 1;

                    if (oldRoom != null)
                        _ = BroadcastToRoomAsync("presence_changed", oldRoom, new { connectedCount = RoomCount(oldRoom) });
                    _ = BroadcastToRoomAsync("presence_changed", newRoom, new { connectedCount = RoomCount(newRoom) });
                    break;
                }

                case "join_retro":
                {
                    if (!root.TryGetProperty("sessionId", out var sidProp)) return;
                    var sessionId = sidProp.GetString();
                    if (string.IsNullOrEmpty(sessionId)) return;
                    var memberName = root.TryGetProperty("memberName", out var nameProp) ? nameProp.GetString() : null;

                    if (!_connections.TryGetValue(connectionId, out var entry)) return;
                    var newRoom = RetroRoom(sessionId);
                    var oldRoom = RemoveRoomsWithPrefix(entry, RetroPrefix, keep: newRoom);
                    entry.Rooms[newRoom] = 1;
                    entry.DisplayName = memberName;

                    if (oldRoom != null)
                        _ = BroadcastRetroPresenceAsync(oldRoom[RetroPrefix.Length..]);
                    _ = BroadcastRetroPresenceAsync(sessionId);
                    break;
                }

                case "leave_retro":
                {
                    if (!_connections.TryGetValue(connectionId, out var entry)) return;
                    var oldRoom = RemoveRoomsWithPrefix(entry, RetroPrefix, keep: null);
                    entry.DisplayName = null;
                    if (oldRoom != null)
                        _ = BroadcastRetroPresenceAsync(oldRoom[RetroPrefix.Length..]);
                    break;
                }

                case "join_board":
                {
                    if (!root.TryGetProperty("sessionId", out var boardSidProp)) return;
                    var boardSessionId = boardSidProp.GetString();
                    if (string.IsNullOrEmpty(boardSessionId)) return;
                    if (!_connections.TryGetValue(connectionId, out var entry)) return;
                    var newRoom = BoardRoom(boardSessionId);
                    RemoveRoomsWithPrefix(entry, BoardPrefix, keep: newRoom);
                    entry.Rooms[newRoom] = 1;
                    break;
                }

                case "leave_board":
                {
                    if (!_connections.TryGetValue(connectionId, out var entry)) return;
                    RemoveRoomsWithPrefix(entry, BoardPrefix, keep: null);
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

    // ---- Room membership mutation + fan-out (session-platform primitive) ----

    public static void JoinRoom(Guid connectionId, string roomKey)
    {
        if (_connections.TryGetValue(connectionId, out var entry)) entry.Rooms[roomKey] = 1;
    }

    public static void LeaveRoom(Guid connectionId, string roomKey)
    {
        if (_connections.TryGetValue(connectionId, out var entry)) entry.Rooms.TryRemove(roomKey, out _);
    }

    // The single room fan-out. Every session-scoped broadcast in the app routes through here; the
    // three feature-named methods below are thin back-compat adapters that only namespace the key.
    public static async Task BroadcastToRoomAsync(string type, string roomKey, object data)
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
                if (!entry.Rooms.ContainsKey(roomKey)) continue;
                if (entry.Socket.State != WebSocketState.Open) { dead.Add(id); continue; }
                if (!await TrySendAsync(entry.Socket, bytes)) dead.Add(id);
            }
            foreach (var id in dead) _connections.TryRemove(id, out _);
        }
        finally { _broadcastLock.Release(); }
    }

    // Back-compat adapters over BroadcastToRoomAsync. New features should call BroadcastToRoomAsync
    // with their own namespaced key rather than adding another of these.
    public static Task BroadcastToRetroSessionAsync(string type, string sessionId, object data) =>
        BroadcastToRoomAsync(type, RetroRoom(sessionId), data);

    public static Task BroadcastToBoardSessionAsync(string type, string sessionId, object data) =>
        BroadcastToRoomAsync(type, BoardRoom(sessionId), data);

    public static Task BroadcastToSessionAsync(string type, string sessionKey, object data) =>
        BroadcastToRoomAsync(type, WowRoom(sessionKey), data);

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
