import { Injectable, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, EMPTY, takeUntil, debounceTime, switchMap, catchError } from 'rxjs';

import { RetroBoardService } from '../../../core/services/retro-board.service';
import { SquadService } from '../../../core/services/squad.service';
import { Squad } from '../../../core/models/squad.model';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { WebSocketService } from '../../../core/websocket/websocket.service';
import { AuthService } from '../../../core/auth/auth.service';
import {
  RetroBoardSession, RetroBoardSummary, RetroPhase, RetroBoardNote,
  RetroBoardFeedbackPrompt, RetroStepDurations, RetroPhaseFlags, RetroColumnInput, DEFAULT_STEP_DURATIONS,
} from '../../../core/models/retro-board.model';
import * as F from './retro-format';

export type StructureLevel = 'freeform' | 'guided' | 'structured';

/** Session Structure levels — a starting suggestion that maps to per-phase flags (never an opaque
 *  mode). `enforced`/`timed` gate the live flow (honoured from Slice 2); `introduce`/`reflect` are the
 *  optional phases each level turns on by default. */
export const STRUCTURE_LEVELS: { key: StructureLevel; label: string; blurb: string }[] = [
  { key: 'freeform',   label: 'Freeform',   blurb: 'Open capture & discuss, no timers — best for small groups that self-organise.' },
  { key: 'guided',     label: 'Guided',     blurb: 'Timed phases you can advance early; Introduce & Reflect optional.' },
  { key: 'structured', label: 'Structured', blurb: 'Full phased flow with timers — keeps larger groups on pace and gives equal airtime.' },
];
const LEVEL_FLAGS: Record<StructureLevel, { enforced: boolean; timed: boolean; introduce: boolean; reflect: boolean }> = {
  freeform:   { enforced: false, timed: false, introduce: false, reflect: false },
  guided:     { enforced: false, timed: true,  introduce: false, reflect: false },
  structured: { enforced: true,  timed: true,  introduce: true,  reflect: true  },
};
// The live phases that carry per-phase flags (setup/summary aren't configurable here).
const LIVE_PHASES = ['checkin', 'capture', 'introduce', 'vote', 'discuss', 'reflect'];

/** Retro column templates — pre-fill the Themes/Columns via the bulk set-columns endpoint (still
 *  fully editable afterwards). "classic" mirrors the server default. */
export const COLUMN_TEMPLATES: { key: string; name: string; desc: string; columns: RetroColumnInput[] }[] = [
  { key: 'classic', name: 'Classic', desc: 'What Went Well / What to Improve / Questions / Shout-outs', columns: [
    { key: 'well', label: 'What Went Well', description: 'Celebrate wins & strengths', color: '#2fd47e', icon: 'star' },
    { key: 'better', label: 'What to Improve', description: 'Things that could be better', color: '#f4566b', icon: 'star' },
    { key: 'quest', label: 'Questions', description: 'Seek clarity', color: '#f5b544', icon: 'star' },
    { key: 'shout', label: 'Shout-outs', description: 'Recognition & gratitude', color: '#5b9dff', icon: 'star' },
  ] },
  { key: 'ssc', name: 'Start-Stop-Continue', desc: 'Start / Stop / Continue', columns: [
    { key: 'start', label: 'Start', description: 'Things to begin doing', color: '#2fd47e', icon: 'star' },
    { key: 'stop', label: 'Stop', description: 'Things to quit doing', color: '#f4566b', icon: 'star' },
    { key: 'continue', label: 'Continue', description: 'Things working well', color: '#5b9dff', icon: 'star' },
  ] },
  { key: '4ls', name: '4Ls', desc: 'Liked / Learned / Lacked / Longed for', columns: [
    { key: 'liked', label: 'Liked', description: 'What you enjoyed', color: '#2fd47e', icon: 'star' },
    { key: 'learned', label: 'Learned', description: 'New insights gained', color: '#5b9dff', icon: 'star' },
    { key: 'lacked', label: 'Lacked', description: 'What was missing', color: '#f5b544', icon: 'star' },
    { key: 'longed', label: 'Longed for', description: 'What you wished for', color: '#b07cff', icon: 'star' },
  ] },
  { key: 'sailboat', name: 'Sailboat', desc: 'Wind / Anchor / Rocks / Island', columns: [
    { key: 'wind', label: 'Wind', description: 'What propels us forward', color: '#2fd47e', icon: 'star' },
    { key: 'anchor', label: 'Anchor', description: 'What holds us back', color: '#f4566b', icon: 'star' },
    { key: 'rocks', label: 'Rocks', description: 'Risks ahead to avoid', color: '#f5934a', icon: 'star' },
    { key: 'island', label: 'Island', description: 'The goal we sail toward', color: '#5b9dff', icon: 'star' },
  ] },
  { key: 'madsadglad', name: 'Mad-Sad-Glad', desc: 'Mad / Sad / Glad', columns: [
    { key: 'mad', label: 'Mad', description: 'Frustrations', color: '#f4566b', icon: 'star' },
    { key: 'sad', label: 'Sad', description: 'Disappointments', color: '#f5b544', icon: 'star' },
    { key: 'glad', label: 'Glad', description: 'What made you happy', color: '#2fd47e', icon: 'star' },
  ] },
];

export type PresetName = 'quick' | 'standard' | 'deep' | 'custom';

