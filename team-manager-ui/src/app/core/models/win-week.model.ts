export interface WinNomination {
  id: string;
  winWeekId: string;
  teamMemberId: string;
  teamMemberName: string;
  nomineeMemberId: string;
  nomineeName: string;
  title: string;
  description: string | null;
  createdAt: string;
  voteCount: number;
  hasVoted: boolean;
}

export interface WinVote {
  id: string;
  winNominationId: string;
  teamMemberId: string;
  votedAt: string;
}

export interface WinWeek {
  id: string;
  weekStart: string;
  status: 'Nominating' | 'Voting' | 'Closed';
  winnerNominationId: string | null;
  winnerTitle: string | null;
  winnerNomineeName: string | null;
  openedAt: string;
  closedAt: string | null;
  currentMemberId: string;
  userVotesRemaining: number;
  userNominationsRemaining: number;
  nominations: WinNomination[];
}

export interface WinWeekHistory {
  id: string;
  weekStart: string;
  weekEnd: string;
  winnerNomineeName: string | null;
  winnerTitle: string | null;
  winnerDescription: string | null;
  winnerVoteCount: number;
  closedAt: string;
}

export interface WinWeekDetail {
  id: string;
  weekStart: string;
  weekEnd: string;
  winnerNomineeName: string | null;
  winnerTitle: string | null;
  allNominations: WinNomination[];
}

export interface WinMonth {
  id: string;
  year: number;
  month: number;
  status: 'Pending' | 'Voting' | 'Closed';
  monthName: string;
  votingEndsAt?: string;
  winnerNominationId: string | null;
  winnerNomineeName: string | null;
  winnerTitle: string | null;
  currentMemberId: string;
  userVotesRemaining: number;
  hasUserVoted: boolean;
  nominations: WinMonthNomination[];
}

export interface WinMonthNomination {
  id: string;
  sourceWinWeekId: string;
  nomineeName: string;
  title: string;
  description: string | null;
  voteCount: number;
  hasVoted: boolean;
  sourceWeekStart: string;
}

export interface WinMonthHistory {
  id: string;
  year: number;
  month: number;
  monthName: string;
  winnerNomineeName: string | null;
  winnerTitle: string | null;
  winnerVoteCount: number;
  closedAt: string;
}

export interface CreateNominationRequest {
  nomineeMemberId: string;
  title: string;
  description?: string;
}

export interface CloseWeekRequest {
  winnerNominationId: string;
}
