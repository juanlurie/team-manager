// Clock formatting for countdown timers — seconds ↔ "m:ss".
//
// NOT the same as shared/pipes/duration.pipe.ts, which takes MINUTES and renders a human
// duration ("1h 30m"). This is a running clock; that is a length of time. Both are needed.
//
// Minutes are deliberately NOT zero-padded ("1:30", not "01:30"). retro.component.ts's local
// formatTime() pads them, so it is not a caller of this — repointing it would change its display.

/** Seconds → "m:ss" (clamped at 0), e.g. 90 → "1:30". */
export function fmtDuration(sec: number): string {
  const s = Math.max(0, sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "m:ss" (or "m") → seconds. Tolerates blanks/garbage by treating missing parts as 0. */
export function parseDuration(str: string): number {
  const parts = (str || '').split(':');
  if (parts.length >= 2) return (+parts[0] || 0) * 60 + (+parts[1] || 0);
  return (+parts[0] || 0) * 60;
}
