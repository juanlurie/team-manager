export type RetroPhase =
  | 'setup' | 'checkin' | 'capture' | 'introduce' | 'vote' | 'discuss' | 'reflect' | 'summary';

export interface RetroPhaseFlags {
  enabled: boolean;
  enforced: boolean;
  timed: boolean;
}

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
  /** Null for a guest participant (no member record). */
  memberId: string | null;
  /** True when this participant joined as a guest (name-only, no member link). */
  isGuest: boolean;
  name: string;
  avatarSeed: string | null;
  role: 'facilitator' | 'participant';
  /** Per-phase "has participated" flags keyed by phase (checkin|capture|vote|reflect). */
  responded: Record<string, boolean>;
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
  /** Whether someone with no member record for this session's team may join as a named guest. */
  allowGuestJoin: boolean;
  hideNotesUntilReveal: boolean;
  notesRevealed: boolean;
  isArchived: boolean;
  stepDurations: RetroStepDurations;
  // Per-phase Session-Structure flags, keyed by phase (checkin/capture/introduce/vote/discuss/reflect).
  phaseConfig: Record<string, RetroPhaseFlags>;
  // Ordered phases active this run (config + auto-skip folded in) — drives the stepper/navigation.
  enabledPhases: string[];
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

/** What a guest sees for a board reached by its slug: the board (guest projection), whether this
 *  caller has already joined, and the name they joined under. Mirrors the API's GuestRetroBoardDto. */
export interface GuestRetroBoard {
  board: RetroBoardSession;
  hasJoined: boolean;
  displayName: string | null;
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
