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

/** A comment on a note — context added in place of a second sticky. Never anonymous. */
export interface RetroBoardNoteComment {
  id: string;
  noteId: string;
  authorId: string | null;      // null when a guest wrote it
  authorName: string;
  isOwn: boolean;               // the viewer wrote it, so they can delete it
  text: string;
  createdAt: string;
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
  /** Oldest-first. Always empty while the note is hidden until reveal. */
  comments: RetroBoardNoteComment[];
  /** Anchor of the group this note was merged into, or null when it stands alone. The anchor points
   *  at itself (`groupId === id`), and a group never spans columns. */
  groupId: string | null;
  /** What the group is about — only ever set on the anchor. */
  groupLabel: string | null;
}

/** One votable topic on the board: a group of merged notes, or a single loose note. The retro votes
 *  on these, not on raw notes — merging exists so an idea gets one vote budget rather than one per
 *  wording of it. Built by the store from the flat note list. */
export interface RetroTopic {
  /** The anchor's id for a group, the note's own id when loose — what the vote endpoints take. */
  id: string;
  columnId: string;
  /** Oldest-first; the anchor is `notes[0]` for a group. Always at least one note. */
  notes: RetroBoardNote[];
  /** True when this is a merged group rather than a single note. */
  isGroup: boolean;
  /** The group's name, or null to fall back to the anchor's text. */
  label: string | null;
  /** Summed across every note in the topic, so votes cast before a merge still count. */
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

export interface RetroVoteTheme {
  title: string;
  description: string;
  noteIds: string[];
}

export interface RetroVoteThemeSummary {
  themes: RetroVoteTheme[];
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
  voteThemes: RetroVoteThemeSummary | null;
  /** Last vote-theme synthesis failure, if any — set by the Vote-phase auto-fire or the manual
   *  trigger, cleared on the next successful run. Doesn't disturb a previous `voteThemes`. */
  voteThemesError: string | null;
  createdAt: string;
  startedAt: string | null;
  closedAt: string | null;
  archivedAt: string | null;
  columns: RetroBoardColumn[];
  notes: RetroBoardNote[];
  checkinQuestions: RetroBoardCheckinQuestion[];
  participants: RetroBoardParticipant[];
  /** Participants the host removed. Facilitator-only and deliberately separate from `participants`,
   *  which the roster and every responded meter count — so removals don't skew them. */
  removedParticipants: RetroBoardParticipant[];
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
