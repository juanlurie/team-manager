/**
 * K Picker utility functions.
 * Includes avatar color hashing, initials extraction, and fuzzy matching.
 */

const AVATAR_COLORS: string[] = [
  '#B8732E', // gold/amber (from design spec)
  '#4A90D9', // blue
  '#7B61FF', // purple
  '#E06C75', // red
  '#56B6C2', // teal
  '#C678DD', // magenta
  '#D19A66', // orange
  '#98C379', // green
  '#528BFF', // light blue
  '#BE5046', // dark red
];

/**
 * Returns a deterministic color for a member's avatar based on their ID.
 * Uses a simple polynomial hash to pick from a fixed palette.
 */
export function getAvatarColor(memberId: string): string {
  let hash = 0;
  for (let i = 0; i < memberId.length; i++) {
    hash = (hash * 31 + memberId.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/**
 * Extracts up to 2 initials from a member's first and last name.
 * - "Fred Ehlers" → "FE"
 * - "Maya Park" → "MP"
 * - "Alex" → "A"
 * - "" → "?"
 */
export function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.trim() || '';
  const last = lastName?.trim() || '';
  if (!first && !last) return '?';
  const f = first.charAt(0).toUpperCase();
  const l = last.charAt(0).toUpperCase();
  return f + (l || '');
}

/**
 * Simple case-insensitive fuzzy / substring match.
 * Returns true if the query matches any part of the text.
 */
export function fuzzyMatch(query: string, ...fields: string[]): boolean {
  const q = query.toLowerCase().trim();
  if (!q) return true;
  return fields.some(f => (f || '').toLowerCase().includes(q));
}

/**
 * Clamps a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
