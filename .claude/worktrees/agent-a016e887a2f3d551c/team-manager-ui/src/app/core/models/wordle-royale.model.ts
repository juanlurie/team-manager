export interface RoyaleStanding {
  rank: number;
  memberId: string;
  memberName: string;
  elo: number;
  winStreak: number;
  bestStreak: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface RoyaleMatch {
  id: string;
  sessionId: string;
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  winnerId: string | null;
  player1Guesses: number;
  player2Guesses: number;
  player1Won: boolean;
  player2Won: boolean;
  player1EloChange: number;
  player2EloChange: number;
  player1EloAfter: number;
  player2EloAfter: number;
  playedAt: string;
}

export interface WeeklyRoyale {
  isoWeek: number;
  year: number;
  matches: RoyaleMatch[];
}

export interface MyRoyaleResult {
  eloChange: number;
  eloAfter: number;
  winStreak: number;
  matchesWon: number;
  matchesLost: number;
  matchesDrawn: number;
}
