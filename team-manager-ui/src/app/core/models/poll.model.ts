export interface PollSummary {
  id: string;
  question: string;
  createdByName: string;
  optionCount: number;
  totalVotes: number;
  isClosed: boolean;
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
  totalVotes: number;
  myOptionId: string | null;
  createdAt: string;
  options: PollOptionResult[];
}

export interface CreatePollRequest {
  question: string;
  options: string[];
}
