import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { WinWeek, WinNomination, WowNominationDisplay } from '../../core/models/win-week.model';
import { wowPhaseInfo } from '../../shared/utils/wow.utils';
import { WowNominationCardComponent } from '../../shared/components/wow-nomination-card/wow-nomination-card.component';
import { WowWinnerBannerComponent } from '../../shared/components/wow-winner-banner/wow-winner-banner.component';
import { WowCountdownComponent } from '../../shared/components/wow-countdown/wow-countdown.component';
import { WowDurationPickerComponent } from '../../shared/components/wow-duration-picker/wow-duration-picker.component';
import { AppLoadingComponent } from '../../shared/components/app-loading/app-loading.component';
import { AppEmptyStateComponent } from '../../shared/components/app-empty-state/app-empty-state.component';
import { AppInfoBannerComponent } from '../../shared/components/app-info-banner/app-info-banner.component';

@Component({
  selector: 'app-wow-current-week',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSlideToggleModule,
    WowNominationCardComponent,
    WowWinnerBannerComponent,
    WowCountdownComponent,
    WowDurationPickerComponent,
    AppLoadingComponent,
    AppEmptyStateComponent,
    AppInfoBannerComponent
  ],
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    @keyframes hypePulse { 0%,100%{opacity:1} 50%{opacity:0.7} }
    .hype-battle-banner { animation: hypePulse 1.5s ease-in-out infinite; }
    .host-ctrl { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; padding: 14px 16px; margin-bottom: 16px; }
    .ctrl-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.45; margin-bottom: 8px; }
    .dur-input { width: 60px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 4px 8px; color: #fff; font-size: 0.85rem; text-align: center; outline: none; }
    .ctrl-btn { font-size: 0.75rem; height: 28px; line-height: 26px; padding: 0 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.75); cursor: pointer; transition: background 0.15s; white-space: nowrap; }
    .ctrl-btn:hover { background: rgba(255,255,255,0.12); }
    .ctrl-btn.stop { background: rgba(255,87,34,0.15); border-color: rgba(255,87,34,0.4); color: #ff7043; }
    .ctrl-btn.danger { background: rgba(239,83,80,0.1); border-color: rgba(239,83,80,0.3); color: #ef5350; }
    .ctrl-btn.sd-btn { background: rgba(255,87,34,0.18); border-color: rgba(255,87,34,0.5); color: #ff7043; font-weight: 700; }
    .ctrl-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .picker-row { display: flex; align-items: center; gap: 6px; }
    .picker-row app-wow-duration-picker { flex: 1; min-width: 0; }
    .label-row { display: flex; align-items: center; justify-content: space-between; width: 100%; }
    .ctrl-section { display: flex; flex-direction: column; gap: 6px; }
    .ctrl-sep { height: 1px; background: rgba(255,255,255,0.07); margin: 10px 0; }
  `],
  template: `
    @let w = week();
    @let phase = phaseInfo();

    <div [style.display]="isMobile() ? 'block' : 'flex'" style="gap:24px;align-items:flex-start">

      <!-- Main column -->
      <div style="flex:1;min-width:0">

        <!-- Phase badge + quota row -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
          <span [style.background]="phase.bg" [style.color]="phase.text"
                style="font-size:0.75rem;font-weight:700;padding:4px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.3px">
            {{ phase.label }}
          </span>
          @if (w?.status === 'Voting') {
            <span style="font-size:0.8rem;opacity:0.6">
              Votes remaining: <strong>{{ w?.userVotesRemaining ?? 0 }}</strong>/3
            </span>
          }
          @if (w?.status === 'Nominating') {
            <span style="font-size:0.8rem;opacity:0.6">
              Nominations remaining: <strong>{{ w?.userNominationsRemaining ?? 0 }}</strong>/3
            </span>
            @if ((w?.userNominationsRemaining ?? 0) > 0) {
              <button mat-stroked-button color="accent" (click)="nominateClick.emit()"
                      style="font-size:0.8rem;height:30px;margin-left:auto">
                <mat-icon style="font-size:1rem;width:1rem;height:1rem">add</mat-icon>
                Nominate a Win
              </button>
            }
          }
          <!-- Token balance pill -->
          @if (w?.status === 'Nominating' && tokenBalance() > 0 && powerUpsEnabled()) {
            <span matTooltip="Spend tokens on Power-ups or Chaos Cards for other people's nominations"
                  style="font-size:0.72rem;font-weight:700;padding:3px 10px;border-radius:20px;background:rgba(255,215,0,0.1);color:#FFD700;cursor:default">
              🎟️ {{ tokenBalance() }} token{{ tokenBalance() !== 1 ? 's' : '' }}
            </span>
          }
        </div>

        <!-- Host countdown timer (visible to all) -->
        @if (activeTimerEndsAt()) {
          <div style="background:rgba(33,150,243,0.08);border:1px solid rgba(33,150,243,0.3);border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:14px">
            <div style="flex:1">
              <div style="font-weight:700;font-size:0.85rem;color:#42a5f5;text-transform:uppercase;letter-spacing:0.5px">⏱ Timer</div>
              <div style="font-size:0.75rem;opacity:0.6;margin-top:2px">Time's ticking!</div>
            </div>
            <div style="text-align:center;min-width:64px">
              <app-wow-countdown [endsAt]="activeTimerEndsAt()" />
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
              <app-wow-countdown [endsAt]="hypeBattleEndsAt()" />
            </div>
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
              <app-wow-countdown [endsAt]="w?.suddenDeathEndsAt ?? null" />
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
          <app-info-banner type="info">💡 You can edit or delete your nominations before voting opens.{{ (!isGuest() && powerUpsEnabled()) ? " Use tokens to apply Power-ups or Chaos Cards to others' nominations!" : '' }}</app-info-banner>
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
                [isTied]="tiedNomIds().has(nom.id)"
                [canApplyCards]="tokenBalance() > 0 && powerUpsEnabled()"
                [isHost]="isHost()"
                [hypeBattleActive]="!!hypeBattleEndsAt()"
                [hypeBattleTotal]="hypeBattleTotal()"
                (voteClick)="voteClick.emit($event)"
                (removeVoteClick)="removeVoteClick.emit($event)"
                (editClick)="editClick.emit($event)"
                (deleteClick)="deleteClick.emit($event)"
                (hypeClick)="hypeClick.emit($event)"
                (applyPowerUpClick)="applyPowerUpClick.emit($event)"
                (applyChaosCardClick)="applyChaosCardClick.emit($event)"
              />
            }
          </div>
        }

      </div>

      <!-- Desktop sidebar (QR + host controls) -->
      @if (isHost() && !isMobile()) {
        <div style="flex-shrink:0;width:248px;position:sticky;top:16px;display:flex;flex-direction:column;gap:12px;margin-right:16px">

          <!-- QR code -->
          @if (qrDataUrl()) {
            <img [src]="qrDataUrl()!" alt="Guest QR code"
                 style="width:248px;height:280px;border-radius:8px;display:block" />
          }

          <!-- Host control panel (any active week) -->
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

              <!-- Reopen Nominations (top, always visible during voting/sudden death) -->
              @if (w.status === 'Voting' || w.status === 'SuddenDeath') {
                <button class="ctrl-btn" style="width:100%;margin-bottom:8px" (click)="reopenNominationsClick.emit()">
                  Reopen Nominations
                </button>
              }

              <div class="ctrl-sep" style="margin-bottom:10px"></div>

              @if (w.status === 'Voting' || w.status === 'SuddenDeath') {
                <!-- Timer section -->
                <div class="ctrl-section">
                  <div class="label-row">
                    <span class="ctrl-label" style="margin:0">Countdown Timer</span>
                    @if (!activeTimerEndsAt()) {
                      <button class="ctrl-btn" (click)="startTimerClick.emit(timerDuration)">Start</button>
                    } @else {
                      <button class="ctrl-btn stop" (click)="stopTimerClick.emit()">Stop</button>
                    }
                  </div>
                  <app-wow-duration-picker                    [value]="timerDuration" [max]="600"
                    [disabled]="!!activeTimerEndsAt()"
                    (valueChange)="timerDuration = $event" />
                </div>

                <div class="ctrl-sep"></div>

                <!-- Hype Battle section -->
                <div class="ctrl-section">
                  <div class="label-row">
                    <span class="ctrl-label" style="margin:0">Hype Battle</span>
                    @if (!hypeBattleEndsAt()) {
                      <button class="ctrl-btn" (click)="startHypeBattleClick.emit(hypeBattleDuration)">Start</button>
                    } @else {
                      <button class="ctrl-btn stop" (click)="endHypeBattleClick.emit()">Stop</button>
                    }
                  </div>
                  <app-wow-duration-picker                    [value]="hypeBattleDuration" [max]="300"
                    [disabled]="!!hypeBattleEndsAt()"
                    (valueChange)="hypeBattleDuration = $event" />
                </div>

                <div class="ctrl-sep"></div>

                <!-- End Voting / Sudden Death -->
                <div class="ctrl-section">
                  @if (w.status === 'Voting') {
                    @if (tiedNomIds().size > 0) {
                      <div class="label-row">
                        <span class="ctrl-label" style="margin:0;color:#ff7043;opacity:1">Tie detected</span>
                      </div>
                      <app-wow-duration-picker                        [value]="suddenDeathDuration" [max]="600"
                        (valueChange)="suddenDeathDuration = $event; suddenDeathDurationChange.emit($event)" />
                      <button class="ctrl-btn sd-btn" style="width:100%" (click)="startSuddenDeathClick.emit()">
                        Sudden Death
                      </button>
                    } @else {
                      <button class="ctrl-btn danger" style="width:100%" (click)="endVotingClick.emit()">
                        End Voting
                      </button>
                    }
                  }
                </div>
              }
            </div>
          }
        </div>
      }

    </div>
  `
})
export class WowCurrentWeekComponent {
  week             = input<WinWeek | null>(null);
  loading          = input(false);
  isHost           = input(false);
  isGuest          = input(false);
  isMobile         = input(false);
  qrDataUrl        = input<string | null>(null);
  currentUserId    = input('');
  tokenBalance     = input(0);
  powerUpsEnabled  = input(true);
  connectedCount   = input(0);
  activeTimerEndsAt   = input<string | null>(null);
  hypeBattleEndsAt    = input<string | null>(null);

  nominateClick           = output();
  openWeekClick           = output();
  voteClick               = output<string>();
  removeVoteClick         = output<string>();
  editClick               = output<WowNominationDisplay>();
  deleteClick             = output<string>();
  copyStory               = output<string>();
  shareClick              = output();
  hypeClick               = output<string>();
  applyPowerUpClick       = output<{ nominationId: string; type: string }>();
  applyChaosCardClick     = output<{ nominationId: string; type: string }>();
  startTimerClick           = output<number>();
  stopTimerClick            = output();
  startHypeBattleClick      = output<number>();
  endHypeBattleClick        = output();
  endVotingClick            = output();
  startSuddenDeathClick     = output();
  togglePowerUpsClick       = output();
  reopenNominationsClick    = output();
  suddenDeathDurationChange = output<number>();

  timerDuration       = 60;
  hypeBattleDuration  = 30;
  suddenDeathDuration = 90;

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
    if (w.status === 'SuddenDeath' && w.tiedNominationIds?.length) {
      const tied = new Set(w.tiedNominationIds);
      noms = noms.filter(n => tied.has(n.id));
    }
    if (w.status === 'Voting' || w.status === 'SuddenDeath' || w.status === 'Closed')
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
