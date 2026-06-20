import { Component, OnInit, OnDestroy, inject, signal, computed, effect, ElementRef, ViewChild, AfterViewInit, ChangeDetectionStrategy } from '@angular/core';
import QRCode from 'qrcode';

import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatBottomSheet, MatBottomSheetModule, MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { Subscription, interval } from 'rxjs';
import { WinOfTheWeekService } from '../../core/services/win-of-the-week.service';
import { WinOfTheMonthService } from '../../core/services/win-of-the-month.service';
import { TeamMemberService } from '../../core/services/team-member.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { MobileService } from '../../core/services/mobile.service';
import { WinWeek, WinNomination, WinSeries, CreateNominationRequest, WowNominationDisplay } from '../../core/models/win-week.model';
import { TeamMember } from '../../core/models/team-member.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { WinOfTheWeekHistoryComponent } from '../win-of-the-week-history/win-of-the-week-history.component';
import { WinOfTheMonthComponent } from '../win-of-the-month/win-of-the-month.component';
import { FeatureAccessService } from '../../core/services/feature-access.service';
import { WinSeriesService } from '../../core/services/win-series.service';
import { AppModalComponent } from '../../shared/components/app-modal/app-modal.component';
import { WowTieBreakSpinnerComponent } from '../../shared/components/wow-tie-break-spinner/wow-tie-break-spinner.component';
import { WowCurrentWeekComponent } from './wow-current-week.component';
import { runTieBreakSpin } from '../../shared/utils/wow.utils';
import { clearCacheForPattern } from '../../core/interceptors/http-cache.interceptor';

