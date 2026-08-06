# Retro Vote Theme Synthesis

Goal: add an AI-assisted step to the structured RetroBoard vote phase that
identifies 2-4 converging themes across notes that have received votes, so
facilitators walk into Discuss with a synthesized starting point instead of
a flat list sorted by vote count.

Scope: **RetroBoard only.** FunRetro (`FunRetroSession`/`FunRetroService`/
`features/fun/retro/`) is a fully separate entity/service/component tree with
no shared "structured" flag — extending this feature to FunRetro is a
same-shape fast-follow, not part of this change, and would roughly double
stages 2-6.

Explicitly out of scope: auto-firing the existing `AnalyseAsync` (AI board
summary) on the Close transition. It is manual-only today (`POST
{id}/analyse`) and stays that way — bundling that change in here would add a
second auto-fire site and a second dedupe guard to get right, for a behavior
change to an already-shipped feature that's unrelated to vote themes.

---

## Status — as of 2026-08-06

Not started. Recon complete (below); write-up done; implementation to begin
in a new session.

**Before stage 1:** current branch is behind `origin/main`. Per repo git
rules, start this work from a fresh branch off updated main:
```
git checkout main
git pull origin main
git checkout -b feature/retro-vote-theme-synthesis
```

---

## Ground truth from recon (2026-08-06)

- **`AnalyseAsync`** (`RetroBoardService.Lifecycle.cs:270-303`) — facilitator-only,
  `blockClosed: false` (callable even on a closed board), manual-only via
  `RetroBoardController.Analyse` → `POST {id}/analyse`. Returns
  `RetroBoardAiSummaryDto`. On AI failure returns a friendly
  `"AI summary unavailable — configure a ... prompt to enable this."` string,
  never throws. This is the pattern to mirror for the new method's guard and
  error handling — **not** `GroupSimilarNotesAsync`'s window-gated guard,
  since the new manual "Re-analyse" trigger must be callable regardless of phase.
- **`GroupSimilarNotesAsync`** (`RetroBoardService.Grouping.cs:144-202`) — manual-only,
  blocks once the grouping window is closed, broadcasts `rb_notes_grouped`.
  **Known footgun to avoid repeating:** `rb_notes_grouped` is broadcast
  server-side but is missing from the frontend's `RETRO_BOARD_EVENT_TYPES`
  allowlist (`core/websocket/events/retro-board.events.ts`), so it silently
  never reaches clients today. The new event type must be added to **both**
  the backend broadcast call and that frontend array.
- **`AiPromptExecutorService.ExecuteAsync`** (`Application/Services/AiPromptExecutorService.cs:25`) —
  looked up by string `AiPrompt.Key` (`Enabled` + has a `Connection`), hard
  12s `HttpClient` timeout, no retry, returns `null` uniformly on any failure
  (bad connection, non-2xx, unparseable response). Logs an `ApiSyncEvent` for
  the Sync Queue. Admin UI is `AiPromptsController`
  (`api/v1/ai-prompts`, `[RequireFeature("settings")]`, CUD needs
  `TeamLead`) + `features/ai-prompts/ai-prompts.component.ts` under the
  Integrations hub — a `RetroVoteThemeSynthesis` prompt row + connection must
  be configured there before the feature does anything.
- **Real-time:** confirmed room-based WS — `WebSocketMiddleware.BroadcastToRoomAsync`,
  rooms keyed `retro:{sessionId}`, reached via `RetroBoardService`'s injected
  `broadcaster.ToSession(sessionId, type, data)`. Frontend `roomEvents<T>()`
  in `websocket.service.ts` filters by the typed `RETRO_BOARD_EVENT_TYPES`
  catalog; the store does a full `refresh(sessionId)` HTTP refetch on any
  matching event rather than consuming the payload directly — so pushing the
  new theme data just means broadcasting the new event type and returning it
  as part of the existing board DTO.
- **Components:** `retro-summary.component.ts` already has the AI-output
  rendering pattern to mirror (facilitator-only Generate/Regenerate button,
  card layout). `retro-vote.component.ts` has **no** existing AI-output UI
  today (just topic list, vote budget, group-similar button, continue
  button) — the theme panel + "analysing..." state there is new UI, not an
  extension of an existing pattern.
- **Phases:** `RetroBoardSession.Phase` = `setup|checkin|capture|introduce|vote|discuss|reflect|summary`.
  Facilitator-driven advance is `RetroBoardStore.goNext()` → `goPhase(n)`;
  server-side legality check is `SetPhaseAsync` (`Lifecycle.cs:142-161`),
  which broadcasts `rb_phase_changed`.

---

## Stages

### Stage 1 — Prompt + DTO
**Model: Sonnet**

