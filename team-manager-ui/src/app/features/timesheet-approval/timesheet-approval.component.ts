import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TimesheetApprovalService } from '../../core/services/timesheet-approval.service';
import { CredentialsService } from '../../core/services/credentials.service';
import { TimesheetApprovalMember, WeeklyTimesheetSummary } from '../../core/models/timesheet-approval.model';

// Builds the date string from local Y/M/D parts — toISOString() converts to UTC first, which
// rolls the date back a day for any timezone ahead of UTC (e.g. local midnight on the 1st
// becomes 22:00 the previous day in UTC), making "today"/"start of month" silently wrong.
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

interface PersonSummary {
  memberName: string;
  totalHours: number;
  missingWeeks: number;
  violationCount: number;
  canReview: boolean;
}

@Component({
  selector: 'app-timesheet-approval',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSnackBarModule, MatProgressSpinnerModule, MatCheckboxModule],
  template: `
    <div class="page">
      <div class="page-header">
        <mat-icon class="header-icon">fact_check</mat-icon>
        <div>
          <h1>Timesheet Approval</h1>
          <span class="subtitle">Fetch outstanding timesheets and review them one person at a time</span>
        </div>
      </div>

      @if (reviewing() === null) {
        <div class="filter-bar">
          <mat-form-field appearance="outline" class="date-field">
            <mat-label>Start</mat-label>
            <input matInput type="date" [(ngModel)]="start">
          </mat-form-field>
          <mat-form-field appearance="outline" class="date-field">
            <mat-label>End</mat-label>
            <input matInput type="date" [(ngModel)]="end">
          </mat-form-field>
          <button mat-raised-button color="primary" (click)="fetch()" [disabled]="loading()">
            <mat-icon>{{ loading() ? 'hourglass_empty' : 'cloud_download' }}</mat-icon>
            {{ loading() ? 'Fetching…' : 'Fetch Outstanding' }}
          </button>
        </div>

        @if (teams().length > 1) {
          <div class="team-filter-row">
            <span class="team-filter-label">Teams:</span>
            @for (t of teams(); track t) {
              <mat-checkbox class="team-checkbox" [checked]="!excludedTeams().has(t)" (change)="toggleTeam(t)">
                {{ t }}
              </mat-checkbox>
            }
          </div>
        }

        @if (loading()) {
          <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
        } @else if (error()) {
          <div class="error-banner"><mat-icon>error_outline</mat-icon>{{ error() }}</div>
        } @else if (fetched()) {
          @if (filteredWeeklySummary().length > 0) {
            <div class="missing-section">
              <div class="missing-title-row">
                <div class="missing-title"><mat-icon>calendar_view_week</mat-icon> Weekly summary</div>
                <button class="show-all-toggle" (click)="showLoggedChips.set(!showLoggedChips())">
                  <mat-icon>{{ showLoggedChips() ? 'visibility_off' : 'visibility' }}</mat-icon>
                  {{ showLoggedChips() ? 'Hide logged' : 'Show logged' }}
                </button>
              </div>
              @for (w of filteredWeeklySummary(); track w.weekStart) {
                <div class="week-row" (click)="toggleWeek(w.weekStart)">
                  <mat-icon class="week-status" [class.good]="weekIsGood(w)">
                    {{ weekIsGood(w) ? 'check_circle' : 'error' }}
                  </mat-icon>
                  <span class="missing-week-range">{{ w.weekStart | date:'d MMM' }} – {{ w.weekEnd | date:'d MMM' }}</span>
                  <span class="week-status-label">
                    {{ weekIsGood(w) ? 'Everyone logged' : (w.missingMemberNames.length + ' missing') }}
                  </span>
                  <span style="flex:1"></span>
                  <mat-icon class="expand-icon">{{ expandedWeek() === w.weekStart ? 'expand_less' : 'expand_more' }}</mat-icon>
                </div>
                @if (expandedWeek() === w.weekStart) {
                  <div class="missing-names">
                    @for (mh of w.memberHours; track mh.memberName) {
                      @if (showLoggedChips() || w.missingMemberNames.includes(mh.memberName)) {
                        <span class="missing-chip" [class.has-hours]="!w.missingMemberNames.includes(mh.memberName)">
                          {{ mh.memberName }} — {{ mh.hours }}h
                        </span>
                      }
                    }
                  </div>
                }
              }
            </div>
          }

          @if (peopleSummary().length === 0) {
            <div class="empty-state">
              <mat-icon class="empty-icon">task_alt</mat-icon>
              <div class="empty-title">All caught up</div>
              <div class="empty-sub">No outstanding timesheets need attention for this period</div>
            </div>
          } @else {
          <div class="summary-row">
            <div class="summary-card">
              <span class="summary-num">{{ filteredMembers().length }}</span>
              <span class="summary-label">Need review</span>
            </div>
            <div class="summary-card">
              <span class="summary-num">{{ totalViolations() }}</span>
              <span class="summary-label">Flagged issues</span>
            </div>
            <div style="flex:1"></div>
            @if (filteredMembers().length > 0) {
              <button mat-raised-button color="primary" (click)="startReview()">
                <mat-icon>play_arrow</mat-icon> Start Review
              </button>
            }
          </div>

          <div class="member-list">
            @for (p of peopleSummary(); track p.memberName) {
              <div class="member-row" [class.has-issue]="p.violationCount > 0 || p.missingWeeks > 0">
                <div class="member-info">
                  <span class="member-name">{{ p.memberName }}</span>
                  <span class="member-hours">{{ p.totalHours }}h logged</span>
                  @if (p.violationCount > 0) {
                    <span class="violation-badge">{{ p.violationCount }} issue{{ p.violationCount !== 1 ? 's' : '' }}</span>
                  }
                  @if (p.missingWeeks > 0) {
                    <span class="missing-badge">{{ p.missingWeeks }} week{{ p.missingWeeks !== 1 ? 's' : '' }} missing</span>
                  }
                </div>
                @if (p.canReview) {
                  <button mat-button color="primary" (click)="startReviewByName(p.memberName)">Review</button>
                }
              </div>
            }
          </div>
          }
        }
      } @else {
        <!-- Sequential review -->
        @if (currentMember(); as m) {
          <div class="review-progress">Reviewing {{ reviewing()! + 1 }} of {{ filteredMembers().length }}</div>
          <div class="review-card">
            <div class="review-header">
              <span class="review-name">{{ m.memberName }}</span>
              <span class="violation-badge">{{ m.violationCount }} issue{{ m.violationCount !== 1 ? 's' : '' }}</span>
            </div>

            <div class="entry-table">
              @for (e of m.entries; track e.date + e.project + e.category) {
                <div class="entry-row" [class.flagged]="e.violations.length > 0">
                  <div class="entry-main">
                    <span class="entry-date">{{ e.date | date:'EEE d MMM' }}</span>
                    <span class="entry-project">{{ e.project }} — {{ e.category }}</span>
                    <span class="entry-hours">{{ e.hours }}h{{ e.minutes > 0 ? ' ' + e.minutes + 'm' : '' }}</span>
                  </div>
                  @if (e.violations.length > 0) {
                    <div class="entry-violations">
                      @for (v of e.violations; track v) {
                        <span class="violation-chip"><mat-icon>warning</mat-icon>{{ v }}</span>
                      }
                    </div>
                  }
                </div>
              }
            </div>

            <div class="review-actions">
              <button mat-button (click)="skip()">Skip</button>
              <button mat-raised-button color="primary" (click)="approve(m)" [disabled]="approving()">
                <mat-icon>{{ approving() ? 'hourglass_empty' : 'check' }}</mat-icon>
                {{ approving() ? 'Approving…' : 'Approve' }}
              </button>
            </div>
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .page { max-width: 760px; margin: 0 auto; padding: 8px 12px 80px; }
    .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .header-icon { font-size: 24px; width: 24px; height: 24px; color: #64b5f6; }
    h1 { font-size: 1.15rem; font-weight: 700; margin: 0; }
    .subtitle { font-size: 0.8rem; opacity: 0.5; }

    .filter-bar { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .date-field { width: 160px; }

    .team-filter-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; padding: 6px 12px; border-radius: 8px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); }
    .team-filter-label { font-size: 0.75rem; opacity: 0.5; font-weight: 600; }
    .team-checkbox { font-size: 0.82rem; }

    .loading { display: flex; justify-content: center; padding: 48px; }
    .error-banner { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 8px; background: rgba(239,83,80,0.1); border: 1px solid rgba(239,83,80,0.3); color: #ef9a9a; font-size: 0.85rem; }

    .empty-state { text-align: center; padding: 60px 20px; opacity: 0.5; }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: #4caf50; opacity: 0.6; margin-bottom: 10px; }
    .empty-title { font-weight: 600; font-size: 1rem; }
    .empty-sub { font-size: 0.8rem; margin-top: 4px; }

    .missing-section { border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); padding: 8px 14px; margin-bottom: 16px; }
    .missing-title-row { display: flex; align-items: center; justify-content: space-between; margin: 4px 0 4px; }
    .missing-title { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 700; opacity: 0.6; }
    .missing-title mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .show-all-toggle { display: flex; align-items: center; gap: 4px; background: none; border: none; color: rgba(255,255,255,0.4); font-size: 0.72rem; cursor: pointer; font-family: inherit; padding: 2px 4px; }
    .show-all-toggle:hover { color: rgba(255,255,255,0.7); }
    .show-all-toggle mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .week-row { display: flex; align-items: center; gap: 10px; padding: 7px 2px; cursor: pointer; border-top: 1px solid rgba(255,255,255,0.05); }
    .week-row:first-of-type { border-top: none; }
    .week-status { font-size: 17px; width: 17px; height: 17px; color: #ef9a9a; }
    .week-status.good { color: #4caf50; }
    .missing-week-range { font-size: 0.78rem; font-weight: 600; opacity: 0.75; min-width: 110px; }
    .week-status-label { font-size: 0.75rem; opacity: 0.55; }
    .expand-icon { font-size: 18px; width: 18px; height: 18px; opacity: 0.4; }
    .missing-names { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 2px 10px; }
    .missing-chip { font-size: 0.72rem; padding: 2px 9px; border-radius: 10px; background: rgba(239,83,80,0.12); color: #ef9a9a; border: 1px solid rgba(239,83,80,0.25); }
    .missing-chip.has-hours { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); border-color: rgba(255,255,255,0.1); }

    .summary-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .summary-card { padding: 10px 18px; border-radius: 10px; background: rgba(100,181,246,0.08); border: 1px solid rgba(100,181,246,0.2); text-align: center; }
    .summary-num { display: block; font-size: 1.3rem; font-weight: 700; color: #64b5f6; }
    .summary-label { font-size: 0.7rem; opacity: 0.6; }

    .member-list { display: flex; flex-direction: column; gap: 6px; }
    .member-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); }
    .member-row.has-issue { border-color: rgba(255,152,0,0.25); }
    .member-info { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .member-name { font-weight: 600; font-size: 0.9rem; }
    .member-hours { font-size: 0.75rem; opacity: 0.5; }
    .violation-badge { font-size: 0.7rem; font-weight: 600; padding: 2px 9px; border-radius: 10px; background: rgba(255,152,0,0.15); color: #ffb74d; border: 1px solid rgba(255,152,0,0.3); }
    .missing-badge { font-size: 0.7rem; font-weight: 600; padding: 2px 9px; border-radius: 10px; background: rgba(239,83,80,0.15); color: #ef9a9a; border: 1px solid rgba(239,83,80,0.3); }

    .review-progress { font-size: 0.75rem; opacity: 0.5; margin-bottom: 8px; }
    .review-card { border-radius: 12px; border: 1px solid rgba(100,181,246,0.25); background: rgba(255,255,255,0.02); padding: 18px; }
    .review-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .review-name { font-size: 1.05rem; font-weight: 700; }

    .entry-table { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; max-height: 360px; overflow-y: auto; }
    .entry-row { padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,0.03); }
    .entry-row.flagged { background: rgba(255,152,0,0.06); border: 1px solid rgba(255,152,0,0.2); }
    .entry-main { display: flex; align-items: center; gap: 10px; font-size: 0.82rem; }
    .entry-date { opacity: 0.6; min-width: 90px; }
    .entry-project { flex: 1; }
    .entry-hours { font-weight: 600; }
    .entry-violations { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
    .violation-chip { display: inline-flex; align-items: center; gap: 3px; font-size: 0.68rem; padding: 2px 8px; border-radius: 10px; background: rgba(255,152,0,0.15); color: #ffb74d; }
    .violation-chip mat-icon { font-size: 12px; width: 12px; height: 12px; }

    .review-actions { display: flex; justify-content: flex-end; gap: 8px; }
  `]
})
export class TimesheetApprovalComponent {
  private svc = inject(TimesheetApprovalService);
  private credentials = inject(CredentialsService);
  private snackBar = inject(MatSnackBar);

