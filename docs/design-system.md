# Design System

Goal: make the product feel like one product. A semantic **token layer** is the
source of truth; features read from it so "modern, clean, easy" is decided once,
not re-decided in every component.

## Direction

**One unified dark identity.** Cool-dark base, Angular Material M3 (azure/blue),
self-hosted **Geist**. RetroBoard renders dark and adopts Retro's *colour
language* only — its "went-well / to-improve / action" map onto
`success` / `warn` / `accent`. We do **not** adopt Retro's warm paper skin.

## The one rule

Product code references `--ds-*` tokens — **never raw hex.** New code is
token-only; existing hardcoded colours get backfilled opportunistically (there
were ~400+ repeated hex literals before this — that's the disease the tokens cure).

## Where things live

- **Tokens (source of truth):** [`team-manager-ui/src/styles/_tokens.scss`](../team-manager-ui/src/styles/_tokens.scss)
  — colour (primary/success/warn/danger/accent/info, each base·hover·soft·border·on),
  surfaces, text, spacing (4px base), radius, elevation, Geist type scale, motion, z-index.
- **Wiring:** `_tokens.scss` is `@use`d in [`src/styles.scss`](../team-manager-ui/src/styles.scss),
  whose global hardcoded colours now reference tokens. Additive and reversible;
  the Material M3 theme is untouched and still works.
- **Living reference:** a published artifact renders every token in Geist (dark).
  Regenerate/republish when tokens change.

## Rollout sequence

1. **Token layer + wiring** — ✅ done (this commit).
2. **Pilot on WoW current-week** (`win-of-the-week/wow-current-week.component.ts`) —
   re-point its inline `styles:` colours to tokens. No redesign; this shakes out
   gaps in the palette before it spreads.
3. **Formalise shared primitives** in `shared/components/` (app-modal,
   app-empty-state, icon-btn, …) as token-driven, with clean `@Input`/`@Output`.
4. **Build RetroBoard token-native** — greenfield is the honest test of the system.

Do **not** bulk-migrate all legacy hex up front. Tokens first, then new/touched
code is token-only, then backfill as files are touched.
