import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { QuizGameService } from '../../core/services/quiz-game.service';
import { QuizGameSession, QuizGameSessionSummary } from '../../core/models/quiz-game.model';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { WowCountdownComponent } from '../../shared/components/wow-countdown/wow-countdown.component';

@Component({
  selector: 'app-create-quiz-game-dialog',
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
    <h2 mat-dialog-title style="font-size:1rem;margin:0 0 4px">New Quiz Game</h2>
    <mat-dialog-content style="padding-top:12px;min-width:320px">
      <label class="field-label">Title (optional)</label>
      <input class="field" [(ngModel)]="title" placeholder="e.g. Friday Trivia" (keyup.enter)="submit()">

      <label class="field-label">Number of questions</label>
      <input class="field" type="number" min="3" max="25" [(ngModel)]="questionCount">
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="margin-top:8px">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="submit()">Create</button>
    </mat-dialog-actions>
  `
})
export class CreateQuizGameDialogComponent {
  dialogRef = inject(MatDialogRef<CreateQuizGameDialogComponent>);
  title = '';
  questionCount = 10;

  submit() {
    this.dialogRef.close({ title: this.title || undefined, questionCount: this.questionCount });
  }
}

@Component({
  selector: 'app-quiz-game',
  standalone: true,
  imports: [
    FormsModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatSnackBarModule, MatProgressSpinnerModule, WowCountdownComponent
  ],
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .wrap { max-width: 760px; margin: 0 auto; }
    .lobby-header { display:flex;justify-content:space-between;align-items:center;margin-bottom:16px }
    .lobby-header h2 { margin:0;font-size:1.1rem }
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
    .question-text { font-weight:700;font-size:1.05rem;margin:14px 0 16px;text-align:center }
    .options-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px }
    .option-btn { padding:14px;height:auto;white-space:normal;text-align:left;font-size:0.9rem }
    .quiz-option-display { padding:14px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);font-size:0.9rem;opacity:0.6 }
    .quiz-option-mine { border-color:rgba(100,181,246,0.5);opacity:0.95;color:#64b5f6 }
    .quiz-option-correct { border-color:rgba(102,187,106,0.6);background:rgba(102,187,106,0.12);opacity:1;color:#81c784 }
    .quiz-option-wrong { border-color:rgba(239,83,80,0.6);background:rgba(239,83,80,0.1);opacity:1;color:#ef5350 }
    .scoreboard { margin-top:20px;border-top:1px solid rgba(255,255,255,0.08);padding-top:14px }
    .scoreboard-row { display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:0.85rem }
    .scoreboard-row.me { color:#64b5f6;font-weight:600 }
    .scoreboard-row.leader .score { color:#ffd54f }
    .progress-label { text-align:center;font-size:0.72rem;opacity:0.5;text-transform:uppercase;letter-spacing:0.5px }
    .completed-banner { text-align:center;padding:24px 0 }
    .completed-banner .winner-name { font-size:1.3rem;font-weight:800;color:#ffd54f;margin:8px 0 }
  `],
  template: `
    <div class="wrap">
      @if (!selectedSession()) {
        <div class="lobby-header">
          <h2>🧠 Quiz Game</h2>
          <button mat-flat-button color="primary" (click)="openCreateDialog()">New Game</button>
        </div>

        @if (loading()) {
          <div style="text-align:center;padding:40px 0"><mat-spinner diameter="32" style="margin:0 auto"></mat-spinner></div>
        } @else if (sessions().length === 0) {
          <div class="empty">No quiz games running right now — start one!</div>
        } @else {
          @for (s of sessions(); track s.id) {
            <div class="session-card" (click)="selectSession(s)">
              <div>
                <div class="session-title">{{ s.title || 'Quiz Game' }}</div>
                <div class="session-meta">Started by {{ s.createdByName }} · {{ s.participantCount }} player{{ s.participantCount === 1 ? '' : 's' }} · {{ s.questionCount }} questions</div>
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
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div class="session-title" style="font-size:1.05rem">{{ s.title || 'Quiz Game' }}</div>
              @if (s.status === 'InProgress' && !s.currentQuestionRevealed) {
                <app-wow-countdown [endsAt]="s.currentQuestionEndsAt" />
              }
            </div>

            @if (s.status === 'Waiting') {
              <div class="progress-label" style="margin:16px 0 8px">Waiting for the host to start</div>
              <div class="scoreboard">
                @for (p of s.participants; track p.memberId) {
                  <div class="scoreboard-row" [class.me]="p.memberId === s.currentMemberId">{{ p.memberName }}</div>
                }
              </div>
              @if (s.isCreator) {
                <button mat-flat-button color="primary" style="width:100%;margin-top:14px" (click)="startSession()">Start Game</button>
              } @else if (!s.isParticipant) {
                <button mat-stroked-button style="width:100%;margin-top:14px" (click)="joinSelected()">Join Game</button>
              }
            }

            @if (s.status === 'InProgress') {
              <div class="progress-label" style="margin-top:14px">Question {{ s.currentQuestionIndex + 1 }} of {{ s.questionCount }}</div>
              <div class="question-text">{{ s.currentQuestion }}</div>

              @if (!s.isParticipant) {
                <button mat-stroked-button style="width:100%;margin-bottom:10px" (click)="joinSelected()">Join Game</button>
              }

              <div class="options-grid">
                @for (opt of s.currentOptions; let i = $index; track i) {
                  @if (s.isParticipant && s.myAnswerIndex === null && !s.currentQuestionRevealed) {
                    <button mat-stroked-button class="option-btn" (click)="submitAnswer(i)">{{ opt }}</button>
                  } @else {
                    <div class="quiz-option-display"
                         [class.quiz-option-correct]="s.currentQuestionRevealed && s.currentCorrectIndex === i"
                         [class.quiz-option-wrong]="s.currentQuestionRevealed && s.myAnswerIndex === i && s.currentCorrectIndex !== i"
                         [class.quiz-option-mine]="!s.currentQuestionRevealed && s.myAnswerIndex === i">
                      {{ opt }}
                      @if (s.myAnswerIndex === i) { <span style="opacity:0.6"> — your pick</span> }
                    </div>
                  }
                }
              </div>

              @if (s.isParticipant && s.myAnswerIndex !== null && !s.currentQuestionRevealed) {
                <div style="font-size:0.78rem;opacity:0.5;margin-top:10px;text-align:center">Answer locked in — waiting on the others…</div>
              }

              <div class="scoreboard">
                @for (p of s.participants; track p.memberId) {
                  <div class="scoreboard-row" [class.me]="p.memberId === s.currentMemberId" [class.leader]="p.score === topScore() && topScore() > 0">
                    <span>{{ p.memberName }}</span>
                    <span class="score">{{ p.score }} pts</span>
                  </div>
                }
              </div>
            }

            @if (s.status === 'Completed') {
              <div class="completed-banner">
                <div style="font-size:1.5rem">🏆</div>
                @if (winnerName()) {
                  <div class="winner-name">{{ winnerName() }} wins!</div>
                } @else {
                  <div class="winner-name">It's a tie!</div>
                }
                <div class="scoreboard" style="text-align:left;max-width:300px;margin:16px auto 0">
                  @for (p of s.participants; track p.memberId) {
                    <div class="scoreboard-row" [class.me]="p.memberId === s.currentMemberId" [class.leader]="p.score === topScore() && topScore() > 0">
                      <span>{{ p.memberName }}</span>
                      <span class="score">{{ p.score }} pts</span>
                    </div>
                  }
                </div>
                <button mat-flat-button color="primary" style="margin-top:18px" (click)="backToLobby()">Back to lobby</button>
              </div>
            }
          </div>
        }
      }
    </div>
  `
})
export class QuizGameComponent implements OnInit, OnDestroy {
  private service = inject(QuizGameService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private ws = inject(WebSocketService);

  loading = signal(true);
  sessions = signal<QuizGameSessionSummary[]>([]);
  selectedSession = signal<QuizGameSession | null>(null);
  selectedSessionLoading = signal(false);

  topScore = computed(() => {
    const s = this.selectedSession();
    if (!s || s.participants.length === 0) return 0;
    return Math.max(...s.participants.map(p => p.score));
  });

  winnerName = computed(() => {
    const s = this.selectedSession();
    if (!s || s.status !== 'Completed') return null;
    const top = this.topScore();
    if (top === 0) return null;
    const winners = s.participants.filter(p => p.score === top);
    return winners.length === 1 ? winners[0].memberName : null;
  });

  private destroy$ = new Subject<void>();
  private poll: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.loadSessions();
    this.ws.connect();
    this.ws.messages$.pipe(
      takeUntil(this.destroy$),
      filter(msg => msg !== null && msg.type.startsWith('quiz_game_'))
    ).subscribe(msg => {
      const sessionId = msg!.data['sessionId'] as string | undefined;
      const current = this.selectedSession();

      if (current && sessionId === current.id) {
        this.refreshSelected();
      }
      if (!current) this.loadSessions();
    });

    this.poll = setInterval(() => {
      if (this.selectedSession()?.status === 'InProgress') this.refreshSelected();
    }, 1500);
  }

