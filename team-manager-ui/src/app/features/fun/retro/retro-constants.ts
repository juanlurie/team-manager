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
// template has one, reuses the action variant). All themes share one 24x24 grid so every
// variant lines up with the canvas's own 40px grid blocks at the same background-size.
const GRID = 24;

function row(y: number, x0: number, x1: number): [number, number][] {
  const out: [number, number][] = [];
  for (let x = x0; x <= x1; x++) out.push([x, y]);
  return out;
}

/** Filled circle (rInner omitted/0) or ring, sampled on the pixel grid. */
function circleRing(cx: number, cy: number, rOuter: number, rInner = 0): [number, number][] {
  const cells: [number, number][] = [];
  const rOuter2 = rOuter * rOuter, rInner2 = rInner * rInner;
  for (let y = Math.floor(cy - rOuter); y <= Math.ceil(cy + rOuter); y++) {
    for (let x = Math.floor(cx - rOuter); x <= Math.ceil(cx + rOuter); x++) {
      const d2 = (x - cx + 0.5) ** 2 + (y - cy + 0.5) ** 2;
      if (d2 <= rOuter2 && d2 >= rInner2) cells.push([x, y]);
    }
  }
  return cells;
}

/** Thick diagonal line from (x0,y0) to (x1,y1), 2px wide. */
function diagLine(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const cells: [number, number][] = [];
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + (x1 - x0) * (i / steps));
    const y = Math.round(y0 + (y1 - y0) * (i / steps));
    cells.push([x, y], [x + 1, y]);
  }
  return cells;
}

