export interface PollSummary {
  id: string;
  question: string;
  createdByName: string;
  optionCount: number;
  totalVotes: number;
  isClosed: boolean;
  hideResultsUntilClosed: boolean;
  scheduledCloseAt: string | null;
  createdAt: string;
}

export interface PollOptionResult {
  id: string;
  text: string;
  voteCount: number;
  percentage: number;
}

export interface PollDetail {
  id: string;
  question: string;
  createdByName: string;
  isClosed: boolean;
  isCreator: boolean;
  hideResultsUntilClosed: boolean;
  resultsVisible: boolean;
  isPeekingAsCreator: boolean;
  scheduledCloseAt: string | null;
  totalVotes: number;
  myOptionId: string | null;
  createdAt: string;
  options: PollOptionResult[];
}

export interface CreatePollRequest {
  question: string;
  options: string[];
  hideResultsUntilClosed?: boolean;
  scheduledCloseAt?: string | null;
  retroSessionId?: string | null;
}
