import { Component, OnInit, OnDestroy, AfterViewChecked, ElementRef, ViewChild, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { WordleService } from '../../core/services/wordle.service';
import { WordleRoyaleService } from '../../core/services/wordle-royale.service';
import { WordleSession, WordleSessionSummary } from '../../core/models/wordle.model';
import { RoyaleStanding, WeeklyRoyale } from '../../core/models/wordle-royale.model';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { FeatureAccessService } from '../../core/services/feature-access.service';
import { NavService } from '../../core/nav/nav.service';
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
    .tab-bar { display:flex;gap:4px;background:rgba(255,255,255,0.04);border-radius:10px;padding:4px;margin-bottom:18px }
    .tab-btn { flex:1;padding:7px 0;border:none;border-radius:7px;background:transparent;color:rgba(255,255,255,0.55);
               font-size:0.82rem;font-weight:600;cursor:pointer;transition:all 0.15s;letter-spacing:0.3px }
    .tab-btn.active { background:rgba(255,255,255,0.1);color:#fff }
    .tab-btn:hover:not(.active) { background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.8) }
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
    .guess-hint { text-align:center;font-size:0.75rem;opacity:0.45;margin-top:4px;display:flex;align-items:center;justify-content:center;gap:8px }
    .native-kb-btn { background:none;border:none;color:rgba(255,255,255,0.35);cursor:pointer;padding:2px;display:flex;align-items:center }
    .native-kb-btn:hover { color:rgba(255,255,255,0.65) }
    .native-kb-btn mat-icon { font-size:18px;width:18px;height:18px;line-height:18px }
    .keyboard { display:flex;flex-direction:column;gap:6px;align-items:center;margin-top:16px }
    .keyboard-row { display:flex;gap:5px }
    .key {
      min-width:30px;height:42px;padding:0 6px;border-radius:5px;border:none;
      background:rgba(255,255,255,0.12);color:#fff;font-weight:700;font-size:0.78rem;
      cursor:pointer;text-transform:uppercase;display:flex;align-items:center;justify-content:center;
      font-family:inherit;flex-shrink:0;
    }
    .key:hover:not(:disabled) { background:rgba(255,255,255,0.22) }
    .key:disabled { opacity:0.5;cursor:default }
    .key.wide { min-width:48px;font-size:0.65rem;padding:0 4px }
    .key.correct { background:#388e3c;color:#fff }
    .key.present { background:#b8960c;color:#fff }
    .key.absent { background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.35) }
    @media (max-width: 480px) {
      .game-card { padding:14px 0 0;border-radius:10px }
      .game-card.is-playing {
        height:calc(100dvh - 62px);
        display:flex;flex-direction:column;overflow:hidden;border-radius:0;border-left:none;border-right:none;
      }
      .playing-back-btn {
        background:none;border:none;border-radius:50%;
        width:44px;height:44px;display:flex;align-items:center;justify-content:center;
        cursor:pointer;color:rgba(255,255,255,0.7);flex-shrink:0;align-self:flex-start;margin:6px 0 0 6px;
      }
      .playing-back-btn:hover { background:rgba(255,255,255,0.08);color:#fff }
      .playing-back-btn mat-icon { font-size:26px;width:26px;height:26px;line-height:26px }
      .session-title { padding:0 14px }
      .progress-label { padding:0 14px }
      .is-playing .session-title { padding:8px 14px 4px;flex-shrink:0 }
      .scoreboard { padding:0 14px 14px }
      .status-banner { padding:16px 14px }
      .royale-banner { margin:0 14px 14px }
      /* Grid fills all remaining space */
      .is-playing .wordle-grid {
        flex:1;min-height:0;margin:0;padding:8px 12px 0;
        box-sizing:border-box;width:100%;align-items:stretch;gap:6px;
      }
      .is-playing .wordle-row { flex:1;gap:5px;justify-content:center }
      .is-playing .wordle-tile {
        flex:0 0 auto;height:100%;aspect-ratio:1;width:auto;
        font-size:clamp(1rem,7cqh,1.6rem);
      }
      /* Keyboard pinned to bottom */
      .is-playing .guess-hint { flex-shrink:0;padding:2px 14px }
      .keyboard { flex-shrink:0;width:100%;box-sizing:border-box;padding:10px 6px 16px;border-top:1px solid rgba(255,255,255,0.07) }
      .keyboard-row { gap:4px;width:100% }
      .key { min-width:0;flex:1;height:52px;font-size:0.85rem;border-radius:6px }
      .key.wide { flex:1.6;font-size:0.72rem }
    }
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
    /* Royale */
    .royale-section { margin-bottom:24px }
    .royale-section-label { font-size:0.7rem;text-transform:uppercase;letter-spacing:0.6px;opacity:0.45;margin-bottom:10px }
    .standings-table { width:100%;border-collapse:collapse }
    .standings-table th { font-size:0.68rem;text-transform:uppercase;letter-spacing:0.4px;opacity:0.45;
                          text-align:left;padding:0 8px 8px;font-weight:600 }
    .standings-table th.num { text-align:right }
    .standings-table td { padding:8px 8px;font-size:0.85rem;border-top:1px solid rgba(255,255,255,0.06) }
    .standings-table td.num { text-align:right;font-variant-numeric:tabular-nums }
    .standings-table tr.me td { color:#64b5f6 }
    .elo-val { font-weight:700;font-size:0.95rem }
    .streak-badge { display:inline-flex;align-items:center;gap:2px;font-size:0.78rem;color:#ff7043;font-weight:700 }
    .streak-icon { font-size:14px;width:14px;height:14px;line-height:14px }
    .rank-num { opacity:0.45;font-size:0.8rem;min-width:20px }
    .match-card {
      background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
      border-radius:10px;padding:12px 14px;margin-bottom:8px;font-size:0.83rem;
    }
    .match-players { display:flex;align-items:center;gap:8px;margin-bottom:6px }
    .match-name { flex:1 }
    .match-name.winner { color:#81c784;font-weight:600 }
    .match-name.loser { opacity:0.6 }
    .match-vs { opacity:0.35;font-size:0.75rem }
    .match-guesses { font-size:0.75rem;opacity:0.55 }
    .elo-pill { font-size:0.72rem;font-weight:700;padding:2px 7px;border-radius:8px;white-space:nowrap }
    .elo-pill.pos { background:rgba(102,187,106,0.15);color:#81c784 }
    .elo-pill.neg { background:rgba(239,83,80,0.15);color:#ef5350 }
    .elo-pill.neu { background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.5) }
    .royale-banner {
      display:flex;align-items:center;gap:10px;background:rgba(100,181,246,0.1);
      border:1px solid rgba(100,181,246,0.2);border-radius:10px;padding:10px 14px;
      margin-top:12px;font-size:0.83rem;
    }
    .royale-banner mat-icon { color:#64b5f6;font-size:20px;width:20px;height:20px;line-height:20px;flex-shrink:0 }
    .royale-delta { font-weight:700;font-size:0.9rem }
    .royale-delta.pos { color:#81c784 }
    .royale-delta.neg { color:#ef5350 }
    .royale-delta.neu { color:rgba(255,255,255,0.5) }
    .week-empty { text-align:center;opacity:0.45;padding:32px 0;font-size:0.82rem }
  `],
  template: `
    <div class="wrap">
      @if (!selectedSession()) {
        <div class="lobby-header">
          <h2><mat-icon class="heading-icon">abc</mat-icon>Wordle</h2>
          @if (activeTab() === 'games' && canHost()) {
            <button mat-flat-button color="primary" [disabled]="creatingSession()" (click)="openCreateDialog()">
              @if (creatingSession()) { <mat-spinner diameter="18" style="display:inline-block;vertical-align:middle" /> Creating… }
              @else { New Game }
            </button>
          }
        </div>

        <div class="tab-bar">
          <button class="tab-btn" [class.active]="activeTab()==='games'" (click)="switchTab('games')">Games</button>
          <button class="tab-btn" [class.active]="activeTab()==='royale'" (click)="switchTab('royale')">
            Royale
          </button>
        </div>

        @if (activeTab() === 'games') {
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
        }

        @if (activeTab() === 'royale') {
          @if (royaleLoading()) {
            <div style="text-align:center;padding:40px 0"><mat-spinner diameter="32" style="margin:0 auto"></mat-spinner></div>
          } @else {
            <!-- Standings -->
            <div class="royale-section">
              <div class="royale-section-label">ELO Standings</div>
              @if (standings().length === 0) {
                <div class="week-empty">No ratings yet — play a Wordle to earn your first ELO.</div>
              } @else {
                <table class="standings-table">
                  <thead>
                    <tr>
                      <th style="width:28px"></th>
                      <th>Player</th>
                      <th class="num">ELO</th>
                      <th class="num">W</th>
                      <th class="num">D</th>
                      <th class="num">L</th>
                      <th class="num">Streak</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (s of standings(); track s.memberId) {
                      <tr [class.me]="s.memberId === myMemberId()">
                        <td class="num"><span class="rank-num">{{ s.rank }}</span></td>
                        <td>{{ s.memberName }}</td>
                        <td class="num"><span class="elo-val">{{ s.elo }}</span></td>
                        <td class="num">{{ s.wins }}</td>
                        <td class="num">{{ s.draws }}</td>
                        <td class="num">{{ s.losses }}</td>
                        <td class="num">
                          @if (s.winStreak >= 2) {
                            <span class="streak-badge">
                              <mat-icon class="streak-icon">local_fire_department</mat-icon>{{ s.winStreak }}
                            </span>
                          } @else {
                            <span style="opacity:0.35">—</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>

            <!-- This week's matches -->
            <div class="royale-section">
              <div class="royale-section-label" style="display:flex;justify-content:space-between">
                <span>This Week's Matches</span>
                @if (weeklyRoyale()) {
                  <span style="opacity:0.4">Week {{ weeklyRoyale()!.isoWeek }}</span>
                }
              </div>
              @if (!weeklyRoyale() || weeklyRoyale()!.matches.length === 0) {
                <div class="week-empty">No head-to-head matches yet this week.</div>
              } @else {
                @for (m of weeklyRoyale()!.matches; track m.id) {
                  <div class="match-card">
                    <div class="match-players">
                      <div class="match-name" [class.winner]="m.winnerId === m.player1Id" [class.loser]="m.winnerId === m.player2Id">
                        {{ m.player1Name }}
                      </div>
                      <span class="match-vs">vs</span>
                      <div class="match-name" style="text-align:right" [class.winner]="m.winnerId === m.player2Id" [class.loser]="m.winnerId === m.player1Id">
                        {{ m.player2Name }}
                      </div>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center">
                      <div style="display:flex;gap:6px;align-items:center">
                        <span class="elo-pill" [class.pos]="m.player1EloChange>0" [class.neg]="m.player1EloChange<0" [class.neu]="m.player1EloChange===0">
                          {{ m.player1EloChange > 0 ? '+' : '' }}{{ m.player1EloChange }} → {{ m.player1EloAfter }}
                        </span>
                      </div>
                      <span class="match-guesses">
                        {{ matchGuessLabel(m.player1Guesses, m.player1Won) }} vs {{ matchGuessLabel(m.player2Guesses, m.player2Won) }}
                      </span>
                      <div style="display:flex;justify-content:flex-end;gap:6px">
                        <span class="elo-pill" [class.pos]="m.player2EloChange>0" [class.neg]="m.player2EloChange<0" [class.neu]="m.player2EloChange===0">
                          {{ m.player2EloChange > 0 ? '+' : '' }}{{ m.player2EloChange }} → {{ m.player2EloAfter }}
                        </span>
                      </div>
                    </div>
                  </div>
                }
              }
            </div>
          }
        }
      } @else {
        @if (selectedSessionLoading()) {
          <div style="text-align:center;padding:40px 0"><mat-spinner diameter="32" style="margin:0 auto"></mat-spinner></div>
        } @else {
          @let s = selectedSession()!;
          @if (s.myStatus !== 'Playing') {
            <span class="back-link" (click)="backToLobby()"><mat-icon style="font-size:16px;width:16px;height:16px">arrow_back</mat-icon> All games</span>
          }
          <div class="game-card" [class.is-playing]="s.myStatus === 'Playing' && s.status !== 'Completed'">
            @if (s.myStatus === 'Playing' && s.status !== 'Completed') {
              <button class="playing-back-btn" type="button" (click)="backToLobby()"><mat-icon>arrow_back</mat-icon></button>
            }
            @if (s.myStatus !== 'Playing') {
              <div class="session-title" style="font-size:1.05rem">{{ s.title || 'Wordle' }}</div>
            }

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
                    <div class="wordle-row" (click)="onGridClick()">
                      @for (i of tileIndexes(s); track i) {
                        <div class="wordle-tile" [class.filled]="i < guessInput.length">{{ guessInput.charAt(i) }}</div>
                      }
                      <input #guessInputEl class="guess-input" [(ngModel)]="guessInput" name="guess"
                             [maxlength]="s.wordLength" [disabled]="submittingGuess()"
                             [attr.inputmode]="isMobile() && !useNativeKeyboard() ? 'none' : null"
                             (ngModelChange)="onGuessInputChange($event, s.wordLength)"
                             (blur)="onInputBlur()"
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
                  <div class="keyboard">
                    @for (row of keyboardRows; track $index) {
                      <div class="keyboard-row">
                        @for (key of row; track key) {
                          <button type="button" class="key" [class.wide]="key === 'ENTER' || key === 'BACKSPACE'"
                                  [class]="letterStatuses()[key]" [disabled]="submittingGuess()"
                                  (click)="onKeyPress(key)">
                            {{ key === 'BACKSPACE' ? '⌫' : (key === 'ENTER' ? 'Enter' : key) }}
                          </button>
                        }
                      </div>
                    }
                  </div>
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
                  @if (s.myRoyaleResult) {
                    @let r = s.myRoyaleResult;
                    <div class="royale-banner">
                      <mat-icon>leaderboard</mat-icon>
                      <div style="flex:1">
                        <div style="opacity:0.6;font-size:0.75rem;margin-bottom:2px">Royale</div>
                        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                          <span class="royale-delta" [class.pos]="r.eloChange>0" [class.neg]="r.eloChange<0" [class.neu]="r.eloChange===0">
                            {{ r.eloChange > 0 ? '+' : '' }}{{ r.eloChange }} ELO
                          </span>
                          <span style="opacity:0.45;font-size:0.78rem">→ {{ r.eloAfter }}</span>
                          <span style="opacity:0.45;font-size:0.78rem">·</span>
                          <span style="font-size:0.78rem;opacity:0.7">{{ r.matchesWon }}W {{ r.matchesDrawn }}D {{ r.matchesLost }}L this session</span>
                          @if (r.winStreak >= 2) {
                            <span class="streak-badge" style="font-size:0.78rem">
                              <mat-icon class="streak-icon">local_fire_department</mat-icon>{{ r.winStreak }} streak
                            </span>
                          }
                        </div>
                      </div>
                    </div>
                  }
                }
              }

              @if (s.myStatus !== 'Playing') {
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
              }

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
  private royaleService = inject(WordleRoyaleService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private ws = inject(WebSocketService);
  private featureAccess = inject(FeatureAccessService);
  private nav = inject(NavService);
  readonly canHost = this.featureAccess.hasAccess$('wordle-host');

  @ViewChild('guessInputEl') guessInputEl?: ElementRef<HTMLInputElement>;
  private wantsFocus = false;
  isMobile = signal(false);
  useNativeKeyboard = signal(false);

  readonly keyboardRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACKSPACE'],
  ];

  // Best status seen for each letter across all of my guesses so far (correct beats present
  // beats absent, e.g. a letter that was "present" in one guess and "correct" in a later one
  // should show as correct) -- drives the on-screen keyboard's coloring.
  letterStatuses = computed<Record<string, 'correct' | 'present' | 'absent'>>(() => {
    const s = this.selectedSession();
    const map: Record<string, 'correct' | 'present' | 'absent'> = {};
    if (!s) return map;
    const rank: Record<string, number> = { absent: 1, present: 2, correct: 3 };
    for (const g of s.myGuesses) {
      for (let i = 0; i < g.word.length; i++) {
        const letter = g.word.charAt(i);
        const status = g.letters[i] as 'correct' | 'present' | 'absent';
        if (!map[letter] || rank[status] > rank[map[letter]]) {
          map[letter] = status;
        }
      }
    }
    return map;
  });

  sessions = signal<WordleSessionSummary[]>([]);
  loading = signal(false);
  selectedSession = signal<WordleSession | null>(null);
  selectedSessionLoading = signal(false);
  starting = signal(false);
  creatingSession = signal(false);
  submittingGuess = signal(false);
  pendingReveal = signal<PendingReveal | null>(null);
  revealedTiles = signal<boolean[]>([]);
  guessInput = '';
  private pendingSession: WordleSession | null = null;

  activeTab = signal<'games' | 'royale'>('games');
  royaleLoading = signal(false);
  standings = signal<RoyaleStanding[]>([]);
  weeklyRoyale = signal<WeeklyRoyale | null>(null);
  myMemberId = signal<string | null>(null);

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

  matchGuessLabel(guesses: number, won: boolean): string {
    return won ? `${guesses}/6` : 'X/6';
  }

  switchTab(tab: 'games' | 'royale') {
    this.activeTab.set(tab);
    if (tab === 'royale') this.loadRoyale();
  }

  onGuessInputChange(value: string, wordLength: number) {
    this.guessInput = value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, wordLength);
  }

  focusInput() {
    this.guessInputEl?.nativeElement.focus();
  }

  onGridClick() {
    if (this.isMobile()) return;
    this.focusInput();
  }

  openNativeKeyboard() {
    this.useNativeKeyboard.set(true);
    this.focusInput();
  }

  onInputBlur() {
    this.useNativeKeyboard.set(false);
  }

  // Letters greyed out (absent) stay fully clickable -- a player might want to retype one if
  // they made a typo, so the keyboard never hard-disables a key just because it's been ruled out.
  onKeyPress(key: string) {
    const s = this.selectedSession();
    if (!s || this.submittingGuess() || this.pendingReveal()) return;
    if (key === 'ENTER') {
      this.submitGuess();
    } else if (key === 'BACKSPACE') {
      this.guessInput = this.guessInput.slice(0, -1);
    } else if (this.guessInput.length < s.wordLength) {
      this.guessInput += key;
    }
    if (!this.isMobile()) this.focusInput();
  }

  ngAfterViewChecked() {
    if (this.wantsFocus && this.guessInputEl) {
      this.wantsFocus = false;
      this.guessInputEl.nativeElement.focus();
    }
  }

  private requestFocus() {
    if (!this.isMobile()) this.wantsFocus = true;
  }

  private destroy$ = new Subject<void>();
  private poll: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.isMobile.set('ontouchstart' in window || navigator.maxTouchPoints > 0);
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
    this.nav.hideNav.set(false);
    this.destroy$.next(); this.destroy$.complete();
    if (this.poll) clearInterval(this.poll);
  }

  private applySession(d: WordleSession) {
    this.selectedSession.set(d);
    this.myMemberId.set(d.currentMemberId);
    this.nav.hideNav.set(d.myStatus === 'Playing' && d.status !== 'Completed');
    if (d.myStatus === 'Playing') this.requestFocus();
  }

  loadSessions() {
    this.loading.set(true);
    this.service.getOpenSessions().subscribe({
      next: d => { this.sessions.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  loadRoyale() {
    this.royaleLoading.set(true);
    this.royaleService.getStandings().subscribe({
      next: d => { this.standings.set(d); },
      error: () => {}
    });
    this.royaleService.getWeeklyMatches().subscribe({
      next: d => { this.weeklyRoyale.set(d); this.royaleLoading.set(false); },
      error: () => this.royaleLoading.set(false)
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
    this.nav.hideNav.set(false);
    this.selectedSession.set(null);
    this.loadSessions();
  }

  refreshSelected() {
    const s = this.selectedSession();
    if (!s || this.submittingGuess()) return;
    this.service.getSession(s.id).subscribe({ next: d => this.applySession(d) });
  }

  openCreateDialog() {
    this.dialog.open(CreateWordleDialogComponent).afterClosed().subscribe(result => {
      if (!result) return;
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
        const lastGuess = d.myGuesses[d.myGuesses.length - 1];
        this.pendingReveal.set({ word: lastGuess.word, letters: lastGuess.letters });
        this.revealedTiles.set(new Array(s.wordLength).fill(false));
        this.pendingSession = d;

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