function pixelSvgDataUrl(cells: [number, number][], gridSize = GRID, color = '#ffffff'): string {
  const rects = cells.map(([x, y]) => `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${gridSize} ${gridSize}" shape-rendering="crispEdges">${rects}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

// Space: rocket (positive/launch) / asteroid (negative/impact) / satellite (action/control)
const SPACE_POSITIVE: [number, number][] = [
  ...row(7, 7, 8), ...row(8, 6, 9), ...row(9, 6, 9), ...row(10, 6, 9),
  ...row(11, 5, 10), ...row(12, 5, 10),
  [5, 13], [10, 13], [5, 14], [10, 14],
  ...row(15, 3, 12), ...row(16, 4, 11), ...row(17, 4, 11),
  ...row(18, 6, 9), ...row(19, 7, 8),
  [2, 2], [3, 2], [2, 3], [21, 6], [3, 20], [4, 20], [20, 18], [21, 18], [20, 19],
];
const SPACE_NEGATIVE: [number, number][] = [
  ...row(7, 10, 13), ...row(8, 8, 15), ...row(9, 7, 16), ...row(10, 6, 17),
  ...row(11, 6, 17), ...row(12, 5, 17), ...row(13, 6, 16), ...row(14, 6, 15),
  ...row(15, 7, 14), ...row(16, 9, 13),
  // motion streak trailing behind the impact
  [4, 17], [3, 18], [5, 18], [2, 19],
];
const SPACE_ACTION: [number, number][] = [
  ...row(10, 11, 13), ...row(11, 10, 14), ...row(12, 11, 13),
  ...row(10, 4, 9), ...row(11, 3, 9), ...row(12, 4, 9),
  ...row(10, 15, 20), ...row(11, 15, 21), ...row(12, 15, 20),
  ...circleRing(17, 6, 1.5),
  [15, 9], [16, 7], [15, 8],
];

// F1: checkered flag (positive/finish) / warning triangle (negative/hazard) / steering wheel (action)
const F1_POSITIVE: [number, number][] = (() => {
  const cells: [number, number][] = [];
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
      if ((x + y) % 2 === 0) cells.push([x + 6, y + 6]);
    }
  }
  return cells;
})();
const F1_NEGATIVE: [number, number][] = [
  ...row(4, 11, 12), ...row(5, 10, 13), ...row(6, 10, 13), ...row(7, 9, 14),
  ...row(8, 9, 14), ...row(9, 8, 15), ...row(10, 8, 15), ...row(11, 7, 16),
  ...row(12, 7, 16), ...row(13, 6, 17), ...row(14, 6, 17),
].filter(([x, y]) => !(x >= 11 && x <= 12 && y >= 7 && y <= 10)); // hollow out the "!" stem
const F1_ACTION: [number, number][] = [
  ...circleRing(12, 12, 7, 5),
  ...circleRing(12, 12, 2),
  ...diagLine(12, 5, 12, 9), ...diagLine(6, 15, 10, 13), ...diagLine(18, 15, 14, 13),
];

// Ocean: sailboat (positive/moving) / anchor (negative/stuck) / compass (action/direction)
const OCEAN_POSITIVE: [number, number][] = [
  // mast
  ...row(3, 12, 12), ...row(4, 12, 12), ...row(5, 12, 12), ...row(6, 12, 12),
  ...row(7, 12, 12), ...row(8, 12, 12), ...row(9, 12, 12), ...row(10, 12, 12),
  ...row(11, 12, 12), ...row(12, 12, 12),
  // sail, widening away from the mast
  ...row(4, 13, 13), ...row(5, 13, 14), ...row(6, 13, 15), ...row(7, 13, 16),
  ...row(8, 13, 17), ...row(9, 13, 18), ...row(10, 13, 19), ...row(11, 13, 20),
  // hull
  ...row(13, 4, 20), ...row(14, 5, 19), ...row(15, 7, 17),
];
const OCEAN_NEGATIVE: [number, number][] = [
  ...row(4, 11, 12), [9, 5], [12, 5],
  ...row(6, 11, 12), ...row(7, 11, 12), ...row(8, 11, 12),
  ...row(9, 6, 17), ...row(10, 11, 12), ...row(11, 11, 12), ...row(12, 11, 12),
  [7, 13], [8, 13], [15, 13], [16, 13],
  [6, 14], [17, 14],
  ...row(15, 8, 15),
  [9, 16], [14, 16],
];
const OCEAN_ACTION: [number, number][] = [
  ...circleRing(12, 12, 7, 6),
  ...circleRing(12, 12, 1.5),
  ...diagLine(12, 6, 12, 11), // north needle
  [11, 5], [13, 5],
];

// Retro gaming: up-arrow (positive/power-up) / X mark (negative/game over) / controller (action)
const RETRO_GAMING_POSITIVE: [number, number][] = [
  ...row(4, 11, 12), ...row(5, 10, 13), ...row(6, 9, 14), ...row(7, 8, 15),
  ...row(8, 11, 12), ...row(9, 11, 12), ...row(10, 11, 12),
  ...row(11, 11, 12), ...row(12, 11, 12), ...row(13, 11, 12), ...row(14, 11, 12),
];
const RETRO_GAMING_NEGATIVE: [number, number][] = [
  ...diagLine(6, 6, 17, 17),
  ...diagLine(17, 6, 6, 17),
];
const RETRO_GAMING_ACTION: [number, number][] = [
  ...row(9, 6, 15), ...row(10, 4, 17),
  ...row(11, 3, 17).filter(([x]) => !(x >= 6 && x <= 8)),
  ...row(12, 3, 17).filter(([x]) => !(x === 7)),
  ...row(13, 3, 17).filter(([x]) => !(x >= 6 && x <= 8) && !(x >= 13 && x <= 14)),
  ...row(14, 4, 17), ...row(15, 6, 15),
  [7, 11], [7, 13], [14, 11], [17, 11],
];

export interface RetroThemeDef {
  id: NonNullable<RetroTheme>;
  label: string;
  /** [positive, negative, action] -- shown on a column by its position (index % 3). */
  variantUrls: [string, string, string];
}

export const RETRO_THEMES: RetroThemeDef[] = [
  {
    id: 'space', label: 'Space',
    variantUrls: [pixelSvgDataUrl(SPACE_POSITIVE), pixelSvgDataUrl(SPACE_NEGATIVE), pixelSvgDataUrl(SPACE_ACTION)],
  },
  {
    id: 'f1', label: 'F1',
    variantUrls: [pixelSvgDataUrl(F1_POSITIVE), pixelSvgDataUrl(F1_NEGATIVE), pixelSvgDataUrl(F1_ACTION)],
  },
  {
    id: 'ocean', label: 'Ocean',
    variantUrls: [pixelSvgDataUrl(OCEAN_POSITIVE), pixelSvgDataUrl(OCEAN_NEGATIVE), pixelSvgDataUrl(OCEAN_ACTION)],
  },
  {
    id: 'retro-gaming', label: 'Retro Gaming',
    variantUrls: [pixelSvgDataUrl(RETRO_GAMING_POSITIVE), pixelSvgDataUrl(RETRO_GAMING_NEGATIVE), pixelSvgDataUrl(RETRO_GAMING_ACTION)],
  },
];
