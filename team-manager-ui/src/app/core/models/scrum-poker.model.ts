export interface ScrumPokerSession {
  id: string;
  title: string;
  storyTitle: string | null;
  description: string | null;
  scale: string;
  revealed: boolean;
  createdAt: string;
  revealedAt: string | null;
  createdByMemberName: string;
}

export interface ScrumPokerVote {
  id: string;
  memberId: string;
  memberName: string;
  value: string | null;
  votedAt: string;
}

export interface ScrumPokerSessionDetail {
  id: string;
  title: string;
  storyTitle: string | null;
  description: string | null;
  scale: string;
  revealed: boolean;
  createdAt: string;
  revealedAt: string | null;
  createdByMemberName: string;
  votes: ScrumPokerVote[];
}

export interface CreateScrumPokerSessionRequest {
  title: string;
  storyTitle?: string;
  description?: string;
  scale?: string;
}

export interface CastScrumPokerVoteRequest {
  value: string;
}

export const SCRUM_POKER_SCALES = {
  Fibonacci: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?'],
  TShirt: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '?'],
  Linear: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '?'],
  PowersOfTwo: ['1', '2', '4', '8', '16', '32', '?']
};
