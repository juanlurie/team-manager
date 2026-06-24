export type QuizGameMode = 'Classic' | 'Millionaire';
export type QuizMillionaireStatus = 'NotStarted' | 'Playing' | 'Eliminated' | 'WalkedAway' | 'Won';

export interface QuizGameSessionSummary {
  id: string;
  title: string | null;
  status: 'Waiting' | 'InProgress' | 'Completed';
  gameMode: QuizGameMode;
  questionCount: number;
  createdByName: string;
  participantCount: number;
  createdAt: string;
}

export interface QuizGameParticipant {
  memberId: string;
  memberName: string;
  score: number;
  millionaireRoundIndex: number;
  millionaireWinnings: number;
  millionaireStatus: QuizMillionaireStatus;
}

export interface QuizMillionaireRun {
  roundIndex: number;
  status: QuizMillionaireStatus;
  question: string | null;
  options: string[];
  endsAt: string | null;
  winnings: number;
  safeHavenWinnings: number;
  revealedCorrectIndex: number | null;
}

export interface QuizGameSession {
  id: string;
  title: string | null;
  status: 'Waiting' | 'InProgress' | 'Completed';
  gameMode: QuizGameMode;
  questionCount: number;
  currentQuestionIndex: number;
  currentQuestion: string | null;
  currentOptions: string[];
  currentQuestionEndsAt: string | null;
  currentQuestionRevealed: boolean;
  revealEndsAt: string | null;
  currentCorrectIndex: number | null;
  myAnswerIndex: number | null;
  answeredMemberIds: string[];
  isCreator: boolean;
  isParticipant: boolean;
  currentMemberId: string;
  participants: QuizGameParticipant[];
  millionairePrizeLadder: number[];
  millionaireSafeHavenRounds: number[];
  myMillionaireRun: QuizMillionaireRun | null;
}

export interface CreateQuizGameSessionRequest {
  title?: string;
  questionCount?: number;
  gameMode?: QuizGameMode;
  // Classic mode only, 1-15 scale -- ignored for Millionaire (escalates per-round instead).
  difficultyLevel?: number;
}
