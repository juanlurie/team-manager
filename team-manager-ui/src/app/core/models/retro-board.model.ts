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

/** Single frontend source for placeholder step durations, used only until a session's real
 *  values (the server defaults) arrive. Mirrors the C# RetroStepDurations defaults. */
export const DEFAULT_STEP_DURATIONS: RetroStepDurations = {
  meeting: 3600, checkin: 180, capture: 480, introduceRead: 60,
  introduceTopic: 30, vote: 300, discussTopic: 120, reflect: 120,
};

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

export interface RetroBoardFeedbackPrompt {
  id: string;
  text: string;
  sortOrder: number;
  myScore: number | null;
  myComment: string | null;
  // Anonymous aggregate — only populated for facilitators.
  responseCount: number;
  averageScore: number | null;
  distribution: number[];        // counts of each star value 1..5, index 0 = one star
  comments: string[];
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
  status: 'draft' | 'open' | 'live' | 'closed';
  votesPerUser: number;
  myVotesUsed: number;
  allowAnonymous: boolean;
  hideNotesUntilReveal: boolean;
  notesRevealed: boolean;
  isArchived: boolean;
  stepDurations: RetroStepDurations;
  liveStateJson: string | null;
  aiSummary: RetroBoardAiSummary | null;
  createdAt: string;
  startedAt: string | null;
  closedAt: string | null;
  archivedAt: string | null;
  columns: RetroBoardColumn[];
  notes: RetroBoardNote[];
  checkinQuestions: RetroBoardCheckinQuestion[];
  participants: RetroBoardParticipant[];
  actions: RetroBoardAction[];
  feedbackPrompts: RetroBoardFeedbackPrompt[];
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
  isFacilitator: boolean;
  isArchived: boolean;
  participantCount: number;
  noteCount: number;
  createdAt: string;
  closedAt: string | null;
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

export interface FeedbackPromptInput {
  text: string;
}
