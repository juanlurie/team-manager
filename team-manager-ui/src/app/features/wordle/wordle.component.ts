import { Component, OnInit, OnDestroy, AfterViewChecked, ElementRef, ViewChild, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { WordleService } from '../../core/services/wordle.service';
import { WordleSession, WordleSessionSummary } from '../../core/models/wordle.model';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { FeatureAccessService } from '../../core/services/feature-access.service';
import { AiBadgeComponent } from '../../shared/components/ai-badge/ai-badge.component';

@Component({
  selector: 'app-create-wordle-dialog',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatDialogModule],
  styles: [`
    .field-label { font-size:0.78rem;opacity:0.6;display:block;margin-bottom:4px }
    .field { background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:6px;
             color:inherit;font-size:0.85rem;padding:8px 10px;outline:none;width:100%;
             box-sizing:border-box;margin-bottom:12px;transition:border-color 0.2s }
    .field:focus { border-color:#64b5f6 }
  `],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <h2 mat-dialog-title style="font-size:1rem;margin:0 0 4px">New Wordle</h2>
    <mat-dialog-content style="padding-top:12px;min-width:300px">
      <label class="field-label">Title (optional)</label>
      <input class="field" [(ngModel)]="title" placeholder="e.g. Friday Wordle" (keyup.enter)="submit()">
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="margin-top:8px">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="submit()">Create</button>
    </mat-dialog-actions>
  `
})
export class CreateWordleDialogComponent {
  dialogRef = inject(MatDialogRef<CreateWordleDialogComponent>);
  title = '';

  submit() {
    this.dialogRef.close({ title: this.title || undefined });
  }
}

interface PendingReveal {
  word: string;
  letters: string[];
}

@Component({
  selector: 'app-wordle',
  standalone: true,
  imports: [
    FormsModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatSnackBarModule, MatProgressSpinnerModule, AiBadgeComponent
  ],
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .wrap { max-width: 600px; margin: 0 auto; }
    .lobby-header { display:flex;justify-content:space-between;align-items:center;margin-bottom:16px }
    .lobby-header h2 { margin:0;font-size:1.1rem;display:flex;align-items:center }
    .heading-icon { font-size:20px;width:20px;height:20px;line-height:20px;color:#64b5f6;margin-right:4px }
    .session-card {
      display:flex;justify-content:space-between;align-items:center;gap:12px;
      background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;
      padding:14px 16px;margin-bottom:10px;cursor:pointer;transition:background 0.15s;
    }
    .session-card:hover { background:rgba(255,255,255,0.07) }
    .session-title { font-weight:600;font-size:0.92rem }
    .session-meta { font-size:0.75rem;opacity:0.55;margin-top:2px }
    .status-chip { font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;padding:3px 8px;border-radius:10px }
    .status-chip.Waiting { background:rgba(255,167,38,0.15);color:#ffb74d }
    .status-chip.InProgress { background:rgba(102,187,106,0.15);color:#81c784 }
    .empty { text-align:center;opacity:0.5;padding:40px 0;font-size:0.85rem }
    .back-link { font-size:0.78rem;opacity:0.6;cursor:pointer;display:inline-flex;align-items:center;gap:4px;margin-bottom:12px }
    .back-link:hover { opacity:1 }
    .game-card { background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:20px }
    .progress-label { text-align:center;font-size:0.72rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.5px;margin-top:14px }
    .wordle-grid { display:flex;flex-direction:column;gap:6px;align-items:center;margin:16px 0;cursor:text }
    .wordle-row { display:flex;gap:6px;position:relative }
    .wordle-tile {
      width:46px;height:46px;display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:1.2rem;text-transform:uppercase;border-radius:6px;
      border:2px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.03);
      backface-visibility:hidden;
    }
    .wordle-tile.filled { border-color:rgba(255,255,255,0.4) }
    .wordle-tile.correct { background:#388e3c;border-color:#388e3c;color:#fff }
    .wordle-tile.present { background:#b8960c;border-color:#b8960c;color:#fff }
    .wordle-tile.absent { background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.08);color:rgba(255,255,255,0.35) }
    .wordle-tile.flip { animation:wordle-flip 0.5s ease both }
    @keyframes wordle-flip {
      0% { transform:rotateX(0deg) }
      50% { transform:rotateX(90deg) }
      100% { transform:rotateX(0deg) }
    }
    .guess-input {
      position:absolute;inset:0;width:100%;height:100%;opacity:0;border:none;padding:0;margin:0;
      font-size:16px;cursor:text;
    }
    .guess-hint { text-align:center;font-size:0.75rem;opacity:0.45;margin-top:4px }
    .status-banner { text-align:center;padding:16px 0;font-size:0.95rem }
    .status-banner.won { color:#81c784 }
    .status-banner.lost { color:#ef5350 }
    .winner-name { font-size:1.1rem;font-weight:800;margin:6px 0 }
    .scoreboard { margin-top:20px;border-top:1px solid rgba(255,255,255,0.08);padding-top:14px }
    .scoreboard-row { display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:0.85rem }
    .scoreboard-row.me { color:#64b5f6;font-weight:600 }
    .scoreboard-row.solved { color:#81c784 }
    .scoreboard-row.failed { color:#ef5350 }
    .completed-banner { text-align:center;padding:24px 0 }
  `],
  template: `
    <div class="wrap">
      @if (!selectedSession()) {
        <div class="lobby-header">
          <h2><mat-icon class="heading-icon">abc</mat-icon>Wordle</h2>
          @if (canHost()) {
            <button mat-flat-button color="primary" [disabled]="creatingSession()" (click)="openCreateDialog()">
              @if (creatingSession()) { <mat-spinner diameter="18" style="display:inline-block;vertical-align:middle" /> Creating… }
              @else { New Game }
            </button>
          }
        </div>

        @if (loading()) {
          <div style="text-align:center;padding:40px 0"><mat-spinner diameter="32" style="margin:0 auto"></mat-spinner></div>
        } @else if (sessions().length === 0) {
          <div class="empty">No Wordle games running right now — start one!</div>
        } @else {
          @for (s of sessions(); track s.id) {
            <div class="session-card" (click)="selectSession(s)">
              <div>
                <div class="session-title">{{ s.title || 'Wordle' }}</div>
                <div class="session-meta">Started by {{ s.createdByName }} · {{ s.participantCount }} player{{ s.participantCount === 1 ? '' : 's' }}</div>
              </div>
              <span class="status-chip" [class]="s.status">{{ s.status === 'Waiting' ? 'Open' : 'In Progress' }}</span>
            </div>
          }
        }
      } @else {
        <span class="back-link" (click)="backToLobby()"><mat-icon style="font-size:16px;width:16px;height:16px">arrow_back</mat-icon> All games</span>

        @if (selectedSessionLoading()) {
          <div style="text-align:center;padding:40px 0"><mat-spinner diameter="32" style="margin:0 auto"></mat-spinner></div>
        } @else {
          @let s = selectedSession()!;
          <div class="game-card">
            <div class="session-title" style="font-size:1.05rem">{{ s.title || 'Wordle' }}</div>

            @if (s.status === 'Waiting') {
              <div class="progress-label">Waiting for the host to start</div>
              <div class="scoreboard">
                @for (p of s.participants; track p.memberId) {
                  <div class="scoreboard-row" [class.me]="p.memberId === s.currentMemberId">{{ p.memberName }}</div>
                }
              </div>
              @if (s.isCreator) {
                <button mat-flat-button color="primary" style="width:100%;margin-top:14px" [disabled]="starting()" (click)="startSession()">
                  @if (starting()) { <mat-spinner diameter="18" style="display:inline-block;vertical-align:middle" /> Starting… }
                  @else { Start Game }
                </button>
              } @else if (!s.isParticipant) {
                <button mat-stroked-button style="width:100%;margin-top:14px" (click)="joinSelected()">Join Game</button>
              }
            }

            @if (s.status === 'InProgress' || s.status === 'Completed') {
              @if (!s.isParticipant) {
                <button mat-stroked-button style="width:100%;margin-top:14px" (click)="joinSelected()">Join Game</button>
              } @else {
                <div class="wordle-grid">
                  @for (g of s.myGuesses; track $index) {
                    <div class="wordle-row">
                      @for (letter of g.letters; let i = $index; track i) {
                        <div class="wordle-tile" [class]="letter">{{ g.word.charAt(i) }}</div>
                      }
                    </div>
                  }

                  @if (pendingReveal()) {
                    <div class="wordle-row">
                      @for (letter of pendingReveal()!.letters; let i = $index; track i) {
                        <div class="wordle-tile flip"
                             [class.correct]="revealedTiles()[i] && letter === 'correct'"
                             [class.present]="revealedTiles()[i] && letter === 'present'"
                             [class.absent]="revealedTiles()[i] && letter === 'absent'"
                             [style.animation-delay]="(i * 220) + 'ms'">
                          {{ pendingReveal()!.word.charAt(i) }}
                        </div>
                      }
                    </div>
                  } @else if (s.myStatus === 'Playing') {
                    <div class="wordle-row" (click)="focusInput()">
                      @for (i of tileIndexes(s); track i) {
                        <div class="wordle-tile" [class.filled]="i < guessInput.length">{{ guessInput.charAt(i) }}</div>
                      }
                      <input #guessInputEl class="guess-input" [(ngModel)]="guessInput" name="guess"
                             [maxlength]="s.wordLength" [disabled]="submittingGuess()"
                             (ngModelChange)="onGuessInputChange($event, s.wordLength)"
                             (keyup.enter)="submitGuess()" autocomplete="off" autocapitalize="off" spellcheck="false">
                    </div>
                  }

                  @if (s.myStatus === 'Playing') {
                    @for (row of emptyRows(s); track row) {
                      <div class="wordle-row">
                        @for (i of tileIndexes(s); track i) {
                          <div class="wordle-tile"></div>
                        }
                      </div>
                    }
                  }
                </div>

                @if (s.myStatus === 'Playing') {
                  <div class="guess-hint">Type your guess, then press Enter — {{ s.myGuesses.length }} of {{ s.maxGuesses }} guesses used</div>
                } @else {
                  <div class="status-banner" [class.won]="s.myStatus === 'Won'" [class.lost]="s.myStatus === 'Lost'">
                    @if (s.myStatus === 'Won') {
                      <mat-icon style="font-size:1.5rem;width:1.5rem;height:1.5rem;color:#64b5f6">emoji_events</mat-icon>
                      <div class="winner-name">Solved it in {{ s.myGuesses.length }} guess{{ s.myGuesses.length === 1 ? '' : 'es' }}!</div>
                    } @else {
                      <div class="winner-name">Out of guesses</div>
                      <div style="font-size:0.85rem;opacity:0.7">The word was {{ s.revealedWord }}@if (s.revealedWordIsAiGenerated) {<app-ai-badge />}</div>
                    }
                  </div>
                }
              }

              <div class="scoreboard">
                @if (s.status === 'Completed') {
                  <div class="progress-label" style="margin-bottom:6px;text-align:left">Final standings</div>
                }
                @for (p of s.participants; track p.memberId) {
                  <div class="scoreboard-row" [class.me]="p.memberId === s.currentMemberId"
                       [class.solved]="p.status === 'Won'" [class.failed]="p.status === 'Lost'">
                    <span>{{ p.memberName }} <span style="opacity:0.5;font-size:0.7rem">({{ statusLabel(p.status) }})</span></span>
                    <span>{{ p.guessCount }}/{{ s.maxGuesses }}</span>
                  </div>
                }
              </div>

              @if (s.status === 'Completed') {
                <button mat-flat-button color="primary" style="width:100%;margin-top:14px" (click)="backToLobby()">Back to lobby</button>
              }
            }
          </div>
        }
      }
    </div>
  `
})
export class WordleComponent implements OnInit, OnDestroy, AfterViewChecked {
  private service = inject(WordleService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private ws = inject(WebSocketService);
  private featureAccess = inject(FeatureAccessService);
  readonly canHost = this.featureAccess.hasAccess$('wordle-host');

  @ViewChild('guessInputEl') guessInputEl?: ElementRef<HTMLInputElement>;
  private wantsFocus = false;

  sessions = signal<WordleSessionSummary[]>([]);
  loading = signal(false);
  selectedSession = signal<WordleSession | null>(null);
  selectedSessionLoading = signal(false);
  starting = signal(false);
  creatingSession = signal(false);
  submittingGuess = signal(false);
  pendingReveal = signal<PendingReveal | null>(null);
  // Which tiles in the pending-reveal row have reached the flip's midpoint (rotateX 90deg, edge-on
  // and effectively invisible) -- the color class only applies once true, so the reveal happens
  // mid-flip instead of being visible from frame one.
  revealedTiles = signal<boolean[]>([]);
  guessInput = '';
  private pendingSession: WordleSession | null = null;

  // Exactly one extra row beyond myGuesses is always on screen while Playing -- the live-typing
  // row, or (during the flip-reveal window) the just-submitted guess being animated -- so the
  // filler count is the same either way.
  emptyRows(s: WordleSession): number[] {
    const remaining = s.maxGuesses - s.myGuesses.length - 1;
    return remaining > 0 ? Array.from({ length: remaining }, (_, i) => i) : [];
  }

  tileIndexes(s: WordleSession): number[] {
    return Array.from({ length: s.wordLength }, (_, i) => i);
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'Won': return 'solved';
      case 'Lost': return 'out of guesses';
      default: return 'playing';
    }
  }