  start = isoDate(startOfMonth(new Date()));
  end = isoDate(endOfMonth(new Date()));

  loading = signal(false);
  fetched = signal(false);
  error = signal('');
  members = signal<TimesheetApprovalMember[]>([]);
  weeklySummary = signal<WeeklyTimesheetSummary[]>([]);
  teams = signal<string[]>([]);
  memberTeams = signal<Record<string, string>>({});
  excludedTeams = signal<Set<string>>(new Set());
  approving = signal(false);
  expandedWeek = signal<string | null>(null);
  showLoggedChips = signal(true);

  // Members/weeks with anyone from an excluded team dropped out — filtering happens client-side
  // against the already-fetched data rather than re-hitting the external system per toggle.
  filteredMembers = computed(() =>
    this.members().filter(m => !this.isTeamExcluded(m.memberName)));

  filteredWeeklySummary = computed(() =>
    this.weeklySummary().map(w => ({
      ...w,
      memberHours: w.memberHours.filter(mh => !this.isTeamExcluded(mh.memberName)),
      missingMemberNames: w.missingMemberNames.filter(n => !this.isTeamExcluded(n))
    })));

  reviewing = signal<number | null>(null);
  currentMember = computed(() => {
    const idx = this.reviewing();
    return idx === null ? null : this.filteredMembers()[idx] ?? null;
  });