  ngOnDestroy() {
    this.destroy$.next(); this.destroy$.complete();
    if (this.poll) clearInterval(this.poll);
  }

  loadSessions() {
    this.loading.set(true);
    this.service.getOpenSessions().subscribe({
      next: items => { this.sessions.set(items); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  selectSession(summary: QuizGameSessionSummary) {
    this.selectedSessionLoading.set(true);
    const load = summary.status === 'Waiting'
      ? this.service.joinSession(summary.id)
      : this.service.getSession(summary.id);
    load.subscribe({
      next: d => { this.selectedSession.set(d); this.selectedSessionLoading.set(false); },
      error: () => { this.selectedSessionLoading.set(false); this.snackBar.open('Failed to open game', 'Close', { duration: 4000 }); }
    });
  }

  joinSelected() {
    const s = this.selectedSession();
    if (!s) return;
    this.service.joinSession(s.id).subscribe({
      next: d => this.selectedSession.set(d),
      error: () => this.snackBar.open('Failed to join', 'Close', { duration: 4000 })
    });
  }

  backToLobby() {
    this.selectedSession.set(null);
    this.loadSessions();
  }

  refreshSelected() {
    const s = this.selectedSession();
    if (!s) return;
    this.service.getSession(s.id).subscribe({ next: d => this.selectedSession.set(d) });
  }

  openCreateDialog() {
    this.dialog.open(CreateQuizGameDialogComponent, { width: '380px' })
      .afterClosed().subscribe(result => {
        if (!result) return;
        this.service.createSession({ title: result.title, questionCount: result.questionCount }).subscribe({
          next: d => { this.selectedSession.set(d); this.snackBar.open('Game created — start it when ready', 'Close', { duration: 3000 }); },
          error: () => this.snackBar.open('Failed to create game', 'Close', { duration: 4000 })
        });
      });
  }

  startSession() {
    const s = this.selectedSession();
    if (!s) return;
    this.service.startSession(s.id).subscribe({
      next: d => this.selectedSession.set(d),
      error: (err) => this.snackBar.open(err.error?.error ?? 'Failed to start game', 'Close', { duration: 4000 })
    });
  }

  submitAnswer(selectedIndex: number) {
    const s = this.selectedSession();
    if (!s) return;
    this.service.submitAnswer(s.id, selectedIndex).subscribe({
      next: () => { this.snackBar.open('Answer locked in', 'Close', { duration: 1500 }); this.refreshSelected(); },
      error: (err) => this.snackBar.open(err.error?.error ?? 'Failed to submit answer', 'Close', { duration: 4000 })
    });
  }
}