Add an `AiPrompt` row, key `"RetroVoteThemeSynthesis"` — system prompt:
identify 2-4 converging themes across the given notes, each with a short
title, 1-2 sentence description, and the note IDs it draws from. Add
`RetroVoteThemeSummaryDto` (`List<RetroVoteThemeDto> { Title, Description,
NoteIds }`), following `RetroBoardAiSummaryDto`'s conventions
(`Application/DTOs/RetroBoard/RetroBoardDtos.cs`). No admin-UI code changes
needed — `AiPromptsController`/`ai-prompts.component.ts` already handle any
`AiPrompt` row generically; just seed/document the key for whoever configures
it in Settings.

### Stage 2 — Service method + endpoint
**Model: Sonnet**

Add `RetroBoardService.VoteThemes.cs` (partial, mirrors the
Lifecycle/Grouping file split) with
`AnalyseVotingThemesAsync(Guid sessionId, Guid memberId, Guid? columnId = null)`:
scope to notes with ≥1 vote (optionally within `columnId`), build params,
call `aiExecutor.ExecuteAsync("RetroVoteThemeSynthesis", …)`, parse into
`RetroVoteThemeSummaryDto`. Guard: facilitator-only, `blockClosed: false`
(mirror `AnalyseAsync`, not the grouping guard — see ground truth above).
Add `POST /api/retro-boards/{id}/voting-themes[?columnId=]` in
`RetroBoardController` using the same authorization as `Analyse`. No
auto-fire or dedupe logic in this method — that's stage 3's concern, kept
out of the service method so the manual path in stage 4 can call it
unconditionally.

### Stage 3 — Auto-fire on Discuss-phase transition
**Model: Opus**

**Corrected during implementation (2026-08-06):** originally specified as
firing on entering *Vote*. That's before any votes exist, so it would fire
immediately with nothing to synthesise every single time — "No voted notes
to synthesise" on 100% of runs — defeating the feature's own stated goal of
having themes ready going into Discuss. Moved to fire on entering *Discuss*
instead, once voting has actually happened.

Wire an auto-fire call to `AnalyseVotingThemesAsync` at the point the board
transitions into the Discuss phase (`SetPhaseAsync`/`goPhase` server-side
path). Guard duplicate auto-fires with a flag/timestamp scoped to "last
auto-fired for this transition into Discuss," checked and set **only** in
the auto-fire call site — never in `AnalyseVotingThemesAsync` itself, so it
can't leak into the manual path.

**The race to design against:** `AiPromptExecutorService` has a 12s HTTP
timeout with no retry. If the dedupe flag is only set *after* the call
completes, a second entry into the Discuss transition within that 12s window
(retried WS event, a facilitator double-clicking Continue, two facilitators)
double-fires. Set the flag/pending-state synchronously *before* the async
call starts, not after it resolves. Failures log and set a status field on
the session; never throw back into the phase-transition flow or block the
transition.

### Stage 4 — Manual trigger
**Model: Sonnet**

Add an "Analyse themes" / "Re-analyse" button in `retro-vote.component.ts`
and `retro-summary.component.ts` — always callable regardless of the
auto-fire guard state, always hits the endpoint fresh, disabled while a call
is in flight. Label reads "Re-analyse" when a result already exists,
"Analyse themes" otherwise. This is new UI in `retro-vote` (no existing
AI-output pattern there to extend, unlike `retro-summary`).

### Stage 5 — Persistence + real-time push
**Model: Sonnet**

Persist theme results on `RetroBoardSession` (new nullable
`VoteThemesJson` column, additive EF migration, mirrors `AiSummaryJson`),
overwritten by whichever call (auto or manual) completes last — no
versioning/history. Broadcast a new `rb_vote_themes_ready` event via
`broadcaster.ToSession(sessionId, ...)`. **Register the new event type in
both places** — the backend broadcast call and
`RETRO_BOARD_EVENT_TYPES` in `core/websocket/events/retro-board.events.ts` —
or it silently won't reach clients, same as the existing `rb_notes_grouped`
gap. Optional drive-by: register `rb_notes_grouped` too while in that file,
called out as a separate fix in the PR description, not folded silently into
this diff. Add the theme summary to the board's `ToDto` conversion next to
`aiSummary`.

### Stage 6 — Client wiring
**Model: Sonnet**

Add `analyseVotingThemes(boardId, columnId?)` to the retro board API
service. In `retro-vote.component.ts` and `retro-summary.component.ts`,
subscribe to `rb_vote_themes_ready` via the existing `roomEvents()` pattern
(store already does a full `refresh()` on matching events — no new
subscription plumbing needed beyond adding the type to the catalog from
stage 5), render the theme panel (title/description per theme, notes
highlighted or linked) when results exist, show a subtle "analysing..."
state after the Discuss-phase auto-fire before results land. Style consistent
with `retro-summary`'s existing AI summary card.

### Stage 7 — Pre-commit
**Model: Sonnet**

`/soundness-check`
`/security-check`
