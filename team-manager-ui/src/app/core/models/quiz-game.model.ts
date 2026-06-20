export interface QuizGameSessionSummary {
  id: string;
  title: string | null;
  status: 'Waiting' | 'InProgress' | 'Completed';
  questionCount: number;
  createdByName: string;
  participantCount: number;
  createdAt: string;
}

export interface QuizGameParticipant {
  memberId: string;
  memberName: string;
  score: number;
}

export interface QuizGameSession {
  id: string;
  title: string | null;
  status: 'Waiting' | 'InProgress' | 'Completed';
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
}

export interface CreateQuizGameSessionRequest {
  title?: string;
  questionCount?: number;
}