/**
 * Session-length presets. Each writes to the SAME per-phase timer fields manual entry does — this is
 * purely a convenience layer. Ratios are hand-tuned per preset, NOT a uniform scale: Quick squeezes
 * the topic-scaling phases (Capture, per-topic Discuss) hardest while keeping Check-in/Reflect nearer
 * their Standard length; Deep expands those same phases most.
 */
export const SESSION_PRESETS: Record<Exclude<PresetName, 'custom'>, RetroStepDurations> = {
  quick:    { meeting: 1800, checkin: 120, capture: 210, introduceRead: 45,  introduceTopic: 20, vote: 150, discussTopic: 60,  reflect: 90  },
  standard: { meeting: 3600, checkin: 180, capture: 480, introduceRead: 60,  introduceTopic: 30, vote: 300, discussTopic: 120, reflect: 120 },
  deep:     { meeting: 5400, checkin: 300, capture: 900, introduceRead: 120, introduceTopic: 45, vote: 420, discussTopic: 240, reflect: 180 },
};

export const PRESET_OPTIONS: { key: PresetName; label: string; short: string }[] = [
  { key: 'quick', label: 'Quick · 30m', short: 'Quick' },
  { key: 'standard', label: 'Standard · 60m', short: 'Standard' },
  { key: 'deep', label: 'Deep · 90m', short: 'Deep' },
  { key: 'custom', label: 'Custom', short: 'Custom' },
];

export const PHASES: { key: RetroPhase; label: string }[] = [
  { key: 'setup', label: 'Setup' }, { key: 'checkin', label: 'Check-in' }, { key: 'capture', label: 'Capture' },
  { key: 'introduce', label: 'Introduce' }, { key: 'vote', label: 'Vote' }, { key: 'discuss', label: 'Discuss' },
  { key: 'reflect', label: 'Reflect' }, { key: 'summary', label: 'Summary' },
];
export const RATINGS = [
  { v: 'better', label: 'Better', color: '#34d67f' }, { v: 'same', label: 'Same', color: '#f5b544' },
  { v: 'worse', label: 'Worse', color: '#f4566b' }, { v: 'na', label: 'N/A', color: '#7c8195' },
];
export const TIMER_FIELDS: { key: keyof RetroBoardSession['stepDurations']; label: string }[] = [
  { key: 'checkin', label: 'Check-in' }, { key: 'capture', label: 'Capture' }, { key: 'introduceRead', label: 'Read / flag' },
  { key: 'introduceTopic', label: 'Per topic intro' }, { key: 'vote', label: 'Vote' }, { key: 'discussTopic', label: 'Discuss / topic' },
  { key: 'reflect', label: 'Reflect' },
];
// phase -> which timer duration applies when the facilitator starts the clock
const PHASE_TIMER: Record<string, keyof RetroBoardSession['stepDurations']> = {
  checkin: 'checkin', capture: 'capture', introduce: 'introduceRead', vote: 'vote', discuss: 'discussTopic', reflect: 'reflect',
};

export interface Member { id: string; name: string; }
export interface ActionDraft { noteId: string; title: string; assignees: string[]; }

/**
 * Holds all RetroBoard view state and the service orchestration for a single mounted board.
 * Provided at the container-component level (not root), so it is created fresh per navigation
 * and shared by the container and every phase child component through Angular DI.
 */
@Injectable()
export class RetroBoardStore implements OnDestroy {
  private svc = inject(RetroBoardService);
  private squadSvc = inject(SquadService);
  private memberSvc = inject(TeamMemberService);
  private ws = inject(WebSocketService);
  private auth = inject(AuthService);
  private router = inject(Router);

  private destroy$ = new Subject<void>();
  // Coalesces refetches: bursts of rb_* events (and rapid local actions) collapse into a single
  // full-session GET, and switchMap cancels any in-flight fetch so the latest result always wins.
  private refresh$ = new Subject<string>();

  readonly phases = PHASES;
  readonly ratings = RATINGS;
  readonly timerFields = TIMER_FIELDS;
  readonly swatches = ['#2fd47e', '#f4566b', '#f5b544', '#5b9dff', '#b07cff', '#f5934a', '#2dd4bf', '#f472b6'];
  readonly starScale = [1, 2, 3, 4, 5];
  readonly starScaleDesc = [5, 4, 3, 2, 1];

  session = signal<RetroBoardSession | null>(null);
  summaries = signal<RetroBoardSummary[]>([]);
  archived = signal<RetroBoardSummary[]>([]);
  showArchived = signal(false);
  members = signal<Member[]>([]);
  squads = signal<Squad[]>([]);
  error = signal<string | null>(null);
  creating = signal(false);
  joining = signal(false);
  analysing = signal(false);
  viewAs = signal<'facilitator' | 'participant'>('facilitator');
  // Facilitator is editing the setup (questions/structure/timers) mid-session — overlays the board.
  editingSetup = signal(false);
  // Freeform lets a participant navigate their own view independently of the shared phase; null =
  // follow the facilitator. Reset whenever the run isn't live+freeform (see setSession).
  private localPhase = signal<RetroPhase | null>(null);
  actionDraft = signal<ActionDraft | null>(null);
  private timerNow = signal(Date.now());
  // Offset (ms) between the server clock and this client's clock, learned from the response Date
  // header, so live countdowns stay in sync across machines with skewed clocks.
  private serverOffsetMs = 0;