  totalViolations = computed(() => this.filteredMembers().reduce((sum, m) => sum + m.violationCount, 0));

  // Single combined roster — everyone who showed up in the weekly summary or has violations to
  // review, sorted so anyone with an issue (flagged entries or a missing week) floats to the top.
  peopleSummary = computed<PersonSummary[]>(() => {
    const weeks = this.filteredWeeklySummary();
    const members = this.filteredMembers();
    const names = new Set<string>();
    for (const w of weeks) for (const mh of w.memberHours) names.add(mh.memberName);
    for (const m of members) names.add(m.memberName);

    return Array.from(names)
      .map(name => {
        const member = members.find(m => m.memberName === name);
        return {
          memberName: name,
          totalHours: weeks.reduce((sum, w) => sum + (w.memberHours.find(mh => mh.memberName === name)?.hours ?? 0), 0),
          missingWeeks: weeks.filter(w => w.missingMemberNames.includes(name)).length,
          violationCount: member?.violationCount ?? 0,
          canReview: !!member
        };
      })
      .sort((a, b) => a.memberName.localeCompare(b.memberName));
  });

  private isTeamExcluded(memberName: string): boolean {
    const team = this.memberTeams()[memberName];
    return !!team && this.excludedTeams().has(team);
  }

  toggleTeam(team: string) {
    const next = new Set(this.excludedTeams());
    if (next.has(team)) next.delete(team); else next.add(team);
    this.excludedTeams.set(next);
  }

