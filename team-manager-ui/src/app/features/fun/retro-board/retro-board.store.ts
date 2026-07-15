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
  RetroBoardFeedbackPrompt, DEFAULT_STEP_DURATIONS,
} from '../../../core/models/retro-board.model';

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
  actionDraft = signal<ActionDraft | null>(null);
  private timerNow = signal(Date.now());
  // Offset (ms) between the server clock and this client's clock, learned from the response Date
  // header, so live countdowns stay in sync across machines with skewed clocks.
  private serverOffsetMs = 0;

  readonly myId = this.auth.me?.id ?? '';
  amFacilitator = computed(() => !!this.session()?.isFacilitator && this.viewAs() === 'facilitator');
  phaseIndex = computed(() => this.phases.findIndex(p => p.key === this.session()?.phase));
  flagged = computed(() => this.session()?.notes.filter(n => n.flagged) ?? []);
  // Flagged notes grouped under their theme/column, in column order, skipping empty groups.
  flaggedByColumn = computed(() => {
    const by = this.notesByColumn();
    return (this.session()?.columns ?? [])
      .map(c => ({ column: c, notes: (by[c.id] ?? []).filter(n => n.flagged) }))
      .filter(g => g.notes.length > 0);
  });
  sortedByVotes = computed(() => [...(this.session()?.notes ?? [])].sort((a, b) => b.voteCount - a.voteCount));
  checkinDone = computed(() => !!this.session()?.participants.find(p => p.memberId === this.myId)?.completedPhases.includes('checkin'));
  // How many joined participants have submitted their check-in, for the "N/M responded" meter.
  checkinResponded = computed(() => this.session()?.participants.filter(p => p.completedPhases.includes('checkin')).length ?? 0);
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
    // Seed local comment drafts once so in-progress typing survives WS refreshes.
    for (const p of s.feedbackPrompts) if (this.fbComments[p.id] === undefined) this.fbComments[p.id] = p.myComment ?? '';
  }

  create() {
    const t = this.newTitle.trim(); this.creating.set(true);
    this.svc.createSession({ title: t || undefined }).subscribe({
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
  // draft → open: publish for asynchronous pre-capture.
  openRetro() { const s = this.session(); if (s && this.amFacilitator()) this.svc.openRetro(s.id).subscribe({ next: r => this.setSession(r) }); }
  // open → live: start the synced, guided session (begins at check-in).
  goLive() { const s = this.session(); if (s && this.amFacilitator()) this.svc.goLive(s.id).subscribe({ next: r => this.setSession(r) }); }
  // Set the owning team and auto-enrol its members as participants.
  setSquad(squadId: string | null) { const s = this.session(); if (s && this.amFacilitator()) this.svc.setSquad(s.id, squadId || null).subscribe({ next: r => this.setSession(r) }); }

  private joinWs(id: string) { this.joinedId = id; const me = this.auth.me; this.ws.send({ type: 'join_retro', sessionId: id, memberName: me ? `${me.firstName} ${me.lastName}`.trim() : '' }); }
  private leaveWs() { if (this.joinedId) { this.ws.send({ type: 'leave_retro' }); this.joinedId = null; } }

  goPhase(p: RetroPhase) { const s = this.session(); if (!s || !this.amFacilitator()) return; this.svc.setPhase(s.id, p).subscribe({ next: r => { this.setSession(r); this.autoStartTimer(r); } }); }
  // Auto-start the phase clock on advance so every participant sees a running timer without the facilitator starting it.
  private autoStartTimer(s: RetroBoardSession) { const key = PHASE_TIMER[s.phase]; if (!key) return; this.svc.setLiveState(s.id, JSON.stringify({ startedAt: new Date(this.serverNow()).toISOString(), seconds: s.stepDurations[key] })).subscribe({ next: () => this.refresh(s.id) }); }
  saveSettings() { const s = this.session(); if (s) this.svc.updateSettings(s.id, { votesPerUser: this.edit.votes, allowAnonymous: this.edit.anon, stepDurations: this.edit.d }).subscribe({ next: () => this.refresh(s.id) }); }
  setTimer(key: keyof RetroBoardSession['stepDurations'], ev: Event) { this.edit.d[key] = this.parse((ev.target as HTMLInputElement).value); this.saveSettings(); }
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
  markDone(phase: string) { const s = this.session(); if (s) this.svc.setProgress(s.id, phase, true).subscribe({ next: () => this.refresh(s.id) }); }

  addPrompt() { const s = this.session(); const v = this.newPrompt.trim(); if (!s || !v) return; this.svc.addFeedbackPrompt(s.id, { text: v }).subscribe({ next: () => { this.newPrompt = ''; this.refresh(s.id); } }); }
  delPrompt(id: string) { const s = this.session(); if (s) this.svc.deleteFeedbackPrompt(s.id, id).subscribe({ next: () => this.refresh(s.id) }); }
  rateFeedback(pid: string, score: number) { const s = this.session(); if (!s) return; this.svc.respondFeedback(s.id, pid, score, (this.fbComments[pid] || '').trim() || null).subscribe({ next: () => this.refresh(s.id) }); }
  commentFeedback(pid: string) { const s = this.session(); const p = s?.feedbackPrompts.find(x => x.id === pid); if (!s || !p?.myScore) return; this.svc.respondFeedback(s.id, pid, p.myScore, (this.fbComments[pid] || '').trim() || null).subscribe({ next: () => this.refresh(s.id) }); }
  avgFb(p: RetroBoardFeedbackPrompt) { return p.averageScore != null ? p.averageScore.toFixed(1) : '—'; }
  distPct(p: RetroBoardFeedbackPrompt, star: number) { return p.responseCount ? (p.distribution[star - 1] / p.responseCount) * 100 : 0; }

  notesFor(colId: string) { return this.notesByColumn()[colId] ?? []; }
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
  memberName(id: string) { const m = this.members().find(x => x.id === id); if (m) return this.shortName(m.name); return this.shortName(this.session()?.participants.find(p => p.memberId === id)?.name ?? '?'); }
  shortName(name: string) { return (name || '').split(' ')[0] || '—'; }
  initials(name: string) { return (name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase(); }
  private hue(id: string) { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
  tint(id: string) { return `hsl(${this.hue(id)} 45% 22%)`; }
  ink(id: string) { return `hsl(${this.hue(id)} 70% 70%)`; }
  pct(v: number, q: { better: number; same: number; worse: number }) { const t = q.better + q.same + q.worse; return t ? (v / t) * 100 : 0; }
  fmt(sec: number) { const s = Math.max(0, sec); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  parse(str: string): number { const parts = (str || '').split(':'); if (parts.length >= 2) return (+parts[0] || 0) * 60 + (+parts[1] || 0); return (+parts[0] || 0) * 60; }
}