  readonly myId = this.auth.me?.id ?? '';
  // Three related facilitator gates — use the narrowest that fits:
  //   • session.isFacilitator (raw) — the caller's actual role; use ONLY for facilitator-exclusive
  //     chrome that must survive the preview toggle (i.e. the Facilitator/Participant switch itself).
  //   • amFacilitator() — isFacilitator AND currently in facilitator view; use for every facilitator
  //     action/control so the participant PREVIEW faithfully hides it.
  //   • liveFacilitation() — amFacilitator AND the session is live; use for controls that only make
  //     sense in the running guided flow (advance phase, reveal notes) — hidden during 'open'.
  amFacilitator = computed(() => !!this.session()?.isFacilitator && this.viewAs() === 'facilitator');
  liveFacilitation = computed(() => this.amFacilitator() && this.session()?.status === 'live');
  // The phase the *viewer* is on: their local freeform phase if set, else the shared session phase.
  viewPhase = computed<RetroPhase | null>(() => this.localPhase() ?? this.session()?.phase ?? null);
  phaseIndex = computed(() => this.phases.findIndex(p => p.key === this.viewPhase()));
  // Structure level of this run (derived from the per-phase flags) + its runtime consequences.
  isFreeform = computed(() => this.structureLevelOf(this.session()?.phaseConfig ?? {}) === 'freeform');
  isStructured = computed(() => this.structureLevelOf(this.session()?.phaseConfig ?? {}) === 'structured');
  // Timers only apply when the viewed phase is `timed` (Freeform turns them off).
  timerAllowed = computed(() => { const s = this.session(); const vp = this.viewPhase(); return !!s && (!vp || s.phaseConfig[vp]?.timed !== false); });
  // Steps a participant sees in the live stepper — the collaborative core, without setup/reflect/summary.
  private readonly participantSteps = ['checkin', 'capture', 'introduce', 'vote', 'discuss'];
  // Only the phases active this run (enabledPhases) show in the stepper; participants also lose reflect/summary.
  visibleSteps = computed(() => {
    const enabled = this.session()?.enabledPhases ?? [];
    const base = this.phases.filter(p => enabled.includes(p.key));
    return this.amFacilitator() ? base : base.filter(p => this.participantSteps.includes(p.key));
  });
  // A step is "done" by its position in the full flow, independent of which steps are shown.
  stepDone(key: string) { return this.phases.findIndex(p => p.key === key) < this.phaseIndex(); }
  // Next phase active this run (skips disabled/auto-skipped phases); null once on the last one.
  nextPhase(): RetroPhase | null {
    const s = this.session(); if (!s) return null;
    const i = s.enabledPhases.indexOf(s.phase);
    return i >= 0 && i < s.enabledPhases.length - 1 ? s.enabledPhases[i + 1] as RetroPhase : null;
  }
  nextPhaseLabel() { const n = this.nextPhase(); return n ? this.phaseLabel(n) : 'Finish'; }
  goNext() { const n = this.nextPhase(); if (n) this.goPhase(n); }
  // Single source of truth for what the board's main area renders: draft is handled by the setup
  // shell; 'open' shows the pre-capture combo; a closed retro always shows the Summary recap;
  // otherwise (live) it follows the current phase.
  mainView = computed<'precapture' | 'summary' | RetroPhase | null>(() => {
    const s = this.session();
    if (!s) return null;
    if (s.status === 'open') return 'precapture';
    if (s.status === 'closed') return 'summary';
    return this.viewPhase();   // live: the viewer's phase (their freeform local phase, else the shared one)
  });
  // Whether the viewer may click a stepper phase. Facilitator drives the shared phase (Structured
  // blocks jumping ahead — advance via Continue only); participants only navigate in Freeform (locally).
  canNavigateTo(key: string): boolean {
    const s = this.session(); if (!s || !s.enabledPhases.includes(key)) return false;
    if (this.amFacilitator()) {
      if (!this.isStructured()) return true;                       // guided/freeform: jump anywhere
      return s.enabledPhases.indexOf(key) <= s.enabledPhases.indexOf(s.phase);   // structured: current or earlier
    }
    return !this.isStructured();                                   // participants navigate in freeform + guided (locally)
  }
  // Previous / next phase relative to the viewer's current phase (for the ← / → nav; freeform + guided).
  private relPhase(dir: -1 | 1): RetroPhase | null {
    const s = this.session(); if (!s) return null;
    const i = s.enabledPhases.indexOf(this.viewPhase() ?? '');
    const j = i + dir;
    return i >= 0 && j >= 0 && j < s.enabledPhases.length ? s.enabledPhases[j] as RetroPhase : null;
  }
  canGoPrev() { const p = this.relPhase(-1); return !!p && this.canNavigateTo(p); }
  canGoNext() { const p = this.relPhase(1); return !!p && this.canNavigateTo(p); }
  goPrevPhase() { const p = this.relPhase(-1); if (p) this.navigate(p); }
  goNextPhase() { const p = this.relPhase(1); if (p) this.navigate(p); }
  /** Stepper navigation entry point: facilitator changes the shared phase; a freeform participant
   *  moves only their own view. */
  navigate(key: RetroPhase) {
    if (!this.canNavigateTo(key)) return;
    if (this.amFacilitator()) { this.localPhase.set(null); this.goPhase(key); }
    else this.localPhase.set(key);
  }
  flagged = computed(() => this.session()?.notes.filter(n => n.flagged) ?? []);
  // Flagged notes grouped under their theme/column, in column order, skipping empty groups.
  flaggedByColumn = computed(() => {
    const by = this.notesByColumn();
    return (this.session()?.columns ?? [])
      .map(c => ({ column: c, notes: (by[c.id] ?? []).filter(n => n.flagged) }))
      .filter(g => g.notes.length > 0);
  });
  sortedByVotes = computed(() => [...(this.session()?.notes ?? [])].sort((a, b) => b.voteCount - a.voteCount));
  // "N/M responded" meters count everyone in the retro (facilitators take part too — a solo admin
  // who answers should read 1/1, not 0/0), keyed by phase (checkin|capture|vote|reflect).
  private respondents = computed(() => this.session()?.participants ?? []);
  respondedTotal = computed(() => this.respondents().length);
  respondedFor(phase: string) { return this.respondents().filter(p => p.responded[phase]).length; }
  feedbackDone = computed(() => { const ps = this.session()?.feedbackPrompts ?? []; return ps.length > 0 && ps.every(p => p.myScore != null); });
  phaseTimerKey = computed(() => PHASE_TIMER[this.session()?.phase ?? '']);

