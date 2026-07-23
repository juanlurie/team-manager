import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Observable, EMPTY } from 'rxjs';
import { filter, take, takeUntil, switchMap, catchError, debounceTime } from 'rxjs/operators';
import { AuthService } from '../../../../core/auth/auth.service';
import { GuestRetroBoardService } from '../../../../core/services/guest-retro-board.service';
import { GuestRetroBoard } from '../../../../core/models/retro-board.model';
import { WebSocketService } from '../../../../core/websocket/websocket.service';
import { RetroBoardEvent, RETRO_BOARD_EVENT_TYPES } from '../../../../core/websocket/events/retro-board.events';
import { GuestRetroBoardViewComponent, GuestNoteDraft } from './guest-retro-board-view.component';
import { GuestRetroReflectComponent, GuestFeedbackResponse } from './guest-retro-reflect.component';
import { GuestRetroTimerComponent } from './guest-retro-timer.component';
import { RetroPhase } from '../../../../core/models/retro-board.model';

type View = 'loading' | 'notFound' | 'join' | 'board';

// Guest-facing phase names + a one-line "what's happening" for each, so the board reads as the step the
// facilitator is on rather than a static list of columns. Keyed by RetroPhase; closed/open are handled
// separately (see phaseHint) since they're a session status, not a phase.
const PHASE_LABEL: Record<string, string> = {
  setup: 'Setup', checkin: 'Check-in', capture: 'Capture', introduce: 'Introduce',
  vote: 'Vote', discuss: 'Discuss', reflect: 'Reflect', summary: 'Summary',
};
const PHASE_HINT: Record<string, string> = {
  setup: 'The facilitator is still setting things up.',
  checkin: 'Check-in — the team is warming up.',
  capture: 'Capture — add your thoughts to the board below.',
  introduce: 'Introduce — notes are being read out. Sit tight.',
  vote: 'Vote — pick the topics that matter most to you.',
  discuss: 'Discuss — the team is talking through the top topics.',
  reflect: 'Reflect — rate the session below.',
  summary: 'Summary — the retro is wrapping up.',
};

/**
 * Public (unguarded) landing for a RetroBoard join link / QR. Recognizes an already-signed-in member
 * and sends them to the authed board; otherwise offers the guest path (name entry, when the board
 * allows guests) or sign-in. Once joined, hosts the guest board — the guest can add/delete their own
 * notes and vote — and keeps it live over the shared WebSocket (joins the retro room and refetches on
 * this session's rb_* events, the same channel members use). Contribution intents come up from the
 * board view; this owns the calls and the board state. See docs/session-identity.md.
 */
