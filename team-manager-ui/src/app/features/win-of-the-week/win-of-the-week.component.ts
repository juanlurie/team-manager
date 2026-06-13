import { Component, OnInit, inject, signal, computed, OnDestroy, effect, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import QRCode from 'qrcode';
import { CommonModule } from '@angular/common';
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
import { Subscription, interval, map } from 'rxjs';
import { WowCountdownComponent } from '../../shared/components/wow-countdown/wow-countdown.component';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { WinOfTheWeekService } from '../../core/services/win-of-the-week.service';
import { WinOfTheMonthService } from '../../core/services/win-of-the-month.service';
import { TeamMemberService } from '../../core/services/team-member.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { WinWeek, WinNomination, WinSeries, CreateNominationRequest, WowNominationDisplay } from '../../core/models/win-week.model';
import { TeamMember } from '../../core/models/team-member.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { WinOfTheWeekHistoryComponent } from '../win-of-the-week-history/win-of-the-week-history.component';
import { WinOfTheMonthComponent } from '../win-of-the-month/win-of-the-month.component';
import { FeatureAccessService } from '../../core/services/feature-access.service';
import { WinSeriesService } from '../../core/services/win-series.service';
import { WowNominationCardComponent } from '../../shared/components/wow-nomination-card/wow-nomination-card.component';
import { WowWinnerBannerComponent } from '../../shared/components/wow-winner-banner/wow-winner-banner.component';

@Component({
  selector: 'app-win-of-the-week',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatTooltipModule, MatDialogModule, MatSnackBarModule,
    MatFormFieldModule, MatSelectModule, MatInputModule, MatMenuModule, MatDividerModule,
    WinOfTheWeekHistoryComponent, WinOfTheMonthComponent, WowCountdownComponent,
    WowNominationCardComponent, WowWinnerBannerComponent
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
    @keyframes spinnerPop {
      0% { transform: scale(0.92); opacity: 0.6; }
      50% { transform: scale(1.04); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    .spinner-name { animation: spinnerPop 0.12s ease-out; }
  `],
  template: `
    <!-- Tie-break spin overlay -->
    @if (isSpinning()) {
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:2000;backdrop-filter:blur(6px)">
        <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:3px;opacity:0.4;margin-bottom:28px">🎲 Breaking the tie</div>
        <div class="spinner-name"
             style="font-size:2.2rem;font-weight:800;color:#ef5350;min-width:300px;text-align:center;padding:24px 36px;background:rgba(239,83,80,0.08);border:2px solid rgba(239,83,80,0.4);border-radius:20px">
          {{spinnerName()}}
        </div>
      </div>
    }

    <div [class.sudden-death-wrap]="currentWeek()?.status === 'SuddenDeath'"
         style="max-width:1060px;margin:0 auto;padding:0 8px 80px;overflow-x:hidden">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <mat-icon style="font-size:1.6rem;width:1.6rem;height:1.6rem;color:#FFD700">emoji_events</mat-icon>
        <h2 style="margin:0;font-size:1.3rem;font-weight:700">Win of the Week</h2>
        @if (series().length > 1) {
          <select [ngModel]="currentSeriesId()" (ngModelChange)="selectSeries($event)"
                  style="background:#1e1e2e;color:rgba(255,255,255,0.8);border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:4px 8px;font-size:0.82rem;cursor:pointer">
            @for (s of series(); track s.id) {
              <option [value]="s.id">{{ s.name }}</option>
            }
          </select>
        }
        <div style="flex:1"></div>
        <button mat-icon-button [matMenuTriggerFor]="moreMenu" style="color:rgba(255,255,255,0.5)">
          <mat-icon>more_vert</mat-icon>
        </button>
        <mat-menu #moreMenu="matMenu">
          @if (activeTab() !== 'current') {
            <button mat-menu-item (click)="activeTab.set('current')">
              <mat-icon>emoji_events</mat-icon>Current Week
            </button>
            <mat-divider />
          }
          <button mat-menu-item (click)="activeTab.set('history')">
            <mat-icon>history</mat-icon>History
          </button>
          @if (hasWinOfMonth()) {
            <button mat-menu-item (click)="activeTab.set('month')">
              <mat-icon>calendar_month</mat-icon>Win of the Month
            </button>
          }
          <mat-divider />
          @if (activeTab() === 'current' && isHost()) {
            @if (currentWeek()?.status === 'Nominating' && (currentWeek()?.nominations?.length ?? 0) > 0) {
              <button mat-menu-item (click)="openVoting()">
                <mat-icon>how_to_vote</mat-icon>Open Voting
              </button>
            }
            @if (currentWeek()?.status === 'Voting' && (currentWeek()?.nominations?.length ?? 0) > 0) {
              @if (hasTie()) {
                <button mat-menu-item (click)="startTieBreaker()">
                  <mat-icon style="color:#ff7043">bolt</mat-icon>Start Sudden Death
                </button>
              } @else {
                <button mat-menu-item (click)="closeWeek()">
                  <mat-icon>lock</mat-icon>Close &amp; Pick Winner
                </button>
              }
            }
            @if (currentWeek()?.status === 'Voting' || currentWeek()?.status === 'SuddenDeath') {
              <button mat-menu-item (click)="reopenNominations()">
                <mat-icon>edit_note</mat-icon>Reopen Nominations
              </button>
            }
            @if (currentWeek()?.status === 'Closed') {
              <button mat-menu-item (click)="openNextWeek()">
                <mat-icon>add_circle</mat-icon>Open Next Week
              </button>
            }
          }
          @if (isHost()) {
            <mat-divider />
            <button mat-menu-item (click)="showNewSeriesPrompt()">
              <mat-icon>add_circle_outline</mat-icon>Start Another Series
            </button>
          }
          <mat-divider />
          <button mat-menu-item (click)="copyShareLink()">
            <mat-icon>share</mat-icon>Copy share link
          </button>
        </mat-menu>
      </div>

      <!-- Secondary header for non-current views -->
      @if (activeTab() !== 'current') {
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
          <button mat-icon-button (click)="activeTab.set('current')" style="color:rgba(255,255,255,0.5)">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <span style="font-size:0.9rem;font-weight:600;opacity:0.7">{{activeTab() === 'history' ? 'History' : 'Win of the Month'}}</span>
        </div>
      }

      <!-- Content -->
      @switch (activeTab()) {
        @case ('current') {
          <div style="display:flex;gap:24px;align-items:flex-start">
            <div style="flex:1;min-width:0">
              <ng-container *ngTemplateOutlet="currentTab"></ng-container>
            </div>
            @if (isHost() && qrDataUrl() && !isMobile()) {
              <div style="flex-shrink:0;width:180px;position:sticky;top:16px">
                <img [src]="qrDataUrl()!" alt="Guest QR code" style="width:180px;height:180px;border-radius:8px;display:block" />
                <button mat-icon-button (click)="copyShareLink()" matTooltip="Copy guest link"
                        style="margin-top:8px;width:100%;border-radius:6px;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.7)">
                  <mat-icon>share</mat-icon>
                </button>
              </div>
            }
          </div>
        }
        @case ('history') {
          <app-win-of-the-week-history />
        }
        @case ('month') {
          <app-win-of-the-month />
        }
      }
    </div>

    <!-- Nominate/Edit Dialog -->
    @if (showDialog()) {
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000"
           (click)="closeDialog()">
        <div style="background:#1e1e2e;border-radius:16px;padding:24px;width:90%;max-width:440px;max-height:85dvh;overflow-y:auto;overscroll-behavior:contain;border:1px solid rgba(255,255,255,0.1);-webkit-overflow-scrolling:touch"
             (click)="$event.stopPropagation()">
          <h3 style="margin:0 0 16px;font-size:1.1rem;font-weight:700">{{editingNominationId() ? 'Edit Nomination' : 'Nominate a Win'}}</h3>

          <div style="display:flex;flex-direction:column;gap:12px">
            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>Who are you nominating?</mat-label>
              <mat-select [(ngModel)]="nominateForm.nomineeMemberId">
                @for (m of allMembers(); track m.id) {
                  <mat-option [value]="m.id">{{m.firstName}} {{m.lastName}}</mat-option>
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

          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;position:sticky;bottom:0;background:#1e1e2e;padding-top:8px">
            <button mat-stroked-button (click)="closeDialog()">Cancel</button>
            <button mat-raised-button color="primary" (click)="submitNomination()"
                    [disabled]="!nominateForm.nomineeMemberId || !nominateForm.title.trim() || submitting()">
              {{ submitting() ? 'Submitting...' : (editingNominationId() ? 'Save Changes' : 'Submit') }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- New Series Dialog -->
    @if (showNewSeriesDialog()) {
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000"
           (click)="closeNewSeriesDialog()">
        <div style="background:#1e1e2e;border-radius:16px;padding:24px;width:90%;max-width:380px;border:1px solid rgba(255,255,255,0.1)"
             (click)="$event.stopPropagation()">
          <h3 style="margin:0 0 16px;font-size:1.1rem;font-weight:700">New Series</h3>
          <input [(ngModel)]="newSeriesName" placeholder="Series name (e.g. Backend Team)"
                 style="width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:10px 14px;color:#fff;font-size:0.95rem;outline:none;box-sizing:border-box"
                 maxlength="100" (keydown.enter)="submitNewSeries()" autofocus />
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
            <button mat-stroked-button (click)="closeNewSeriesDialog()">Cancel</button>
            <button mat-raised-button color="primary" (click)="submitNewSeries()"
                    [disabled]="!newSeriesName.trim() || submitting()">
              {{ submitting() ? 'Creating...' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Current tab template -->
    <ng-template #currentTab>
      <!-- Phase badge + quota on same row -->
      @let phase = phaseInfo();
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <span [style.background]="phase.bg" [style.color]="phase.text"
              style="font-size:0.75rem;font-weight:700;padding:4px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.3px">
          {{phase.label}}
        </span>
        @if (currentWeek()?.status === 'Voting') {
          <span style="font-size:0.8rem;opacity:0.6">
            Votes remaining: <strong>{{currentWeek()?.userVotesRemaining ?? 0}}</strong>/3
          </span>
        }
        @if (currentWeek()?.status === 'Nominating') {
          <span style="font-size:0.8rem;opacity:0.6">
            Nominations remaining: <strong>{{currentWeek()?.userNominationsRemaining ?? 0}}</strong>/3
          </span>
          @if ((currentWeek()?.userNominationsRemaining ?? 0) > 0) {
            <button mat-stroked-button color="accent" (click)="showNominateDialog()"
                    style="font-size:0.8rem;height:30px;margin-left:auto">
              <mat-icon style="font-size:1rem;width:1rem;height:1rem">add</mat-icon>
              Nominate a Win
            </button>
          }
        }
      </div>

      <!-- Sudden Death countdown banner -->
      @if (currentWeek()?.status === 'SuddenDeath') {
        <div style="background:rgba(239,83,80,0.08);border:1px solid rgba(239,83,80,0.3);border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:14px">
          <div style="flex:1">
            <div style="font-weight:700;font-size:0.85rem;color:#ef5350;text-transform:uppercase;letter-spacing:0.5px">⚡ Tie-Breaker</div>
            <div style="font-size:0.75rem;opacity:0.6;margin-top:2px">Vote now — highest vote wins when time expires</div>
          </div>
          <div style="text-align:center;min-width:64px">
            <app-wow-countdown [endsAt]="currentWeek()?.suddenDeathEndsAt ?? null" />
          </div>
        </div>
      }


      <!-- Winner banner -->
      @let winner = currentWeek();
      @if (winner && winner.status === 'Closed' && winner.winnerNomineeName) {
        <app-wow-winner-banner
          [winnerNomineeName]="winner.winnerNomineeName"
          [winnerTitle]="winner.winnerTitle"
          [winnerStory]="winner.winnerStory"
          [showPoints]="true"
          (copyStory)="copyStory($event)"
        />
      }


<!-- Info banner during nominating phase -->
      @if (currentWeek()?.status === 'Nominating') {
        <div style="background:rgba(100,181,246,0.08);border:1px solid rgba(100,181,246,0.15);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:0.8rem;color:#64b5f6">
          💡 You can edit or delete your nominations before voting opens.
        </div>
      }

      <!-- All votes used banner (regular voting) -->
      @if (currentWeek()?.status === 'Voting' && (currentWeek()?.userVotesRemaining ?? 0) === 0) {
        <div style="background:rgba(76,175,80,0.08);border:1px solid rgba(76,175,80,0.2);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:0.8rem;color:#4caf50">
          ✓ All votes cast! Results will be announced Sunday night.
        </div>
      }

      <!-- Vote progress bar (voting + sudden death) -->
      @let w = currentWeek();
      @if (w && (w.status === 'Voting' || w.status === 'SuddenDeath')) {
        @let pct = voteProgressPct();
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;font-size:0.7rem;opacity:0.5;margin-bottom:4px">
            <span>
              <mat-icon style="font-size:12px;width:12px;height:12px;vertical-align:middle">people</mat-icon>
              {{w.connectedMemberCount}} connected
            </span>
            <span>{{w.totalVotesCast}}{{w.connectedMemberCount > 0 ? ' / ' + (w.connectedMemberCount * 3) : ''}} votes cast</span>
          </div>
          <div style="height:4px;border-radius:2px;background:rgba(255,255,255,0.08);overflow:hidden">
            <div [style.width]="pct + '%'" style="height:100%;background:#4caf50;border-radius:2px;transition:width 0.4s ease"></div>
          </div>
        </div>
      }

      <!-- Loading -->
      @if (loading()) {
        <div style="text-align:center;padding:64px;opacity:0.35">Loading...</div>
      }

      <!-- No week yet for this series -->
      @if (!loading() && !currentWeek()) {
        <div style="text-align:center;padding:64px;opacity:0.5">
          <mat-icon style="font-size:3rem;width:3rem;height:3rem;opacity:0.3">emoji_events</mat-icon>
          <div style="margin-top:12px;font-weight:600">No active week for this series</div>
          @if (isHost()) {
            <button mat-raised-button color="primary" (click)="openNextWeek()" style="margin-top:16px">Open First Week</button>
          }
        </div>
      }

      <!-- Empty state -->
      @if (!loading() && currentWeek() && currentWeek()!.nominations.length === 0) {
        <div style="text-align:center;padding:64px;opacity:0.35">
          <mat-icon style="font-size:3rem;width:3rem;height:3rem;opacity:0.3">emoji_events</mat-icon>
          <div style="margin-top:12px;font-weight:600">No wins nominated yet this week</div>
          <div style="margin-top:4px;font-size:0.85rem">Be the first to recognise a teammate!</div>
          @if (currentWeek()?.status === 'Nominating' && (currentWeek()?.userNominationsRemaining ?? 0) > 0) {
            <button mat-raised-button color="primary" (click)="showNominateDialog()" style="margin-top:16px">
              Nominate a Win
            </button>
          }
        </div>
      }

      <!-- Nominations list -->
      @if (!loading() && currentWeek() && currentWeek()!.nominations.length > 0) {
        <div style="display:flex;flex-direction:column;gap:10px">
          @for (nom of sortedNominations(); track nom.id) {
            <app-wow-nomination-card
              [nomination]="toDisplay(nom)"
              [weekStatus]="currentWeek()!.status"
              [canEdit]="nom.teamMemberId === currentUserId"
              [votesRemaining]="currentWeek()?.userVotesRemaining ?? 0"
              [isTied]="tiedNomIds().has(nom.id)"
              (voteClick)="vote($event)"
              (removeVoteClick)="removeVote($event)"
              (editClick)="showEditDialog($event)"
              (deleteClick)="deleteNomination($event)"
            />
          }
        </div>
      }
    </ng-template>
  `
})
export class WinOfTheWeekComponent implements OnInit, OnDestroy {
  private breakpointObserver = inject(BreakpointObserver);
  isMobile = toSignal(this.breakpointObserver.observe([Breakpoints.Handset, Breakpoints.TabletPortrait]).pipe(map(r => r.matches)), { initialValue: false });

  private winSvc = inject(WinOfTheWeekService);
  private seriesSvc = inject(WinSeriesService);
  private womSvc = inject(WinOfTheMonthService);
  private memberSvc = inject(TeamMemberService);
  private wsSvc = inject(WebSocketService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private featureAccess = inject(FeatureAccessService);
  private wsSub: Subscription | null = null;
  private timerSub: Subscription | null = null;
  private timerExpiredWeekId: string | null = null;
  private suddenDeathSnapshot: { nominations: WinNomination[], tiedNominationIds: string[] } | null = null;

  constructor() {
    effect(() => {
      const url = this.guestUrl();
      if (!url) { this.qrDataUrl.set(null); return; }
      QRCode.toDataURL(url, { width: 320, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
        .then(dataUrl => this.qrDataUrl.set(dataUrl));
    });

    let lastTokenSeriesId: string | null = null;
    effect(() => {
      const week = this.currentWeek();
      const sid = this.currentSeriesId();
      if (!week || !this.isHost() || sid === lastTokenSeriesId) return;
      lastTokenSeriesId = sid;
      this.winSvc.generateGuestToken(week.id).subscribe({
        next: (result) => this.guestUrl.set(`${window.location.origin}/guest/wow/${result.token}`),
        error: () => {}
      });
    });
  }

  activeTab = signal('current');
  currentWeek = signal<WinWeek | null>(null);
  allMembers = signal<TeamMember[]>([]);
  loading = signal(true);
  submitting = signal(false);
  showDialog = signal(false);
  editingNominationId = signal<string | null>(null);
  isSpinning = signal(false);
  spinnerName = signal('');
  currentUserId = '';
  guestUrl = signal<string | null>(null);
  qrDataUrl = signal<string | null>(null);
  series = signal<WinSeries[]>([]);
  currentSeriesId = signal<string | null>(null);
  showNewSeriesDialog = signal(false);
  newSeriesName = '';

  readonly isHost = this.featureAccess.hasAccess$('wow-host');
  readonly hasWinOfMonth = this.featureAccess.hasAccess$('win-of-month');

  nominateForm: CreateNominationRequest = {
    nomineeMemberId: '',
    title: '',
    description: ''
  };

  readonly phaseInfo = computed(() => {
    const week = this.currentWeek();
    if (!week) return { label: 'Loading', text: '#fff', bg: 'rgba(255,255,255,0.1)' };
    switch (week.status) {
      case 'Nominating':
        return { label: 'Nominations Open', text: '#FFD700', bg: 'rgba(255,215,0,0.15)' };
      case 'Voting':
        return { label: 'Voting Open', text: '#4caf50', bg: 'rgba(76,175,80,0.15)' };
      case 'SuddenDeath':
        return { label: '⚡ Tie-Breaker', text: '#ff7043', bg: 'rgba(255,87,34,0.15)' };
      case 'Closed':
        return { label: 'Closed', text: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.06)' };
      default:
        return { label: week.status, text: '#fff', bg: 'rgba(255,255,255,0.1)' };
    }
  });

  readonly hasTie = computed(() => {
    const week = this.currentWeek();
    if (!week || week.status !== 'Voting' || week.nominations.length < 2) return false;
    const sorted = [...week.nominations].sort((a, b) => b.voteCount - a.voteCount);
    return sorted[0].voteCount > 0 && sorted[0].voteCount === sorted[1].voteCount;
  });

  readonly tiedNomIds = computed(() => {
    const week = this.currentWeek();
    if (!week) return new Set<string>();
    if (week.status === 'SuddenDeath') return new Set(week.tiedNominationIds);
    if (week.status === 'Voting' && week.nominations.length >= 2) {
      const sorted = [...week.nominations].sort((a, b) => b.voteCount - a.voteCount);
      const top = sorted[0].voteCount;
      if (top > 0 && sorted[1].voteCount === top)
        return new Set(sorted.filter(n => n.voteCount === top).map(n => n.id));
    }
    return new Set<string>();
  });

  readonly voteProgressPct = computed(() => {
    const week = this.currentWeek();
    if (!week || week.connectedMemberCount === 0) return 0;
    return Math.min(100, Math.round((week.totalVotesCast / (week.connectedMemberCount * 3)) * 100));
  });

  readonly sortedNominations = computed(() => {
    const week = this.currentWeek();
    if (!week) return [];
    let nominations = [...week.nominations];
    if (week.status === 'SuddenDeath' && week.tiedNominationIds?.length) {
      const tiedSet = new Set(week.tiedNominationIds);
      nominations = nominations.filter(n => tiedSet.has(n.id));
    }
    if (week.status === 'Voting' || week.status === 'SuddenDeath' || week.status === 'Closed') {
      return nominations.sort((a, b) => b.voteCount - a.voteCount || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return nominations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  ngOnInit() {
    this.memberSvc.getAll({ isActive: true }).subscribe(members => {
      this.allMembers.set(members.sort((a, b) => a.firstName.localeCompare(b.firstName)));
    });

    this.seriesSvc.getAll().subscribe(list => {
      this.series.set(list);
      if (list.length > 0 && !this.currentSeriesId()) {
        this.currentSeriesId.set(list[0].id);
      }
      this.refresh();
    });


    this.timerSub = interval(1000).subscribe(() => {
      const week = this.currentWeek();
      if (week?.status === 'SuddenDeath' && week.suddenDeathEndsAt && this.timerExpiredWeekId !== week.id) {
        const remaining = new Date(week.suddenDeathEndsAt).getTime() - Date.now();
        if (remaining <= 0) {
          this.timerExpiredWeekId = week.id;
          // Snapshot tied state before refresh so voting_closed can animate even if HTTP response arrives first
          this.suddenDeathSnapshot = { nominations: week.nominations, tiedNominationIds: week.tiedNominationIds };
          this.silentRefresh();
        }
      }
    });

    this.wsSvc.connect();
    this.wsSub = this.wsSvc.messages$.subscribe(msg => {
      if (!msg || this.activeTab() !== 'current') return;
      switch (msg.type) {
        case 'vote_cast':
        case 'vote_removed':
        case 'nomination_created':
        case 'nomination_updated':
        case 'nomination_deleted':
        case 'voting_opened':
        case 'sudden_death_started':
        case 'nominations_reopened':
        case 'presence_changed':
          this.silentRefresh();
          break;
        case 'win_story_ready':
          this.silentRefresh();
          break;
        case 'voting_closed': {
          const wk = this.currentWeek();
          const snap = this.suddenDeathSnapshot;
          this.suddenDeathSnapshot = null;
          const source = wk?.status === 'SuddenDeath' ? wk : snap ? { nominations: snap.nominations, tiedNominationIds: snap.tiedNominationIds } : null;
          const tiedNoms = source ? source.nominations.filter(n => source.tiedNominationIds.includes(n.id)) : [];
          if (tiedNoms.length > 0) {
            const winnerId = msg.data['winnerId'] as string;
            const winner = tiedNoms.find(n => n.id === winnerId);
            this.runTieBreakSpin(tiedNoms.map(n => n.nomineeName), winner?.nomineeName ?? tiedNoms[0].nomineeName);
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
      next: (week) => {
        this.currentWeek.set(week);
        if (week) this.currentUserId = week.currentMemberId;
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load Win of the Week', 'Close', { duration: 3000 });
      }
    });
  }

  private silentRefresh() {
    const sid = this.currentSeriesId();
    if (!sid) return;
    this.winSvc.getCurrentWeek(sid).subscribe({
      next: (week) => {
        this.currentWeek.set(week);
        if (week) this.currentUserId = week.currentMemberId;
      }
    });
  }

  selectSeries(id: string) {
    if (id === '__new__') {
      this.newSeriesName = '';
      this.showNewSeriesDialog.set(true);
      return;
    }
    this.currentSeriesId.set(id);
    this.currentWeek.set(null);
    this.guestUrl.set(null);
    this.qrDataUrl.set(null);
    this.refresh();
  }

  showNewSeriesPrompt() {
    this.newSeriesName = '';
    this.showNewSeriesDialog.set(true);
  }

  closeNewSeriesDialog() {
    this.showNewSeriesDialog.set(false);
  }

  submitNewSeries() {
    const name = this.newSeriesName.trim();
    if (!name || this.submitting()) return;
    this.submitting.set(true);
    this.seriesSvc.create(name).subscribe({
      next: (s) => {
        this.series.update(list => [...list, s]);
        this.currentSeriesId.set(s.id);
        this.currentWeek.set(null);
        this.guestUrl.set(null);
        this.showNewSeriesDialog.set(false);
        this.submitting.set(false);
        this.refresh();
      },
      error: () => {
        this.submitting.set(false);
        this.snackBar.open('Failed to create series', 'Close', { duration: 3000 });
      }
    });
  }

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
      isOwned: nom.teamMemberId === this.currentUserId
    };
  }

  showNominateDialog() {
    this.editingNominationId.set(null);
    this.nominateForm = { nomineeMemberId: '', title: '', description: '' };
    this.showDialog.set(true);
  }

  showEditDialog(nom: WowNominationDisplay) {
    this.editingNominationId.set(nom.id);
    this.nominateForm = {
      nomineeMemberId: nom.nomineeMemberId,
      title: nom.title,
      description: nom.description || ''
    };
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
    this.editingNominationId.set(null);
  }

  submitNomination() {
    if (!this.nominateForm.nomineeMemberId || !this.nominateForm.title.trim()) return;
    this.submitting.set(true);

    const editId = this.editingNominationId();
    if (editId) {
      this.winSvc.updateNomination(editId, {
        nomineeMemberId: this.nominateForm.nomineeMemberId,
        title: this.nominateForm.title.trim(),
        description: this.nominateForm.description?.trim() || undefined
      }).subscribe({
        next: () => {
          this.submitting.set(false);
          this.showDialog.set(false);
          this.editingNominationId.set(null);
          this.snackBar.open('Nomination updated!', 'Close', { duration: 3000 });
          this.refresh();
        },
        error: (err) => {
          this.submitting.set(false);
          const msg = err.error?.error || 'Failed to update nomination';
          this.snackBar.open(msg, 'Close', { duration: 3000 });
        }
      });
    } else {
      this.winSvc.createNomination({
        nomineeMemberId: this.nominateForm.nomineeMemberId,
        title: this.nominateForm.title.trim(),
        description: this.nominateForm.description?.trim() || undefined
      }, this.currentSeriesId() ?? undefined).subscribe({
        next: () => {
          this.submitting.set(false);
          this.showDialog.set(false);
          this.snackBar.open('Nomination submitted! Voting opens Friday.', 'Close', { duration: 3000 });
          this.refresh();
        },
        error: (err) => {
          this.submitting.set(false);
          const msg = err.error?.error || 'Failed to submit nomination';
          this.snackBar.open(msg, 'Close', { duration: 3000 });
        }
      });
    }
  }

  deleteNomination(nominationId: string) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        title: 'Delete nomination?',
        message: 'This cannot be undone.',
        confirmLabel: 'Delete',
        danger: true
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.winSvc.deleteNomination(nominationId).subscribe({
        next: () => {
          this.snackBar.open('Nomination deleted', 'Close', { duration: 3000 });
          this.refresh();
        },
        error: (err) => {
          const msg = err.error?.error || 'Failed to delete nomination';
          this.snackBar.open(msg, 'Close', { duration: 3000 });
        }
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
      error: (err) => {
        const msg = err.error?.error || 'Failed to vote';
        this.snackBar.open(msg, 'Close', { duration: 3000 });
      }
    });
  }

  removeVote(nominationId: string) {
    this.winSvc.removeVote(nominationId).subscribe({
      next: () => {
        this.snackBar.open('Vote removed', 'Close', { duration: 2000 });
        this.refresh();
      },
      error: () => {
        this.snackBar.open('Failed to remove vote', 'Close', { duration: 3000 });
      }
    });
  }

  closeWeek() {
    const week = this.currentWeek();
    if (!week || week.nominations.length === 0) return;
    const topNom = [...week.nominations].sort((a, b) => b.voteCount - a.voteCount)[0];
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        title: 'Close week?',
        message: `The winner will be "${topNom.nomineeName} — ${topNom.title}" with ${topNom.voteCount} vote(s).`,
        confirmLabel: 'Close',
        danger: false
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.winSvc.closeWeek({ winnerNominationId: topNom.id }, this.currentSeriesId() ?? undefined).subscribe({
        next: () => {
          this.snackBar.open('Week closed! Winner announced.', 'Close', { duration: 3000 });
          this.refresh();
        },
        error: (err) => {
          const msg = err.error?.error || 'Failed to close week';
          this.snackBar.open(msg, 'Close', { duration: 3000 });
        }
      });
    });
  }

  openNextWeek() {
    this.winSvc.openNextWeek(this.currentSeriesId() ?? undefined).subscribe({
      next: () => {
        this.snackBar.open('New week opened! Nominations are now open.', 'Close', { duration: 3000 });
        this.refresh();
      },
      error: (err) => {
        const msg = err.error?.error || 'Failed to open next week';
        this.snackBar.open(msg, 'Close', { duration: 3000 });
      }
    });
  }

  openVoting() {
    this.winSvc.openVoting(this.currentSeriesId() ?? undefined).subscribe({
      next: () => {
        this.snackBar.open('Voting is now open!', 'Close', { duration: 3000 });
        this.refresh();
      },
      error: (err) => {
        const msg = err.error?.error || 'Failed to open voting';
        this.snackBar.open(msg, 'Close', { duration: 3000 });
      }
    });
  }

  reopenNominations() {
    this.winSvc.reopenNominations(this.currentSeriesId() ?? undefined).subscribe({
      next: () => {
        this.snackBar.open('Nominations reopened!', 'Close', { duration: 3000 });
        this.silentRefresh();
      },
      error: (err) => {
        const msg = err.error?.error || 'Failed to reopen nominations';
        this.snackBar.open(msg, 'Close', { duration: 3000 });
      }
    });
  }

  startTieBreaker() {
    const week = this.currentWeek();
    if (!week) return;
    const sorted = [...week.nominations].sort((a, b) => b.voteCount - a.voteCount);
    const topVotes = sorted[0].voteCount;
    const tied = sorted.filter(n => n.voteCount === topVotes);
    const names = tied.map(n => n.nomineeName).join(' vs ');
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        title: '⚡ Sudden Death',
        message: `${names} are tied with ${topVotes} vote(s). Start a 90-second sudden death round? Highest vote when time expires wins.`,
        confirmLabel: '⚡ Start Sudden Death',
        danger: true
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.winSvc.startSuddenDeath({ tiedNominationIds: tied.map(n => n.id) }, this.currentSeriesId() ?? undefined).subscribe({
        next: () => {
          this.snackBar.open('⚡ Sudden Death started! 90 seconds on the clock.', 'Close', { duration: 4000 });
          this.refresh();
        },
        error: (err) => {
          const msg = err.error?.error ?? err.error?.title ?? err.error?.detail ?? `Failed to start sudden death (${err.status})`;
          this.snackBar.open(msg, 'Close', { duration: 5000 });
        }
      });
    });
  }

  private runTieBreakSpin(names: string[], winnerName: string) {
    this.isSpinning.set(true);
    this.spinnerName.set(names[0]);
    let elapsed = 0;
    const totalDuration = 3200;
    let idx = 0;
    const tick = () => {
      const progress = elapsed / totalDuration;
      const interval = 60 + 460 * (progress * progress); // 60ms → 520ms quadratic ease
      if (elapsed + interval >= totalDuration) {
        this.spinnerName.set(winnerName);
        setTimeout(() => { this.isSpinning.set(false); this.silentRefresh(); }, 1800);
        return;
      }
      elapsed += interval;
      idx = (idx + 1) % names.length;
      this.spinnerName.set(names[idx]);
      setTimeout(tick, interval);
    };
    setTimeout(tick, 60);
  }

  copyShareLink() {
    const existingUrl = this.guestUrl();
    if (this.isHost() && existingUrl) {
      navigator.clipboard.writeText(existingUrl).then(() => {
        this.snackBar.open('Guest link copied! Anyone with this link can nominate', 'Close', { duration: 3000 });
      }).catch(() => {
        this.snackBar.open('Failed to copy link', 'Close', { duration: 3000 });
      });
    } else if (this.isHost()) {
      const week = this.currentWeek();
      if (!week) return;
      this.winSvc.generateGuestToken(week.id).subscribe({
        next: (result) => {
          const url = `${window.location.origin}/guest/wow/${result.token}`;
          this.guestUrl.set(url);
          navigator.clipboard.writeText(url).then(() => {
            this.snackBar.open('Guest link copied! Anyone with this link can nominate', 'Close', { duration: 3000 });
          }).catch(() => {
            this.snackBar.open('Failed to copy link', 'Close', { duration: 3000 });
          });
        },
        error: () => {
          this.snackBar.open('Failed to generate guest link', 'Close', { duration: 3000 });
        }
      });
    } else {
      const url = `${window.location.origin}/fun/win-of-the-week`;
      navigator.clipboard.writeText(url).then(() => {
        this.snackBar.open('Link copied! Share on WhatsApp 📱', 'Close', { duration: 3000 });
      }).catch(() => {
        this.snackBar.open('Failed to copy link', 'Close', { duration: 3000 });
      });
    }
  }

  copyStory(story: string) {
    navigator.clipboard.writeText(story).then(() => {
      this.snackBar.open('Hero story copied! 🦸', 'Close', { duration: 2000 });
    }).catch(() => {
      this.snackBar.open('Failed to copy story', 'Close', { duration: 3000 });
    });
  }
}
