import { RetroColumn, RetroTheme } from '../../../core/models/fun-retro.model';

export const DEFAULT_COLS: RetroColumn[] = [
  { key: 'well',   label: '✅ Went Well',      color: '#4caf50' },
  { key: 'better', label: "⚠️ Didn't Go Well", color: '#ff9800' },
  { key: 'action', label: '🎯 Action Items',    color: '#e91e8c' },
];

export interface RetroTemplate {
  id: string;
  name: string;
  description: string;
  columns: RetroColumn[];
}

export const RETRO_TEMPLATES: RetroTemplate[] = [
  {
    id: 'well-better-action',
    name: 'Well / Better / Action',
    description: 'Classic format',
    columns: DEFAULT_COLS,
  },
  {
    id: 'start-stop-continue',
    name: 'Start / Stop / Continue',
    description: 'Focus on behaviours',
    columns: [
      { key: 'start',    label: '🚀 Start',    color: '#4caf50' },
      { key: 'stop',     label: '🛑 Stop',     color: '#ef5350' },
      { key: 'continue', label: '✅ Continue', color: '#64b5f6' },
    ],
  },
  {
    id: '4ls',
    name: '4Ls',
    description: 'Liked / Learned / Lacked / Longed for',
    columns: [
      { key: 'liked',   label: '❤️ Liked',    color: '#e91e63' },
      { key: 'learned', label: '📚 Learned',  color: '#64b5f6' },
      { key: 'lacked',  label: '😕 Lacked',   color: '#ff9800' },
      { key: 'longed',  label: '🌟 Longed for', color: '#ab47bc' },
    ],
  },
  {
    id: 'mad-sad-glad',
    name: 'Mad / Sad / Glad',
    description: 'Emotion-driven reflection',
    columns: [
      { key: 'mad',  label: '😠 Mad',  color: '#ef5350' },
      { key: 'sad',  label: '😢 Sad',  color: '#64b5f6' },
      { key: 'glad', label: '😊 Glad', color: '#4caf50' },
    ],
  },
  {
    id: 'daki',
    name: 'DAKI',
    description: 'Drop / Add / Keep / Improve',
    columns: [
      { key: 'drop',    label: '🗑️ Drop',    color: '#ef5350' },
      { key: 'add',     label: '➕ Add',     color: '#4caf50' },
      { key: 'keep',    label: '🔒 Keep',    color: '#64b5f6' },
      { key: 'improve', label: '⬆️ Improve', color: '#ff9800' },
    ],
  },
  {
    id: 'sailboat',
    name: 'Sailboat',
    description: 'Wind / Anchor / Island / Rocks',
    columns: [
      { key: 'wind',   label: '💨 Wind (helps)',   color: '#4caf50' },
      { key: 'anchor', label: '⚓ Anchor (slows)', color: '#ef5350' },
      { key: 'island', label: '🏝️ Goal',           color: '#64b5f6' },
      { key: 'rocks',  label: '🪨 Risks',          color: '#ff9800' },
    ],
  },
];

export const ICEBREAKER_QUESTIONS = [
  "What's one word that describes this session?",
  "If this retro were a weather forecast, what would it be?",
  "What's one thing you wish you'd known at the start?",
  "On a scale of 🐢 to 🚀 how was your productivity?",
  "What's the best thing that happened outside of work this sprint?",
  "What song best describes your last two weeks?",
  "If this sprint were a movie, what genre would it be?",
  "What's one habit you want to build next sprint?",
  "Rate your energy this sprint: 🪫 🔋 ⚡ 🚀",
  "What's a superpower you wish you had this sprint?",
  "One emoji that sums up your sprint:",
  "What's something the team did that you're proud of?",
  "What would you do differently if you started over?",
  "What's your biggest win (personal or team)?",
  "Name a challenge you overcame this sprint:",
  "What's one thing that surprised you?",
  "If you could add one hour to your day next sprint, how would you use it?",
  "What's one thing you learned?",
  "How full is your motivation tank right now? 0–10",
  "What's one thing you want to celebrate from this sprint?",
];

// ── Retro board themes: a subtle pixel-art watermark behind each canvas ──
// Each theme has 3 tone variants -- positive/negative/action -- shown per column by
// position (1st column = positive, 2nd = negative, 3rd = action; a 4th column, where a
// template has one, reuses the action variant). All themes share one grid so every
// variant lines up with the canvas's own 40px grid blocks at the same background-size.
//
// The shapes below are authored at a 40x40 coordinate space (every row()/circleRing()/
// diagLine() call uses those coordinates) -- SCALE_FACTOR blows each cell up into an NxN
// block at final render resolution. For straight-edged shapes (built from row()) this is
// lossless, just literally more pixels describing the same crisp edge. Curved/diagonal
// shapes (circleRing, diagLine) are instead regenerated natively at the scaled-up
// radius/coordinates -- block-scaling a coarse circle would just make its jagged
// stair-steps bigger, not smoother; sampling the same circle formula at a bigger radius
// genuinely produces a rounder-looking curve.
const SCALE_FACTOR = 2;
const AUTH_GRID = 40;
const GRID = AUTH_GRID * SCALE_FACTOR;

