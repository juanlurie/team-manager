export interface GameConnectionsParticipant {
  id: string;
  memberId: string;
  displayName: string;
  isMe: boolean;
}

export interface GameConnectionsGroup {
  groupIndex: number;
  difficulty: number; // 0=yellow 1=green 2=blue 3=purple
  label: string | null;
  words: string[] | null;
  wasRevealed: boolean;
}

export interface GameConnectionsSession {
  id: string;
  title: string | null;
  status: 'waiting' | 'inprogress' | 'won' | 'lost';
  words: string[];
  solvedGroups: GameConnectionsGroup[];
  mistakesUsed: number;
  createdByMemberId: string;
  isCreator: boolean;
  myParticipantId: string | null;
  createdAt: string;
  participants: GameConnectionsParticipant[];
  lastGuessResult: 'correct' | 'one_away' | 'wrong' | null;
}

export interface GameConnectionsSessionSummary {
  id: string;
  title: string | null;
  status: string;
  playerCount: number;
  createdByName: string;
  createdAt: string;
}
