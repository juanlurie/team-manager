export interface DotsAndBoxesLine {
  t: 'H' | 'V';
  r: number;
  c: number;
}

export interface DotsAndBoxesParticipant {
  id: string;
  memberId: string | null;
  displayName: string;
  order: number;
  score: number;
  isMe: boolean;
  isCurrentTurn: boolean;
  isAi: boolean;
}

export interface DotsAndBoxesSession {
  id: string;
  title: string | null;
  status: 'waiting' | 'inprogress' | 'completed';
  gridSize: number;
  lines: DotsAndBoxesLine[];
  boxes: Record<string, string>;
  currentParticipantId: string | null;
  createdByMemberId: string;
  isCreator: boolean;
  isMyTurn: boolean;
  myParticipantId: string | null;
  createdAt: string;
  participants: DotsAndBoxesParticipant[];
  hasAi: boolean;
}

export interface DotsAndBoxesSessionSummary {
  id: string;
  title: string | null;
  status: string;
  gridSize: number;
  playerCount: number;
  createdByName: string;
  createdAt: string;
}