  fetch() {
    this.loading.set(true);
    this.error.set('');
    this.fetched.set(false);
    const cookie = this.credentials.getValue();
    const credentials: Record<string, string> = {};
    for (const entry of this.credentials.getAll())
      credentials[entry.keyName] = this.credentials.getValueFor(entry);
    this.svc.fetchOutstanding({ cookie, start: this.start, end: this.end, credentials }).subscribe({
      next: (result) => {
        this.members.set(result.members);
        this.weeklySummary.set(result.weeklySummary);
        this.teams.set(result.teams);
        this.memberTeams.set(result.memberTeams);
        this.excludedTeams.set(new Set());
        this.loading.set(false);
        this.fetched.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        this.fetched.set(true);
        this.error.set(err?.error?.detail ?? 'Failed to fetch timesheets');
      }
    });
  }

  startReview(member?: TimesheetApprovalMember) {
    const idx = member ? this.filteredMembers().indexOf(member) : 0;
    this.reviewing.set(idx < 0 ? 0 : idx);
  }

  startReviewByName(memberName: string) {
    const member = this.filteredMembers().find(m => m.memberName === memberName);
    if (member) this.startReview(member);
  }

  weekIsGood(w: WeeklyTimesheetSummary): boolean {
    return w.missingMemberNames.length === 0;
  }

  toggleWeek(weekStart: string) {
    this.expandedWeek.set(this.expandedWeek() === weekStart ? null : weekStart);
  }

  skip() {
    this.advance();
  }

  approve(member: TimesheetApprovalMember) {
    this.approving.set(true);
    const credentials: Record<string, string> = {};
    for (const entry of this.credentials.getAll())
      credentials[entry.keyName] = this.credentials.getValueFor(entry);
    const cookie = this.credentials.getValue();

    this.svc.approve(member, { start: this.start, end: this.end }, cookie, credentials).subscribe({
      next: () => {
        this.approving.set(false);
        this.members.set(this.members().filter(m => m !== member));
        this.snackBar.open(`${member.memberName} approved`, 'Close', { duration: 2500 });
        this.advanceAfterApprove();
      },
      error: () => {
        this.approving.set(false);
        this.snackBar.open('Failed to approve — check the cookie/credentials', 'Close', { duration: 4000 });
      }
    });
  }

  private advance() {
    const idx = this.reviewing();
    if (idx === null) return;
    const next = idx + 1;
    this.reviewing.set(next < this.filteredMembers().length ? next : null);
  }

  private advanceAfterApprove() {
    const idx = this.reviewing();
    if (idx === null) return;
    // Member was removed from the array — same index now points at the next one
    this.reviewing.set(idx < this.filteredMembers().length ? idx : null);
  }
}