@Component({
  selector: 'app-wow-series-sheet',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div style="padding:16px 0 8px">
      <div style="font-size:0.75rem;font-weight:600;opacity:0.45;letter-spacing:0.1em;text-transform:uppercase;padding:0 16px 10px">Switch Series</div>
      @for (s of data.series; track s.id) {
        <button (click)="select(s.id)"
                style="display:flex;align-items:center;gap:14px;width:100%;padding:14px 20px;border:none;cursor:pointer;font-family:inherit;font-size:0.95rem;text-align:left;transition:background 0.12s"
                [style.background]="s.id === data.currentSeriesId ? 'rgba(100,181,246,0.1)' : 'transparent'"
                [style.color]="s.id === data.currentSeriesId ? '#64b5f6' : 'rgba(255,255,255,0.85)'">
          @if (s.id === data.currentSeriesId) {
            <mat-icon style="font-size:20px;width:20px;height:20px;color:#64b5f6;flex-shrink:0">check_circle</mat-icon>
          } @else {
            <mat-icon style="font-size:20px;width:20px;height:20px;opacity:0.3;flex-shrink:0">radio_button_unchecked</mat-icon>
          }
          {{ s.name }}
        </button>
      }
      <div style="height:1px;background:rgba(255,255,255,0.07);margin:6px 0"></div>
      <button (click)="ref.dismiss('__new__')"
              style="display:flex;align-items:center;gap:14px;width:100%;padding:14px 20px;border:none;background:transparent;color:rgba(100,181,246,0.8);cursor:pointer;font-family:inherit;font-size:0.95rem;text-align:left">
        <mat-icon style="font-size:20px;width:20px;height:20px;flex-shrink:0">add_circle_outline</mat-icon>
        New Series
      </button>
    </div>
  `
})
export class WowSeriesSheetComponent {
  data = inject<{ series: WinSeries[], currentSeriesId: string | null }>(MAT_BOTTOM_SHEET_DATA);
  ref = inject(MatBottomSheetRef);
  select(id: string) { this.ref.dismiss(id); }
}

@Component({
  selector: 'app-win-of-the-week',
  standalone: true,
  imports: [
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatMenuModule,
    MatDividerModule,
    MatBottomSheetModule,
    WowSeriesSheetComponent,
    WinOfTheWeekHistoryComponent,
    WinOfTheMonthComponent,
    AppModalComponent,
    WowTieBreakSpinnerComponent,
    WowCurrentWeekComponent
  ],
  styles: [`
    @keyframes alertPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239,83,80,0); border-color: rgba(239,83,80,0.25); }
      50% { box-shadow: 0 0 32px 4px rgba(239,83,80,0.18); border-color: rgba(239,83,80,0.55); }
    }
    .sudden-death-wrap {
      border: 1px solid rgba(239,83,80,0.25);
      border-radius: 16px;
      animation: alertPulse 2s ease-in-out infinite;
    }
  `],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <app-wow-tie-break-spinner [show]="isSpinning()" [name]="spinnerName()" />

    <div [class.sudden-death-wrap]="currentWeek()?.status === 'SuddenDeath'"
         style="max-width:1060px;margin:0 auto;padding:0 8px 80px;overflow-x:hidden">


      <!-- Back button for sub-views -->
      @if (activeTab() !== 'current') {
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
          <button mat-icon-button (click)="activeTab.set('current')" style="color:rgba(255,255,255,0.5)">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <span style="font-size:0.9rem;font-weight:600;opacity:0.7">
            {{ activeTab() === 'history' ? 'History' : 'Win of the Month' }}
          </span>
        </div>
      }

      <!-- Content -->
      @switch (activeTab()) {
        @case ('current') {
          <app-wow-current-week
            [week]="currentWeek()"
            [loading]="loading()"
            [isHost]="isHost()"
            [isMobile]="isMobile"
            [qrDataUrl]="qrDataUrl()"
            [currentUserId]="currentUserId"
            [tokenBalance]="tokenBalance()"
            [powerUpsEnabled]="powerUpsEnabled()"
            [hideVoteCounts]="hideVoteCounts()"
            [connectedCount]="connectedCount()"
            [activeTimerEndsAt]="activeTimerEndsAt()"
            [hypeBattleEndsAt]="hypeBattleEndsAt()"
            [quizEligible]="currentWeek()?.quizEligible ?? false"
            [guestToken]="currentWeek()?.guestToken ?? null"
            [hasWinOfMonth]="hasWinOfMonth()"
            [reactionEvents]="reactionEvents()"
            (switchSeriesClick)="series().length > 1 && openSeriesPicker()"
            (nominateClick)="showNominateDialog()"
            (openWeekClick)="openNextWeek()"
            (voteClick)="vote($event)"
            (removeVoteClick)="removeVote($event)"
            (editClick)="showEditDialog($event)"
            (deleteClick)="deleteNomination($event)"
            (copyStory)="copyStory($event)"
            (shareClick)="copyShareLink()"
            (hypeClick)="tapHype($event)"
            (reactionClick)="sendReaction($event)"
            (applyPowerUpClick)="applyPowerUp($event)"
            (applyChaosCardClick)="applyChaosCard($event)"
            (startTimerClick)="startTimer($event)"
            (stopTimerClick)="stopTimer()"
            (startHypeBattleClick)="startHypeBattle($event)"
            (endHypeBattleClick)="endHypeBattle()"
            (startQuizClick)="startQuiz()"
            (submitQuizAnswerClick)="submitQuizAnswer($event)"
            (openVotingClick)="openVoting()"
            (endVotingClick)="endVoting()"
            (startSuddenDeathClick)="startTieBreaker()"
            (togglePowerUpsClick)="togglePowerUps()"
            (toggleHideVoteCountsClick)="toggleHideVoteCounts()"
            (reopenNominationsClick)="reopenNominations()"
            (suddenDeathDurationChange)="onSuddenDeathDurationChange($event)"
            (historyClick)="activeTab.set('history')"
            (winOfMonthClick)="activeTab.set('month')"
(openNextWeekClick)="openNextWeek()"
          />
        }
        @case ('history') { <app-win-of-the-week-history /> }
        @case ('month')   { <app-win-of-the-month /> }
      }
    </div>

    <!-- Nominate / Edit modal -->
    <app-modal [title]="editingNominationId() ? 'Edit Nomination' : 'Nominate a Win'"
               [show]="showDialog()" (closed)="closeDialog()">
      <div style="display:flex;flex-direction:column;gap:12px">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Who are you nominating?</mat-label>
          <mat-select [(ngModel)]="nominateForm.nomineeMemberId">
            @for (m of allMembers(); track m.id) {
              <mat-option [value]="m.id">{{ m.firstName }} {{ m.lastName }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Title</mat-label>
          <input matInput [(ngModel)]="nominateForm.title" placeholder="e.g. Fixed the production DB issue" maxlength="200">
        </mat-form-field>
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Description (optional)</mat-label>
          <textarea matInput [(ngModel)]="nominateForm.description" rows="3" maxlength="2000"></textarea>
        </mat-form-field>
      </div>
      <ng-container modal-footer>
        <button mat-stroked-button (click)="closeDialog()">Cancel</button>
        <button mat-raised-button color="primary" (click)="submitNomination()"
                [disabled]="!nominateForm.nomineeMemberId || !nominateForm.title.trim() || submitting()">
          {{ submitting() ? 'Submitting...' : (editingNominationId() ? 'Save Changes' : 'Submit') }}
        </button>
      </ng-container>
    </app-modal>

    <!-- Switch Series dialog -->
    <app-modal title="Switch Series" [show]="showSeriesDialog()" maxWidth="360px"
               (closed)="showSeriesDialog.set(false)">
      <div style="display:flex;flex-direction:column;gap:8px">
        @for (s of series(); track s.id) {
          <button (click)="selectSeries(s.id); showSeriesDialog.set(false)"
                  style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:10px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:inherit;font-size:0.9rem;cursor:pointer;text-align:left;font-family:inherit;transition:background 0.15s"
                  [style.background]="s.id === currentSeriesId() ? 'rgba(100,181,246,0.12)' : ''"
                  [style.border-color]="s.id === currentSeriesId() ? 'rgba(100,181,246,0.4)' : ''">
            @if (s.id === currentSeriesId()) {
              <mat-icon style="font-size:18px;width:18px;height:18px;color:#64b5f6">check_circle</mat-icon>
            } @else {
              <mat-icon style="font-size:18px;width:18px;height:18px;opacity:0.3">radio_button_unchecked</mat-icon>
            }
            {{ s.name }}
          </button>
        }
        <div style="height:1px;background:rgba(255,255,255,0.07);margin:2px 0"></div>
        <button (click)="showSeriesDialog.set(false); showNewSeriesPrompt()"
                style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:10px;border:1px solid rgba(100,181,246,0.2);background:rgba(100,181,246,0.06);color:rgba(100,181,246,0.85);font-size:0.9rem;cursor:pointer;text-align:left;font-family:inherit;transition:background 0.15s">
          <mat-icon style="font-size:18px;width:18px;height:18px">add_circle_outline</mat-icon>
          New Series
        </button>
      </div>
    </app-modal>

    <!-- New Series modal -->
    <app-modal title="New Series" [show]="showNewSeriesDialog()" maxWidth="380px"
               (closed)="closeNewSeriesDialog()">
      <input [(ngModel)]="newSeriesName" placeholder="Series name (e.g. Backend Team)"
             style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px 14px;color:#fff;font-size:0.95rem;outline:none;box-sizing:border-box"
             maxlength="100" (keydown.enter)="submitNewSeries()" autofocus />
      <ng-container modal-footer>
        <button mat-stroked-button (click)="closeNewSeriesDialog()">Cancel</button>
        <button mat-raised-button color="primary" (click)="submitNewSeries()"
                [disabled]="!newSeriesName.trim() || submitting()">
          {{ submitting() ? 'Creating...' : 'Create' }}
        </button>
      </ng-container>
    </app-modal>
  `
})
export class WinOfTheWeekComponent implements OnInit, OnDestroy {
  private winSvc      = inject(WinOfTheWeekService);
  private seriesSvc   = inject(WinSeriesService);
  private womSvc      = inject(WinOfTheMonthService);
  private memberSvc   = inject(TeamMemberService);
  private wsSvc       = inject(WebSocketService);
  private dialog      = inject(MatDialog);
  private snackBar    = inject(MatSnackBar);
  private bottomSheet = inject(MatBottomSheet);
  private featureAccess = inject(FeatureAccessService);
  private mobileSvc   = inject(MobileService);