  onGuessInputChange(value: string, wordLength: number) {
    this.guessInput = value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, wordLength);
  }

  focusInput() {
    this.guessInputEl?.nativeElement.focus();
  }

  ngAfterViewChecked() {
    if (this.wantsFocus && this.guessInputEl) {
      this.wantsFocus = false;
      this.guessInputEl.nativeElement.focus();
    }
  }

  private requestFocus() {
    this.wantsFocus = true;
  }

  private destroy$ = new Subject<void>();
  private poll: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.loadSessions();
    this.ws.connect();
    this.ws.messages$.pipe(
      takeUntil(this.destroy$),
      filter(msg => msg !== null && msg.type.startsWith('wordle_'))
    ).subscribe(msg => {
      const sessionId = msg!.data['sessionId'] as string | undefined;
      const current = this.selectedSession();

      if (current && sessionId === current.id) {
        this.refreshSelected();
      }
      if (!current) this.loadSessions();
    });

    this.poll = setInterval(() => {
      if (this.selectedSession()?.status === 'InProgress' && !this.submittingGuess()) this.refreshSelected();
    }, 1500);
  }

  ngOnDestroy() {
    this.destroy$.next(); this.destroy$.complete();
    if (this.poll) clearInterval(this.poll);
  }

  private applySession(d: WordleSession) {
    this.selectedSession.set(d);
    if (d.myStatus === 'Playing') this.requestFocus();
  }

  loadSessions() {
    this.loading.set(true);
    this.service.getOpenSessions().subscribe({
      next: d => { this.sessions.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  selectSession(summary: WordleSessionSummary) {
    this.selectedSessionLoading.set(true);
    const load = summary.status === 'Waiting'
      ? this.service.joinSession(summary.id)
      : this.service.getSession(summary.id);
    load.subscribe({
      next: d => { this.applySession(d); this.selectedSessionLoading.set(false); },
      error: () => { this.selectedSessionLoading.set(false); this.snackBar.open('Failed to open game', 'Close', { duration: 4000 }); }
    });
  }

  joinSelected() {
    const s = this.selectedSession();
    if (!s) return;
    this.service.joinSession(s.id).subscribe({
      next: d => this.applySession(d),
      error: () => this.snackBar.open('Failed to join', 'Close', { duration: 4000 })
    });
  }

  backToLobby() {
    this.selectedSession.set(null);
    this.loadSessions();
  }

  refreshSelected() {
    const s = this.selectedSession();
    // Skip while a guess is submitting or its flip-reveal is being held on screen -- the WS
    // broadcast fires mid-request, before our own POST response arrives, so this has to be
    // guarded by `submittingGuess` (set synchronously the instant the player hits Enter), not
    // just `pendingReveal` (only set once our own response arrives) -- otherwise the WS-triggered
    // refresh wins the race and snaps the grid forward before the flip ever plays.
    if (!s || this.submittingGuess()) return;
    this.service.getSession(s.id).subscribe({ next: d => this.applySession(d) });
  }

  openCreateDialog() {
    this.dialog.open(CreateWordleDialogComponent).afterClosed().subscribe(result => {
      if (!result) return;
      // The secret word is generated (possibly via an AI call) right here at create time, unlike
      // Quiz Game where generation is deferred to start -- so this needs its own loading state
      // rather than relying on the dialog having already closed instantly.
      this.creatingSession.set(true);
      this.service.createSession({ title: result.title }).subscribe({
        next: d => {
          this.creatingSession.set(false);
          this.applySession(d);
          this.snackBar.open('Game created — start it when ready', 'Close', { duration: 3000 });
        },
        error: (err) => {
          this.creatingSession.set(false);
          this.snackBar.open(err.error?.error ?? 'Failed to create game', 'Close', { duration: 4000 });
        }
      });
    });
  }

  startSession() {
    const s = this.selectedSession();
    if (!s || this.starting()) return;
    this.starting.set(true);
    this.service.startSession(s.id).subscribe({
      next: d => { this.applySession(d); this.starting.set(false); },
      error: (err) => { this.starting.set(false); this.snackBar.open(err.error?.error ?? 'Failed to start game', 'Close', { duration: 4000 }); }
    });
  }

  submitGuess() {
    const s = this.selectedSession();
    if (!s || this.submittingGuess() || this.pendingReveal()) return;
    const word = this.guessInput.trim();
    if (word.length !== s.wordLength) {
      this.snackBar.open(`Guess must be exactly ${s.wordLength} letters`, 'Close', { duration: 3000 });
      return;
    }
    this.submittingGuess.set(true);
    this.service.submitGuess(s.id, word).subscribe({
      next: d => {
        // Hold the just-submitted guess on screen and flip-reveal it tile by tile before
        // advancing the grid (clearing the input, showing the next empty row, or the
        // won/lost banner) -- same beat as the real game instead of snapping forward instantly.
        const lastGuess = d.myGuesses[d.myGuesses.length - 1];
        this.pendingReveal.set({ word: lastGuess.word, letters: lastGuess.letters });
        this.revealedTiles.set(new Array(s.wordLength).fill(false));
        this.pendingSession = d;

        // Each tile's color flips on at its animation's midpoint (rotateX 90deg -- edge-on,
        // effectively invisible), not at frame one -- 250ms is half of the 0.5s flip animation,
        // offset by that tile's own stagger delay (i * 220ms).
        for (let i = 0; i < s.wordLength; i++) {
          setTimeout(() => {
            this.revealedTiles.update(arr => arr.map((v, idx) => idx === i ? true : v));
          }, i * 220 + 250);
        }

        const flipTotalMs = s.wordLength * 220 + 600;
        setTimeout(() => {
          this.applySession(this.pendingSession!);
          this.pendingSession = null;
          this.pendingReveal.set(null);
          this.submittingGuess.set(false);
          this.guessInput = '';
        }, flipTotalMs);
      },
      error: (err) => {
        this.submittingGuess.set(false);
        this.snackBar.open(err.error?.error ?? 'Failed to submit guess', 'Close', { duration: 4000 });
      }
    });
  }
}
