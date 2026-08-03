# Session Identity

Goal: one model for **who a participant is** and **how they got in**, shared across
session types — so "anonymous-first large-group retros" and "recognition-matters
WoW" are two *configurations* of one system, not two hand-rolled identity stacks.

This is primitive 2 of the [session platform](./session-platform.md). Phase 0 (the
shared scan/copy-to-join component) shipped. This doc is Phase 1–2: the identity
data model and the join flow. It is **design-first on purpose** — see why below.

## Why a doc and not a PR

The refinement spec says "add three booleans to the Session entity" and "Participant
records distinguish three identity states." Neither exists yet:

- **There is no unified `Session` entity.** Every feature has its own — `RetroBoardSession`,
  `WinWeek`, ~10 game sessions.
- **There is no shared Participant with identity states.** The two features that have
  *any* identity model built them differently (below).

So this is a **new subsystem**, not an extraction like Shared Clock or Session Room.
Building it blind across ~15 session types is how you get a mess. Pin the model first.

## Reality today — two divergent identity models

| | Retro (`RetroBoardSession`) | Win of the Week (`WinWeek`) |
|---|---|---|
| Participant record | [`RetroBoardParticipant`](../src/TeamManager.Api/Domain/Entities/RetroBoardParticipant.cs) — **`MemberId` non-nullable**, i.e. *logged-in members only* | **none** — no participant entity at all |
| Guest / outsider join | not supported (no non-member participant) | per-content: [`WinNomination.GuestSessionId`/`GuestName`](../src/TeamManager.Api/Domain/Entities/WinNomination.cs), `WinVote.GuestSessionId`, `WinWeek.GuestToken` |
| Anonymous *content* | `AllowAnonymous` → `RetroBoardNote.IsAnonymous` (author null) | — |
| Recognition | the auth token (`TMID` claim); creator ⇒ facilitator | host is authed; guests carry the [`GuestSessionManager`](../src/TeamManager.Api/Application/Services/GuestSessionManager.cs) cookie |

The takeaways that shape the design:

1. **Anonymity today lives at the *content* level (Retro notes), not the *join* level.**
   Control #3 below already exists — do not build a second toggle.
2. **Guest identity exists only in WoW, and only per-content-row** — there's no participant
   concept to attach it to. The spec's "guest participant with a session-scoped token" is
   WoW's `GuestSessionId` idea, promoted to a first-class participant.
