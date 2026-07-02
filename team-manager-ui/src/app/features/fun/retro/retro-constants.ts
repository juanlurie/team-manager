import { RetroColumn } from '../../../core/models/fun-retro.model';

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