  // PF3: notes grouped by column once per session change, instead of filtering on every call.
  private notesByColumn = computed(() => {
    const map: Record<string, RetroBoardNote[]> = {};
    for (const n of this.session()?.notes ?? []) (map[n.columnId] ??= []).push(n);
    return map;
  });

  // Whether a countdown is actively ticking; drives the 1s interval so it never runs in the
  // lobby (PF5) and stops while paused.
  private timerRunning = computed(() => {
    const s = this.session();
    if (!s?.liveStateJson) return false;
    try { const st = JSON.parse(s.liveStateJson); return !!(st.startedAt && st.seconds && !st.paused); } catch { return false; }
  });

  // True while the phase clock is paused (frozen remaining stored in `seconds`, no `startedAt`).
  isPaused = computed(() => {
    const s = this.session(); if (!s?.liveStateJson) return false;
    try { return !!JSON.parse(s.liveStateJson).paused; } catch { return false; }
  });

  timer = computed(() => {
    const s = this.session(); if (!s?.liveStateJson) return null;
    const nowMs = this.timerNow();
    try {
      const st = JSON.parse(s.liveStateJson) as { startedAt?: string | null; seconds?: number; paused?: boolean };
      if (!st.seconds) return null;
      // Paused: `seconds` holds the frozen remaining directly.
      if (st.paused || !st.startedAt) return Math.max(0, Math.round(st.seconds));
      const rem = Math.round(st.seconds - (nowMs - new Date(st.startedAt).getTime()) / 1000);
      return rem > 0 ? rem : 0;
    } catch { return null; }
  });

  newTitle = '';
  joinCode = '';
  edit = { votes: 6, anon: true, d: { ...DEFAULT_STEP_DURATIONS } };
  // Facilitator's estimate of how many topics will be discussed; the per-topic timers
  // (intro + discuss) are multiplied by this for the Allocated/Remaining budget. UI-only.
  topicEstimate = 5;
  // Expected number of participants — nudges the preset/structure recommendation. Auto-detects from
  // the roster until the facilitator edits it (in case more people join before the retro opens).
  teamSize = 8;
  private teamSizeTouched = false;
  readonly presetOptions = PRESET_OPTIONS;
  newColumn = ''; newQuestion = ''; newPrompt = '';
  fbComments: Record<string, string> = {};
  manual = { title: '', assignees: [] as string[] };
  assigneeQuery = '';
  draft: Record<string, string> = {}; draftAnon: Record<string, boolean> = {};
  private joinedId: string | null = null;
  private tick?: ReturnType<typeof setInterval>;

  constructor() {
    // PF5: run the 1s tick only while a timer is configured (never in the lobby).
    effect(() => {
      const active = this.timerRunning();
      if (active && !this.tick) this.tick = setInterval(() => this.timerNow.set(this.serverNow()), 1000);
      else if (!active && this.tick) { clearInterval(this.tick); this.tick = undefined; }
    });
  }

  /** Called by the container once the route id (if any) is known. */
  init(routeId: string | null) {
    // Restore the facilitator's last-used team size (durations are seeded onto new retros in create()).
    const prefs = this.loadSetupPrefs();
    if (prefs?.teamSize) this.teamSize = prefs.teamSize;
    this.memberSvc.getAll({ isActive: true }).subscribe({ next: ms => this.members.set(ms.map(m => ({ id: m.id, name: `${m.firstName} ${m.lastName}`.trim() }))) });
    this.squadSvc.getAll().subscribe({ next: sq => this.squads.set(sq) });
    this.ws.connect();
    this.refresh$.pipe(
      debounceTime(150),
      switchMap(id => this.svc.getSessionResponse(id).pipe(catchError(() => EMPTY))),
      takeUntil(this.destroy$),
    ).subscribe(resp => { this.updateOffset(resp); if (resp.body) this.setSession(resp.body); });
    this.ws.messages$.pipe(takeUntil(this.destroy$)).subscribe(msg => {
      if (!msg) return;
      const s = this.session();
      if (s && typeof msg.type === 'string' && msg.type.startsWith('rb_') && msg.data?.['sessionId'] === s.id) this.refresh(s.id);
    });
    if (routeId) this.load(routeId); else this.loadLobby();
  }