3. **Recognition is currently all-or-nothing** (you have an auth token or you don't). The
   spec's low-friction "select your name" middle path is new.

## The two controls — independent booleans, not an enum

> **Decision (locked):** the earlier `allowAnonymousJoin` / `allowGuestJoin` split is **collapsed
> into one concept — Guest.** "Guest is clearer than anonymous, and a guest must provide a name."
> A **guest is anyone who joins without being a recognized member of this session's team** —
> whether they're a member of *another* team or not logged in at all. There is no nameless
> "anonymous join." That leaves two independent controls:

Set at Setup, editable by anyone with **host permission** for that session (a facilitator *guard*
today, not yet a grantable permission — see open questions). Per-session, never global config.

| Flag | Question it answers | Default | Notes |
|---|---|---|---|
| `allowGuestJoin` | Can someone who **isn't a recognized member of this session's team** join by entering a **display name**? | `false` | Covers both cases: another team's member, or nobody logged in. Explicit opt-in, never a silent fallback. Grants a session-scoped identity (display name + stable token for rejoining) — WoW's `GuestSessionId` pattern, promoted. A name is **required** — there is no anonymous nameless join. |
| `allowAnonymousContent` | Can a joined participant's **contributions** (notes, votes) stay unattributed *within* the session? | `false`* | **Already built for Retro** as `AllowAnonymous` ("Allow anonymous notes"). Fully independent of how they joined. *Retro's existing default is `true`; keep it for Retro. |

They stay **independent** because facilitators need combinations an enum can't express:
guests-allowed + fully-attributed content (public demo), or members-only + anonymous notes
(sensitive retro). Do **not** collapse them into one "anonymous mode."

**Why the design got trickier (and why this is still clean):** "Guest" now spans a *logged-in
member of another team* and a *not-logged-in stranger*. The simplifier: **membership is
session-scoped.** If your auth token doesn't resolve to a member of *this* session's team, you're
a guest here — even with an account elsewhere. Identity-of-join (member vs guest, both named) and
attribution-of-content (named vs anonymous) remain the **two axes**; nothing is nameless.

### Suggested per-type defaults (facilitator can override at Setup)

| Type | `allowGuestJoin` | Rationale |
|---|---|---|
| WoW | false | Recognition is the point — a win must be attributable. |
| Retro, Games | true | Keeps low-friction large-group joining, but guest access is an *explicit* choice, not silent. |
| Meetings | n/a | 1:1s have no open join flow. |

## Participant — three identity states

Promote to a shared shape (Retro's participant is the seed; WoW gains one):

- **Member** — auth token resolves to a member of *this session's team*; name/avatar from the
  profile. (Retro today.)
- **Guest** — everyone else who joins: another team's member, or nobody logged in. **No member
  link for this session**; a **required display name** + a session-scoped token/cookie for stable
  rejoin. Requires `allowGuestJoin`. (Generalizes WoW's `GuestSessionId`.)
- **Anonymous-content** — *not a join state.* An orthogonal flag on a contribution
  (`IsAnonymous`), allowed when `allowAnonymousContent` is on, regardless of how the author
  joined. (Retro notes today.)

So identity-of-join (member vs guest) and attribution-of-content (named vs anonymous) are
**two axes**, not one ladder.

## The recognition ladder (friction requirement)

"Being recognized" as a member must stay cheap for the common case — a known team member joining
their own team's session — without a full login every time:

1. **Auto-recognize** an already-authenticated device silently (we have the `TMID` token today).
2. Else offer a lightweight **"select your name"** from the Team's member list (new — the
   default path; `TeamMemberService` already exposes the roster).
3. Reserve **full credential/SSO login** for first-time devices only.

The **guest path** (`allowGuestJoin`) is separate and deliberately opt-in: enter a display name,
get the session token. It may be slightly heavier — guest friction is acceptable in a way member
friction is not.

## Architecture — incremental, not a big-bang Session table

Do **not** create a unified `Session` table and migrate ~15 features onto it. Instead, same
strangler pattern as the rest of the platform:

1. Define the two flags + the Participant identity-state as a **shared contract**
   (interface / value objects), not a shared table.
2. **Retro first** — it already has `AllowAnonymous` (=`allowAnonymousContent`) and a participant
   table. Add `allowGuestJoin` to `RetroBoardSession`; make `RetroBoardParticipant.MemberId`
   **nullable** + add `DisplayName` + a guest session token to carry the guest state. Surface the
   guest toggle in the Retro Setup card (next to the existing "Allow anonymous notes").
3. **WoW next** — promote its per-row `GuestSessionId`/`GuestName` into the shared Participant
   shape; wire the two join flags (defaults keep it recognition-only, so no behaviour change).
4. **Games / future types** adopt the contract when they grow a join flow.

Each feature moves when touched; nothing is rewritten wholesale.

## First code slice (recommended)

**Retro, guest join + guest participant.** Concretely:
- `RetroBoardSession`: `+ AllowGuestJoin (true)`. (`AllowAnonymous` already covers content.)
- `RetroBoardParticipant`: `MemberId` → nullable, `+ DisplayName`, `+ GuestSessionId`.
- Setup card: one guest toggle beside "Allow anonymous notes".
- Join flow: the Phase 2 modal (reuse [`confirm-dialog`](../team-manager-ui/src/app/shared/components/confirm-dialog/confirm-dialog.component.ts))
  with the recognition ladder; guest path gated on `AllowGuestJoin`, name required.

This is meaningful but contained, and proves the model end-to-end before WoW.

## Non-goals / open questions

- **Host permission is not a grantable permission yet** — it's a facilitator *guard*
  (`GuardAsync(facilitatorOnly:true)`) + participant `Role`. The spec's "same check as Phase 3"
  assumes a permission model that isn't built. These flags should ride whatever host-check exists
  when they land; a real grantable "retro host" permission is its own piece. **Open for the user:**
  ride the existing facilitator guard for now, or wait on the permission model?
- ~~`allowAnonymousJoin` vs `allowGuestJoin` split~~ — **resolved**: collapsed into Guest (named).
- Meetings are explicitly out (no open join).
- Not a unified `Session` table — deliberately (see Architecture).

## Related

- [`docs/session-platform.md`](./session-platform.md) — the umbrella; this is primitive 2.
- Phase 0 (shared scan/copy-to-join component) — shipped in the `session-join` work.
