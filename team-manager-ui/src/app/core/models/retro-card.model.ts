export type RetroColumn = 'well' | 'better' | 'action';
export type RetroPhase = 'lobby' | 'add' | 'vote' | 'discuss' | 'actions';

export interface RetroCard {
  id: string;
  sprintId: string;
  column: RetroColumn;
  text: string;
  authorName: string;
  authorId: string | null;
  createdAt: string;
  voteCount: number;
  myVoteCount: number;
}

export interface CreateRetroCardRequest {
  sprintId: string;
  column: RetroColumn;
  text: string;
  authorName: string;
}

export interface ToggleVoteResponse {
  cardId: string;
  voteCount: number;
  myVoteCount: number;
  voted: boolean;
}
