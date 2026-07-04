export interface FunRetroReaction {
  emoji: string;
  count: number;
  mine: boolean;
}

export interface FunRetroCard {
  id: string;
  sessionId: string;
  column: 'well' | 'better' | 'action';
  text: string | null;       // null = hidden (other person's card during add)
  authorName: string | null; // null = hidden
  authorId: string;
  authorAvatarSeed: string | null;
  isOwn: boolean;
  createdAt: string;
  voteCount: number;
  myVoteCount: number;
  reactions: FunRetroReaction[];
  positionX: number | null;
  positionY: number | null;
  color: string | null;
  groupId: string | null;
  commentCount: number;
}

export interface FunRetroCardComment {
  id: string;
  cardId: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export type FunRetroTokenSize = 'small' | 'medium' | 'large';

export interface FunRetroToken {
  id: string;
  sessionId: string;
  column: 'well' | 'better' | 'action';
  emoji: string;
  size: FunRetroTokenSize;
  positionX: number;
  positionY: number;
  createdByMemberId: string;
  createdAt: string;
}

export interface FunRetroAnalysis {
  wellThemes: string[];
  betterThemes: string[];
  actionThemes: string[];
  keyInsights: string[];
  suggestedActions: string[];
}

export interface RetroColumn {
  key: string;
  label: string;
  color: string;
}

export interface FunRetroSession {
  id: string;
  slug: string | null;
  title: string | null;
  phase: 'lobby' | 'add' | 'vote' | 'discuss' | 'done';
  createdByMemberId: string;
  isCreator: boolean;
  sprintId: string | null;
  sprintName: string | null;
  createdAt: string;
  cards: FunRetroCard[];
  totalCardCount: number;
  currentMemberId?: string;
  aiAnalysis: FunRetroAnalysis | null;
  timerJson: string | null;
  icebreakerAnswers: { memberId: string; memberName: string; answer: string }[];
  icebreakerQuestion: string | null;
  columns: RetroColumn[];
  participationTracking: boolean;
  theme: RetroTheme;
  canvasLayout: RetroCanvasLayout;
  tokens: FunRetroToken[];
}

export type RetroTheme = 'space' | 'f1' | 'ocean' | 'retro-gaming' | null;
export type RetroCanvasLayout = 'columns' | 'single' | null;

export interface FunRetroSessionSummary {
  id: string;
  title: string | null;
  phase: string;
  createdByMemberId: string;
  createdByName: string;
  sprintName: string | null;
  cardCount: number;
  createdAt: string;
}