@Component({
  selector: 'app-guest-retro',
  standalone: true,
  imports: [FormsModule, GuestRetroBoardViewComponent, GuestRetroReflectComponent, GuestRetroTimerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; min-height: 100vh; background: var(--ds-surface-canvas, #0f1117); color: var(--ds-text, #e6e9ef); }
    .wrap { max-width: 1040px; margin: 0 auto; padding: 24px 16px 48px; }
    .center { min-height: 100vh; display: grid; place-items: center; padding: 24px; }
    .card { width: 100%; max-width: 420px; background: var(--ds-surface-1, #151b24); border: 1px solid var(--ds-border, rgba(255,255,255,.08)); border-radius: 16px; padding: 28px 24px; text-align: center; }
    .eyebrow { font-size: .72rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--ds-text-faint, #667085); }
    h1 { font-size: 1.35rem; margin: 8px 0 4px; }
    .sub { color: var(--ds-text-muted, #9aa6b8); font-size: .9rem; margin-bottom: 20px; }
    label { display: block; text-align: left; font-size: .78rem; font-weight: 600; color: var(--ds-text-muted, #9aa6b8); margin: 0 0 6px; }
    input { width: 100%; box-sizing: border-box; padding: 11px 12px; border-radius: 10px; border: 1px solid var(--ds-border-strong, rgba(255,255,255,.14)); background: var(--ds-surface-sunken, #0b0d12); color: var(--ds-text, #e6e9ef); font-size: .95rem; }
    input:focus { outline: none; border-color: var(--ds-primary, #5b9df0); }
    button { font: inherit; cursor: pointer; border-radius: 10px; border: 1px solid transparent; padding: 11px 16px; font-weight: 600; width: 100%; }
    button:disabled { opacity: .55; cursor: default; }
    .btn-primary { background: var(--ds-primary, #5b9df0); color: var(--ds-primary-on, #081120); margin-top: 14px; }
    .btn-ghost { background: transparent; border-color: var(--ds-border-strong, rgba(255,255,255,.14)); color: var(--ds-text, #e6e9ef); margin-top: 10px; }
    .err { color: var(--ds-danger, #ef5b58); font-size: .82rem; margin-top: 10px; }
    .divider { display: flex; align-items: center; gap: 10px; color: var(--ds-text-faint, #667085); font-size: .72rem; margin: 16px 0 6px; }
    .divider::before, .divider::after { content: ''; height: 1px; background: var(--ds-border, rgba(255,255,255,.08)); flex: 1; }
    .board-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
    .board-head h1 { font-size: 1.25rem; margin: 0; }
    .badge { font-size: .7rem; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; padding: 3px 8px; border-radius: 999px; background: var(--ds-primary-soft, rgba(91,157,240,.14)); color: var(--ds-primary, #5b9df0); }
    .you { margin-left: auto; font-size: .82rem; color: var(--ds-text-muted, #9aa6b8); }
    .roster { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 20px; }
    .chip { font-size: .74rem; padding: 3px 9px; border-radius: 999px; background: var(--ds-surface-2, #1a2230); border: 1px solid var(--ds-border, rgba(255,255,255,.08)); color: var(--ds-text-muted, #9aa6b8); }
    .chip.guest { border-color: var(--ds-primary-border, rgba(91,157,240,.35)); }
    .reflect { margin-bottom: 24px; }
    .reflect h2 { font-size: 1.05rem; margin: 0 0 10px; }
    .board-head app-guest-retro-timer { margin-left: 4px; }
    .phase-hint { color: var(--ds-text-muted, #9aa6b8); font-size: .9rem; margin: -6px 0 18px; }
  `],
  template: `
    @switch (view()) {
      @case ('loading') {
        <div class="center"><div class="card"><p class="sub" style="margin:0">Loading…</p></div></div>
      }
      @case ('notFound') {
        <div class="center">
          <div class="card">
            <p class="eyebrow">Retro</p>
            <h1>This link isn't available</h1>
            <p class="sub">The retro may have ended, or it isn't open to guests. Check with whoever shared it.</p>
          </div>
        </div>
      }
      @case ('join') {
        <div class="center">
          <div class="card">
            <p class="eyebrow">Join retro</p>
            <h1>{{ title() }}</h1>
            <p class="sub">You've been invited to join this retrospective.</p>
            @if (allowGuest()) {
              <label for="gname">Your name</label>
              <input id="gname" [(ngModel)]="name" maxlength="60" placeholder="e.g. Alex from Design"
                     (keyup.enter)="joinAsGuest()" [disabled]="joining()" />
              <button class="btn-primary" (click)="joinAsGuest()" [disabled]="joining() || !name.trim()">
                {{ joining() ? 'Joining…' : 'Join as guest' }}
              </button>
              <div class="divider">or</div>
            } @else {
              <p class="sub">This retro is open to team members only.</p>
            }
            <button class="btn-ghost" (click)="signIn()">Sign in with your account</button>
            @if (error()) { <p class="err">{{ error() }}</p> }
          </div>
        </div>
      }
      @case ('board') {
        <div class="wrap">
          <div class="board-head">
            <h1>{{ title() }}</h1>
            <span class="badge">{{ phaseLabel() }}</span>
            <app-guest-retro-timer [liveStateJson]="liveState()" [label]="phaseLabel()" />
            <span class="you">You're in as <strong>{{ board()!.displayName }}</strong></span>
          </div>
          <p class="phase-hint">{{ phaseHint() }}</p>
          <div class="roster">
            @for (p of board()!.board.participants; track p.id) {
              <span class="chip" [class.guest]="p.isGuest">{{ p.name }}{{ p.isGuest ? ' (guest)' : '' }}</span>
            }
          </div>
          @if (error()) { <p class="err" style="text-align:left;margin:-8px 0 14px">{{ error() }}</p> }
          @if (showReflect()) {
            <section class="reflect">
              <h2>Reflect</h2>
              <app-guest-retro-reflect [prompts]="board()!.board.feedbackPrompts" [interactive]="reflectInteractive()"
                (respond)="onRespondFeedback($event)" />
            </section>
          }
          <app-guest-retro-board-view [board]="board()!.board" [interactive]="interactive()" [canCompose]="canCompose()"
            (addNote)="onAddNote($event)" (deleteNote)="onDeleteNote($event)"
            (vote)="onVote($event)" (unvote)="onUnvote($event)" />
        </div>
      }
    }
  `,
})
export class GuestRetroComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private svc = inject(GuestRetroBoardService);
  private ws = inject(WebSocketService);
  private destroy$ = new Subject<void>();
  private refresh$ = new Subject<void>();
  private sessionId: string | null = null;

  view = signal<View>('loading');
  board = signal<GuestRetroBoard | null>(null);
  joining = signal(false);
  busy = signal(false);
  error = signal<string | null>(null);
  name = '';

  private slug = '';

  title() { return this.board()?.board.title || 'Retrospective'; }
  allowGuest() { return this.board()?.board.allowGuestJoin ?? false; }
  /** Contributions are allowed while the retro is open (not closed) and no action is in flight. */
  interactive() { return this.board()?.board.status !== 'closed' && !this.busy(); }
  /** The Reflect step: shown once the facilitator reaches the Reflect phase and while the retro is
   *  closed (feedback is collected as the retro wraps up), whenever there are prompts to rate. */
  showReflect() { const b = this.board()?.board; return !!b && b.feedbackPrompts.length > 0 && (b.phase === 'reflect' || b.status === 'closed'); }
  /** Reflect is exempt from the close-lock (submitted after close), so unlike notes/votes it stays
   *  active on a closed retro — only an in-flight action disables it. */
  reflectInteractive() { return !this.busy(); }

  // ── Phase-awareness: the guest board follows the facilitator through the retro, so it must read as
  //    the current step (label + one-line "what's happening"), not a static wall of columns. ──
  private phase(): RetroPhase | undefined { return this.board()?.board.phase; }
  private closed() { return this.board()?.board.status === 'closed'; }
  /** Friendly name for the current step (or "Closed" once the retro ends). */
  phaseLabel() { return this.closed() ? 'Closed' : (PHASE_LABEL[this.phase() ?? ''] ?? this.phase() ?? ''); }
  /** One line telling the guest what's happening now and what, if anything, they can do. */
  phaseHint() {
    const b = this.board()?.board; if (!b) return '';
    if (b.status === 'closed') return 'This retro has closed — thanks for taking part.';
    if (b.status === 'open') return 'The retro is open — add your thoughts to the board below.';
    return PHASE_HINT[b.phase] ?? '';
  }
  /** Adding notes only makes sense while capturing (pre-capture "open", or the Capture phase); once the
   *  facilitator moves on, the board goes view/vote-only for the guest. */
  canCompose() { const b = this.board()?.board; return !!b && b.status !== 'closed' && (b.status === 'open' || b.phase === 'capture'); }
  /** Don't count down a stale timer on a closed board. */
  liveState() { return this.closed() ? null : (this.board()?.board.liveStateJson ?? null); }

  ngOnInit() {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';

    // Coalesce refetches: a burst of rb_* events (or a reconnect catch-up) collapses into one GET.
    this.refresh$.pipe(
      debounceTime(150),
      switchMap(() => this.svc.getBoard(this.slug).pipe(catchError(() => EMPTY))),
      takeUntil(this.destroy$),
    ).subscribe(b => this.board.set(b));

    // Recognize an already-signed-in member and hand them the real (authed) board, which enrols them
    // as a member participant. Guests fall through to the join card.
    this.auth.authStatus$.pipe(
      filter(s => s !== 'checking'),
      take(1),
      takeUntil(this.destroy$),
    ).subscribe(status => {
      if (status === 'authorized') {
        this.router.navigate(['/pulse/retro-board', this.slug]);
      } else {
        this.loadBoard(true);
      }
    });
  }

  ngOnDestroy() {
    if (this.sessionId) this.ws.leaveRoom(`retro:${this.sessionId}`);
    this.destroy$.next(); this.destroy$.complete();
  }

  private loadBoard(initial: boolean) {
    this.svc.getBoard(this.slug).pipe(takeUntil(this.destroy$)).subscribe({
      next: b => {
        this.board.set(b);
        if (b.hasJoined) {
          this.view.set('board');
          this.startRealtime();   // arm live updates (no-op if already armed)
        } else {
          this.view.set('join');
        }
      },
      error: () => { if (initial) this.view.set('notFound'); },
    });
  }

  joinAsGuest() {
    const displayName = this.name.trim();
    if (!displayName || this.joining()) return;
    this.joining.set(true); this.error.set(null);
    this.svc.join(this.slug, displayName).pipe(takeUntil(this.destroy$)).subscribe({
      next: b => { this.joining.set(false); this.board.set(b); this.view.set('board'); this.startRealtime(); },
      error: () => { this.joining.set(false); this.error.set('Could not join — the retro may have closed.'); },
    });
  }

  signIn() { this.auth.login(this.router.url); }

  // ── Contributions (the view emits intents; we perform them and feed back the board) ──
  onAddNote(d: GuestNoteDraft) { this.applyBoard(this.svc.addNote(this.slug, d), "Couldn't add that note — try again."); }
  onDeleteNote(noteId: string) { this.applyBoard(this.svc.deleteNote(this.slug, noteId), "Couldn't delete that note."); }
  onVote(noteId: string) { this.applyVote(this.svc.vote(this.slug, noteId), "Vote didn't go through — you may be out of votes."); }
  onUnvote(noteId: string) { this.applyVote(this.svc.unvote(this.slug, noteId), "Couldn't remove that vote."); }
  onRespondFeedback(r: GuestFeedbackResponse) { this.applyVote(this.svc.respondFeedback(this.slug, r.promptId, r.score, r.comment), "Couldn't save your rating — try again."); }

  // Note add/delete return the refreshed board; use it directly.
  private applyBoard(obs: Observable<GuestRetroBoard>, errMsg: string) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(null);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: b => { this.board.set(b); this.busy.set(false); },
      error: () => { this.busy.set(false); this.error.set(errMsg); this.reload(); },
    });
  }

  // Vote/unvote return 204; refetch to reflect the new counts.
  private applyVote(obs: Observable<void>, errMsg: string) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set(null);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.busy.set(false); this.reload(); },
      error: () => { this.busy.set(false); this.error.set(errMsg); this.reload(); },
    });
  }

  private reload() {
    this.svc.getBoard(this.slug).pipe(takeUntil(this.destroy$)).subscribe({ next: b => this.board.set(b) });
  }

  // Real-time updates over the shared WebSocket, same channel members use: join the retro room and
  // refetch on this session's rb_* broadcasts. Guests connect tokenless (like guest WoW).
  private startRealtime() {
    const sid = this.board()?.board.id;
    if (!sid || this.sessionId) return;   // need a loaded board; arm once
    this.sessionId = sid;
    const room = `retro:${sid}`;

    this.ws.connect();
    // Room membership lives only in the server's in-memory connection state, so (re)join on every
    // connect and catch up with a refetch — covers the initial connect and any reconnect.
    this.ws.connected$.pipe(filter(c => c), takeUntil(this.destroy$)).subscribe(() => {
      this.ws.joinRoom(room);
      this.refresh$.next();
    });
    // Any rb_* event for this session → refetch (debounced upstream to coalesce bursts).
    this.ws.roomEvents<RetroBoardEvent>(RETRO_BOARD_EVENT_TYPES).pipe(
      filter(e => e.data?.['sessionId'] === sid),
      takeUntil(this.destroy$),
    ).subscribe(() => this.refresh$.next());
  }
}
