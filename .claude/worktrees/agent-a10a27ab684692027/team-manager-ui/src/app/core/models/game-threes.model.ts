export interface GameThreesParticipant {
  id: string;
  memberId: string;
  displayName: string;
  order: number;
  score: number;
  board: number[];
  nextTile: number;
  isGameOver: boolean;
  isMe: boolean;
}

export interface GameThreesSession {
  id: string;
  title: string | null;
  status: string; // 'inprogress' | 'completed'
  createdByMemberId: string;
  isCreator: boolean;
  createdAt: string;
  participants: GameThreesParticipant[];
}

export interface GameThreesSessionSummary {
  id: string;
  title: string | null;
  status: string;
  playerCount: number;
  createdByName: string;
  createdAt: string;
}
