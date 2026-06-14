export type WowPowerUp = 'Spotlight' | 'HypeMeter' | 'Wildcard';
export type WowChaosCard = 'ClownMode' | 'TinyText' | 'Autocorrect' | 'DramaticReading';

export interface WinNomination {
  id: string;
  winWeekId: string;
  teamMemberId: string | null;
  teamMemberName: string;
  isGuestNomination: boolean;
  nomineeMemberId: string;
  nomineeName: string;
  title: string;
  description: string | null;
  createdAt: string;
  voteCount: number;
  hasVoted: boolean;
  powerUp: WowPowerUp | null;
  chaosCard: WowChaosCard | null;
  hypeMeterCount: number;
}

export interface WinVote {
  id: string;
  winNominationId: string;
  teamMemberId: string;
  votedAt: string;
}

export interface WinSeries {
  id: string;
  name: string;
  createdAt: string;
}

export interface WinWeek {
  id: string;
  seriesId: string;
  seriesName: string;
  weekStart: string;
  status: 'Nominating' | 'Voting' | 'SuddenDeath' | 'Closed';
  winnerNominationId: string | null;
  winnerTitle: string | null;
  winnerNomineeName: string | null;
  openedAt: string;
  closedAt: string | null;
  suddenDeathEndsAt: string | null;
  currentMemberId: string;
  userVotesRemaining: number;
  userNominationsRemaining: number;
  totalVotesCast: number;
  activeMemberCount: number;
  connectedMemberCount: number;
  tiedNominationIds: string[];
  winnerStory: string | null;
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

export interface StartSuddenDeathRequest {
  tiedNominationIds: string[];
}

export interface GuestWinWeek {
  id: string;
  weekStart: string;
  status: 'Nominating' | 'Voting' | 'SuddenDeath' | 'Closed';
  isNominatingOpen: boolean;
  isVotingOpen: boolean;
  userNominationsRemaining: number;
  userVotesRemaining: number;
  winnerNomineeName: string | null;
  winnerTitle: string | null;
  winnerStory: string | null;
  suddenDeathEndsAt: string | null;
  tiedNominationIds: string[];
  nominations: GuestNomination[];
}

export interface GuestNomination {
  id: string;
  nomineeMemberId: string;
  nomineeName: string;
  nominatorDisplayName: string;
  title: string;
  description: string | null;
  voteCount: number;
  hasVoted: boolean;
  isOwned: boolean;
  createdAt: string;
  powerUp: WowPowerUp | null;
  chaosCard: WowChaosCard | null;
  hypeMeterCount: number;
}

export interface WowNominationDisplay {
  id: string;
  nomineeMemberId: string;
  nomineeName: string;
  nominatorName: string;
  title: string;
  description: string | null;
  voteCount: number;
  hasVoted: boolean;
  isOwned: boolean;
  powerUp: WowPowerUp | null;
  chaosCard: WowChaosCard | null;
  hypeMeterCount: number;
}

export interface ApplyWowCardRequest {
  type: string;
}

export interface GuestCreateNominationRequest {
  guestSessionId: string;
  guestName: string;
  nomineeMemberId: string;
  title: string;
  description?: string;
}
