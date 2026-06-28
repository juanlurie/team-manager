export interface GameUltimateTttParticipant {
  id: string;
  memberId: string | null;
  displayName: string;
  order: number;   // 0 = X, 1 = O
  score: number;   // small boards won
  isWinner: boolean;
  isMe: boolean;
  isAi: boolean;
}

export interface GameUltimateTttSession {
  id: string;
  title: string | null;
  status: 'waiting' | 'inprogress' | 'completed';
  createdByMemberId: string;
  isCreator: boolean;
  isAiGame: boolean;
  createdAt: string;
  participants: GameUltimateTttParticipant[];
  cells: number[];      // 81 ints: 0=empty 1=X 2=O
  bigBoard: number[];   // 9 ints:  0=empty 1=X 2=O 3=draw
  currentTurnMemberId: string | null;
  nextBoardIndex: number;  // -1=free, 0-8=required
  winnerMemberId: string | null;
}

export interface GameUltimateTttSessionSummary {
  id: string;
  title: string | null;
  status: string;
  playerCount: number;
  createdByName: string;
  createdAt: string;
}