  ngOnDestroy() { this.leaveWs(); if (this.tick) clearInterval(this.tick); this.destroy$.next(); this.destroy$.complete(); }

  private serverNow() { return Date.now() + this.serverOffsetMs; }
  private updateOffset(resp: HttpResponse<unknown>) {
    const header = resp.headers.get('Date');
    if (!header) return;
    const server = Date.parse(header);
    if (!isNaN(server)) this.serverOffsetMs = server - Date.now();
  }

  loadLobby() { this.svc.getLobbySessions().subscribe({ next: v => this.summaries.set(v), error: () => this.error.set('Could not load retros.') }); }
  private loadArchived() { this.svc.getArchivedSessions().subscribe({ next: v => this.archived.set(v) }); }
  private reloadLists() { this.loadLobby(); if (this.showArchived()) this.loadArchived(); }
  toggleArchived() { const next = !this.showArchived(); this.showArchived.set(next); if (next) this.loadArchived(); }
  private load(idOrSlug: string) { this.svc.join(idOrSlug).subscribe({ next: s => { this.setSession(s); this.joinWs(s.id); }, error: () => this.error.set('Could not open retro.') }); }
  private refresh(id: string) { this.refresh$.next(id); }
  private setSession(s: RetroBoardSession) {
    this.session.set(s); this.edit.votes = s.votesPerUser; this.edit.anon = s.allowAnonymous; this.edit.d = { ...s.stepDurations };
    // Local (self-paced) navigation applies to a live freeform/guided run; otherwise snap to the shared phase.
    if (!(s.status === 'live' && this.structureLevelOf(s.phaseConfig) !== 'structured')) this.localPhase.set(null);
    // Auto-detect team size from the roster until the facilitator overrides it.
    if (!this.teamSizeTouched && s.participants.length) this.teamSize = s.participants.length;
    // Seed local comment drafts once so in-progress typing survives WS refreshes.
    for (const p of s.feedbackPrompts) if (this.fbComments[p.id] === undefined) this.fbComments[p.id] = p.myComment ?? '';
  }

  create() {
    const t = this.newTitle.trim(); this.creating.set(true);
    // Seed a new retro from the facilitator's last-used timers so Setup doesn't reset to defaults.
    const stepDurations = this.loadSetupPrefs()?.durations;
    this.svc.createSession({ title: t || undefined, stepDurations }).subscribe({
      next: s => { this.creating.set(false); this.router.navigate(['/pulse/retro-board', s.id]); this.setSession(s); this.joinWs(s.id); },
      error: () => { this.creating.set(false); this.error.set('Create failed.'); },
    });
  }
  open(id: string) { this.router.navigate(['/pulse/retro-board', id]); this.load(id); }

