import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { WinWeek, WinNomination, WowNominationDisplay } from '../../core/models/win-week.model';
import { wowPhaseInfo } from '../../shared/utils/wow.utils';
import { WowNominationCardComponent } from '../../shared/components/wow-nomination-card/wow-nomination-card.component';
import { WowWinnerBannerComponent } from '../../shared/components/wow-winner-banner/wow-winner-banner.component';
import { WowCountdownComponent } from '../../shared/components/wow-countdown/wow-countdown.component';
import { AppLoadingComponent } from '../../shared/components/app-loading/app-loading.component';
import { AppEmptyStateComponent } from '../../shared/components/app-empty-state/app-empty-state.component';
import { AppInfoBannerComponent } from '../../shared/components/app-info-banner/app-info-banner.component';

@Component({
  selector: 'app-wow-current-week',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatIconModule,
    WowNominationCardComponent, WowWinnerBannerComponent, WowCountdownComponent,
    AppLoadingComponent, AppEmptyStateComponent, AppInfoBannerComponent,
  ],
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
        </div>

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
          <app-info-banner type="info">💡 You can edit or delete your nominations before voting opens.</app-info-banner>
        }

        <!-- All votes used banner -->
        @if (w?.status === 'Voting' && (w?.userVotesRemaining ?? 0) === 0) {
          <app-info-banner type="success">✓ All votes cast! Results will be announced Sunday night.</app-info-banner>
        }

        <!-- Vote progress bar -->
        @if (w && (w.status === 'Voting' || w.status === 'SuddenDeath')) {
          @let pct = voteProgressPct();
          <div style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;font-size:0.7rem;opacity:0.5;margin-bottom:4px">
              <span>
                <mat-icon style="font-size:12px;width:12px;height:12px;vertical-align:middle">people</mat-icon>
                {{ w.connectedMemberCount }} connected
              </span>
              <span>{{ w.totalVotesCast }}{{ w.connectedMemberCount > 0 ? ' / ' + (w.connectedMemberCount * 3) : '' }} votes cast</span>
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
                (voteClick)="voteClick.emit($event)"
                (removeVoteClick)="removeVoteClick.emit($event)"
                (editClick)="editClick.emit($event)"
                (deleteClick)="deleteClick.emit($event)"
              />
            }
          </div>
        }

      </div>

      <!-- Desktop QR sidebar -->
      @if (isHost() && qrDataUrl() && !isMobile()) {
        <div style="flex-shrink:0;width:180px;position:sticky;top:16px">
          <img [src]="qrDataUrl()!" alt="Guest QR code"
               style="width:180px;height:180px;border-radius:8px;display:block" />
          <button mat-button (click)="shareClick.emit()"
                  style="margin-top:8px;width:100%;border-radius:6px;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.7)">
            <mat-icon>share</mat-icon> Share link
          </button>
        </div>
      }

    </div>
  `
})
export class WowCurrentWeekComponent {
  week          = input<WinWeek | null>(null);
  loading       = input(false);
  isHost        = input(false);
  isMobile      = input(false);
  qrDataUrl     = input<string | null>(null);
  currentUserId = input('');

  nominateClick  = output();
  openWeekClick  = output();
  voteClick      = output<string>();
  removeVoteClick = output<string>();
  editClick      = output<WowNominationDisplay>();
  deleteClick    = output<string>();
  copyStory      = output<string>();
  shareClick     = output();

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
    if (!w || w.connectedMemberCount === 0) return 0;
    return Math.min(100, Math.round((w.totalVotesCast / (w.connectedMemberCount * 3)) * 100));
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
      return noms.sort((a, b) => b.voteCount - a.voteCount || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return noms.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
      isOwned: nom.teamMemberId === this.currentUserId()
    };
  }
}
