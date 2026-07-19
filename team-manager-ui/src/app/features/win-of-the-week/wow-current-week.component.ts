import { Component, computed, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WinWeek, WinNomination, WowNominationDisplay } from '../../core/models/win-week.model';
import { wowPhaseInfo } from '../../shared/utils/wow.utils';
import { WowNominationCardComponent, ReactionBurst } from '../../shared/components/wow-nomination-card/wow-nomination-card.component';
import { WowWinnerBannerComponent } from '../../shared/components/wow-winner-banner/wow-winner-banner.component';
import { SharedCountdownComponent } from '../../shared/components/shared-countdown/shared-countdown.component';
import { AppLoadingComponent } from '../../shared/components/app-loading/app-loading.component';
import { AppEmptyStateComponent } from '../../shared/components/app-empty-state/app-empty-state.component';
import { AppInfoBannerComponent } from '../../shared/components/app-info-banner/app-info-banner.component';
import { RevealProgressBarComponent } from '../../shared/components/reveal-progress-bar/reveal-progress-bar.component';
import { AiBadgeComponent } from '../../shared/components/ai-badge/ai-badge.component';

@Component({
  selector: 'app-wow-current-week',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatMenuModule,
    MatDividerModule,
    WowNominationCardComponent,
    WowWinnerBannerComponent,
    SharedCountdownComponent,
    AppLoadingComponent,
    AppEmptyStateComponent,
    AppInfoBannerComponent,
    RevealProgressBarComponent,
    MatProgressSpinnerModule,
    AiBadgeComponent
  ],
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    @keyframes hypePulse { 0%,100%{opacity:1} 50%{opacity:0.7} }
    .hype-battle-banner { animation: hypePulse 1.5s ease-in-out infinite; }
    .host-ctrl { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 14px 16px; margin-bottom: 16px; }
    .ctrl-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.45; margin-bottom: 8px; }
    .ctrl-btn { font-size: 0.75rem; height: 28px; line-height: 26px; padding: 0 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.75); cursor: pointer; transition: background 0.15s; white-space: nowrap; }
    .ctrl-btn:hover { background: rgba(255,255,255,0.12); }
    .ctrl-btn.stop { background: rgba(255,87,34,0.15); border-color: rgba(255,87,34,0.4); color: #ff7043; }
    .ctrl-btn.danger { background: rgba(239,83,80,0.1); border-color: rgba(239,83,80,0.3); color: #ef5350; }
    .quiz-option-display { padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); font-size: 0.85rem; opacity: 0.6; }
    .quiz-option-mine { border-color: rgba(100,181,246,0.5); opacity: 0.9; color: #64b5f6; }
    .quiz-option-correct { border-color: rgba(102,187,106,0.6); background: rgba(102,187,106,0.12); opacity: 1; color: #81c784; }
    .quiz-option-wrong { border-color: rgba(239,83,80,0.6); background: rgba(239,83,80,0.1); opacity: 1; color: #ef5350; }
    .ctrl-btn.primary { background: rgba(100,181,246,0.15); border-color: rgba(100,181,246,0.4); color: #64b5f6; font-weight: 600; }
    .label-row { display: flex; align-items: center; justify-content: space-between; width: 100%; }
    .ctrl-section { display: flex; flex-direction: column; gap: 6px; }
    .ctrl-sep { height: 1px; background: rgba(255,255,255,0.07); margin: 10px 0; }
    .preset-row { display: flex; gap: 6px; }
    .preset-btn { flex: 1; font-size: 0.75rem; height: 30px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); cursor: pointer; font-weight: 600; transition: background 0.15s; font-family: inherit; }
    .preset-btn:hover { background: rgba(255,255,255,0.14); }
    .preset-btn.sd { background: rgba(255,87,34,0.15); border-color: rgba(255,87,34,0.4); color: #ff7043; }
    .preset-btn.active { background: rgba(100,181,246,0.18); border-color: #64b5f6; color: #64b5f6; }
    .mob-tabs { display: flex; align-items: stretch; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 16px; position: sticky; top: 0; z-index: 10; background: #0f1923; }
    .mob-tab { flex: 1; padding: 10px 0; font-size: 0.8rem; font-weight: 600; text-align: center; cursor: pointer; color: rgba(255,255,255,0.45); border: none; background: none; font-family: inherit; transition: color 0.15s; border-bottom: 2px solid transparent; margin-bottom: -1px; }
    .mob-tab.active { color: #64b5f6; border-bottom-color: #64b5f6; }
    .mob-more { flex: 0 0 44px; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.4); }
  `],
  template: `
    @let w = week();
    @let phase = phaseInfo();

    <!-- Host controls template (reused on desktop sidebar + mobile tab) -->
    <ng-template #ctrlsTpl>
      @let w = week();
      @if (w && w.status === 'Closed') {
        <div class="host-ctrl">
          <div style="font-size:0.75rem;font-weight:700;opacity:0.6;margin-bottom:12px;display:flex;align-items:center;gap:6px">
            <mat-icon style="font-size:14px;width:14px;height:14px">tune</mat-icon> Host Controls
          </div>
          <button class="ctrl-btn primary" style="width:100%" (click)="openNextWeekClick.emit()">
            Open Next Week
          </button>
        </div>
      }
      @if (w && w.status !== 'Closed') {
        <div class="host-ctrl">
          <div style="font-size:0.75rem;font-weight:700;opacity:0.6;margin-bottom:12px;display:flex;align-items:center;gap:6px">
            <mat-icon style="font-size:14px;width:14px;height:14px">tune</mat-icon> Host Controls
          </div>

          <!-- Power-ups toggle -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;opacity:0.45">Power-ups &amp; Cards</span>
            <mat-slide-toggle [checked]="powerUpsEnabled()" (change)="togglePowerUpsClick.emit()" color="accent" />
          </div>

          <!-- Hide vote counts toggle -->
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;opacity:0.45">Hide Vote Counts</span>
            <mat-slide-toggle [checked]="hideVoteCounts()" (change)="toggleHideVoteCountsClick.emit()" color="accent" />
          </div>

          @if (w.status === 'Nominating') {
            <div class="ctrl-sep"></div>

            <!-- Nominating controls -->
            <div class="ctrl-section">
              <button class="ctrl-btn primary" style="width:100%" (click)="openVotingClick.emit()">
                Open Voting
              </button>
            </div>
          }

          @if (w.status === 'Voting' || w.status === 'SuddenDeath') {
            <!-- Reopen Nominations -->
            <button class="ctrl-btn" style="width:100%;margin-bottom:8px" (click)="reopenNominationsClick.emit()">
              Reopen Nominations
            </button>

            <div class="ctrl-sep"></div>

            <!-- Timer section -->
            <div class="ctrl-section">
              <span class="ctrl-label">Countdown Timer</span>
              @if (!activeTimerEndsAt()) {
                <div class="preset-row">
                  <button class="preset-btn" (click)="startTimerClick.emit(30)">30s</button>
                  <button class="preset-btn" (click)="startTimerClick.emit(60)">1:00</button>
                  <button class="preset-btn" (click)="startTimerClick.emit(90)">1:30</button>
                </div>
              } @else {
                <button class="ctrl-btn stop" style="width:100%" (click)="stopTimerClick.emit()">Stop Timer</button>
              }
            </div>

            <div class="ctrl-sep"></div>

            <!-- Tie Detected: Sudden Death + Hype Battle, both tiebreaker options for the same tie -->
            @if (revealTieUI() && tiedNomIds().size > 0) {
              <div class="ctrl-section">
                <span class="ctrl-label" style="color:#ff7043;opacity:1">🔥 Tie Detected</span>

                @if (w.quizQuestion) {
                  <!-- Quiz Duel is the active tiebreaker -- only one mini-game shows at a time -->
                  <span class="ctrl-label" style="margin-bottom:4px">🧠 Quiz Duel running</span>
                  <div style="font-size:0.68rem;opacity:0.4;margin-bottom:8px">Loops automatically until someone wins</div>
                  <button class="ctrl-btn stop" style="width:100%" (click)="stopQuizClick.emit()">Stop Quiz Duel</button>
                } @else {
                  @if (w.status === 'Voting') {
                    <span class="ctrl-label" style="margin-bottom:4px">Sudden Death</span>
                    <div style="font-size:0.68rem;opacity:0.4;margin-bottom:4px">Re-vote on the tied nominations</div>
                    <div class="preset-row">
                      <button class="preset-btn sd" (click)="suddenDeathDurationChange.emit(60); startSuddenDeathClick.emit()">1:00</button>
                      <button class="preset-btn sd" (click)="suddenDeathDurationChange.emit(90); startSuddenDeathClick.emit()">1:30</button>
                      <button class="preset-btn sd" (click)="suddenDeathDurationChange.emit(120); startSuddenDeathClick.emit()">2:00</button>
                    </div>
                    <span class="ctrl-label" style="margin:10px 0 4px">Hype Battle</span>
                    <div style="font-size:0.68rem;opacity:0.4;margin-bottom:4px">Most taps wins instantly — only if votes are still tied</div>
                  } @else {
                    <span class="ctrl-label" style="margin-bottom:4px">Hype Battle</span>
                    <div style="font-size:0.68rem;opacity:0.4;margin-bottom:4px">Most taps wins instantly — only if votes are still tied</div>
                  }
                  @if (!hypeBattleEndsAt()) {
                    <div class="preset-row">
                      <button class="preset-btn" (click)="startHypeBattleClick.emit(30)">30s</button>
                      <button class="preset-btn" (click)="startHypeBattleClick.emit(60)">1:00</button>
                      <button class="preset-btn" (click)="startHypeBattleClick.emit(90)">1:30</button>
                    </div>
                  } @else {
                    <button class="ctrl-btn stop" style="width:100%" (click)="endHypeBattleClick.emit()">Stop Hype Battle</button>
                  }

                  @if (!hypeBattleEndsAt() && w.status !== 'SuddenDeath') {
                    <span class="ctrl-label" style="margin:10px 0 4px">Quiz Duel</span>
                    <div style="font-size:0.68rem;opacity:0.4;margin-bottom:4px">
                      @if (quizEligible()) {
                        Tied nominees race to answer first — needs everyone logged in now
                      } @else {
                        Needs every tied nominee logged in right now to start
                      }
                    </div>
                    <div class="preset-row" style="margin-bottom:6px">
                      <button class="preset-btn" [class.active]="quizDifficulty() === 3" (click)="quizDifficulty.set(3)">Easy</button>
                      <button class="preset-btn" [class.active]="quizDifficulty() === 8" (click)="quizDifficulty.set(8)">Medium</button>
                      <button class="preset-btn" [class.active]="quizDifficulty() === 13" (click)="quizDifficulty.set(13)">Hard</button>
                    </div>
                    <button class="ctrl-btn" style="width:100%" [style.opacity]="quizEligible() ? 1 : 0.6"
                            [disabled]="quizStarting()"
                            [matTooltip]="quizEligible() ? '' : 'All tied nominees must be logged in and connected right now'"
                            (click)="startQuizClick.emit(quizDifficulty())">
                      @if (quizStarting()) { Starting… } @else { 🧠 Start Quiz Duel }
                    </button>
                  }
                }
              </div>
            } @else if (w.status === 'Voting') {
              <div class="ctrl-section">
                <button class="ctrl-btn danger" style="width:100%" (click)="endVotingClick.emit()">
                  End Voting
                </button>
              </div>
            }
          }
        </div>
      }
    </ng-template>

    <!-- Tab bar (mobile only) -->
    @if (isMobile() && (isHost() || hasMenuItems())) {
    <div class="mob-tabs">
      @if (isHost() && w) {
        <button class="mob-tab" [class.active]="mobileTab() === 'nominations'" (click)="mobileTab.set('nominations')">
          Nominations
        </button>
        <button class="mob-tab" [class.active]="mobileTab() === 'controls'" (click)="mobileTab.set('controls')">
          Controls
        </button>
      } @else {
        <div style="flex:1"></div>
      }
      @if (hasMenuItems()) {
        <button class="mob-tab mob-more" [matMenuTriggerFor]="mobMenu">
          <mat-icon style="font-size:20px;width:20px;height:20px">more_vert</mat-icon>
        </button>
      }
    </div>
    }
    <!-- mat-menu (declared outside so desktop trigger can reference it too) -->
    <mat-menu #mobMenu="matMenu" xPosition="before">
        @if (!isGuest()) {
          <button mat-menu-item (click)="switchSeriesClick.emit()">
            <mat-icon>swap_horiz</mat-icon>Switch Series
          </button>
          <mat-divider />
        }
        @if (isMobile() && guestToken()) {
          <button mat-menu-item (click)="shareClick.emit()">
            <mat-icon>share</mat-icon>Share Link
          </button>
        }
        @if (!isGuest()) {
          <button mat-menu-item (click)="historyClick.emit()">
            <mat-icon>history</mat-icon>History
          </button>
        }
        @if (hasWinOfMonth()) {
          <button mat-menu-item (click)="winOfMonthClick.emit()">
            <mat-icon>calendar_month</mat-icon>Win of the Month
          </button>
        }
        @if (isHost()) {
          @if (week()?.status === 'Closed') {
            <mat-divider />
            <button mat-menu-item (click)="openNextWeekClick.emit()">
              <mat-icon>add_circle</mat-icon>Open Next Week
            </button>
          }
        }
    </mat-menu>

    <div [style.display]="isMobile() ? 'block' : 'flex'" style="gap:24px;align-items:flex-start">

      <!-- Mobile: Controls tab -->
      @if (isHost() && isMobile() && mobileTab() === 'controls') {
        <ng-container [ngTemplateOutlet]="ctrlsTpl" />
      }

      <!-- Main column (nominations) — hidden on mobile when Controls tab active -->
      @if (!isMobile() || mobileTab() === 'nominations') {
        <div style="flex:1;min-width:0">

          <!-- Phase badge + quota row -->
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
            @if (w) {
              <span [style.background]="phase.bg" [style.color]="phase.text"
                    style="font-size:0.75rem;font-weight:700;padding:4px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.3px">
                {{ phase.label }}
              </span>
            }
            @if (w?.status === 'Voting') {
              <span style="font-size:0.8rem;opacity:0.6">
                Votes remaining: <strong>{{ w?.userVotesRemaining ?? 0 }}</strong>/3
              </span>
            }
            @if (w?.status === 'Nominating') {
              <span style="font-size:0.8rem;opacity:0.6">
                Nominations remaining: <strong>{{ w?.userNominationsRemaining ?? 0 }}</strong>/3
              </span>
            }
            <!-- Token balance pill -->
            @if ((w?.status === 'Voting' || w?.status === 'SuddenDeath') && tokenBalance() > 0 && powerUpsEnabled()) {
              <span matTooltip="Spend tokens on Power-ups or Chaos Cards for other people's nominations"
                    style="font-size:0.72rem;font-weight:700;padding:3px 10px;border-radius:20px;background:rgba(255,215,0,0.1);color:#FFD700;cursor:default">
                🎟️ {{ tokenBalance() }} token{{ tokenBalance() !== 1 ? 's' : '' }}
              </span>
            }
            <!-- Right-side actions -->
            <div style="margin-left:auto;display:flex;align-items:center;gap:4px">
              @if (w?.status === 'Nominating' && (w?.userNominationsRemaining ?? 0) > 0) {
                <button mat-stroked-button color="accent" (click)="nominateClick.emit()"
                        style="font-size:0.8rem;height:30px">
                  <mat-icon style="font-size:1rem;width:1rem;height:1rem">add</mat-icon>
                  Nominate a Win
                </button>
              }
              @if (!isMobile()) {
                @if (guestToken()) {
                  <button mat-icon-button (click)="shareClick.emit()"
                          style="color:rgba(255,255,255,0.5)"
                          matTooltip="Copy share link">
                    <mat-icon>share</mat-icon>
                  </button>
                }
                @if (hasMenuItems()) {
                <button mat-icon-button [matMenuTriggerFor]="mobMenu"
                        style="color:rgba(255,255,255,0.5)">
                  <mat-icon>more_vert</mat-icon>
                </button>
                }
              }
            </div>
          </div>

          <!-- Host countdown timer (visible to all) -->
          @if (activeTimerEndsAt()) {
            <div style="background:rgba(33,150,243,0.08);border:1px solid rgba(33,150,243,0.3);border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:14px">
              <div style="flex:1">
                <div style="font-weight:700;font-size:0.85rem;color:#42a5f5;text-transform:uppercase;letter-spacing:0.5px">⏱ Timer</div>
                <div style="font-size:0.75rem;opacity:0.6;margin-top:2px">Time's ticking!</div>
              </div>
              <div style="text-align:center;min-width:64px">
                <app-shared-countdown [endsAt]="activeTimerEndsAt()" />
              </div>
            </div>
          }

          <!-- Hype Battle banner (visible to all) -->
          @if (hypeBattleEndsAt() && (w?.status === 'Voting' || w?.status === 'SuddenDeath')) {
            <div class="hype-battle-banner" style="background:rgba(255,87,34,0.1);border:1px solid rgba(255,87,34,0.4);border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:14px">
              <div style="flex:1">
                <div style="font-weight:700;font-size:0.85rem;color:#ff7043;text-transform:uppercase;letter-spacing:0.5px">🔥 Hype Battle!</div>
                <div style="font-size:0.75rem;opacity:0.6;margin-top:2px">Tap 🔥 Hype on your favourite nomination!</div>
              </div>
              <div style="text-align:center;min-width:64px">
                <app-shared-countdown [endsAt]="hypeBattleEndsAt()" />
              </div>
            </div>
          }

          <!-- Quiz Duel banner: only shown while it's the active tiebreaker (no other tiebreaker running) -->
          @if (w?.quizQuestion && w && !w.suddenDeathEndsAt && !w.hypeBattleEndsAt) {
            <div [style.background]="w.quizWinnerName ? 'rgba(102,187,106,0.1)' : w.quizRevealed ? 'rgba(255,255,255,0.04)' : 'rgba(171,71,188,0.1)'"
                 [style.border]="'1px solid ' + (w.quizWinnerName ? 'rgba(102,187,106,0.5)' : w.quizRevealed ? 'rgba(255,255,255,0.15)' : 'rgba(171,71,188,0.4)')"
                 style="border-radius:12px;padding:16px;margin-bottom:16px">
              <div style="display:flex;align-items:center;gap:14px;margin-bottom:12px">
                <div style="flex:1">
                  <div style="font-weight:700;font-size:0.85rem;color:#ce93d8;text-transform:uppercase;letter-spacing:0.5px">🧠 Quiz Duel</div>
                  <div style="font-size:0.75rem;opacity:0.6;margin-top:2px">
                    @if (w.quizWinnerName) {
                      🎉 {{ w.quizWinnerName }} wins!
                    } @else if (w.quizRevealed) {
                      No outright winner yet — next question coming up…
                    } @else if (isQuizParticipant()) {
                      Wrong answer eliminates you — last one standing wins!
                    } @else {
                      {{ quizAnsweredCount() }} of {{ quizParticipantCount() }} nominees have answered
                    }
                  </div>
                </div>
                @if (!w.quizRevealed) {
                  <div style="text-align:center;min-width:64px">
                    <app-shared-countdown [endsAt]="w.quizEndsAt" />
                  </div>
                }
              </div>

              @if (quizRoster().length > 1) {
                <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
                  @for (r of quizRoster(); track r.memberId) {
                    <span style="font-size:0.72rem;padding:3px 9px;border-radius:12px;display:inline-flex;align-items:center;gap:4px"
                          [style.background]="r.isWinner ? 'rgba(102,187,106,0.18)' : r.eliminated ? 'rgba(255,255,255,0.04)' : 'rgba(171,71,188,0.12)'"
                          [style.color]="r.isWinner ? '#81c784' : r.eliminated ? 'rgba(255,255,255,0.35)' : '#ce93d8'"
                          [style.textDecoration]="r.eliminated ? 'line-through' : 'none'">
                      {{ r.isWinner ? '🏆' : r.eliminated ? '❌' : '🟣' }} {{ r.name }}
                    </span>
                  }
                </div>
              }

              <div style="font-weight:600;font-size:0.95rem;margin-bottom:10px">{{ w.quizQuestion }}@if (w.quizIsAiGenerated) {<app-ai-badge />}</div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                @for (opt of w.quizOptions; let i = $index; track i) {
                  @if (!w.quizRevealed && isQuizParticipant() && !hasAnsweredQuiz()) {
                    <button class="ctrl-btn" style="padding:10px;height:auto;white-space:normal;text-align:left" (click)="submitQuizAnswerClick.emit(i)">
                      {{ opt }}
                    </button>
                  } @else {
                    <div class="quiz-option-display"
                         [class.quiz-option-correct]="w.quizRevealed && w.quizCorrectIndex === i"
                         [class.quiz-option-wrong]="w.quizRevealed && w.quizMyAnswerIndex === i && w.quizCorrectIndex !== i"
                         [class.quiz-option-mine]="!w.quizRevealed && w.quizMyAnswerIndex === i">
                      {{ opt }}
                      @if (w.quizMyAnswerIndex === i) { <span style="opacity:0.6"> — your pick</span> }
                    </div>
                  }
                }
              </div>

              @if (!w.quizRevealed && isQuizParticipant() && hasAnsweredQuiz()) {
                <div style="font-size:0.8rem;opacity:0.5;margin-top:8px">Answer locked in — waiting on the others…</div>
              }

              @if (w.quizRevealed && !w.quizWinnerName) {
                @if (quizLoadingNext()) {
                  <div style="font-size:0.78rem;opacity:0.6;margin-top:8px;display:flex;align-items:center;gap:8px">
                    <mat-spinner diameter="16" /> Loading next question…
                  </div>
                } @else {
                  <app-reveal-progress-bar [endsAt]="w.quizRevealEndsAt" (drained)="quizRevealDrained.emit()" />
                }
              }

              @if (w.quizWinnerName && isHost()) {
                <button class="ctrl-btn" style="width:100%;margin-top:12px;background:rgba(102,187,106,0.15);border-color:rgba(102,187,106,0.4);color:#81c784"
                        (click)="completeQuizWinnerClick.emit()">
                  ✅ Complete Win of the Week
                </button>
              }
            </div>
          }

          <!-- Sudden death countdown banner -->
          @if (w?.status === 'SuddenDeath') {
            <div style="background:rgba(239,83,80,0.08);border:1px solid rgba(239,83,80,0.3);border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:14px">
              <div style="flex:1">
                <div style="font-weight:700;font-size:0.85rem;color:#ef5350;text-transform:uppercase;letter-spacing:0.5px">⚡ Tie-Breaker</div>
                <div style="font-size:0.75rem;opacity:0.6;margin-top:2px">Vote now — highest vote wins when time expires</div>
              </div>
              <div style="text-align:center;min-width:64px">
                <app-shared-countdown [endsAt]="w?.suddenDeathEndsAt ?? null" />
              </div>
            </div>
          }

          <!-- Winner banner -->
          @if (w && w.status === 'Closed' && w.winnerNomineeName) {
            <app-wow-winner-banner
              [winnerNomineeName]="w.winnerNomineeName"
              [winnerTitle]="w.winnerTitle"
              [winnerStory]="w.winnerStory"
              [showPoints]="true"
              (copyStory)="copyStory.emit($event)"
            />
          }

          <!-- Info banner during nominating phase -->
          @if (w?.status === 'Nominating') {
            <app-info-banner type="info">💡 You can edit or delete your nominations before voting opens.</app-info-banner>
          }

          <!-- Info banner during voting phase -->
          @if (!isGuest() && (w?.status === 'Voting' || w?.status === 'SuddenDeath') && powerUpsEnabled() && tokenBalance() > 0) {
            <app-info-banner type="info">💡 Use tokens to apply Power-ups or Chaos Cards to others' nominations!</app-info-banner>
          }

          <!-- Vote progress bar -->
          @if (!isGuest() && w && (w.status === 'Voting' || w.status === 'SuddenDeath')) {
            @let pct = voteProgressPct();
            <div style="margin-bottom:16px">
              <div style="display:flex;justify-content:space-between;font-size:0.7rem;opacity:0.5;margin-bottom:4px">
                <span>
                  <mat-icon style="font-size:12px;width:12px;height:12px;vertical-align:middle">people</mat-icon>
                  {{ connectedCount() }} connected
                </span>
                <span>{{ w.totalVotesCast }}{{ connectedCount() > 0 ? ' / ' + (connectedCount() * 3) : '' }} votes cast</span>
              </div>
              <div style="height:4px;border-radius:2px;background:rgba(255,255,255,0.08);overflow:hidden">
                <div [style.width]="pct + '%'" style="height:100%;background:#4caf50;border-radius:2px;transition:width 0.4s ease"></div>
              </div>
            </div>
          }

          <!-- Loading -->
          @if (loading()) { <app-loading /> }

          <!-- No week yet -->
          @if (!loading() && !w) {
            <app-empty-state icon="emoji_events" title="No active week for this series"
              [actionLabel]="isHost() ? 'Open First Week' : ''"
              (actionClick)="openWeekClick.emit()" />
          }

          <!-- Empty nominations -->
          @if (!loading() && w && w.nominations.length === 0) {
            <app-empty-state icon="emoji_events"
              title="No wins nominated yet this week"
              subtitle="Be the first to recognise a teammate!"
              [actionLabel]="canNominate() ? 'Nominate a Win' : ''"
              (actionClick)="nominateClick.emit()" />
          }

          <!-- Nominations list -->
          @if (!loading() && w && w.nominations.length > 0) {
            <div style="display:flex;flex-direction:column;gap:10px">
              @for (nom of sortedNominations(); track nom.id) {
                <app-wow-nomination-card
                  [nomination]="toDisplay(nom)"
                  [weekStatus]="w.status"
                  [canEdit]="nom.teamMemberId === currentUserId()"
                  [votesRemaining]="w.userVotesRemaining"
                  [isTied]="displayTiedNomIds().has(nom.id)"
                  [canApplyCards]="tokenBalance() > 0 && powerUpsEnabled()"
                  [isHost]="isHost()"
                  [hypeBattleActive]="!!hypeBattleEndsAt()"
                  [hypeBattleTotal]="hypeBattleTotal()"
                  [reactionBursts]="burstsFor(nom.id)"
                  [hideVoteCounts]="hideVoteCounts()"
                  (voteClick)="voteClick.emit($event)"
                  (removeVoteClick)="removeVoteClick.emit($event)"
                  (editClick)="editClick.emit($event)"
                  (deleteClick)="deleteClick.emit($event)"
                  (hypeClick)="hypeClick.emit($event)"
                  (applyPowerUpClick)="applyPowerUpClick.emit($event)"
                  (applyChaosCardClick)="applyChaosCardClick.emit($event)"
                  (reactionClick)="reactionClick.emit($event)"
                />
              }
            </div>
          }

        </div>
      }

      <!-- Desktop sidebar (QR + host controls) -->
      @if (isHost() && !isMobile()) {
        <div style="flex-shrink:0;width:248px;position:sticky;top:16px;display:flex;flex-direction:column;gap:12px;margin-right:16px">
          @if (qrDataUrl()) {
            <img [src]="qrDataUrl()!" alt="Guest QR code"
                 style="width:248px;height:280px;border-radius:8px;display:block" />
          }
          <ng-container [ngTemplateOutlet]="ctrlsTpl" />
        </div>
      }

    </div>
  `
})
export class WowCurrentWeekComponent {
  // Host's Quiz Duel difficulty pick (1-15 scale) -- transient UI state, not persisted here;
  // sent along with startQuizClick and persisted on the WinWeek server-side.
  quizDifficulty = signal(8);

  week             = input<WinWeek | null>(null);
  loading          = input(false);
  isHost           = input(false);
  isGuest          = input(false);
  isMobile         = input(false);
  qrDataUrl        = input<string | null>(null);
  currentUserId    = input('');
  tokenBalance     = input(0);
  powerUpsEnabled  = input(true);
  hideVoteCounts   = input(false);
  votingEndRequested = input(false);
  connectedCount   = input(0);
  activeTimerEndsAt   = input<string | null>(null);
  hypeBattleEndsAt    = input<string | null>(null);
  quizEligible        = input(false);
  quizStarting        = input(false);
  quizLoadingNext     = input(false);
  guestToken          = input<string | null>(null);
  hasWinOfMonth       = input(false);
  reactionEvents      = input<(ReactionBurst & { nominationId: string })[]>([]);

  burstsFor(nominationId: string): ReactionBurst[] {
    return this.reactionEvents().filter(r => r.nominationId === nominationId);
  }

  hasMenuItems = computed(() =>
    !this.isGuest() ||
    (this.isMobile() && !!this.guestToken()) ||
    this.hasWinOfMonth()
  );

  readonly quizParticipantNomineeIds = computed(() => {
    const w = this.week();
    if (!w) return new Set<string>();
    const tied = this.tiedNomIds();
    return new Set(w.nominations.filter(n => tied.has(n.id)).map(n => n.nomineeMemberId));
  });

  readonly isQuizParticipant = computed(() => this.quizParticipantNomineeIds().has(this.currentUserId()));
  readonly hasAnsweredQuiz = computed(() => {
    const w = this.week();
    return !!w && (w.quizAnsweredMemberIds ?? []).includes(this.currentUserId());
  });
  readonly quizParticipantCount = computed(() => this.quizParticipantNomineeIds().size);
  readonly quizAnsweredCount = computed(() => {
    const w = this.week();
    if (!w) return 0;
    const participants = this.quizParticipantNomineeIds();
    return (w.quizAnsweredMemberIds ?? []).filter(id => participants.has(id)).length;
  });

  // One row per tied nominee -- shown as the duel proceeds so it's clear who's still in the
  // running vs already eliminated, since a wrong answer now knocks someone out rather than the
  // duel just being a race to answer first.
  readonly quizRoster = computed(() => {
    const w = this.week();
    if (!w) return [];
    const eliminated = new Set(w.quizEliminatedMemberIds ?? []);
    const seen = new Set<string>();
    const roster: { memberId: string; name: string; eliminated: boolean; isWinner: boolean }[] = [];
    for (const id of this.quizParticipantNomineeIds()) {
      if (seen.has(id)) continue;
      seen.add(id);
      const nom = w.nominations.find(n => n.nomineeMemberId === id);
      roster.push({
        memberId: id,
        name: nom?.nomineeName ?? 'Unknown',
        eliminated: eliminated.has(id),
        isWinner: w.quizWinnerMemberId === id
      });
    }
    return roster;
  });

  nominateClick           = output();
  openWeekClick           = output();
  openVotingClick         = output();
  voteClick               = output<string>();
  removeVoteClick         = output<string>();
  editClick               = output<WowNominationDisplay>();
  deleteClick             = output<string>();
  copyStory               = output<string>();
  shareClick              = output();
  hypeClick               = output<string>();
  applyPowerUpClick       = output<{ nominationId: string; type: string }>();
  applyChaosCardClick     = output<{ nominationId: string; type: string }>();
  reactionClick           = output<{ nominationId: string; emoji: string }>();
  startTimerClick           = output<number>();
  stopTimerClick            = output();
  startHypeBattleClick      = output<number>();
  endHypeBattleClick        = output();
  startQuizClick            = output<number>();
  submitQuizAnswerClick     = output<number>();
  completeQuizWinnerClick   = output();
  stopQuizClick             = output();
  quizRevealDrained         = output();
  endVotingClick            = output();
  startSuddenDeathClick     = output();
  togglePowerUpsClick       = output();
  toggleHideVoteCountsClick = output();
  reopenNominationsClick    = output();
  suddenDeathDurationChange = output<number>();
  historyClick              = output();
  winOfMonthClick           = output();
  openNextWeekClick         = output();
  switchSeriesClick         = output();

  mobileTab = signal<'nominations' | 'controls'>('nominations');

  readonly phaseInfo = computed(() => wowPhaseInfo(this.week()?.status));

  readonly canNominate = computed(() =>
    this.week()?.status === 'Nominating' && (this.week()?.userNominationsRemaining ?? 0) > 0
  );

  readonly tiedNomIds = computed((): Set<string> => {
    const w = this.week();
    if (!w) return new Set();
    if (w.status === 'SuddenDeath') return new Set(w.tiedNominationIds);
    if (w.status === 'Voting' && w.nominations.length >= 2) {
      const sorted = [...w.nominations].sort((a, b) => b.voteCount - a.voteCount);
      const top = sorted[0].voteCount;
      if (top > 0 && sorted[1].voteCount === top)
        return new Set(sorted.filter(n => n.voteCount === top).map(n => n.id));
    }
    return new Set();
  });

  // While votes are hidden and voting is still open, a tie shouldn't be visible to anyone
  // (the highlight alone would leak who's ahead) or offer the host tie-break options early --
  // both wait until the host ends voting, at which point votingEndRequested flips true.
  readonly revealTieUI = computed(() =>
    !this.hideVoteCounts() || this.week()?.status !== 'Voting' || this.votingEndRequested()
  );

  // Card-highlight-safe view of tiedNomIds -- empty while revealTieUI() is false.
  readonly displayTiedNomIds = computed((): Set<string> =>
    this.revealTieUI() ? this.tiedNomIds() : new Set<string>()
  );

  readonly voteProgressPct = computed(() => {
    const w = this.week();
    const cc = this.connectedCount();
    if (!w || cc === 0) return 0;
    return Math.min(100, Math.round((w.totalVotesCast / (cc * 3)) * 100));
  });

  readonly hypeBattleTotal = computed(() => {
    const w = this.week();
    if (!w || !this.hypeBattleEndsAt()) return 0;
    return w.nominations.reduce((sum, n) => sum + n.hypeMeterCount, 0);
  });

  readonly sortedNominations = computed(() => {
    const w = this.week();
    if (!w) return [];
    let noms = [...w.nominations];
    const tiedIds = this.tiedNomIds();
    if (w.status === 'SuddenDeath' && w.tiedNominationIds?.length) {
      const tied = new Set(w.tiedNominationIds);
      noms = noms.filter(n => tied.has(n.id));
    } else if (this.hypeBattleEndsAt() && tiedIds.size > 0) {
      noms = noms.filter(n => tiedIds.has(n.id));
    }
    if (w.status === 'SuddenDeath' || w.status === 'Closed')
      noms = noms.sort((a, b) => b.voteCount - a.voteCount || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else
      noms = noms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Spotlight nominations float to the top
    return [...noms.filter(n => n.powerUp === 'Spotlight'), ...noms.filter(n => n.powerUp !== 'Spotlight')];
  });

  toDisplay(nom: WinNomination): WowNominationDisplay {
    return {
      id: nom.id,
      nomineeMemberId: nom.nomineeMemberId,
      nomineeName: nom.nomineeName,
      nominatorName: nom.teamMemberName,
      title: nom.title,
      description: nom.description,
      voteCount: nom.voteCount,
      hasVoted: nom.hasVoted,
      isOwned: nom.teamMemberId === this.currentUserId(),
      powerUp: nom.powerUp,
      chaosCard: nom.chaosCard,
      hypeMeterCount: nom.hypeMeterCount
    };
  }
}
