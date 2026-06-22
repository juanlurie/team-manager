import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { from } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TimesheetApprovalService } from '../../core/services/timesheet-approval.service';
import { CredentialsService } from '../../core/services/credentials.service';
import { MemberQualityInput, TimesheetApprovalEntry, TimesheetApprovalMember, WeeklyTimesheetSummary } from '../../core/models/timesheet-approval.model';

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

const EXCLUDED_TEAMS_KEY = 'timesheetApproval.excludedTeams';

// Persisted across fetches/sessions — once you've excluded a team you don't want to keep
// re-unchecking it every time you come back to this screen.
function loadSavedExcludedTeams(): Set<string> {
  try {
    const raw = localStorage.getItem(EXCLUDED_TEAMS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

interface PersonSummary {
  memberName: string;
  totalHours: number;
  missingWeeks: number;
  violationCount: number;
  canReview: boolean;
}

interface DayGroup {
  date: string;
  entries: TimesheetApprovalEntry[];
  violations: string[];
}

@Component({
  selector: 'app-timesheet-approval',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatAutocompleteModule, MatSnackBarModule, MatProgressSpinnerModule, MatCheckboxModule, MatTooltipModule],
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
          <div class="team-filter-section">
            <div class="team-filter-header" (click)="teamsExpanded.set(!teamsExpanded())">
              <span class="team-filter-label">Teams ({{ teams().length - excludedTeams().size }} of {{ teams().length }} shown)</span>
              <mat-icon class="expand-icon">{{ teamsExpanded() ? 'expand_less' : 'expand_more' }}</mat-icon>
            </div>
            @if (teamsExpanded()) {
              <div class="team-filter-row">
                @for (t of teams(); track t) {
                  <mat-checkbox class="team-checkbox" [checked]="!excludedTeams().has(t)" (change)="toggleTeam(t)">
                    {{ t }}
                  </mat-checkbox>
                }
              </div>
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
            <div class="summary-card clickable" (click)="showIssuesBreakdown.set(!showIssuesBreakdown())">
              <span class="summary-num">{{ totalViolations() }}</span>
              <span class="summary-label">Flagged issues</span>
            </div>
            <div style="flex:1"></div>
            <button mat-stroked-button [disabled]="analyzingQuality()" (click)="analyzeVisibleQuality()">
              <mat-icon>{{ analyzingQuality() ? 'hourglass_empty' : 'psychology' }}</mat-icon>
              {{ analyzingQuality() ? 'Analyzing…' : 'AI Analysis' }}
            </button>
            @if (filteredMembers().length > 0) {
              <button mat-raised-button color="primary" (click)="startReview()">
                <mat-icon>play_arrow</mat-icon> Start Review
              </button>
            }
          </div>

          @if (qualityAnalysis() !== null) {
            <div class="issues-breakdown">
              <div class="issues-breakdown-hdr">
                <span>AI Timesheet Quality Analysis ({{ displayedPeople().length }} people)</span>
                <button class="ts-ai-close" (click)="qualityAnalysis.set(null)">&times;</button>
              </div>
              <div class="quality-analysis-body">{{ qualityAnalysis() }}</div>
            </div>
          }

          @if (showIssuesBreakdown() && issuesByPerson().length > 0) {
            <div class="issues-breakdown">
              @for (p of issuesByPerson(); track p.memberName) {
                <div class="issues-person">
                  <div class="issues-person-name">{{ p.memberName }}</div>
                  <div class="entry-violations">
                    @for (v of p.violations; track v) {
                      <span class="violation-chip"><mat-icon>warning</mat-icon>{{ v }}</span>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <mat-checkbox class="needs-review-toggle" [checked]="onlyNeedsReview()" (change)="onlyNeedsReview.set(!onlyNeedsReview())">
            Only show people needing review
          </mat-checkbox>

          <div class="member-list">
            @for (p of displayedPeople(); track p.memberName) {
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
          <div class="review-nav">
            <button mat-icon-button (click)="backToList()" matTooltip="Back to list">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <button mat-icon-button (click)="goToPrevious()" [disabled]="reviewing() === 0" matTooltip="Previous person">
              <mat-icon>navigate_before</mat-icon>
            </button>
            <span class="review-progress">{{ reviewing()! + 1 }} of {{ filteredMembers().length }}</span>
            <button mat-icon-button (click)="skip()" matTooltip="Next person">
              <mat-icon>navigate_next</mat-icon>
            </button>
            <span style="flex:1"></span>
            <mat-form-field appearance="outline" class="jump-field">
              <mat-label>Jump to</mat-label>
              <input matInput [ngModel]="jumpQuery()" (ngModelChange)="jumpQuery.set($event)"
                     [matAutocomplete]="jumpAuto" placeholder="Search by name">
              <mat-autocomplete #jumpAuto="matAutocomplete" (optionSelected)="jumpToName($event.option.value)">
                @for (p of filteredJumpOptions(); track p.memberName) {
                  <mat-option [value]="p.memberName">{{ p.memberName }}</mat-option>
                }
              </mat-autocomplete>
            </mat-form-field>
          </div>
          <div class="review-card">
            <div class="review-header">
              <span class="review-name">{{ m.memberName }}</span>
              <span class="violation-badge">{{ m.violationCount }} issue{{ m.violationCount !== 1 ? 's' : '' }}</span>
            </div>

            <div class="entry-table">
              @for (g of dayGroups(); track g.date) {
                <div class="day-group" [class.flagged]="g.violations.length > 0">
                  <div class="day-header">
                    <mat-checkbox [checked]="selectedDays().has(g.date)" (change)="toggleDay(g.date)">
                      <span class="entry-date">{{ g.date | date:'EEE d MMM' }}</span>
                    </mat-checkbox>
                    <span class="day-total">{{ dayTotalHours(g) }}h</span>
                  </div>
                  @for (e of g.entries; track e.project + e.category) {
                    <div class="entry-block">
                      <div class="entry-row">
                        <span class="entry-project">{{ e.project }} — {{ e.category }}</span>
                        <span class="entry-hours">{{ e.hours }}h{{ e.minutes > 0 ? ' ' + e.minutes + 'm' : '' }}</span>
                        <mat-icon class="billable-icon" [class.billable]="e.billable"
                                  [matTooltip]="e.billable ? 'Billable' : 'Non-billable'">
                          {{ e.billable ? 'attach_money' : 'money_off' }}
                        </mat-icon>
                        <mat-icon class="location-icon" [matTooltip]="e.workedFrom || 'Unknown location'">
                          {{ workedFromIcon(e.workedFrom) }}
                        </mat-icon>
                      </div>
                      @if (e.description) {
                        <div class="entry-description">{{ e.description }}</div>
                      }
                    </div>
                  }
                  @if (g.violations.length > 0) {
                    <div class="entry-violations">
                      @for (v of g.violations; track v) {
                        <span class="violation-chip"><mat-icon>warning</mat-icon>{{ v }}</span>
                      }
                    </div>
                  }
                </div>
              }
            </div>

            <div class="review-actions">
              <button mat-button (click)="skip()">Skip</button>
              <button mat-raised-button color="primary" (click)="approve(m)" [disabled]="approving() || selectedDays().size === 0">
                <mat-icon>{{ approving() ? 'hourglass_empty' : 'check' }}</mat-icon>
                {{ approving() ? 'Approving…' : 'Approve ' + selectedDays().size + ' day' + (selectedDays().size !== 1 ? 's' : '') }}
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

    .team-filter-section { border-radius: 8px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); margin-bottom: 16px; }
    .team-filter-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; cursor: pointer; }
    .team-filter-label { font-size: 0.75rem; opacity: 0.6; font-weight: 600; }
    .team-filter-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 4px 12px 10px; }
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
    .summary-card.clickable { cursor: pointer; }
    .summary-card.clickable:hover { background: rgba(100,181,246,0.14); }
    .summary-num { display: block; font-size: 1.3rem; font-weight: 700; color: #64b5f6; }
    .summary-label { font-size: 0.7rem; opacity: 0.6; }

    .issues-breakdown { display: flex; flex-direction: column; gap: 10px; padding: 12px 14px; border-radius: 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); margin-bottom: 16px; }
    .issues-person-name { font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; }
    .issues-breakdown-hdr { display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; font-weight: 700; color: #ce93d8; }
    .ts-ai-close { background: none; border: none; color: rgba(255,255,255,0.4); font-size: 18px; line-height: 1; cursor: pointer; padding: 0 4px; }
    .ts-ai-close:hover { color: rgba(255,255,255,0.8); }
    .quality-analysis-body { font-size: 0.78rem; line-height: 1.5; opacity: 0.8; white-space: pre-wrap; max-height: 320px; overflow-y: auto; }

    .needs-review-toggle { display: block; font-size: 0.78rem; opacity: 0.7; margin-bottom: 10px; }
    .member-list { display: flex; flex-direction: column; gap: 6px; }
    .member-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); }
    .member-row.has-issue { border-color: rgba(255,152,0,0.25); }
    .member-info { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .member-name { font-weight: 600; font-size: 0.9rem; }
    .member-hours { font-size: 0.75rem; opacity: 0.5; }
    .violation-badge { font-size: 0.7rem; font-weight: 600; padding: 2px 9px; border-radius: 10px; background: rgba(255,152,0,0.15); color: #ffb74d; border: 1px solid rgba(255,152,0,0.3); }
    .missing-badge { font-size: 0.7rem; font-weight: 600; padding: 2px 9px; border-radius: 10px; background: rgba(239,83,80,0.15); color: #ef9a9a; border: 1px solid rgba(239,83,80,0.3); }

    .review-nav { display: flex; align-items: center; gap: 4px; margin-bottom: 10px; }
    .review-progress { font-size: 0.75rem; opacity: 0.6; font-weight: 600; padding: 0 6px; }
    .jump-field { width: 220px; }
    .review-card { border-radius: 12px; border: 1px solid rgba(100,181,246,0.25); background: rgba(255,255,255,0.02); padding: 18px; }
    .review-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .review-name { font-size: 1.05rem; font-weight: 700; }

    .entry-table { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; max-height: 420px; overflow-y: auto; }
    .day-group { padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,0.03); }
    .day-group.flagged { background: rgba(255,152,0,0.06); border: 1px solid rgba(255,152,0,0.2); }
    .day-header { display: flex; align-items: center; justify-content: space-between; font-size: 0.82rem; font-weight: 600; margin-bottom: 4px; }
    .entry-date { opacity: 0.7; }
    .day-total { opacity: 0.7; }
    .entry-block { padding: 3px 0; }
    .entry-row { display: flex; align-items: center; gap: 10px; font-size: 0.8rem; }
    .entry-project { flex: 1; opacity: 0.85; }
    .entry-hours { font-weight: 600; }
    .billable-icon, .location-icon { font-size: 16px; width: 16px; height: 16px; opacity: 0.4; }
    .billable-icon.billable { opacity: 1; color: #4caf50; }
    .entry-description { font-size: 0.72rem; opacity: 0.5; margin-top: 2px; padding-left: 2px; font-style: italic; }
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
  excludedTeams = signal<Set<string>>(loadSavedExcludedTeams());
  teamsExpanded = signal(false);
  approving = signal(false);
  expandedWeek = signal<string | null>(null);
  showLoggedChips = signal(false);

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

  // Same daily-violation-message repetition as dayGroups() — dedupe per person so the "Flagged
  // issues" tile expands into one chip per distinct issue rather than one per affected entry.
  showIssuesBreakdown = signal(false);
  issuesByPerson = computed(() =>
    this.filteredMembers()
      .map(m => ({
        memberName: m.memberName,
        violations: [...new Set(m.entries.flatMap(e => e.violations))]
      }))
      .filter(p => p.violations.length > 0));

  jumpQuery = signal('');
  filteredJumpOptions = computed(() => {
    const q = this.jumpQuery().trim().toLowerCase();
    const members = this.filteredMembers();
    if (!q) return members.slice(0, 20);
    return members.filter(m => m.memberName.toLowerCase().includes(q)).slice(0, 20);
  });

  selectedDays = signal<Set<string>>(new Set());

  // The backend repeats the same daily violation message on every entry that day (it doesn't
  // know which entry to "attach" a whole-day issue to) — group by date and dedupe so the review
  // card shows each day's entries together with its issues listed once underneath.
  dayGroups = computed<DayGroup[]>(() => {
    const m = this.currentMember();
    if (!m) return [];
    const byDate = new Map<string, DayGroup>();
    for (const e of m.entries) {
      let g = byDate.get(e.date);
      if (!g) { g = { date: e.date, entries: [], violations: [] }; byDate.set(e.date, g); }
      g.entries.push(e);
      for (const v of e.violations) if (!g.violations.includes(v)) g.violations.push(v);
    }
    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  });

  constructor() {
    // Default to every day selected whenever the person being reviewed changes (jump/skip/
    // previous all flow through here since they all change dayGroups()' source).
    effect(() => {
      const dates = this.dayGroups().map(g => g.date);
      this.selectedDays.set(new Set(dates));
    });
  }

  dayTotalHours(g: DayGroup): number {
    return g.entries.reduce((sum, e) => sum + e.hours + e.minutes / 60, 0);
  }

  // Mirrors DEFAULT_LOC_ICONS in timesheet-entry-card.component.ts so the same location reads
  // the same icon everywhere in the app.
  workedFromIcon(workedFrom: string): string {
    const wf = (workedFrom || '').toLowerCase();
    if (wf.includes('home')) return 'home';
    if (wf.includes('client')) return 'store';
    return 'location_on';
  }

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

  onlyNeedsReview = signal(false);

  displayedPeople = computed(() =>
    this.onlyNeedsReview() ? this.peopleSummary().filter(p => p.canReview) : this.peopleSummary());

  analyzingQuality = signal(false);
  qualityAnalysis = signal<string | null>(null);

  // Sends exactly what's currently visible (after team exclusion + the needs-review toggle) —
  // full entries for people with flagged ones, just a total-hours note for everyone else, since
  // the backend only returns itemized entries for members who have at least one violation.
  analyzeVisibleQuality() {
    const members = this.filteredMembers();
    const payload: MemberQualityInput[] = this.displayedPeople().map(p => {
      const member = members.find(m => m.memberName === p.memberName);
      return {
        memberName: p.memberName,
        totalHours: p.totalHours,
        entries: member?.entries.map(e => ({
          date: e.date, project: e.project, category: e.category,
          hours: e.hours, minutes: e.minutes, billable: e.billable, description: e.description
        })) ?? []
      };
    });

    this.analyzingQuality.set(true);
    this.svc.analyzeQuality(payload).subscribe({
      next: (result) => {
        this.analyzingQuality.set(false);
        if (!result.configured) {
          this.qualityAnalysis.set('Not configured — add an "Analyze Timesheet Quality" action in Integrations.');
          return;
        }
        this.qualityAnalysis.set(result.analysis ?? 'No analysis returned.');
      },
      error: () => {
        this.analyzingQuality.set(false);
        this.qualityAnalysis.set('Failed to run the analysis. Check the Sync Queue for details.');
      }
    });
  }

  private isTeamExcluded(memberName: string): boolean {
    const team = this.memberTeams()[memberName];
    return !!team && this.excludedTeams().has(team);
  }

  toggleTeam(team: string) {
    const next = new Set(this.excludedTeams());
    if (next.has(team)) next.delete(team); else next.add(team);
    this.excludedTeams.set(next);
    localStorage.setItem(EXCLUDED_TEAMS_KEY, JSON.stringify([...next]));
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

  toggleDay(date: string) {
    const next = new Set(this.selectedDays());
    if (next.has(date)) next.delete(date); else next.add(date);
    this.selectedDays.set(next);
  }

  backToList() {
    this.reviewing.set(null);
  }

  goToPrevious() {
    const idx = this.reviewing();
    if (idx === null || idx === 0) return;
    this.reviewing.set(idx - 1);
  }

  jumpToName(memberName: string) {
    const idx = this.filteredMembers().findIndex(m => m.memberName === memberName);
    if (idx >= 0) this.reviewing.set(idx);
    this.jumpQuery.set('');
  }

  skip() {
    this.advance();
  }

  // Approves only the selected days — each gets its own ApproveTimesheet call (start = end =
  // that date), since the external action's only date granularity is a start/end range and we
  // can't tell it "these specific dates out of the period". Calls run one at a time so a failure
  // partway through is easy to attribute to a specific day.
  approve(member: TimesheetApprovalMember) {
    const groups = this.dayGroups();
    const selected = this.selectedDays();
    const selectedGroups = groups.filter(g => selected.has(g.date));
    if (selectedGroups.length === 0) return;

    this.approving.set(true);
    const credentials: Record<string, string> = {};
    for (const entry of this.credentials.getAll())
      credentials[entry.keyName] = this.credentials.getValueFor(entry);
    const cookie = this.credentials.getValue();

    from(selectedGroups).pipe(
      concatMap(g => this.svc.approve(member, { start: g.date, end: g.date }, this.dayTotalHours(g), cookie, credentials))
    ).subscribe({
      error: () => {
        this.approving.set(false);
        this.snackBar.open('Failed to approve — check the cookie/credentials', 'Close', { duration: 4000 });
      },
      complete: () => {
        this.approving.set(false);
        if (selectedGroups.length === groups.length) {
          this.members.set(this.members().filter(m => m !== member));
          this.snackBar.open(`${member.memberName} approved`, 'Close', { duration: 2500 });
        } else {
          this.snackBar.open(
            `Approved ${selectedGroups.length} of ${groups.length} day(s) for ${member.memberName}`, 'Close', { duration: 3500 });
        }
        this.advanceAfterApprove();
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
    // On a full approval the member was removed from the array, so the same index now points
    // at the next one. On a partial approval the member stays put, so this re-displays them
    // with a fresh (fully selected) day list rather than auto-advancing.
    this.reviewing.set(idx < this.filteredMembers().length ? idx : null);
  }
}
