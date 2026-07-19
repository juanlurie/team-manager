# Session Platform

Goal: stop re-implementing "a live room people join" for every feature. Retro,
Win of the Week, and most of the Fun Hub are the **same shape** underneath.
Build that shape **once** as a small set of primitives, and make new features
plug into it instead of hand-rolling their own realtime, join, and timer code.

## What we're actually building

Strip the themes away and Retro and WoW are the same thing:

> **A room people join — often anonymously via a link — that holds live shared
> state everyone sees update in real time, sometimes on a shared clock.**

That is not two features. It's the shape of almost the entire Fun Hub registry
in [`Program.cs`](../src/TeamManager.Api/Program.cs) (scrum-poker, polls,
quiz-game, dots-and-boxes, wordle, connections, …). The product is a
**live-session platform**; each feature is an activity plugged into it.

Framing it this way is the whole point: it's what makes "use it for new
features" a concrete instruction instead of a wish.

## The one rule

**A new live feature declares its state and events, then consumes the three
primitives below. It does not open its own socket path, invent its own join
model, or write its own countdown.** If a feature needs something a primitive
can't do, we extend the primitive — we don't fork it.

## The three primitives

### 1. Session Room — realtime scoping

*One generic room keyed by a string, replacing the per-feature scoping bolted
onto the shared socket.*

Today there is a single global WebSocket at `/ws`
([`websocket.service.ts`](../team-manager-ui/src/app/core/websocket/websocket.service.ts)),
and [`WebSocketMiddleware`](../src/TeamManager.Api/Middleware/WebSocketMiddleware.cs)
tracks each connection in one `ConnectionEntry` that has grown a field **per
feature** — `RetroSessionId`, `WowSession`, `BoardSessionId`, `RetroMemberName` —
with parallel join messages (`join_retro`, `join_wow`, `join_board`) and
parallel broadcast paths (`BroadcastToRetroSessionAsync`, `BroadcastToSessionAsync`,
…). The frontend `WsMessage.type` is a ~120-entry union of every feature's
events on one channel.

So "rooms" already exist — as copy-pasted special cases. Collapse them into one:

```
// backend
ISessionRoom.Join(connectionId, roomKey)        // roomKey e.g. "retro:{id}", "wow:{weekId}"
ISessionRoom.Broadcast(roomKey, type, data)
ISessionRoom.Presence(roomKey) -> participants
ISessionRoom.Leave(connectionId, roomKey)
```

```
// frontend
room = sessionRoom.join(roomKey);
room.events$        // ONLY this room's events — not the global god-union
room.presence$
room.leave();
```

`roomKey` is an opaque namespaced string, so a new feature never touches the
middleware. Presence is generic (a set of participants per room), not
retro-specific.

### 2. Session Identity — join + anonymous participant

*A shareable entry point plus a stable anonymous identity behind it — Retro's
join code and WoW's cookie identity are two halves of the same thing.*

Today these are unrelated:

- **Retro** — a friendly slug **join code** + `AllowAnonymous`
  ([`RetroBoardSession.cs`](../src/TeamManager.Api/Domain/Entities/RetroBoardSession.cs)).
  Answers *"how do I get into the room."*
- **WoW** — a signed, httpOnly cookie guest **identity** with per-person caps
  ([`GuestSessionManager.cs`](../src/TeamManager.Api/Application/Services/GuestSessionManager.cs)).
  Answers *"who is this anonymous person, consistently, without letting them
  impersonate or reset."*

Merge them into one model:

- **Join code → room** resolution (the shareable link / code), with an
  `AllowAnonymous` gate per session.
- **Signed, httpOnly, per-scope anonymous participant id** (WoW's model,
  generalized): the server mints it, page script can't read or rotate it, it's
  never echoed in a body or broadcast. Feature-level caps/ownership hang off it.

New features get "share a link, let guests join, give each guest a stable
identity" for free, with WoW's security properties baked in rather than
re-derived. Keep WoW's hard-won guarantees (see
[`GuestSessionManager.cs`](../src/TeamManager.Api/Application/Services/GuestSessionManager.cs))
as the acceptance bar for the generalized version.

### 3. Shared Clock — one server-authoritative countdown

*A deadline the server owns and every client renders, skew-corrected.*

Both features need exactly one thing — a shared deadline safe against skewed
client clocks — and both built it separately:

- **WoW** — `…EndsAt` columns on [`WinWeek`](../src/TeamManager.Api/Domain/Entities/WinWeek.cs)
  (`VotingEndsAt`, `SuddenDeathEndsAt`, `HypeBattleEndsAt`, `QuizEndsAt`) +
  `WowTimerRequest(DurationSeconds)` + [`wow-countdown.component.ts`](../team-manager-ui/src/app/shared/components/wow-countdown/wow-countdown.component.ts).
- **Retro** — `TimerJson` / `StepDurationsJson`, a `fun_retro_timer_updated`
  broadcast, and a `timerNow` signal counting down on the client.

Same physics, two stacks. Unify to:

```
// a room carries an optional clock
clock = { endsAt: ISO-8601, serverNow: ISO-8601 }   // serverNow anchors skew correction
```

```
// one component, everywhere
<shared-countdown [endsAt]="clock.endsAt" [serverNow]="clock.serverNow" />
```

The server owns `endsAt`; the client only renders. This is the smallest, most
self-contained primitive — a good proof-of-concept for the whole approach.

## How a new feature plugs in

The payoff, as a recipe:

1. **Define** your state + event names (e.g. `poll_vote_cast`, `poll_closed`).
2. **Join** a room: `roomKey = "poll:{id}"`; broadcast via `ISessionRoom`.
3. **Subscribe** to `room.events$` on the client — you only see your room.
4. **(optional) Share it** — opt into join-codes + anonymous identity if guests
   should join by link.
5. **(optional) Add a clock** — set `endsAt`, drop in `<shared-countdown>`.

No new socket path, no new join message, no new countdown, no new guest-security
model.

## Migration — strangler, not big-bang

**Retro is the reference implementation.** It already has real room scoping and
join codes — it's the most evolved. The order of operations:

1. **Extract** Retro's mechanism into neutral primitives (Session Room first —
   everything rides on it).
2. **Split the frontend `type` union** so each feature sees only its room's
   events instead of the global fan-out.
3. **Migrate WoW** onto the primitives (drop `WowSession`/`GuestSessionManager`
   specializations into the generalized versions).
4. **New features are born on the platform** — the registry entries that don't
   exist yet never learn the old way.

Nothing is rewritten wholesale; each feature moves when it's touched.

## Non-goals / open questions

- **Not** a move to SignalR or a message broker *yet* — the room abstraction is
  transport-agnostic, so a future backplane (Redis) for multi-instance fan-out
  slots in behind `ISessionRoom` without touching features. Tracked separately.
- **Pure single-player games** (2048, threes, wordle) may not need rooms at all —
  the map-the-features pass decides which primitives each one actually wants.
- Exact `roomKey` naming convention and the presence payload shape are TBD in
  the Session Room build.

## Related

- [`docs/design-system.md`](./design-system.md) — the visual counterpart: one
  token layer so features *look* like one product, as this makes them *behave*
  like one product.
