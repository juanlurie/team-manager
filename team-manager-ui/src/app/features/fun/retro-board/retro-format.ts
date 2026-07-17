// Pure, stateless formatting helpers for RetroBoard. Kept out of the store so they can be unit
// tested in isolation and reused without pulling in view state. The store exposes thin delegates
// so templates keep calling `store.fmt(...)` etc.
//
// Clock formatting (fmtDuration/parseDuration) now lives in core/utils/time-format.ts — it is
// shared with wow-countdown. Re-exported here so the store's `F.*` delegates keep working.
//
// The name/avatar helpers below deliberately stay local: core/utils/member-display-name.ts and
// core/components/k-picker/k-picker.utils.ts already solve initials and avatar colour differently
// (a fixed hex palette vs the HSL hash here). Reconciling them is a design-system decision, not a
// move — see the plan.

export { fmtDuration, parseDuration } from '../../../core/utils/time-format';

/** First word of a name, or an em-dash when empty. */
export function shortName(name: string): string {
  return (name || '').split(' ')[0] || '—';
}

/** Up to two uppercase initials from a name. */
export function initials(name: string): string {
  return (name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

/** Deterministic hue (0–359) from an id, so a given member always gets the same colour. */
function hue(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

/** Avatar background tint for an id. */
export function avatarTint(id: string): string {
  return `hsl(${hue(id)} 45% 22%)`;
}

/** Avatar foreground ("ink") for an id. */
export function avatarInk(id: string): string {
  return `hsl(${hue(id)} 70% 70%)`;
}

/** A value's share (%) of a better/same/worse total; 0 when the total is 0. */
export function ratioPct(v: number, q: { better: number; same: number; worse: number }): number {
  const total = q.better + q.same + q.worse;
  return total ? (v / total) * 100 : 0;
}
