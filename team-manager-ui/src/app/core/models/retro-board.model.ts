export type RetroPhase =
  | 'setup' | 'checkin' | 'capture' | 'introduce' | 'vote' | 'discuss' | 'reflect' | 'summary';

export interface RetroStepDurations {
  meeting: number;
  checkin: number;
  capture: number;
  introduceRead: number;
  introduceTopic: number;
  vote: number;
  discussTopic: number;
  reflect: number;
}

export interface RetroBoardColumn {
  id: string;
  key: string;
  label: string;
  description: string | null;
  color: string;
  icon: string;
  sortOrder: number;
}

export interface RetroBoardNote {
  id: string;
  columnId: string;
  columnKey: string;
  text: string | null;          // null when hidden until reveal
  authorId: string | null;
  authorName: string | null;
  authorAvatarSeed: string | null;
  isAnonymous: boolean;
  isOwn: boolean;
  flagged: boolean;
  clarification: string | null;
  introducedAt: string | null;
  createdAt: string;
  voteCount: number;
  myVoteCount: number;
}

export interface RetroBoardCheckinQuestion {
  id: string;
  text: string;
  contextText: string | null;
  sourceActionId: string | null;
  sortOrder: number;
  myRating: string | null;      // better|same|worse|na
  better: number;
  same: number;
  worse: number;
  na: number;
}

export interface RetroBoardParticipant {
  id: string;
  memberId: string;
  name: string;
  avatarSeed: string | null;
  role: 'facilitator' | 'participant';
  isSelfPaced: boolean;
  completedPhases: string[];
}

export interface RetroBoardAction {
  id: string;
  sourceNoteId: string | null;
  title: string;
  ownerMemberId: string | null;
  ownerName: string | null;
  assigneeMemberIds: string[];
  status: string;
  dueDate: string | null;
  isAiSuggested: boolean;
}

export interface RetroBoardAiSummary {
  strengthThemes: string[];
  improveThemes: string[];
  insights: string[];
  suggestedActions: string[];
}

export interface RetroBoardSession {
  id: string;
  slug: string | null;
  title: string | null;
  squadId: string | null;
  squadName: string | null;
  sprintId: string | null;
  sprintName: string | null;
  createdByMemberId: string;
  isFacilitator: boolean;
  phase: RetroPhase;
  status: 'draft' | 'live' | 'closed';
  votesPerUser: number;
  myVotesUsed: number;
  allowAnonymous: boolean;
  hideNotesUntilReveal: boolean;
  notesRevealed: boolean;
  stepDurations: RetroStepDurations;
  liveStateJson: string | null;
  aiSummary: RetroBoardAiSummary | null;
  createdAt: string;
  startedAt: string | null;
  closedAt: string | null;
  columns: RetroBoardColumn[];
  notes: RetroBoardNote[];
  checkinQuestions: RetroBoardCheckinQuestion[];
  participants: RetroBoardParticipant[];
  actions: RetroBoardAction[];
}

export interface RetroBoardSummary {
  id: string;
  title: string | null;
  slug: string | null;
  phase: RetroPhase;
  status: string;
  squadName: string | null;
  createdByMemberId: string;
  createdByName: string;
  participantCount: number;
  noteCount: number;
  createdAt: string;
}

export interface RetroColumnInput {
  key?: string;
  label: string;
  description?: string | null;
  color: string;
  icon: string;
}

export interface CheckinQuestionInput {
  text: string;
  contextText?: string | null;
}