// Two-tone shading: FILL is the shape's main silhouette, DETAIL is a dimmer accent used for
// internal shading/highlights/texture (windows, craters, checker squares, spokes, waves...).
// Both render in the same low-opacity watermark, but the value difference between them still
// reads as depth instead of a single flat cutout -- this is the main lever for "more
// interesting", since the watermark is always monochrome-on-dark by design.
const FILL = '#ffffff';
const DETAIL = 'rgba(255,255,255,0.5)';

function row(y: number, x0: number, x1: number): [number, number][] {
  const out: [number, number][] = [];
  for (let x = x0; x <= x1; x++) out.push([x, y]);
  return out;
}

function col(x: number, y0: number, y1: number): [number, number][] {
  const out: [number, number][] = [];
  for (let y = y0; y <= y1; y++) out.push([x, y]);
  return out;
}

/** Expands each authored-resolution cell into an NxN block at final render resolution.
 *  Only valid for straight-edged shapes (built from row()/col()) -- see note above. */
function scale(cells: [number, number][], factor = SCALE_FACTOR): [number, number][] {
  const out: [number, number][] = [];
  for (const [x, y] of cells) {
    for (let dy = 0; dy < factor; dy++) {
      for (let dx = 0; dx < factor; dx++) out.push([x * factor + dx, y * factor + dy]);
    }
  }
  return out;
}

/** Filled circle (rInner omitted/0) or ring, sampled directly at final render resolution
 *  (cx/cy/rOuter/rInner are given in authored-resolution units and scaled up here) so the
 *  curve is genuinely smoother, not just a blown-up blocky one. */
function circleRing(cx: number, cy: number, rOuter: number, rInner = 0): [number, number][] {
  const s = SCALE_FACTOR;
  const [cxS, cyS, rOuterS, rInnerS] = [cx * s, cy * s, rOuter * s, rInner * s];
  const cells: [number, number][] = [];
  const rOuter2 = rOuterS * rOuterS, rInner2 = rInnerS * rInnerS;
  for (let y = Math.floor(cyS - rOuterS); y <= Math.ceil(cyS + rOuterS); y++) {
    for (let x = Math.floor(cxS - rOuterS); x <= Math.ceil(cxS + rOuterS); x++) {
      const d2 = (x - cxS + 0.5) ** 2 + (y - cyS + 0.5) ** 2;
      if (d2 <= rOuter2 && d2 >= rInner2) cells.push([x, y]);
    }
  }
  return cells;
}

/** Filled circle clipped to a half-plane (side='left'|'right'|'top'|'bottom' of cx/cy) --
 *  used for two-tone circles like a compass needle (red north half / white south half in
 *  spirit, though here it's just FILL vs DETAIL). */
function circleHalf(cx: number, cy: number, rOuter: number, side: 'left' | 'right' | 'top' | 'bottom'): [number, number][] {
  return circleRing(cx, cy, rOuter).filter(([x, y]) => {
    const s = SCALE_FACTOR;
    if (side === 'left') return x < cx * s;
    if (side === 'right') return x >= cx * s;
    if (side === 'top') return y < cy * s;
    return y >= cy * s;
  });
}

/** Thick diagonal line from (x0,y0) to (x1,y1) (authored-resolution units, scaled up here),
 *  proportionally thicker at higher resolution so it doesn't thin out relatively. */
function diagLine(x0: number, y0: number, x1: number, y1: number, thickness = 1): [number, number][] {
  const s = SCALE_FACTOR;
  const [x0S, y0S, x1S, y1S] = [x0 * s, y0 * s, x1 * s, y1 * s];
  const cells: [number, number][] = [];
  const steps = Math.max(Math.abs(x1S - x0S), Math.abs(y1S - y0S));
  const half = Math.floor((s * thickness) / 2) + 1;
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0S + (x1S - x0S) * (i / steps));
    const y = Math.round(y0S + (y1S - y0S) * (i / steps));
    for (let w = -half; w <= half; w++) cells.push([x + w, y]);
  }
  return cells;
}

/** A small 4-point sparkle/star (plus-shape with tapered arms) -- background texture (extra
 *  stars, sparks, motion accents) that reads as more than a single dot. */
