import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { QuizGameService } from '../../core/services/quiz-game.service';
import { QuizGameMode, QuizGameSession, QuizGameSessionSummary } from '../../core/models/quiz-game.model';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { WowCountdownComponent } from '../../shared/components/wow-countdown/wow-countdown.component';
import { RevealProgressBarComponent } from '../../shared/components/reveal-progress-bar/reveal-progress-bar.component';
import { FeatureAccessService } from '../../core/services/feature-access.service';

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
    .mode-row { display:flex;gap:8px;margin-bottom:12px }
    .mode-btn { flex:1;padding:10px;border-radius:6px;border:1px solid rgba(255,255,255,0.12);
                background:rgba(255,255,255,0.04);color:inherit;font-size:0.82rem;cursor:pointer;
                font-family:inherit;transition:all 0.15s;text-align:center }
    .mode-btn.active { border-color:#64b5f6;background:rgba(100,181,246,0.12);color:#64b5f6;font-weight:600 }
    .mode-hint { font-size:0.72rem;opacity:0.5;margin:-4px 0 12px }
  `],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <h2 mat-dialog-title style="font-size:1rem;margin:0 0 4px">New Quiz Game</h2>
    <mat-dialog-content style="padding-top:12px;min-width:320px">
      <label class="field-label">Mode</label>
      <div class="mode-row">
        <button type="button" class="mode-btn" [class.active]="gameMode === 'Classic'" (click)="gameMode = 'Classic'">Classic</button>
        <button type="button" class="mode-btn" [class.active]="gameMode === 'Millionaire'" (click)="gameMode = 'Millionaire'">Millionaire</button>
      </div>
      <div class="mode-hint">
        @if (gameMode === 'Classic') {
          Everyone answers the same question together each round.
        } @else {
          Each player climbs their own 15-question prize ladder — wrong answer ends your run, walk away anytime to bank your winnings.
        }
      </div>

      <label class="field-label">Title (optional)</label>
      <input class="field" [(ngModel)]="title" placeholder="e.g. Friday Trivia" (keyup.enter)="submit()">

      @if (gameMode === 'Classic') {
        <label class="field-label">Number of questions</label>
        <input class="field" type="number" min="3" max="25" [(ngModel)]="questionCount">
      }
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
  gameMode: QuizGameMode = 'Classic';

  submit() {
    this.dialogRef.close({ title: this.title || undefined, questionCount: this.questionCount, gameMode: this.gameMode });
  }
}

@Component({
  selector: 'app-quiz-game',
  standalone: true,
  imports: [
    DecimalPipe, FormsModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatSnackBarModule, MatProgressSpinnerModule, WowCountdownComponent, RevealProgressBarComponent
  ],
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .wrap { max-width: 760px; margin: 0 auto; transition: max-width 0.2s }
    .wrap.wide { max-width: 960px }
    .millionaire-layout { display:flex; gap:24px; align-items:flex-start }
    .millionaire-main { flex:1; min-width:0 }
    .millionaire-sidebar { width:170px; flex-shrink:0 }
    .millionaire-sidebar .progress-label { text-align:left; margin:0 0 6px }
    @media (max-width: 640px) {
      .millionaire-layout { flex-direction: column }
      .millionaire-sidebar { width:100% }
    }
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
    .mode-tag { font-size:0.65rem;font-weight:700;background:rgba(255,213,79,0.15);color:#ffd54f;padding:2px 7px;border-radius:8px;margin-left:6px;vertical-align:middle }
    .ladder { display:flex;flex-direction:column-reverse;gap:2px;margin:0;max-height:480px;overflow-y:auto }
    .ladder-rung { display:flex;align-items:center;justify-content:space-between;padding:4px 8px;border-radius:5px;font-size:0.68rem;background:rgba(255,255,255,0.03);gap:4px }
    .rung-players { display:flex;gap:2px;flex:1;justify-content:center;flex-wrap:wrap }
    .player-chip { display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;
                   background:rgba(100,181,246,0.25);color:#64b5f6;font-size:0.6rem;font-weight:700;cursor:default;flex-shrink:0 }
    .player-chip.eliminated { background:rgba(239,83,80,0.25);color:#ef5350 }
    .player-chip.walked-away { background:rgba(255,213,79,0.25);color:#ffd54f }
    .player-chip.won { background:rgba(129,199,132,0.25);color:#81c784 }
    .ladder-rung.current { background:rgba(100,181,246,0.15);border:1px solid #64b5f6;font-weight:700 }
    .ladder-rung.safe-haven { border-left:3px solid #ffd54f }
    .ladder-rung.cleared { opacity:0.45 }
    .millionaire-status-banner { text-align:center;padding:18px 0;font-size:0.95rem }
    .millionaire-status-banner.won { color:#81c784 }
    .millionaire-status-banner.eliminated { color:#ef5350 }
    .millionaire-status-banner.walked-away { color:#ffd54f }
    .winnings-row { display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:0.85rem }
    .winnings-row.me { color:#64b5f6;font-weight:600 }
    .walk-away-btn { width:100%;margin-top:10px }
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
    .option-btn.option-selected { border-color:#64b5f6;background:rgba(100,181,246,0.12);color:#64b5f6 }
    .option-btn:disabled { opacity:0.7 }
    .option-btn.flash-correct { animation:millionaire-flash-correct 0.4s ease-in-out 3; border-color:#4caf50 !important; color:#4caf50 !important; background:rgba(76,175,80,0.18) !important; opacity:1 !important }
    .option-btn.flash-wrong { animation:millionaire-flash-wrong 0.4s ease-in-out 3; border-color:#f44336 !important; color:#f44336 !important; background:rgba(244,67,54,0.18) !important; opacity:1 !important }
    .option-btn.reveal-correct-static { border-color:#4caf50 !important; color:#4caf50 !important; background:rgba(76,175,80,0.18) !important; opacity:1 !important }
    @keyframes millionaire-flash-correct { 0%,100% { background:rgba(76,175,80,0.18) } 50% { background:rgba(76,175,80,0.5) } }
    @keyframes millionaire-flash-wrong { 0%,100% { background:rgba(244,67,54,0.18) } 50% { background:rgba(244,67,54,0.5) } }
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
    <div class="wrap" [class.wide]="millionaireLayoutActive()">
      @if (!selectedSession()) {
        <div class="lobby-header">
          <h2><mat-icon class="heading-icon">help_outline</mat-icon>Quiz Game</h2>
          @if (canHost()) {
            <button mat-flat-button color="primary" (click)="openCreateDialog()">New Game</button>
          }
        </div>

        @if (loading()) {
          <div style="text-align:center;padding:40px 0"><mat-spinner diameter="32" style="margin:0 auto"></mat-spinner></div>
        } @else if (sessions().length === 0) {
          <div class="empty">No quiz games running right now — start one!</div>
        } @else {
          @for (s of sessions(); track s.id) {
            <div class="session-card" (click)="selectSession(s)">
              <div>
                <div class="session-title">
                  {{ s.title || 'Quiz Game' }}
                  @if (s.gameMode === 'Millionaire') { <span class="mode-tag">Millionaire</span> }
                </div>
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
              <div class="session-title" style="font-size:1.05rem">
                {{ s.title || 'Quiz Game' }}
                @if (s.gameMode === 'Millionaire') { <span class="mode-tag">Millionaire</span> }
              </div>
              @if (s.gameMode === 'Classic' && s.status === 'InProgress' && !s.currentQuestionRevealed) {
                <app-wow-countdown [endsAt]="s.currentQuestionEndsAt" />
              }
              @if (s.gameMode === 'Millionaire' && s.myMillionaireRun?.status === 'Playing' && s.myMillionaireRun?.endsAt) {
                <app-wow-countdown [endsAt]="s.myMillionaireRun!.endsAt" />
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
                <button mat-flat-button color="primary" style="width:100%;margin-top:14px" [disabled]="starting()" (click)="startSession()">
                  @if (starting()) { <mat-spinner diameter="18" style="display:inline-block;vertical-align:middle" /> Starting… }
                  @else { Start Game }
                </button>
              } @else if (!s.isParticipant) {
                <button mat-stroked-button style="width:100%;margin-top:14px" (click)="joinSelected()">Join Game</button>
              }
            }

            @if ((s.status === 'InProgress' || s.status === 'Completed') && s.gameMode === 'Millionaire') {
              @if (!s.isParticipant) {
                <button mat-stroked-button style="width:100%;margin-bottom:10px" (click)="joinSelected()">Join Game</button>
              } @else if (!s.myMillionaireRun || s.myMillionaireRun.status === 'NotStarted') {
                <div class="progress-label" style="margin:16px 0 8px">Ready to climb the ladder?</div>
                <button mat-flat-button color="primary" style="width:100%" [disabled]="starting()" (click)="startMillionaireRun()">
                  @if (starting()) { <mat-spinner diameter="18" style="display:inline-block;vertical-align:middle" /> Starting… }
                  @else { Start My Run }
                </button>
              } @else if (s.myMillionaireRun.status === 'Playing') {
                <div class="millionaire-layout" style="margin-top:14px">
                  <div class="millionaire-main">
                    <div class="progress-label">
                      Question {{ s.myMillionaireRun.roundIndex + 1 }} of {{ s.millionairePrizeLadder.length }} — for \${{ (s.millionairePrizeLadder[s.myMillionaireRun.roundIndex] ?? 0) | number }}
                    </div>
                    <div class="question-text">{{ s.myMillionaireRun.question }}</div>

                    <div class="options-grid">
                      @for (opt of s.myMillionaireRun.options; let i = $index; track i) {
                        <button mat-stroked-button class="option-btn"
                                [class.option-selected]="selectedAnswerIndex() === i && !answerReveal()"
                                [class.flash-correct]="answerReveal()?.selectedIndex === i && answerReveal()?.isCorrect"
                                [class.flash-wrong]="answerReveal()?.selectedIndex === i && answerReveal()?.isCorrect === false"
                                [class.reveal-correct-static]="answerReveal()?.isCorrect === false && answerReveal()?.correctIndex === i"
                                [disabled]="submittingAnswer()" (click)="submitMillionaireAnswer(i)">
                          {{ opt }}
                        </button>
                      }
                    </div>

                    @if (submittingAnswer() && !answerReveal()) {
                      <div style="font-size:0.78rem;opacity:0.6;text-align:center;margin-top:10px;display:flex;align-items:center;justify-content:center;gap:8px">
                        <mat-spinner diameter="16" /> Checking your answer…
                      </div>
                    }

                    @if (answerReveal() && canContinue()) {
                      <button mat-flat-button color="primary" style="width:100%;margin-top:10px" (click)="continueAfterReveal()">Continue</button>
                    }

                    <button mat-stroked-button class="walk-away-btn" [disabled]="submittingAnswer()" (click)="walkAway()">
                      Walk Away with \${{ s.myMillionaireRun.safeHavenWinnings | number }}
                    </button>
                  </div>

                  <div class="millionaire-sidebar">
                    <div class="progress-label">Prize ladder</div>
                    <div class="ladder">
                      @for (prize of s.millionairePrizeLadder; let i = $index; track i) {
                        <div class="ladder-rung"
                             [class.current]="i === s.myMillionaireRun.roundIndex"
                             [class.safe-haven]="s.millionaireSafeHavenRounds.includes(i)"
                             [class.cleared]="i < s.myMillionaireRun.roundIndex">
                          <span>{{ i + 1 }}</span>
                          <span class="rung-players">
                            @for (p of participantsAtRound(s, i, true); track p.memberId) {
                              <span class="player-chip"
                                    [class.eliminated]="p.millionaireStatus === 'Eliminated'"
                                    [class.walked-away]="p.millionaireStatus === 'WalkedAway'"
                                    [class.won]="p.millionaireStatus === 'Won'"
                                    [title]="p.memberName + ' (' + millionaireStatusLabel(p.millionaireStatus) + ')'">
                                {{ p.memberName.charAt(0) }}
                              </span>
                            }
                          </span>
                          <span>\${{ prize | number }}</span>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              } @else {
                <div class="millionaire-status-banner"
                     [class.won]="s.myMillionaireRun.status === 'Won'"
                     [class.eliminated]="s.myMillionaireRun.status === 'Eliminated'"
                     [class.walked-away]="s.myMillionaireRun.status === 'WalkedAway'">
                  @if (s.myMillionaireRun.status === 'Won') {
                    <mat-icon style="font-size:1.5rem;width:1.5rem;height:1.5rem;color:#64b5f6">emoji_events</mat-icon>
                    <div class="winner-name">You won \${{ s.myMillionaireRun.winnings | number }}!</div>
                  } @else if (s.myMillionaireRun.status === 'Eliminated') {
                    <div class="winner-name">Eliminated — you kept \${{ s.myMillionaireRun.winnings | number }}</div>
                    @if (s.myMillionaireRun.revealedCorrectIndex !== null) {
                      <div style="font-size:0.8rem;opacity:0.7;margin-top:6px">
                        Correct answer: {{ s.myMillionaireRun.options[s.myMillionaireRun.revealedCorrectIndex!] }}
                      </div>
                    }
                  } @else {
                    <div class="winner-name">You walked away with \${{ s.myMillionaireRun.winnings | number }}</div>
                  }
                </div>
              }

              <div class="scoreboard">
                @if (s.status === 'Completed') {
                  <div class="progress-label" style="margin-bottom:6px;text-align:left">Final standings</div>
                }
                @for (p of s.participants; track p.memberId) {
                  <div class="winnings-row" [class.me]="p.memberId === s.currentMemberId">
                    <span>{{ p.memberName }} <span style="opacity:0.5;font-size:0.7rem">({{ millionaireStatusLabel(p.millionaireStatus) }})</span></span>
                    <span class="score">\${{ p.millionaireWinnings | number }}</span>
                  </div>
                }
              </div>

              @if (s.status === 'Completed') {
                <button mat-flat-button color="primary" style="width:100%;margin-top:14px" (click)="backToLobby()">Back to lobby</button>
              }
            }

            @if (s.status === 'InProgress' && s.gameMode === 'Classic') {
              <div class="progress-label" style="margin-top:14px">Question {{ s.currentQuestionIndex + 1 }} of {{ s.questionCount }}</div>
              <div class="question-text">{{ s.currentQuestion }}</div>

              @if (!s.isParticipant) {
                <button mat-stroked-button style="width:100%;margin-bottom:10px" (click)="joinSelected()">Join Game</button>
              }

              <div class="options-grid">
                @for (opt of s.currentOptions; let i = $index; track i) {
                  @if (s.isParticipant && s.myAnswerIndex === null && !s.currentQuestionRevealed && !classicAnswerResult()) {
                    <button mat-stroked-button class="option-btn" [disabled]="submittingClassicAnswer()" (click)="submitAnswer(i)">{{ opt }}</button>
                  } @else {
                    <div class="quiz-option-display"
                         [class.quiz-option-correct]="(s.currentQuestionRevealed && s.currentCorrectIndex === i) || classicAnswerResult()?.correctIndex === i"
                         [class.quiz-option-wrong]="(s.currentQuestionRevealed && s.myAnswerIndex === i && s.currentCorrectIndex !== i) || (classicAnswerResult()?.selectedIndex === i && classicAnswerResult()?.isCorrect === false)"
                         [class.quiz-option-mine]="!s.currentQuestionRevealed && !classicAnswerResult() && s.myAnswerIndex === i">
                      {{ opt }}
                      @if ((classicAnswerResult()?.selectedIndex ?? s.myAnswerIndex) === i) { <span style="opacity:0.6"> — your pick</span> }
                    </div>
                  }
                }
              </div>

              @if (s.isParticipant && classicAnswerResult() && !s.currentQuestionRevealed) {
                <div style="font-size:0.85rem;font-weight:700;margin-top:10px;text-align:center"
                     [style.color]="classicAnswerResult()!.isCorrect ? '#81c784' : '#ef5350'">
                  {{ classicAnswerResult()!.isCorrect ? 'Correct!' : 'Incorrect' }} — waiting on the others…
                </div>
              } @else if (s.isParticipant && s.myAnswerIndex !== null && !s.currentQuestionRevealed) {
                <div style="font-size:0.78rem;opacity:0.5;margin-top:10px;text-align:center">Answer locked in — waiting on the others…</div>
              }

              @if (s.currentQuestionRevealed) {
                @if (loadingNextQuestion()) {
                  <div style="font-size:0.78rem;opacity:0.6;text-align:center;margin-top:10px;display:flex;align-items:center;justify-content:center;gap:8px">
                    <mat-spinner diameter="16" /> Loading next question…
                  </div>
                } @else {
                  <div style="font-size:0.75rem;opacity:0.6;font-weight:600;margin-top:10px;text-align:center">Next question coming up…</div>
                  <app-reveal-progress-bar [endsAt]="s.revealEndsAt" (drained)="loadingNextQuestion.set(true)" />
                }
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

            @if (s.status === 'Completed' && s.gameMode === 'Classic') {
              <div class="completed-banner">
                <mat-icon style="font-size:1.5rem;width:1.5rem;height:1.5rem;color:#64b5f6">emoji_events</mat-icon>
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
  private featureAccess = inject(FeatureAccessService);
  readonly canHost = this.featureAccess.hasAccess$('quiz-game-host');

  loading = signal(true);
  sessions = signal<QuizGameSessionSummary[]>([]);
  selectedSession = signal<QuizGameSession | null>(null);
  selectedSessionLoading = signal(false);
  starting = signal(false);
  loadingNextQuestion = signal(false);
  submittingAnswer = signal(false);
  selectedAnswerIndex = signal<number | null>(null);
  answerReveal = signal<{ selectedIndex: number; correctIndex: number | null; isCorrect: boolean } | null>(null);
  canContinue = signal(false);
  private pendingMillionaireResult: QuizGameSession | null = null;

  // Classic mode: lets the answering player see correct/wrong immediately, instead of waiting
  // in the dark until the whole room's reveal fires. Cleared in applySession once the question
  // actually advances (see lastClassicQuestionIndex).
  submittingClassicAnswer = signal(false);
  classicAnswerResult = signal<{ selectedIndex: number; isCorrect: boolean; correctIndex: number } | null>(null);
  private lastClassicQuestionIndex = -1;

  millionaireLayoutActive = computed(() => {
    const s = this.selectedSession();
    return !!s && s.gameMode === 'Millionaire' && s.status === 'InProgress' && s.myMillionaireRun?.status === 'Playing';
  });

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

  millionaireStatusLabel(status: string): string {
    switch (status) {
      case 'Playing': return 'playing';
      case 'Eliminated': return 'eliminated';
      case 'WalkedAway': return 'walked away';
      case 'Won': return 'won';
      default: return 'not started';
    }
  }

  // Which participants are sitting at a given rung -- Won shows at the top rung since a winner's
  // round index points one past the last rung (there's nothing above 15 to show them on).
  participantsAtRound(s: QuizGameSession, roundIndex: number, excludeSelf: boolean) {
    const topRung = s.millionairePrizeLadder.length - 1;
    return s.participants.filter(p => {
      if (excludeSelf && p.memberId === s.currentMemberId) return false;
      if (p.millionaireStatus === 'NotStarted') return false;
      const effectiveIndex = p.millionaireStatus === 'Won' ? topRung : p.millionaireRoundIndex;
      return effectiveIndex === roundIndex;
    });
  }

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

    // Mobile browsers throttle/pause timers when the screen dims or the tab backgrounds --
    // resync immediately on resume instead of waiting for the next poll tick to catch up.
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy() {
    this.destroy$.next(); this.destroy$.complete();
    if (this.poll) clearInterval(this.poll);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private onVisibilityChange = () => {
    if (document.visibilityState !== 'visible') return;
    if (this.selectedSession()) this.refreshSelected();
    else this.loadSessions();
  };

  loadSessions() {
    this.loading.set(true);
    this.service.getOpenSessions().subscribe({
      next: items => { this.sessions.set(items); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  // Centralizes selectedSession updates so the "loading next question" spinner always clears
  // the moment a fresh (non-revealed) question actually arrives.
  private applySession(d: QuizGameSession) {
    if (!d.currentQuestionRevealed) this.loadingNextQuestion.set(false);
    if (d.gameMode === 'Classic' && d.currentQuestionIndex !== this.lastClassicQuestionIndex) {
      this.classicAnswerResult.set(null);
      this.lastClassicQuestionIndex = d.currentQuestionIndex;
    }
    this.selectedSession.set(d);
  }

  selectSession(summary: QuizGameSessionSummary) {
    this.selectedSessionLoading.set(true);
    this.loadingNextQuestion.set(false);
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
    this.loadingNextQuestion.set(false);
    this.loadSessions();
  }

  refreshSelected() {
    const s = this.selectedSession();
    // Skip while a Millionaire answer is submitting or its reveal is being held on screen. The
    // backend broadcasts its WS message mid-request, while still processing the answer -- that
    // can reach this client before our own POST's response does, so this has to be guarded by
    // `submittingAnswer` (set synchronously the instant the user clicks), not just `answerReveal`
    // (only set once our own response arrives) -- otherwise the WS-triggered refresh wins the
    // race and snaps to the post-answer state before the flash ever shows.
    if (!s || this.submittingAnswer()) return;
    this.service.getSession(s.id).subscribe({ next: d => this.applySession(d) });
  }

  openCreateDialog() {
    this.dialog.open(CreateQuizGameDialogComponent, { width: '380px' })
      .afterClosed().subscribe(result => {
        if (!result) return;
        this.service.createSession({ title: result.title, questionCount: result.questionCount, gameMode: result.gameMode }).subscribe({
          next: d => { this.applySession(d); this.snackBar.open('Game created — start it when ready', 'Close', { duration: 3000 }); },
          error: () => this.snackBar.open('Failed to create game', 'Close', { duration: 4000 })
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

  startMillionaireRun() {
    const s = this.selectedSession();
    if (!s || this.starting()) return;
    this.starting.set(true);
    this.service.startMillionaireRun(s.id).subscribe({
      next: d => { this.applySession(d); this.starting.set(false); },
      error: (err) => { this.starting.set(false); this.snackBar.open(err.error?.error ?? 'Failed to start your run', 'Close', { duration: 4000 }); }
    });
  }

  submitMillionaireAnswer(selectedIndex: number) {
    const s = this.selectedSession();
    if (!s || this.submittingAnswer()) return;
    this.submittingAnswer.set(true);
    this.selectedAnswerIndex.set(selectedIndex);
    this.service.submitMillionaireAnswer(s.id, selectedIndex).subscribe({
      next: d => {
        // Hold the just-answered question on screen and flash the result -- selected option
        // green/red, correct option revealed in green if wrong -- and wait for the player to hit
        // Continue rather than auto-advancing, so the reveal doesn't whip past before they've
        // actually seen it.
        const isCorrect = d.myMillionaireRun?.status !== 'Eliminated';
        const correctIndex = isCorrect ? selectedIndex : (d.myMillionaireRun?.revealedCorrectIndex ?? null);
        this.answerReveal.set({ selectedIndex, correctIndex, isCorrect });
        this.pendingMillionaireResult = d;
        setTimeout(() => this.canContinue.set(true), 1200);
      },
      error: (err) => {
        this.submittingAnswer.set(false);
        this.selectedAnswerIndex.set(null);
        this.snackBar.open(err.error?.error ?? 'Failed to submit answer', 'Close', { duration: 4000 });
      }
    });
  }

  continueAfterReveal() {
    const d = this.pendingMillionaireResult;
    if (!d) return;
    this.applySession(d);
    this.submittingAnswer.set(false);
    this.selectedAnswerIndex.set(null);
    this.answerReveal.set(null);
    this.canContinue.set(false);
    this.pendingMillionaireResult = null;
  }

  walkAway() {
    const s = this.selectedSession();
    if (!s || this.submittingAnswer()) return;
    this.submittingAnswer.set(true);
    this.service.walkAway(s.id).subscribe({
      next: d => {
        this.applySession(d);
        this.submittingAnswer.set(false);
        this.snackBar.open('Winnings banked', 'Close', { duration: 2500 });
      },
      error: (err) => {
        this.submittingAnswer.set(false);
        this.snackBar.open(err.error?.error ?? 'Failed to walk away', 'Close', { duration: 4000 });
      }
    });
  }

  submitAnswer(selectedIndex: number) {
    const s = this.selectedSession();
    if (!s || this.submittingClassicAnswer()) return;
    this.submittingClassicAnswer.set(true);
    this.service.submitAnswer(s.id, selectedIndex).subscribe({
      next: res => {
        this.classicAnswerResult.set({ selectedIndex, isCorrect: res.isCorrect, correctIndex: res.correctIndex });
        this.submittingClassicAnswer.set(false);
        this.refreshSelected();
      },
      error: (err) => {
        this.submittingClassicAnswer.set(false);
        this.snackBar.open(err.error?.error ?? 'Failed to submit answer', 'Close', { duration: 4000 });
      }
    });
  }
}
