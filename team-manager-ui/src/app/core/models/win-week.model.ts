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
  userVotesRemaining: number;
  userNominationsRemaining: number;
  nominations: WinNomination[];
}

export interface CreateNominationRequest {
  nomineeMemberId: string;
  title: string;
  description?: string;
}

export interface CloseWeekRequest {
  winnerNominationId: string;
}