function sparkle(cx: number, cy: number, r: number): [number, number][] {
  return [
    ...diagLine(cx - r, cy, cx + r, cy),
    ...diagLine(cx, cy - r, cx, cy + r),
    [cx, cy],
  ];
}

interface PixelLayer { cells: [number, number][]; color: string; }

function pixelSvgDataUrl(layers: PixelLayer[], gridSize = GRID): string {
  const rects = layers
    .map(({ cells, color }) => cells.map(([x, y]) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`).join(''))
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${gridSize} ${gridSize}" shape-rendering="crispEdges">${rects}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// ── Ocean: sailboat (positive/moving) / anchor (negative/stuck) / compass (action/direction) ──
const OCEAN_POSITIVE_FILL: [number, number][] = scale([
  // mast
  ...col(19, 3, 24),
  // main sail, widening away from the mast
  ...row(5, 20, 20), ...row(6, 20, 21), ...row(7, 20, 22), ...row(8, 20, 23), ...row(9, 20, 24),
  ...row(10, 20, 25), ...row(11, 20, 26), ...row(12, 20, 27), ...row(13, 20, 28), ...row(14, 20, 29),
  ...row(15, 20, 30), ...row(16, 20, 31),
  // jib sail, in front of the mast
  ...row(9, 15, 18), ...row(10, 14, 18), ...row(11, 13, 18), ...row(12, 12, 18), ...row(13, 11, 18),
  ...row(14, 10, 18), ...row(15, 9, 18), ...row(16, 8, 18),
  // hull
  ...row(25, 4, 34), ...row(26, 6, 32), ...row(27, 9, 29),
]);
const OCEAN_POSITIVE_DETAIL: [number, number][] = [
  ...scale([[19, 3], [20, 3], [19, 4], [20, 4], [19, 5], [20, 5], [18, 4], [17, 4]]), // pennant flag
  ...diagLine(20, 6, 27, 15), ...diagLine(20, 16, 26, 15), // main sail seam
  ...diagLine(18, 10, 13, 16), // jib seam
  ...scale(row(29, 5, 8)), ...scale(row(29, 14, 17)), ...scale(row(29, 22, 25)), ...scale(row(29, 30, 33)), // waves
  ...scale(row(31, 2, 5)), ...scale(row(31, 10, 13)), ...scale(row(31, 20, 23)), ...scale(row(31, 28, 33)),
];
const OCEAN_NEGATIVE_FILL: [number, number][] = [
  ...scale(col(19, 12, 27)), ...scale(col(20, 12, 27)), // shank
  ...scale(row(16, 15, 24)), // crossbar
  ...circleRing(19.5, 9, 3, 1.8), // ring at top
  // curved flukes at the bottom
  ...circleRing(13, 27, 5, 3.5), ...circleRing(26, 27, 5, 3.5),
];
const OCEAN_NEGATIVE_DETAIL: [number, number][] = [
  // chain links above the ring
  ...circleRing(19.5, 4, 1.6, 0.6), ...circleRing(19.5, 6.5, 1.6, 0.6),
  ...scale([[14, 15], [15, 15], [24, 15], [25, 15]]), // crossbar end caps
];
const OCEAN_ACTION_FILL: [number, number][] = [
  ...circleRing(20, 20, 12, 10.5),
  ...circleHalf(20, 20, 8, 'top'), // north half of the needle disc
];
const OCEAN_ACTION_DETAIL: [number, number][] = [
  ...circleHalf(20, 20, 8, 'bottom'), // south half, dimmer -- reads as a two-tone needle
  ...circleRing(20, 20, 2), // center hub
  // N/E/S/W tick marks poking out past the ring
  ...diagLine(20, 8, 20, 5, 1.2), ...diagLine(20, 32, 20, 35, 1.2),
  ...diagLine(8, 20, 5, 20, 1.2), ...diagLine(32, 20, 35, 20, 1.2),
];

// ── Retro gaming: up-arrow (positive/power-up) / X mark (negative/game over) / controller (action) ──
const RETRO_GAMING_POSITIVE_FILL: [number, number][] = scale([
  ...row(4, 17, 22), ...row(5, 15, 24), ...row(6, 13, 26), ...row(7, 11, 28), ...row(8, 9, 30),
  ...row(9, 17, 22), ...row(10, 17, 22), ...row(11, 17, 22), ...row(12, 17, 22), ...row(13, 17, 22),
  ...row(14, 17, 22), ...row(15, 17, 22), ...row(16, 17, 22), ...row(17, 17, 22), ...row(18, 17, 22),
  ...row(19, 17, 22), ...row(20, 17, 22), ...row(21, 17, 22), ...row(22, 17, 22), ...row(23, 17, 22),
]);
const RETRO_GAMING_POSITIVE_DETAIL: [number, number][] = [
  ...sparkle(31, 8, 2.5), ...sparkle(9, 14, 1.8), // sparkle beside the arrow
  ...scale(row(27, 17, 22)), ...scale(row(29, 18, 21)), ...scale(row(31, 19, 20)), // motion lines below
];
const RETRO_GAMING_NEGATIVE_FILL: [number, number][] = [
  ...diagLine(9, 9, 31, 31, 1.6),
  ...diagLine(31, 9, 9, 31, 1.6),
];
const RETRO_GAMING_NEGATIVE_DETAIL: [number, number][] = [
  ...sparkle(9, 9, 2.5), ...sparkle(31, 9, 2.5), ...sparkle(9, 31, 2.5), ...sparkle(31, 31, 2.5),
];
const RETRO_GAMING_ACTION_FILL: [number, number][] = scale([
  // rounded body
  ...row(14, 9, 30), ...row(15, 7, 32), ...row(16, 6, 33), ...row(17, 6, 33), ...row(18, 6, 33),
  ...row(19, 6, 33), ...row(20, 6, 33), ...row(21, 6, 33), ...row(22, 6, 33), ...row(23, 7, 32),
  ...row(24, 9, 30),
  // D-pad cross
  ...row(17, 10, 12), ...row(18, 10, 12), ...row(19, 9, 13), ...row(20, 10, 12), ...row(21, 10, 12),
]);
const RETRO_GAMING_ACTION_DETAIL: [number, number][] = [
  ...circleRing(27, 17, 2), ...circleRing(31, 19, 2), // action buttons
  ...circleRing(18, 23, 2.5, 1.4), ...circleRing(25, 23, 2.5, 1.4), // joysticks (hollow center)
  ...scale([[8, 12], [9, 12], [30, 12], [31, 12]]), // shoulder button hints
];

export interface RetroThemeDef {
  id: NonNullable<RetroTheme>;
  label: string;
  /** [positive, negative, action] -- shown on a column by its position (index % 3). */
  variantUrls: [string, string, string];
  /** Overrides for themes backed by real photo/render assets (not the hand-authored,
   *  mostly-transparent pixel SVGs above) -- those need a much higher opacity plus a
   *  screen blend to read at all instead of just tinting the column a flat color, and
   *  `contain` sizing so the subject isn't stretched. Omitted for the vector themes, which
   *  keep the CSS defaults (0.16 opacity, no blend, stretched to fill). */
  bgStyle?: { opacity: number; blend: string; size: string };
}

function twoTone(fill: [number, number][], detail: [number, number][]): string {
  return pixelSvgDataUrl([{ cells: fill, color: FILL }, { cells: detail, color: DETAIL }]);
}

export const RETRO_THEMES: RetroThemeDef[] = [
  {
    id: 'space', label: 'Space',
    // Real renders instead of the hand-authored pixel SVGs above -- the rocket (launch/
    // positive), the UFO (unknown/negative), the astronaut (doing the work/action).
    variantUrls: [
      'url("/assets/pixel-art/space_rocket.png")',
      'url("/assets/pixel-art/space_ufo.png")',
      'url("/assets/pixel-art/space_astronaut.png")',
    ],
    bgStyle: { opacity: 0.4, blend: 'screen', size: 'contain' },
  },
  {
    id: 'f1', label: 'F1',
    // Real renders instead of the hand-authored pixel SVGs above -- checkered flag (finish/
    // positive), the car (still racing/negative), the podium (the goal/action).
    variantUrls: [
      'url("/assets/pixel-art/formula_1_flag.png")',
      'url("/assets/pixel-art/formula_1_race_car.png")',
      'url("/assets/pixel-art/formula_1_podium.png")',
    ],
    bgStyle: { opacity: 0.4, blend: 'screen', size: 'contain' },
  },
  {
    id: 'ocean', label: 'Ocean',
    variantUrls: [
      twoTone(OCEAN_POSITIVE_FILL, OCEAN_POSITIVE_DETAIL),
      twoTone(OCEAN_NEGATIVE_FILL, OCEAN_NEGATIVE_DETAIL),
      twoTone(OCEAN_ACTION_FILL, OCEAN_ACTION_DETAIL),
    ],
  },
  {
    id: 'retro-gaming', label: 'Retro Gaming',
    variantUrls: [
      twoTone(RETRO_GAMING_POSITIVE_FILL, RETRO_GAMING_POSITIVE_DETAIL),
      twoTone(RETRO_GAMING_NEGATIVE_FILL, RETRO_GAMING_NEGATIVE_DETAIL),
      twoTone(RETRO_GAMING_ACTION_FILL, RETRO_GAMING_ACTION_DETAIL),
    ],
  },
];
