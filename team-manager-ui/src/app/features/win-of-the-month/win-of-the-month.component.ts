import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { WinOfTheMonthService } from '../../core/services/win-of-the-month.service';
import { WinMonth, WinMonthNomination } from '../../core/models/win-week.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-win-of-the-month',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, MatSnackBarModule, MatDialogModule],
  template: `
    <div style="max-width:800px;margin:0 auto;padding:0 8px">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
        <div style="display:flex;align-items:center;gap:10px">
          <mat-icon style="font-size:1.6rem;width:1.6rem;height:1.6rem;color:#FFD700">workspace_premium</mat-icon>
          <h2 style="margin:0;font-size:1.3rem;font-weight:700">
            @if (month()) {
              Win of the Month — {{month()!.monthName}}
            } @else {
              Win of the Month
            }
          </h2>
        </div>

        @if (month()) {
          <span [style.background]="statusBg()" [style.color]="statusText()"
                style="font-size:0.75rem;font-weight:700;padding:4px 12px;border-radius:20px;text-transform:uppercase;letter-spacing:0.3px">
            @if (month()!.status === 'Voting') {
              Voting Open
            } @else if (month()!.status === 'Pending') {
              Pending
            } @else {
              Closed
            }
          </span>
        }

        <div style="flex:1"></div>

        @if (month() && month()!.status === 'Pending') {
          <button mat-flat-button color="primary" (click)="openVoting()"
                  style="font-size:0.8rem;height:34px">
            <mat-icon style="font-size:1rem;width:1rem;height:1rem">play_arrow</mat-icon>
            Open Voting Now
          </button>
        }
        @if (month() && month()!.status === 'Voting') {
          <button mat-stroked-button color="primary" (click)="closeMonth()"
                  style="font-size:0.8rem;height:34px">
            <mat-icon style="font-size:1rem;width:1rem;height:1rem">lock</mat-icon>
            Close Month & Declare Winner
          </button>
        }
        @if (!month()) {
          <button mat-stroked-button color="primary" (click)="generateMonth()"
                  style="font-size:0.8rem;height:34px">
            <mat-icon style="font-size:1rem;width:1rem;height:1rem">add_circle</mat-icon>
            Generate Month Contest
          </button>
        }
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div style="text-align:center;padding:64px;opacity:0.35">Loading...</div>
      }

      <!-- No active month -->
      @if (!loading() && !month()) {
        <div style="text-align:center;padding:48px 24px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px">
          <mat-icon style="font-size:3rem;width:3rem;height:3rem;opacity:0.3;color:#FFD700">workspace_premium</mat-icon>
          <div style="margin-top:12px;font-weight:700;font-size:1.1rem">Next month's contest is on its way!</div>
          <div style="margin-top:8px;font-size:0.85rem;opacity:0.5">
            We need 4 weekly winners to start the monthly vote.
          </div>
          @if (weeklyWinsCount() > 0) {
            <div style="margin-top:16px;max-width:300px;margin-left:auto;margin-right:auto">
              <div style="height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden">
                <div [style.width]="(weeklyWinsCount() / 4 * 100) + '%'"
                     style="height:100%;background:#64b5f6;border-radius:4px;transition:width 0.5s"></div>
              </div>
              <div style="font-size:0.75rem;opacity:0.4;margin-top:6px">
                {{weeklyWinsCount()}} of 4 weekly wins collected
              </div>
            </div>
          }
          <a routerLink="../win-of-the-week" style="display:inline-block;margin-top:16px;color:#64b5f6;font-size:0.85rem;text-decoration:none;font-weight:600">
            Go to Win of the Week →
          </a>
        </div>

        <!-- Past monthly winners -->
        @if (monthHistory().length > 0) {
          <div style="margin-top:24px">
            <div style="font-weight:600;font-size:0.9rem;margin-bottom:12px;opacity:0.7">Past Monthly Winners</div>
            @for (m of monthHistory(); track m.id) {
              <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;background:rgba(255,255,255,0.03);margin-bottom:6px">
                <mat-icon style="font-size:1.2rem;width:1.2rem;height:1.2rem;color:#FFD700">emoji_events</mat-icon>
                <span style="font-weight:600;font-size:0.85rem">{{m.monthName}}</span>
                <span style="opacity:0.5;font-size:0.85rem">— {{m.winnerNomineeName}}</span>
                <span style="opacity:0.35;font-size:0.75rem;margin-left:auto">"{{m.winnerTitle}}"</span>
              </div>
            }
          </div>
        }
      }

      <!-- Active month: Countdown -->
      @if (!loading() && month() && month()!.status === 'Voting') {
        <div style="background:linear-gradient(135deg,rgba(37,99,235,0.2),rgba(29,78,216,0.15));border-radius:12px;padding:12px 16px;margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:8px;color:#fff;font-size:0.9rem;font-weight:500">
            <mat-icon style="font-size:1.1rem;width:1.1rem;height:1.1rem">timer</mat-icon>
            Voting closes in {{countdown()}}
          </div>
          <div style="height:4px;background:rgba(255,255,255,0.3);border-radius:2px;margin-top:8px;overflow:hidden">
            <div [style.width]="progressPercent() + '%'"
                 style="height:100%;background:rgba(255,255,255,0.9);border-radius:2px;transition:width 1s"></div>
          </div>
        </div>

        <!-- Vote counter -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;font-size:0.85rem">
          <span [style.background]="votesBadgeBg()" [style.color]="votesBadgeText()"
                style="padding:4px 12px;border-radius:20px;font-weight:700;font-size:0.8rem">
            {{month()!.userVotesRemaining}} votes left
          </span>
        </div>

        <div style="font-size:0.85rem;opacity:0.6;margin-bottom:16px">
          Vote for your favorite weekly winner to become the {{month()!.monthName}} Champion!
        </div>
      }

      <!-- Winner announcement (closed) -->
      @if (!loading() && month() && month()!.status === 'Closed' && month()!.winnerNomineeName) {
        <div style="background:linear-gradient(135deg,rgba(255,215,0,0.12),rgba(255,165,0,0.08));border:1px solid rgba(255,215,0,0.35);border-radius:14px;padding:24px;text-align:center;margin-bottom:20px">
          <div style="font-size:1.2rem;font-weight:800;color:#FFD700">🎉 {{month()!.monthName.toUpperCase()}} CHAMPION 🎉</div>
          <div style="font-size:1.5rem;font-weight:900;margin-top:8px;color:#FFD700">{{month()!.winnerNomineeName}}</div>
          <div style="font-size:0.95rem;opacity:0.8;margin-top:4px">{{month()!.winnerTitle}}</div>
          <div style="margin-top:12px;display:inline-block;background:rgba(255,215,0,0.15);border:1px solid rgba(255,215,0,0.4);border-radius:8px;padding:8px 14px">
            <span style="font-size:0.85rem;font-weight:700;color:#B8860B">🏅 Monthly Champion +50 points</span>
          </div>
        </div>

        <!-- Final standings -->
        <div style="font-weight:600;font-size:0.9rem;margin-bottom:10px;opacity:0.7">Final Standings</div>
        @for (nom of month()!.nominations; track nom.id; let i = $index) {
          <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:8px;margin-bottom:4px"
               [style.background]="i < 3 ? 'rgba(255,215,0,0.06)' : 'rgba(255,255,255,0.03)'">
            <span style="font-size:1rem;width:24px;text-align:center;font-weight:700"
                  [style.color]="i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'rgba(255,255,255,0.3)'">
              {{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.'}}
            </span>
            <span style="font-weight:600;font-size:0.9rem;flex:1">{{nom.nomineeName}}</span>
            <span style="font-size:0.8rem;opacity:0.5">{{nom.voteCount}} votes</span>
          </div>
        }

        <div style="margin-top:16px;font-size:0.8rem;opacity:0.4">
          Next month's contest will begin when enough weekly winners are available.
        </div>
      }

      <!-- Nomination cards (voting) -->
      @if (!loading() && month() && month()!.status === 'Voting' && month()!.nominations.length > 0) {
        <div style="display:flex;flex-direction:column;gap:10px">
          @for (nom of month()!.nominations; track nom.id) {
            <div style="display:flex;align-items:flex-start;gap:14px;padding:16px;border-radius:12px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03)">
              <!-- Avatar -->
              <div style="width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:0.85rem;font-weight:700;background:rgba(255,215,0,0.12);color:#FFD700;border:1px solid rgba(255,215,0,0.3)">
                {{getInitials(nom.nomineeName)}}
              </div>

              <!-- Content -->
              <div style="flex:1;min-width:0">
                <div style="font-weight:700;font-size:0.95rem">{{nom.nomineeName}}</div>
                <div style="display:inline-flex;align-items:center;gap:4px;font-size:0.7rem;opacity:0.4;margin-top:2px;background:rgba(255,255,255,0.05);padding:2px 8px;border-radius:10px">
                  <mat-icon style="font-size:0.8rem;width:0.8rem;height:0.8rem">calendar_today</mat-icon>
                  Week of {{formatDate(nom.sourceWeekStart)}}
                </div>
                <div style="font-weight:600;font-size:0.85rem;margin-top:4px;font-style:italic">"{{nom.title}}"</div>
                @if (nom.description) {
                  <div style="font-size:0.8rem;opacity:0.55;margin-top:4px;line-height:1.4">{{nom.description}}</div>
                }
              </div>

              <!-- Vote section -->
              <div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;min-width:60px">
                <div style="font-size:1.1rem;font-weight:800;opacity:0.8">{{nom.voteCount}}</div>
                <div style="font-size:0.6rem;opacity:0.4;text-transform:uppercase">votes</div>

                @if (nom.hasVoted) {
                  <button mat-stroked-button color="warn" (click)="removeVote(nom.id)"
                          style="font-size:0.7rem;height:28px;line-height:28px;min-width:0;padding:0 10px">
                    Voted ✓
                  </button>
                } @else {
                  @if ((month()!.userVotesRemaining) > 0) {
                    <button mat-stroked-button color="primary" (click)="vote(nom.id)"
                            style="font-size:0.7rem;height:28px;line-height:28px;min-width:0;padding:0 10px">
                      Vote
                    </button>
                  } @else {
                    <button mat-stroked-button disabled
                            style="font-size:0.7rem;height:28px;line-height:28px;min-width:0;padding:0 10px">
                      No votes left
                    </button>
                  }
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Link to history -->
      @if (!loading() && month()) {
        <a routerLink="../win-of-the-week/history" style="display:inline-block;margin-top:16px;color:#64b5f6;font-size:0.85rem;text-decoration:none;font-weight:600">
          View past weekly winners →
        </a>
      }
    </div>
  `
})
export class WinOfTheMonthComponent implements OnInit, OnDestroy {
  private svc = inject(WinOfTheMonthService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  month = signal<WinMonth | null>(null);
  monthHistory = signal<any[]>([]);
  loading = signal(true);
  weeklyWinsCount = signal(0);
  countdown = signal('--');
  progressPercent = signal(0);
  private timer: any;

  readonly statusBg = computed(() => {
    const m = this.month();
    if (!m) return 'rgba(255,255,255,0.1)';
    if (m.status === 'Voting') return 'rgba(76,175,80,0.15)';
    if (m.status === 'Pending') return 'rgba(255,193,7,0.15)';
    return 'rgba(255,255,255,0.06)';
  });

  readonly statusText = computed(() => {
    const m = this.month();
    if (!m) return '#fff';
    if (m.status === 'Voting') return '#4caf50';
    if (m.status === 'Pending') return '#ffc107';
    return 'rgba(255,255,255,0.5)';
  });

  readonly votesBadgeBg = computed(() => {
    const remaining = this.month()?.userVotesRemaining ?? 0;
    if (remaining === 0) return 'rgba(76,175,80,0.15)';
    if (remaining === 1) return 'rgba(217,119,6,0.15)';
    return 'rgba(37,99,235,0.15)';
  });

  readonly votesBadgeText = computed(() => {
    const remaining = this.month()?.userVotesRemaining ?? 0;
    if (remaining === 0) return '#4caf50';
    if (remaining === 1) return '#D97706';
    return '#2563EB';
  });

  ngOnInit() {
    this.refresh();
    this.timer = setInterval(() => this.updateCountdown(), 60000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private refresh() {
    this.loading.set(true);
    this.svc.getCurrentMonth().subscribe({
      next: (data) => {
        this.month.set(data);
        this.loading.set(false);
        this.updateCountdown();
        if (data) {
          this.svc.getMonthHistory().subscribe(h => this.monthHistory.set(h.slice(0, 3)));
        }
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load Win of the Month', 'Close', { duration: 3000 });
      }
    });
  }

  private updateCountdown() {
    const m = this.month();
    if (!m || m.status !== 'Voting' || !m.votingEndsAt) {
      this.countdown.set('--');
      this.progressPercent.set(0);
      return;
    }
    const end = new Date(m.votingEndsAt).getTime();
    const now = Date.now();
    const diff = end - now;
    if (diff <= 0) {
      this.countdown.set('0m');
      this.progressPercent.set(100);
      return;
    }
    const start = new Date(m.votingEndsAt).getTime() - (5 * 24 * 60 * 60 * 1000);
    const total = end - start;
    const elapsed = now - start;
    this.progressPercent.set(Math.min(100, Math.max(0, (elapsed / total) * 100)));

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) {
      this.countdown.set(`${days}d ${hours}h ${mins}m`);
    } else if (hours > 0) {
      this.countdown.set(`${hours}h ${mins}m`);
    } else {
      this.countdown.set(`${mins}m`);
    }
  }

  vote(nominationId: string) {
    this.svc.vote(nominationId).subscribe({
      next: () => {
        const remaining = (this.month()?.userVotesRemaining ?? 1) - 1;
        this.snackBar.open(`Vote cast! ${remaining} votes remaining.`, 'Close', { duration: 2000 });
        this.refresh();
      },
      error: (err) => {
        const msg = err.error?.error || 'Failed to cast vote';
        this.snackBar.open(msg, 'Close', { duration: 3000 });
      }
    });
  }

  removeVote(nominationId: string) {
    this.svc.removeVote(nominationId).subscribe({
      next: () => {
        this.snackBar.open('Vote removed', 'Close', { duration: 2000 });
        this.refresh();
      },
      error: () => {
        this.snackBar.open('Failed to remove vote', 'Close', { duration: 3000 });
      }
    });
  }

  closeMonth() {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        title: 'Close month?',
        message: 'End voting and announce the winner. This cannot be undone.',
        confirmLabel: 'Close',
        danger: false
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.svc.closeMonth().subscribe({
        next: () => {
          this.snackBar.open('Month closed! Winner announced.', 'Close', { duration: 3000 });
          this.refresh();
        },
        error: (err) => {
          const msg = err.error?.error || 'Failed to close month';
          this.snackBar.open(msg, 'Close', { duration: 3000 });
        }
      });
    });
  }

  generateMonth() {
    this.svc.generateFromWeeks().subscribe({
      next: () => {
        this.snackBar.open('Month contest generated!', 'Close', { duration: 3000 });
        this.refresh();
      },
      error: (err) => {
        const msg = err.error?.error || 'Failed to generate month contest';
        this.snackBar.open(msg, 'Close', { duration: 3000 });
      }
    });
  }

  openVoting() {
    this.svc.openVoting().subscribe({
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

  getInitials(name: string): string {
    return name.split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2);
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  }
}