  // Join by the friendly session code (slug). Validates before navigating so a bad code shows an
  // inline lobby error rather than dropping the user on a broken board. Tolerates a pasted share
  // link — the code is pulled out of any `.../retro-board/<code>` URL.
  joinByCode() {
    const code = this.extractJoinCode(this.joinCode);
    if (!code) return;
    this.joining.set(true); this.error.set(null);
    this.svc.join(code).subscribe({
      next: s => { this.joining.set(false); this.joinCode = ''; this.router.navigate(['/pulse/retro-board', s.slug ?? s.id]); this.setSession(s); this.joinWs(s.id); },
      error: () => { this.joining.set(false); this.error.set('No open retro with that code.'); },
    });
  }
  private extractJoinCode(raw: string): string {
    const v = (raw || '').trim();
    const m = v.match(/retro-board\/([^/?#]+)/i);
    return m ? decodeURIComponent(m[1]) : v;
  }
  del(id: string, ev: Event) { ev.stopPropagation(); if (!confirm('Delete this retro permanently? This cannot be undone.')) return; this.svc.deleteSession(id).subscribe({ next: () => this.reloadLists() }); }
  leave() { this.leaveWs(); this.session.set(null); this.viewAs.set('facilitator'); this.router.navigate(['/pulse/retro-board']); this.reloadLists(); }

  // ---- lobby lifecycle actions ----
  reopen(id: string, ev: Event) { ev.stopPropagation(); this.svc.reopen(id).subscribe({ next: () => this.reloadLists() }); }
  archive(id: string, ev: Event) { ev.stopPropagation(); this.svc.archive(id).subscribe({ next: () => this.reloadLists() }); }
  unarchive(id: string, ev: Event) { ev.stopPropagation(); this.svc.unarchive(id).subscribe({ next: () => this.reloadLists() }); }
  // ---- in-session lifecycle actions ----
  closeCurrent() { const s = this.session(); if (s && confirm('Close this retro? It will be marked closed. You can reopen or archive it anytime.')) this.svc.close(s.id).subscribe({ next: r => this.setSession(r) }); }
  reopenCurrent() { const s = this.session(); if (s) this.svc.reopen(s.id).subscribe({ next: r => this.setSession(r) }); }
  // draft → open (pre-capture). A Freeform retro has no separate synced "live" step, so it goes
  // straight to the navigable working session (draft → open → live in one action).
  openRetro() {
    const s = this.session(); if (!s || !this.amFacilitator()) return;
    const freeform = this.structureLevelOf(s.phaseConfig) === 'freeform';
    this.svc.openRetro(s.id).subscribe({ next: r => {
      if (freeform) this.svc.goLive(r.id).subscribe({ next: r2 => this.setSession(r2) });
      else this.setSession(r);
    } });
  }
  // open → live: start the synced, guided session (begins at check-in).
  goLive() { const s = this.session(); if (s && this.amFacilitator()) this.svc.goLive(s.id).subscribe({ next: r => this.setSession(r) }); }
  // Set the owning team and auto-enrol its members as participants.
  setSquad(squadId: string | null) { const s = this.session(); if (s && this.amFacilitator()) this.svc.setSquad(s.id, squadId || null).subscribe({ next: r => this.setSession(r) }); }

  private joinWs(id: string) { this.joinedId = id; const me = this.auth.me; this.ws.send({ type: 'join_retro', sessionId: id, memberName: me ? `${me.firstName} ${me.lastName}`.trim() : '' }); }
  private leaveWs() { if (this.joinedId) { this.ws.send({ type: 'leave_retro' }); this.joinedId = null; } }

  goPhase(p: RetroPhase) { const s = this.session(); if (!s || !this.amFacilitator()) return; this.svc.setPhase(s.id, p).subscribe({ next: r => { this.setSession(r); this.autoStartTimer(r); } }); }
  // Auto-start the phase clock on advance so every participant sees a running timer without the facilitator
  // starting it — but not for an untimed (Freeform) phase.
  private autoStartTimer(s: RetroBoardSession) { const key = PHASE_TIMER[s.phase]; if (!key || s.phaseConfig[s.phase]?.timed === false) return; this.svc.setLiveState(s.id, JSON.stringify({ startedAt: new Date(this.serverNow()).toISOString(), seconds: s.stepDurations[key] })).subscribe({ next: () => this.refresh(s.id) }); }
  saveSettings() { const s = this.session(); if (s) this.svc.updateSettings(s.id, { votesPerUser: this.edit.votes, allowAnonymous: this.edit.anon, stepDurations: this.edit.d }).subscribe({ next: () => this.refresh(s.id) }); }
  // A manual timer edit persists as the new "last used" — and because the preset selector reads
  // presetOf(edit.d), it silently flips to Custom whenever the values stop matching a preset.
  setTimer(key: keyof RetroStepDurations, ev: Event) { this.edit.d[key] = F.parseDuration((ev.target as HTMLInputElement).value); this.saveSettings(); this.saveSetupPrefs(); }

  // ---- Session-length presets (a convenience layer over the same timer fields) ----
  /** Which preset the current durations match, or 'custom' after any manual edit. */
  presetOf(d: RetroStepDurations): PresetName {
    const match = (Object.keys(SESSION_PRESETS) as Exclude<PresetName, 'custom'>[])
      .find(name => (Object.keys(SESSION_PRESETS[name]) as (keyof RetroStepDurations)[]).every(k => SESSION_PRESETS[name][k] === d[k]));
    return match ?? 'custom';
  }
  /** Apply a preset to every timer field (Custom is a derived state, so it's a no-op). */
  applyPreset(name: PresetName) {
    if (name === 'custom' || !this.amFacilitator()) return;
    this.edit.d = { ...SESSION_PRESETS[name] };
    this.saveSettings();
    this.saveSetupPrefs();
  }
  /** Starting recommendation from team size: larger teams carry more Introduce/Discuss overhead. */
  recommendedPreset(): Exclude<PresetName, 'custom'> {
    const n = this.teamSize || 0;
    if (n <= 6) return 'quick';
    if (n <= 15) return 'standard';
    return 'deep';
  }
  presetLabel(name: PresetName) { return this.presetOptions.find(o => o.key === name)?.short ?? 'Custom'; }

  private setupPrefsKey() { return `rb-setup-prefs:${this.myId}`; }
  saveSetupPrefs() {
    try { localStorage.setItem(this.setupPrefsKey(), JSON.stringify({ durations: this.edit.d, teamSize: this.teamSize })); } catch { /* storage may be unavailable */ }
  }
  private loadSetupPrefs(): { durations?: RetroStepDurations; teamSize?: number } | null {
    try { const raw = localStorage.getItem(this.setupPrefsKey()); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  // ---- Session Structure (per-phase config + column templates) ----
  readonly structureLevels = STRUCTURE_LEVELS;
  readonly columnTemplates = COLUMN_TEMPLATES;
  /** Derive the level from the per-phase flags (like presetOf) — freeform turns timers off, structured
   *  enforces every phase, otherwise guided. Robust to individual include toggles. */
  structureLevelOf(config: Record<string, RetroPhaseFlags>): StructureLevel {
    const live = LIVE_PHASES.map(p => config[p]).filter(Boolean);
    if (live.length === 0) return 'structured';
    if (live.some(f => !f.timed)) return 'freeform';
    if (live.every(f => f.enforced)) return 'structured';
    return 'guided';
  }
  /** Apply a structure level: sets enforced/timed across phases + the optional phases it turns on. */
  applyStructureLevel(level: StructureLevel) {
    const s = this.session(); if (!s || !this.amFacilitator()) return;
    const f = LEVEL_FLAGS[level];
    const cfg: Record<string, RetroPhaseFlags> = {};
    for (const p of LIVE_PHASES) {
      const enabled = p === 'introduce' ? f.introduce : p === 'reflect' ? f.reflect : true;
      cfg[p] = { enabled, enforced: f.enforced, timed: f.timed };
    }
    this.svc.updateSettings(s.id, { phaseConfig: cfg }).subscribe({ next: () => this.refresh(s.id) });
  }
  /** Flip a phase's "include in this retro" toggle (checkin/introduce/reflect). */
  togglePhase(phase: string) {
    const s = this.session(); if (!s || !this.amFacilitator()) return;
    const cur = s.phaseConfig[phase] ?? { enabled: true, enforced: true, timed: true };
    const cfg = { ...s.phaseConfig, [phase]: { ...cur, enabled: !cur.enabled } };
    this.svc.updateSettings(s.id, { phaseConfig: cfg }).subscribe({ next: () => this.refresh(s.id) });
  }
  applyColumnTemplate(key: string) {
    const s = this.session(); const t = this.columnTemplates.find(x => x.key === key);
    if (s && t && this.amFacilitator()) this.svc.setColumns(s.id, t.columns).subscribe({ next: r => this.setSession(r) });
  }
  /** Starting recommendation from team size: larger groups fragment without structure. */
  recommendedLevel(): StructureLevel {
    const n = this.teamSize || 0;
    if (n <= 8) return 'freeform';
    if (n <= 15) return 'guided';
    return 'structured';
  }
  structureLabel(level: StructureLevel) { return this.structureLevels.find(l => l.key === level)?.label ?? level; }
  structureBlurb(level: StructureLevel) { return this.structureLevels.find(l => l.key === level)?.blurb ?? ''; }
  onTeamSizeInput() { this.teamSizeTouched = true; this.saveSetupPrefs(); }

  reveal() { const s = this.session(); if (s) this.svc.reveal(s.id, true).subscribe({ next: () => this.refresh(s.id) }); }
  // Undo an accidental reveal — re-hides notes from participants during Capture.
  hideNotes() { const s = this.session(); if (s) this.svc.reveal(s.id, false).subscribe({ next: () => this.refresh(s.id) }); }

  // Start (or restart) the current phase clock from its full configured duration.
  startTimer() { const s = this.session(); const key = this.phaseTimerKey(); if (!s || !key) return; this.svc.setLiveState(s.id, JSON.stringify({ startedAt: new Date(this.serverNow()).toISOString(), seconds: s.stepDurations[key] })).subscribe({ next: () => this.refresh(s.id) }); }
  // Freeze the clock at its current remaining; Resume continues from there.
  pauseTimer() { const s = this.session(); const rem = this.timer(); if (!s || rem === null) return; this.svc.setLiveState(s.id, JSON.stringify({ startedAt: null, seconds: rem, paused: true })).subscribe({ next: () => this.refresh(s.id) }); }
  resumeTimer() { const s = this.session(); if (!s?.liveStateJson) return; let secs = 0; try { secs = JSON.parse(s.liveStateJson).seconds || 0; } catch { /* ignore */ } if (secs <= 0) return; this.svc.setLiveState(s.id, JSON.stringify({ startedAt: new Date(this.serverNow()).toISOString(), seconds: secs })).subscribe({ next: () => this.refresh(s.id) }); }

  setColor(columnId: string, color: string) { const s = this.session(); const c = s?.columns.find(x => x.id === columnId); if (s && c) this.svc.updateColumn(s.id, columnId, { label: c.label, description: c.description, color, icon: c.icon }).subscribe({ next: () => this.refresh(s.id) }); }
  addColumn() { const s = this.session(); const v = this.newColumn.trim(); if (!s || !v) return; this.svc.addColumn(s.id, { label: v, color: '#5b9dff', icon: 'star' }).subscribe({ next: () => { this.newColumn = ''; this.refresh(s.id); } }); }
  delColumn(id: string) { const s = this.session(); if (s) this.svc.deleteColumn(s.id, id).subscribe({ next: () => this.refresh(s.id) }); }

  addQuestion() { const s = this.session(); const v = this.newQuestion.trim(); if (!s || !v) return; this.svc.addCheckinQuestion(s.id, { text: v }).subscribe({ next: () => { this.newQuestion = ''; this.refresh(s.id); } }); }
  delQuestion(id: string) { const s = this.session(); if (s) this.svc.deleteCheckinQuestion(s.id, id).subscribe({ next: () => this.refresh(s.id) }); }
  respond(qid: string, rating: string) { const s = this.session(); if (s) this.svc.respondCheckin(s.id, qid, rating).subscribe({ next: () => this.refresh(s.id) }); }

  addPrompt() { const s = this.session(); const v = this.newPrompt.trim(); if (!s || !v) return; this.svc.addFeedbackPrompt(s.id, { text: v }).subscribe({ next: () => { this.newPrompt = ''; this.refresh(s.id); } }); }
  delPrompt(id: string) { const s = this.session(); if (s) this.svc.deleteFeedbackPrompt(s.id, id).subscribe({ next: () => this.refresh(s.id) }); }
  rateFeedback(pid: string, score: number) { const s = this.session(); if (!s) return; this.svc.respondFeedback(s.id, pid, score, (this.fbComments[pid] || '').trim() || null).subscribe({ next: () => this.refresh(s.id) }); }
  commentFeedback(pid: string) { const s = this.session(); const p = s?.feedbackPrompts.find(x => x.id === pid); if (!s || !p?.myScore) return; this.svc.respondFeedback(s.id, pid, p.myScore, (this.fbComments[pid] || '').trim() || null).subscribe({ next: () => this.refresh(s.id) }); }
  avgFb(p: RetroBoardFeedbackPrompt) { return p.averageScore != null ? p.averageScore.toFixed(1) : '—'; }
  distPct(p: RetroBoardFeedbackPrompt, star: number) { return p.responseCount ? (p.distribution[star - 1] / p.responseCount) * 100 : 0; }

  notesFor(colId: string) { return this.notesByColumn()[colId] ?? []; }
  // Theme colour for a note's column, for colour-coding topics in Discuss. Returns a hex fallback
  // (not a CSS var) so callers that append an alpha suffix — e.g. `columnColor(id)+'22'` — stay valid.
  columnColor(columnId: string) { return this.session()?.columns.find(c => c.id === columnId)?.color ?? '#7d5cff'; }
  masked(n: RetroBoardNote) { const s = this.session(); return this.viewAs() === 'participant' && !!s && s.phase === 'capture' && s.hideNotesUntilReveal && !s.notesRevealed && !n.isOwn; }
  introducer(n: RetroBoardNote) { return n.isAnonymous ? 'facilitator' : this.shortName(n.authorName ?? '?'); }
  addNote(colId: string) { const s = this.session(); const v = (this.draft[colId] || '').trim(); if (!s || !v) return; this.svc.addNote(s.id, colId, v, !!this.draftAnon[colId]).subscribe({ next: r => { this.draft[colId] = ''; this.setSession(r); } }); }
  toggleFlag(n: RetroBoardNote) { const s = this.session(); if (s) this.svc.flagNote(s.id, n.id, !n.flagged).subscribe({ next: () => this.refresh(s.id) }); }
  // Delete a note while the session is open (author or facilitator; server-enforced).
  delNote(n: RetroBoardNote) { const s = this.session(); if (s && confirm('Delete this note?')) this.svc.deleteNote(s.id, n.id).subscribe({ next: () => this.refresh(s.id) }); }
  canDelNote(n: RetroBoardNote) { return !this.masked(n) && (n.isOwn || this.amFacilitator()); }

  vote(n: { id: string }) { const s = this.session(); if (s) this.svc.addVote(s.id, n.id).subscribe({ next: () => this.refresh(s.id), error: () => {} }); }
  unvote(n: { id: string }) { const s = this.session(); if (s) this.svc.removeVote(s.id, n.id).subscribe({ next: () => this.refresh(s.id) }); }

  startAction(n: RetroBoardNote) { this.actionDraft.set({ noteId: n.id, title: n.text ?? '', assignees: [] }); this.assigneeQuery = ''; }
  addAssignee(draft: { assignees: string[] }, id: string) { if (!draft.assignees.includes(id)) draft.assignees.push(id); this.assigneeQuery = ''; this.actionDraft.set(this.actionDraft()); }
  removeAssignee(draft: { assignees: string[] }, id: string) { const i = draft.assignees.indexOf(id); if (i >= 0) draft.assignees.splice(i, 1); this.actionDraft.set(this.actionDraft()); }
  saveAction() { const s = this.session(); const d = this.actionDraft(); if (!s || !d || !d.title.trim()) return; this.svc.addAction(s.id, d.title.trim(), { sourceNoteId: d.noteId, assigneeMemberIds: d.assignees }).subscribe({ next: () => { this.actionDraft.set(null); this.refresh(s.id); } }); }
  addManual() { const s = this.session(); const v = this.manual.title.trim(); if (!s || !v) return; this.svc.addAction(s.id, v, { assigneeMemberIds: this.manual.assignees }).subscribe({ next: () => { this.manual = { title: '', assignees: [] }; this.assigneeQuery = ''; this.refresh(s.id); } }); }
  delAction(id: string) { const s = this.session(); if (s) this.svc.deleteAction(s.id, id).subscribe({ next: () => this.refresh(s.id) }); }

  analyse() { const s = this.session(); if (!s) return; this.analysing.set(true); this.error.set(null); this.svc.analyse(s.id).subscribe({ next: () => { this.analysing.set(false); this.refresh(s.id); }, error: e => { this.analysing.set(false); this.error.set(e?.error?.error || 'AI summary unavailable.'); } }); }

  // ---- display helpers ----
  filterMembers(query: string, exclude: string[]): Member[] { const q = query.trim().toLowerCase(); if (!q) return []; return this.members().filter(m => !exclude.includes(m.id) && m.name.toLowerCase().includes(q)).slice(0, 6); }
  allocated() { const d = this.edit.d; const t = Math.max(0, this.topicEstimate || 0); return d.checkin + d.capture + d.introduceRead + d.vote + d.reflect + (d.introduceTopic + d.discussTopic) * t; }
  remaining() { return (this.edit.d.meeting || 0) - this.allocated(); }
  phaseLabel(p: string) { return this.phases.find(x => x.key === p)?.label ?? p; }
  memberName(id: string) { const m = this.members().find(x => x.id === id); if (m) return F.shortName(m.name); return F.shortName(this.session()?.participants.find(p => p.memberId === id)?.name ?? '?'); }
  // Thin delegates to the pure retro-format helpers so templates keep calling store.fmt(...) etc.
  shortName(name: string) { return F.shortName(name); }
  initials(name: string) { return F.initials(name); }
  tint(id: string) { return F.avatarTint(id); }
  ink(id: string) { return F.avatarInk(id); }
  pct(v: number, q: { better: number; same: number; worse: number }) { return F.ratioPct(v, q); }
  fmt(sec: number) { return F.fmtDuration(sec); }
  parse(str: string) { return F.parseDuration(str); }
}
