import { MyRoyaleResult } from './wordle-royale.model';

export type WordleStatus = 'Playing' | 'Won' | 'Lost';

export interface WordleSessionSummary {
  id: string;
  title: string | null;
  status: 'Waiting' | 'InProgress' | 'Completed';
  createdByName: string;
  participantCount: number;
  createdAt: string;
}

export interface WordleGuessResult {
  word: string;
  letters: ('correct' | 'present' | 'absent')[];
}

export interface WordleParticipant {
  memberId: string;
  memberName: string;
  status: WordleStatus;
  guessCount: number;
}

export interface WordleSession {
  id: string;
  title: string | null;
  status: 'Waiting' | 'InProgress' | 'Completed';
  isCreator: boolean;
  isParticipant: boolean;
  currentMemberId: string;
  wordLength: number;
  maxGuesses: number;
  participants: WordleParticipant[];
  myStatus: WordleStatus;
  myGuesses: WordleGuessResult[];
  revealedWord: string | null;
  revealedWordIsAiGenerated: boolean | null;
  myRoyaleResult: MyRoyaleResult | null;
}

export interface CreateWordleSessionRequest {
  title?: string;
}
