import { Component, OnInit, inject, signal, computed, OnDestroy } from '@angular/core';
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
import { Subscription } from 'rxjs';
import { WinOfTheWeekService } from '../../core/services/win-of-the-week.service';
import { WinOfTheMonthService } from '../../core/services/win-of-the-month.service';
import { TeamMemberService } from '../../core/services/team-member.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { WinWeek, WinNomination, CreateNominationRequest } from '../../core/models/win-week.model';
import { TeamMember } from '../../core/models/team-member.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { WinOfTheWeekHistoryComponent } from '../win-of-the-week-history/win-of-the-week-history.component';
import { WinOfTheMonthComponent } from '../win-of-the-month/win-of-the-month.component';

@Component({
  selector: 'app-win-of-the-week',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatTooltipModule, MatDialogModule, MatSnackBarModule,
    MatFormFieldModule, MatSelectModule, MatInputModule,
    WinOfTheWeekHistoryComponent, WinOfTheMonthComponent
  ],
  template: `
    <div style="max-width:800px;margin:0 auto;padding:0 8px">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:10px">
          <mat-icon style="font-size:1.6rem;width:1.6rem;height:1.6rem;color:#FFD700">emoji_events</mat-icon>
          <h2 style="margin:0;font-size:1.3rem;font-weight:700">Win of the Week</h2>
        </div>
        <div style="flex:1"></div>
      </div>

      <!-- Internal tabs -->
      <nav style="display:flex;gap:0;margin-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.08)">
        @for (tab of tabs; track tab.id) {
          <button style="padding:12px 16px;font-size:0.85rem;font-weight:500;border-bottom:2px solid;background:none;border-top:none;border-left:none;border-right:none;cursor:pointer;transition:all 0.15s;font-family:inherit"
              [style.color]="activeTab() === tab.id ? '#64b5f6' : 'rgba(255,255,255,0.45)'"
              [style.borderBottomColor]="activeTab() === tab.id ? '#64b5f6' : 'transparent'"
                  (click)="activeTab.set(tab.id)"
                  (mouseenter)="tabHover.set(tab.id)"
                  (mouseleave)="tabHover.set(null)"
                  [style.background]="tabHover() === tab.id ? 'rgba(255,255,255,0.04)' : 'none'">
            {{tab.label}}
          </button>
        }
      </nav>

      <!-- Tab content -->
      @switch (activeTab()) {
        @case ('current') {
          <ng-container *ngTemplateOutlet="currentTab"></ng-container>
        }
        @case ('history') {
          <app-win-of-the-week-history />
        }
        @case ('month') {
          <app-win-of-the-month />
        }
      }
    </div>

    <!-- Nominate Dialog -->
    @if (showDialog()) {
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000"
           (click)="closeDialog()">
        <div style="background:#1e1e2e;border-radius:16px;padding:24px;width:90%;max-width:440px;max-height:85dvh;overflow-y:auto;overscroll-behavior:contain;border:1px solid rgba(255,255,255,0.1);-webkit-overflow-scrolling:touch"
             (click)="$event.stopPropagation()">
          <h3 style="margin:0 0 16px;font-size:1.1rem;font-weight:700">Nominate a Win</h3>

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
              {{ submitting() ? 'Submitting...' : 'Submit' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Current tab template -->
    <ng-template #currentTab>
      <!-- Phase badge -->
      @let phase = phaseInfo();
      <span [style.background]="phase.bg" [style.color]="phase.text"
            style="font-size:0.75rem;font-weight:700;padding:4px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.3px;margin-bottom:16px;display:inline-block">
        {{phase.label}}
      </span>

      <!-- Admin actions -->
      <div style="display:flex;gap:8px;margin-bottom:16px">
        @if (currentWeek()?.status === 'Nominating' && (currentWeek()?.nominations?.length ?? 0) > 0) {
          <button mat-stroked-button color="accent" (click)="openVoting()"
                  style="font-size:0.8rem;height:34px">
            <mat-icon style="font-size:1rem;width:1rem;height:1rem">how_to_vote</mat-icon>
            Open Voting
          </button>
        }
        @if (currentWeek()?.status === 'Voting') {
          <button mat-stroked-button color="primary" (click)="closeWeek()"
                  style="font-size:0.8rem;height:34px">
            <mat-icon style="font-size:1rem;width:1rem;height:1rem">lock</mat-icon>
            Close & Pick Winner
          </button>
        }
        @if (currentWeek()?.status === 'Closed') {
          <button mat-stroked-button color="primary" (click)="openNextWeek()"
                  style="font-size:0.8rem;height:34px">
            <mat-icon style="font-size:1rem;width:1rem;height:1rem">add_circle</mat-icon>
            Open Next Week
          </button>
        }
      </div>

      <!-- Schedule Bar -->
      <div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:8px 16px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;font-size:0.7rem;font-weight:500;color:rgba(255,255,255,0.4);margin-bottom:4px">
          @for (d of DAYS; track d) {
            <span [style.color]="isCurrentDay(d) ? '#64b5f6' : 'inherit'">{{d}}</span>
          }
        </div>
        <div style="display:flex;height:20px;border-radius:4px;overflow:hidden;background:rgba(255,255,255,0.06)">
          @for (d of DAYS; track d; let i = $index) {
            <div [style.flex]="1" [style.background]="daySegmentBg(i)" style="transition:background 0.3s"></div>
          }
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.65rem;margin-top:4px">
          <span [style.color]="currentWeek()?.status === 'Nominating' ? '#64b5f6' : 'rgba(255,255,255,0.35)'">
            {{currentWeek()?.status === 'Nominating' ? 'NOMINATIONS OPEN' : 'Nominations Closed'}}
          </span>
          <span [style.color]="currentWeek()?.status === 'Voting' ? '#64b5f6' : 'rgba(255,255,255,0.35)'">
            {{currentWeek()?.status === 'Voting' ? 'VOTING OPEN' : (currentWeek()?.status === 'Nominating' ? 'Voting Opens Friday' : 'Voting Closed')}}
          </span>
        </div>
        @if (isCurrentDayVisible()) {
          <div style="font-size:0.65rem;color:#64b5f6;margin-top:2px">▲ Current day</div>
        }
      </div>

      <!-- Winner banner -->
      @let winner = currentWeek();
      @if (winner && winner.status === 'Closed' && winner.winnerNomineeName) {
        <div style="background:linear-gradient(135deg,rgba(255,215,0,0.12),rgba(255,165,0,0.08));border:1px solid rgba(255,215,0,0.35);border-radius:14px;padding:20px 24px;margin-bottom:20px;text-align:center">
          <div style="font-size:2.4rem;margin-bottom:4px">🏆</div>
          <div style="font-size:1.2rem;font-weight:800;color:#FFD700">{{winner.winnerNomineeName}}</div>
          <div style="font-size:0.95rem;opacity:0.8;margin-top:4px">{{winner.winnerTitle}}</div>
          <div style="margin-top:12px;display:inline-block;background:rgba(255,215,0,0.15);border:1px solid rgba(255,215,0,0.4);border-radius:8px;padding:8px 14px">
            <span style="font-size:0.85rem;font-weight:700;color:#B8860B">🏅 Weekly Champion +10 points</span>
          </div>
          <div style="font-size:0.75rem;opacity:0.45;margin-top:12px">Winner of the Week</div>
        </div>
      }

      <!-- User quota chips -->
      <div style="display:flex;gap:12px;margin-bottom:16px;font-size:0.8rem;flex-wrap:wrap">
        @if (currentWeek()?.status === 'Nominating') {
          <span style="opacity:0.6">
            Nominations remaining: <strong>{{currentWeek()?.userNominationsRemaining ?? 0}}</strong>/3
          </span>
        }
        @if (currentWeek()?.status === 'Voting') {
          <span style="opacity:0.6">
            Votes remaining: <strong>{{currentWeek()?.userVotesRemaining ?? 0}}</strong>/3
          </span>
        }
        @if (currentWeek()?.status === 'Nominating' && (currentWeek()?.userNominationsRemaining ?? 0) > 0) {
          <button mat-stroked-button color="accent" (click)="showNominateDialog()"
                  style="font-size:0.8rem;height:30px;margin-left:auto">
            <mat-icon style="font-size:1rem;width:1rem;height:1rem">add</mat-icon>
            Nominate a Win
          </button>
        }
      </div>

      <!-- Info banner during nominating phase -->
      @if (currentWeek()?.status === 'Nominating') {
        <div style="background:rgba(100,181,246,0.08);border:1px solid rgba(100,181,246,0.15);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:0.8rem;color:#64b5f6">
          💡 Voting opens Friday. You'll have 3 votes to use.
        </div>
      }

      <!-- All votes used banner -->
      @if (currentWeek()?.status === 'Voting' && (currentWeek()?.userVotesRemaining ?? 0) === 0) {
        <div style="background:rgba(76,175,80,0.08);border:1px solid rgba(76,175,80,0.2);border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:0.8rem;color:#4caf50">
          ✓ All votes cast! Results will be announced Sunday night.
        </div>
      }

      <!-- Loading -->
      @if (loading()) {
        <div style="text-align:center;padding:64px;opacity:0.35">Loading...</div>
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
            <div style="display:flex;align-items:flex-start;gap:14px;padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03)">
              <!-- Avatar -->
              <div style="width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:0.85rem;font-weight:700;background:rgba(255,215,0,0.12);color:#FFD700;border:1px solid rgba(255,215,0,0.3)">
                {{getInitials(nom.nomineeName)}}
              </div>

              <!-- Content -->
              <div style="flex:1;min-width:0">
                <div style="font-weight:700;font-size:0.95rem">{{nom.nomineeName}}</div>
                <div style="font-weight:600;font-size:0.85rem;margin-top:2px">{{nom.title}}</div>
                @if (nom.description) {
                  <div style="font-size:0.8rem;opacity:0.55;margin-top:4px;line-height:1.4">{{nom.description}}</div>
                }
                <div style="font-size:0.7rem;opacity:0.35;margin-top:8px">
                  Nominated by {{nom.teamMemberName}}
                </div>
              </div>

              <!-- Vote section -->
              <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;min-width:60px">
                <div style="font-size:1.1rem;font-weight:800;opacity:0.8">{{nom.voteCount}}</div>
                <div style="font-size:0.6rem;opacity:0.4;text-transform:uppercase">votes</div>

                @if (currentWeek()?.status === 'Voting') {
                  @if (nom.teamMemberId !== currentUserId) {
                    @if (nom.hasVoted) {
                      <button mat-stroked-button color="warn" (click)="removeVote(nom.id)"
                              style="font-size:0.7rem;height:28px;line-height:28px;min-width:0;padding:0 10px">
                        Voted ✓
                      </button>
                    } @else {
                      @if ((currentWeek()?.userVotesRemaining ?? 0) > 0) {
                        <button mat-stroked-button color="primary" (click)="vote(nom.id)"
                                style="font-size:0.7rem;height:28px;line-height:28px;min-width:0;padding:0 10px">
                          Vote
                        </button>
                      } @else {
                        <button mat-stroked-button disabled
                                style="font-size:0.7rem;height:28px;line-height:28px;min-width:0;padding:0 10px">
                          Max votes
                        </button>
                      }
                    }
                  } @else {
                    <span style="font-size:0.65rem;opacity:0.35;text-align:center">Your<br>nomination</span>
                  }
                }
              </div>
            </div>
          }
        </div>
      }
    </ng-template>
  `
})
export class WinOfTheWeekComponent implements OnInit, OnDestroy {
  private winSvc = inject(WinOfTheWeekService);
  private womSvc = inject(WinOfTheMonthService);
  private memberSvc = inject(TeamMemberService);
  private wsSvc = inject(WebSocketService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private wsSub: Subscription | null = null;

  readonly DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  readonly tabs = [
    { id: 'current', label: 'Current' },
    { id: 'history', label: 'History' },
    { id: 'month', label: 'Win of the Month' }
  ];
  activeTab = signal('current');
  tabHover = signal<string | null>(null);
  currentWeek = signal<WinWeek | null>(null);
  allMembers = signal<TeamMember[]>([]);
  loading = signal(true);
  submitting = signal(false);
  showDialog = signal(false);
  currentUserId = '';

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
      case 'Closed':
        return { label: 'Closed', text: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.06)' };
      default:
        return { label: week.status, text: '#fff', bg: 'rgba(255,255,255,0.1)' };
    }
  });

  readonly sortedNominations = computed(() => {
    const week = this.currentWeek();
    if (!week) return [];
    return [...week.nominations].sort((a, b) => b.voteCount - a.voteCount || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  ngOnInit() {
    this.memberSvc.getAll({ isActive: true }).subscribe(members => {
      this.allMembers.set(members.sort((a, b) => a.firstName.localeCompare(b.firstName)));
    });
    this.refresh();

    // Connect to WebSocket for real-time updates
    this.wsSvc.connect();
    this.wsSub = this.wsSvc.messages$.subscribe(msg => {
      if (!msg || this.activeTab() !== 'current') return;
      switch (msg.type) {
        case 'vote_cast':
        case 'vote_removed':
          // Refresh nominations to get updated vote counts
          this.refresh();
          break;
        case 'voting_opened':
        case 'voting_closed':
          this.refresh();
          break;
      }
    });
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
  }

  private refresh() {
    this.loading.set(true);
    this.winSvc.getCurrentWeek().subscribe({
      next: (week) => {
        this.currentWeek.set(week);
        this.currentUserId = week.currentMemberId;
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load Win of the Week', 'Close', { duration: 3000 });
      }
    });
  }

  getInitials(name: string): string {
    return name.split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2);
  }

  isCurrentDay(dayLabel: string): boolean {
    const jsDay = new Date().getDay();
    const idx = this.DAYS.indexOf(dayLabel);
    return idx === (jsDay === 0 ? 6 : jsDay - 1);
  }

  isCurrentDayVisible(): boolean {
    const status = this.currentWeek()?.status;
    return status === 'Nominating' || status === 'Voting';
  }

  daySegmentBg(index: number): string {
    const week = this.currentWeek();
    if (!week) return 'rgba(255,255,255,0.06)';
    const jsDay = new Date().getDay();
    const currentDayIndex = jsDay === 0 ? 6 : jsDay - 1;

    if (week.status === 'Nominating') {
      return index <= 3 ? 'rgba(100,181,246,0.25)' : 'rgba(255,255,255,0.06)';
    } else if (week.status === 'Voting') {
      return index >= 4 ? 'rgba(100,181,246,0.25)' : 'rgba(255,255,255,0.06)';
    }
    return 'rgba(255,255,255,0.06)';
  }

  showNominateDialog() {
    this.nominateForm = { nomineeMemberId: '', title: '', description: '' };
    this.showDialog.set(true);
  }

  closeDialog() {
    this.showDialog.set(false);
  }

  submitNomination() {
    if (!this.nominateForm.nomineeMemberId || !this.nominateForm.title.trim()) return;
    this.submitting.set(true);
    this.winSvc.createNomination({
      nomineeMemberId: this.nominateForm.nomineeMemberId,
      title: this.nominateForm.title.trim(),
      description: this.nominateForm.description?.trim() || undefined
    }).subscribe({
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
      this.winSvc.closeWeek({ winnerNominationId: topNom.id }).subscribe({
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
    this.winSvc.openNextWeek().subscribe({
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
    this.winSvc.openVoting().subscribe({
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
}
