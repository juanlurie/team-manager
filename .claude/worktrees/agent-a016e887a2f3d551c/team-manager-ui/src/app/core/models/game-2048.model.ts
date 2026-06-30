export interface Game2048Participant {
  id: string;
  memberId: string;
  displayName: string;
  order: number;
  score: number;
  board: number[];
  isGameOver: boolean;
  hasWon: boolean;
  isMe: boolean;
}

export interface Game2048Session {
  id: string;
  title: string | null;
  status: 'waiting' | 'inprogress' | 'completed';
  createdByMemberId: string;
  isCreator: boolean;
  createdAt: string;
  participants: Game2048Participant[];
}

export interface Game2048SessionSummary {
  id: string;
  title: string | null;
  status: string;
  playerCount: number;
  createdByName: string;
  createdAt: string;
}