  get isMobile() { return this.mobileSvc.isMobile(); }

  private wsSub: Subscription | null = null;
  private timerSub: Subscription | null = null;
  private timerExpiredWeekId: string | null = null;
  private hypeExpiredWeekId: string | null = null;
  private suddenDeathSnapshot: { nominations: WinNomination[], tiedNominationIds: string[] } | null = null;

  constructor() {
    effect(() => {
      const url = this.guestUrl();
      if (!url) { this.qrDataUrl.set(null); return; }
      QRCode.toDataURL(url, { width: 320, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
        .then(dataUrl => this.qrDataUrl.set(dataUrl));
    });

    let lastTokenWeekId: string | null = null;
    effect(() => {
      const week = this.currentWeek();
      if (!week || !this.isHost() || week.id === lastTokenWeekId) return;
      lastTokenWeekId = week.id;
      this.winSvc.generateGuestToken(week.id).subscribe({
        next: (result) => {
          this.guestUrl.set(`${window.location.origin}/guest/wow/${result.token}`);
          this.wsSvc.send({ type: 'join_wow', sessionKey: result.token });
        },
        error: () => {}
      });
    });
  }

  activeTab           = signal('current');
  currentWeek         = signal<WinWeek | null>(null);
  allMembers          = signal<TeamMember[]>([]);
  loading             = signal(true);
  submitting          = signal(false);
  showDialog          = signal(false);
  editingNominationId = signal<string | null>(null);
  isSpinning          = signal(false);
  spinnerName         = signal('');
  currentUserId       = '';
  guestUrl            = signal<string | null>(null);
  qrDataUrl           = signal<string | null>(null);
  series              = signal<WinSeries[]>([]);
  currentSeriesId     = signal<string | null>(null);
  showNewSeriesDialog = signal(false);
  showSeriesDialog    = signal(false);
  newSeriesName       = '';
  tokenBalance        = signal(0);

  connectedCount      = signal(0);
  activeTimerEndsAt   = signal<string | null>(null);
  hypeBattleEndsAt    = signal<string | null>(null);
  suddenDeathDuration = signal(90);
  reactionEvents      = signal<{ id: string; nominationId: string; emoji: string }[]>([]);

  readonly powerUpsEnabled = computed(() => {
    const sid = this.currentSeriesId();
    return this.series().find(s => s.id === sid)?.powerUpsEnabled ?? true;
  });

  readonly hideVoteCounts = computed(() => {
    const sid = this.currentSeriesId();
    return this.series().find(s => s.id === sid)?.hideVoteCounts ?? false;
  });

  readonly isHost       = this.featureAccess.hasAccess$('wow-host');
  readonly hasWinOfMonth = this.featureAccess.hasAccess$('win-of-month');

  readonly hasTie = computed(() => {
    const week = this.currentWeek();
    if (!week || week.status !== 'Voting' || week.nominations.length < 2) return false;
    const sorted = [...week.nominations].sort((a, b) => b.voteCount - a.voteCount);
    return sorted[0].voteCount > 0 && sorted[0].voteCount === sorted[1].voteCount;
  });

  nominateForm: CreateNominationRequest = { nomineeMemberId: '', title: '', description: '' };

  ngOnInit() {
    this.memberSvc.getAll({ isActive: true }).subscribe(members => {
      this.allMembers.set(members.sort((a, b) => a.firstName.localeCompare(b.firstName)));
    });

    this.seriesSvc.getAll().subscribe(list => {
      this.series.set(list);
      if (list.length > 0 && !this.currentSeriesId()) this.currentSeriesId.set(list[0].id);
      this.refresh();
    });

    this.timerSub = interval(1000).subscribe(() => {
      const week = this.currentWeek();
      if (week?.status === 'SuddenDeath' && week.suddenDeathEndsAt && this.timerExpiredWeekId !== week.id) {
        if (new Date(week.suddenDeathEndsAt).getTime() - Date.now() <= 0) {
          this.timerExpiredWeekId = week.id;
          this.suddenDeathSnapshot = { nominations: week.nominations, tiedNominationIds: week.tiedNominationIds };
          this.silentRefresh();
        }
      }
      const timerEndsAt = this.activeTimerEndsAt();
      if (timerEndsAt && new Date(timerEndsAt).getTime() - Date.now() <= 0) {
        this.activeTimerEndsAt.set(null);
      }
      const battleEndsAt = this.hypeBattleEndsAt();
      if (battleEndsAt && new Date(battleEndsAt).getTime() - Date.now() <= 0) {
        this.hypeBattleEndsAt.set(null);
        if (week && this.hypeExpiredWeekId !== week.id) {
          this.hypeExpiredWeekId = week.id;
          this.silentRefresh();
        }
      }
    });

    this.wsSvc.connect();
    // Re-join session when WS reconnects (handles reconnects mid-session)
    const connSub = this.wsSvc.connected$.subscribe(connected => {
      if (connected) {
        const token = this.currentWeek()?.guestToken;
        if (token) this.wsSvc.send({ type: 'join_wow', sessionKey: token });
      }
    });
    this.wsSub?.add(connSub);
    this.wsSub = this.wsSvc.messages$.subscribe(msg => {
      if (!msg || this.activeTab() !== 'current') return;
      switch (msg.type) {
        case 'presence_changed': {
          const count = msg.data['connectedCount'] as number;
          if (typeof count === 'number') this.connectedCount.set(count);
          break;
        }
        case 'vote_cast': case 'vote_removed': case 'nomination_created':
        case 'nomination_updated': case 'nomination_deleted': case 'voting_opened':
        case 'sudden_death_started': case 'nominations_reopened': case 'win_story_ready':
        case 'wow_quiz_started': case 'wow_quiz_answer_submitted':
          this.silentRefresh(); break;
        case 'wow_timer_started': {
          const endsAt = msg.data['endsAt'] as string;
          if (endsAt) this.activeTimerEndsAt.set(endsAt);
          break;
        }
        case 'wow_timer_stopped':
          this.activeTimerEndsAt.set(null);
          break;
        case 'wow_hype_battle_started': {
          const endsAt = msg.data['endsAt'] as string;
          if (endsAt) this.hypeBattleEndsAt.set(endsAt);
          // Battles always start fresh -- mirror the server-side reset locally.
          this.currentWeek.update(w => w ? { ...w, nominations: w.nominations.map(n => ({ ...n, hypeMeterCount: 0 })) } : w);
          break;
        }
        case 'wow_hype_battle_ended':
          this.hypeBattleEndsAt.set(null);
          break;
        case 'hype_meter_tapped': {
          const nomId = msg.data['nominationId'] as string;
          const count = msg.data['count'] as number;
          this.currentWeek.update(w => {
            if (!w) return w;
            return { ...w, nominations: w.nominations.map(n => n.id === nomId ? { ...n, hypeMeterCount: count } : n) };
          });
          break;
        }
        case 'reaction_sent': {
          const id = msg.data['id'] as string;
          const nominationId = msg.data['nominationId'] as string;
          const emoji = msg.data['emoji'] as string;
          this.reactionEvents.update(list => [...list.slice(-49), { id, nominationId, emoji }]);
          break;
        }
        case 'voting_closed': {
          const wk = this.currentWeek();
          const snap = this.suddenDeathSnapshot;
          this.suddenDeathSnapshot = null;
          const source = wk?.status === 'SuddenDeath' ? wk
            : snap ? { nominations: snap.nominations, tiedNominationIds: snap.tiedNominationIds } : null;
          const tiedNoms = source ? source.nominations.filter(n => source.tiedNominationIds.includes(n.id)) : [];
          if (tiedNoms.length > 0) {
            const winnerId = msg.data['winnerId'] as string;
            const winner = tiedNoms.find(n => n.id === winnerId);
            runTieBreakSpin(
              tiedNoms.map(n => n.nomineeName),
              winner?.nomineeName ?? tiedNoms[0].nomineeName,
              n => this.spinnerName.set(n),
              v => this.isSpinning.set(v),
              () => this.silentRefresh()
            );
          } else {
            this.silentRefresh();
          }
          break;
        }
      }
    });
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
    this.timerSub?.unsubscribe();
  }

  private refresh() {
    const sid = this.currentSeriesId();
    if (!sid) { this.loading.set(false); return; }
    this.loading.set(true);
    this.winSvc.getCurrentWeek(sid).subscribe({
      next: (week) => { this.currentWeek.set(week); if (week) { this.currentUserId = week.currentMemberId; this.connectedCount.set(week.connectedMemberCount); this.hypeBattleEndsAt.set(week.hypeBattleEndsAt); if (week.guestToken) this.wsSvc.send({ type: 'join_wow', sessionKey: week.guestToken }); } this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Failed to load Win of the Week', 'Close', { duration: 3000 }); }
    });
    this.winSvc.getTokenBalance(sid).subscribe({ next: r => this.tokenBalance.set(r.balance), error: () => {} });
  }

  private silentRefresh() {
    const sid = this.currentSeriesId();
    if (!sid) return;
    clearCacheForPattern('/api/v1/win-of-the-week');
    this.winSvc.getCurrentWeek(sid).subscribe({
      next: (week) => { this.currentWeek.set(week); if (week) { this.currentUserId = week.currentMemberId; this.connectedCount.set(week.connectedMemberCount); this.hypeBattleEndsAt.set(week.hypeBattleEndsAt); if (week.guestToken) this.wsSvc.send({ type: 'join_wow', sessionKey: week.guestToken }); } }
    });
  }

  selectSeries(id: string) {
    this.currentSeriesId.set(id);
    this.currentWeek.set(null);
    this.guestUrl.set(null);
    this.qrDataUrl.set(null);
    this.refresh();
  }

  togglePowerUps() {
    const sid = this.currentSeriesId();
    if (!sid) return;
    this.seriesSvc.togglePowerUps(sid).subscribe({
      next: (updated) => this.series.update(list => list.map(s => s.id === updated.id ? updated : s)),
      error: () => this.snackBar.open('Failed to toggle power-ups', 'Close', { duration: 3000 })
    });
  }

  toggleHideVoteCounts() {
    const sid = this.currentSeriesId();
    if (!sid) return;
    this.seriesSvc.toggleHideVoteCounts(sid).subscribe({
      next: (updated) => this.series.update(list => list.map(s => s.id === updated.id ? updated : s)),
      error: () => this.snackBar.open('Failed to toggle vote count visibility', 'Close', { duration: 3000 })
    });
  }

  openSeriesPicker() {
    if (this.isMobile) {
      const ref = this.bottomSheet.open(WowSeriesSheetComponent, {
        data: { series: this.series(), currentSeriesId: this.currentSeriesId() },
        panelClass: 'wow-series-sheet'
      });
      ref.afterDismissed().subscribe(result => {
        if (result === '__new__') this.showNewSeriesPrompt();
        else if (result) this.selectSeries(result);
      });
    } else {
      this.showSeriesDialog.set(true);
    }
  }

  showNewSeriesPrompt()  { this.newSeriesName = ''; this.showNewSeriesDialog.set(true); }
  closeNewSeriesDialog() { this.showNewSeriesDialog.set(false); }

  submitNewSeries() {
    const name = this.newSeriesName.trim();
    if (!name || this.submitting()) return;
    this.submitting.set(true);
    this.seriesSvc.create(name).subscribe({
      next: (s) => {
        this.series.update(list => [...list, s]);
        this.selectSeries(s.id);
        this.showNewSeriesDialog.set(false);
        this.submitting.set(false);
      },
      error: () => { this.submitting.set(false); this.snackBar.open('Failed to create series', 'Close', { duration: 3000 }); }
    });
  }

  showNominateDialog() {
    this.editingNominationId.set(null);
    this.nominateForm = { nomineeMemberId: '', title: '', description: '' };
    this.showDialog.set(true);
  }

  showEditDialog(nom: WowNominationDisplay) {
    this.editingNominationId.set(nom.id);
    this.nominateForm = { nomineeMemberId: nom.nomineeMemberId, title: nom.title, description: nom.description || '' };
    this.showDialog.set(true);
  }

  closeDialog() { this.showDialog.set(false); this.editingNominationId.set(null); }

  submitNomination() {
    if (!this.nominateForm.nomineeMemberId || !this.nominateForm.title.trim()) return;
    this.submitting.set(true);
    const editId = this.editingNominationId();
    const payload = {
      nomineeMemberId: this.nominateForm.nomineeMemberId,
      title: this.nominateForm.title.trim(),
      description: this.nominateForm.description?.trim() || undefined
    };
    const req$ = editId
      ? this.winSvc.updateNomination(editId, payload)
      : this.winSvc.createNomination(payload, this.currentSeriesId() ?? undefined);

    req$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.showDialog.set(false);
        this.editingNominationId.set(null);
        this.snackBar.open(editId ? 'Nomination updated!' : 'Nomination submitted! Voting opens Friday.', 'Close', { duration: 3000 });
        this.refresh();
      },
      error: (err) => { this.submitting.set(false); this.snackBar.open(err.error?.error || 'Failed to save nomination', 'Close', { duration: 3000 }); }
    });
  }

  deleteNomination(nominationId: string) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete nomination?', message: 'This cannot be undone.', confirmLabel: 'Delete', danger: true }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.winSvc.deleteNomination(nominationId).subscribe({
        next: () => { this.snackBar.open('Nomination deleted', 'Close', { duration: 3000 }); this.refresh(); },
        error: (err) => this.snackBar.open(err.error?.error || 'Failed to delete nomination', 'Close', { duration: 3000 })
      });
    });
  }

  vote(nominationId: string) {
    this.winSvc.vote(nominationId).subscribe({
      next: () => {
        const remaining = (this.currentWeek()?.userVotesRemaining ?? 1) - 1;
        this.snackBar.open(`Vote cast! ${remaining} votes remaining.`, 'Close', { duration: 2000 });
        this.refresh();
      },
      error: (err) => this.snackBar.open(err.error?.error || 'Failed to vote', 'Close', { duration: 3000 })
    });
  }

  removeVote(nominationId: string) {
    this.winSvc.removeVote(nominationId).subscribe({
      next: () => { this.snackBar.open('Vote removed', 'Close', { duration: 2000 }); this.refresh(); },
      error: () => this.snackBar.open('Failed to remove vote', 'Close', { duration: 3000 })
    });
  }

  closeWeek() {
    const week = this.currentWeek();
    if (!week || week.nominations.length === 0) return;
    const topNom = [...week.nominations].sort((a, b) => b.voteCount - a.voteCount)[0];
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Close week?', message: `Winner: "${topNom.nomineeName} — ${topNom.title}" (${topNom.voteCount} vote(s)).`, confirmLabel: 'Close', danger: false }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.winSvc.closeWeek({ winnerNominationId: topNom.id }, this.currentSeriesId() ?? undefined).subscribe({
        next: () => { this.snackBar.open('Week closed! Winner announced.', 'Close', { duration: 3000 }); this.refresh(); },
        error: (err) => this.snackBar.open(err.error?.error || 'Failed to close week', 'Close', { duration: 3000 })
      });
    });
  }

  openNextWeek() {
    this.winSvc.openNextWeek(this.currentSeriesId() ?? undefined).subscribe({
      next: () => { this.snackBar.open('New week opened!', 'Close', { duration: 3000 }); this.refresh(); },
      error: (err) => this.snackBar.open(err.error?.error || 'Failed to open next week', 'Close', { duration: 3000 })
    });
  }

  openVoting() {
    this.winSvc.openVoting(this.currentSeriesId() ?? undefined).subscribe({
      next: () => { this.snackBar.open('Voting is now open!', 'Close', { duration: 3000 }); this.refresh(); },
      error: (err) => this.snackBar.open(err.error?.error || 'Failed to open voting', 'Close', { duration: 3000 })
    });
  }

  reopenNominations() {
    this.winSvc.reopenNominations(this.currentSeriesId() ?? undefined).subscribe({
      next: () => { this.snackBar.open('Nominations reopened!', 'Close', { duration: 3000 }); this.silentRefresh(); },
      error: (err) => this.snackBar.open(err.error?.error || 'Failed to reopen nominations', 'Close', { duration: 3000 })
    });
  }

  startTieBreaker() {
    const week = this.currentWeek();
    if (!week) return;
    const sorted = [...week.nominations].sort((a, b) => b.voteCount - a.voteCount);
    const topVotes = sorted[0].voteCount;
    const tied = sorted.filter(n => n.voteCount === topVotes);
    const dur = this.suddenDeathDuration();
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        title: '⚡ Sudden Death',
        message: `${tied.map(n => n.nomineeName).join(' vs ')} are tied with ${topVotes} vote(s). Start a ${dur}-second sudden death round?`,
        confirmLabel: '⚡ Start Sudden Death', danger: true
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.winSvc.startSuddenDeath({ tiedNominationIds: tied.map(n => n.id), durationSeconds: dur }, this.currentSeriesId() ?? undefined).subscribe({
        next: () => { this.snackBar.open(`⚡ Sudden Death started! ${dur} seconds on the clock.`, 'Close', { duration: 4000 }); this.refresh(); },
        error: (err) => this.snackBar.open(err.error?.error ?? err.error?.title ?? `Failed (${err.status})`, 'Close', { duration: 5000 })
      });
    });
  }

  startTimer(durationSeconds: number) {
    this.winSvc.startTimer({ durationSeconds }, this.currentSeriesId() ?? undefined).subscribe({
      next: (r) => this.activeTimerEndsAt.set(r.endsAt),
      error: () => this.snackBar.open('Failed to start timer', 'Close', { duration: 3000 })
    });
  }

  stopTimer() {
    this.winSvc.stopTimer(this.currentSeriesId() ?? undefined).subscribe({
      next: () => this.activeTimerEndsAt.set(null),
      error: () => {}
    });
  }

  startHypeBattle(durationSeconds: number) {
    this.winSvc.startHypeBattle({ durationSeconds }, this.currentSeriesId() ?? undefined).subscribe({
      next: (r) => this.hypeBattleEndsAt.set(r.endsAt),
      error: () => this.snackBar.open('Failed to start Hype Battle', 'Close', { duration: 3000 })
    });
  }

  endHypeBattle() {
    this.winSvc.endHypeBattle(this.currentSeriesId() ?? undefined).subscribe({
      next: () => this.hypeBattleEndsAt.set(null),
      error: () => {}
    });
  }

  startQuiz() {
    this.winSvc.startQuiz(this.currentSeriesId() ?? undefined).subscribe({
      next: (week) => this.currentWeek.set(week),
      error: (err) => this.snackBar.open(err.error?.error ?? 'Failed to start Quiz Duel', 'Close', { duration: 4000 })
    });
  }

  submitQuizAnswer(selectedIndex: number) {
    this.winSvc.submitQuizAnswer(selectedIndex, this.currentSeriesId() ?? undefined).subscribe({
      next: (r) => {
        if (!r.isCorrect) this.snackBar.open('Not quite — try again next time!', 'Close', { duration: 3000 });
        this.silentRefresh();
      },
      error: (err) => this.snackBar.open(err.error?.error ?? 'Failed to submit answer', 'Close', { duration: 4000 })
    });
  }

  onSuddenDeathDurationChange(val: number) {
    this.suddenDeathDuration.set(val);
  }

  endVoting() {
    this.closeWeek();
  }

  tapHype(nominationId: string) {
    this.winSvc.incrementHypeMeter(nominationId).subscribe({ error: () => {} });
  }

  sendReaction(event: { nominationId: string; emoji: string }) {
    this.winSvc.sendReaction(event.nominationId, event.emoji).subscribe({ error: () => {} });
  }

  applyPowerUp(event: { nominationId: string; type: string }) {
    this.winSvc.applyPowerUp(event.nominationId, { type: event.type }).subscribe({
      next: () => { this.snackBar.open(`⭐ ${event.type} applied! Token spent.`, 'Close', { duration: 3000 }); this.refresh(); },
      error: (err) => this.snackBar.open(err.error?.error || 'Failed to apply power-up', 'Close', { duration: 3000 })
    });
  }

  applyChaosCard(event: { nominationId: string; type: string }) {
    this.winSvc.applyChaosCard(event.nominationId, { type: event.type }).subscribe({
      next: () => { this.snackBar.open(`🌶️ ${event.type} applied! Token spent.`, 'Close', { duration: 3000 }); this.refresh(); },
      error: (err) => this.snackBar.open(err.error?.error || 'Failed to apply chaos card', 'Close', { duration: 3000 })
    });
  }

  copyShareLink() {
    const existingUrl = this.guestUrl();
    if (this.isHost() && existingUrl) {
      navigator.clipboard.writeText(existingUrl)
        .then(() => this.snackBar.open('Guest link copied!', 'Close', { duration: 3000 }))
        .catch(() => this.snackBar.open('Failed to copy link', 'Close', { duration: 3000 }));
    } else if (this.isHost()) {
      const week = this.currentWeek();
      if (!week) return;
      this.winSvc.generateGuestToken(week.id).subscribe({
        next: (result) => {
          const url = `${window.location.origin}/guest/wow/${result.token}`;
          this.guestUrl.set(url);
          navigator.clipboard.writeText(url)
            .then(() => this.snackBar.open('Guest link copied!', 'Close', { duration: 3000 }))
            .catch(() => this.snackBar.open('Failed to copy link', 'Close', { duration: 3000 }));
        },
        error: () => this.snackBar.open('Failed to generate guest link', 'Close', { duration: 3000 })
      });
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/fun/win-of-the-week`)
        .then(() => this.snackBar.open('Link copied! Share on WhatsApp 📱', 'Close', { duration: 3000 }))
        .catch(() => this.snackBar.open('Failed to copy link', 'Close', { duration: 3000 }));
    }
  }

  copyStory(story: string) {
    navigator.clipboard.writeText(story)
      .then(() => this.snackBar.open('Hero story copied! 🦸', 'Close', { duration: 2000 }))
      .catch(() => this.snackBar.open('Failed to copy story', 'Close', { duration: 3000 }));
  }
}
