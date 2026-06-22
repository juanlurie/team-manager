import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TimesheetApprovalService } from '../../core/services/timesheet-approval.service';
import { CredentialsService } from '../../core/services/credentials.service';
import { TimesheetApprovalMember } from '../../core/models/timesheet-approval.model';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-timesheet-approval',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSnackBarModule, MatProgressSpinnerModule],
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

        @if (loading()) {
          <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
        } @else if (error()) {
          <div class="error-banner"><mat-icon>error_outline</mat-icon>{{ error() }}</div>
        } @else if (fetched() && members().length === 0) {
          <div class="empty-state">
            <mat-icon class="empty-icon">task_alt</mat-icon>
            <div class="empty-title">All caught up</div>
            <div class="empty-sub">No outstanding timesheets need attention for this period</div>
          </div>
        } @else if (members().length > 0) {
          <div class="summary-row">
            <div class="summary-card">
              <span class="summary-num">{{ members().length }}</span>
              <span class="summary-label">People</span>
            </div>
            <div class="summary-card">
              <span class="summary-num">{{ totalViolations() }}</span>
              <span class="summary-label">Flagged issues</span>
            </div>
            <div style="flex:1"></div>
            <button mat-raised-button color="primary" (click)="startReview()">
              <mat-icon>play_arrow</mat-icon> Start Review
            </button>
          </div>

          <div class="member-list">
            @for (m of members(); track m.memberName) {
              <div class="member-row">
                <div class="member-info">
                  <span class="member-name">{{ m.memberName }}</span>
                  <span class="violation-badge">{{ m.violationCount }} issue{{ m.violationCount !== 1 ? 's' : '' }}</span>
                </div>
                <button mat-button color="primary" (click)="startReview(m)">Review</button>
              </div>
            }
          </div>
        }
      } @else {
        <!-- Sequential review -->
        @if (currentMember(); as m) {
          <div class="review-progress">Reviewing {{ reviewing()! + 1 }} of {{ members().length }}</div>
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

    .loading { display: flex; justify-content: center; padding: 48px; }
    .error-banner { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 8px; background: rgba(239,83,80,0.1); border: 1px solid rgba(239,83,80,0.3); color: #ef9a9a; font-size: 0.85rem; }

    .empty-state { text-align: center; padding: 60px 20px; opacity: 0.5; }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: #4caf50; opacity: 0.6; margin-bottom: 10px; }
    .empty-title { font-weight: 600; font-size: 1rem; }
    .empty-sub { font-size: 0.8rem; margin-top: 4px; }

    .summary-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .summary-card { padding: 10px 18px; border-radius: 10px; background: rgba(100,181,246,0.08); border: 1px solid rgba(100,181,246,0.2); text-align: center; }
    .summary-num { display: block; font-size: 1.3rem; font-weight: 700; color: #64b5f6; }
    .summary-label { font-size: 0.7rem; opacity: 0.6; }

    .member-list { display: flex; flex-direction: column; gap: 6px; }
    .member-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); }
    .member-info { display: flex; align-items: center; gap: 10px; }
    .member-name { font-weight: 600; font-size: 0.9rem; }
    .violation-badge { font-size: 0.7rem; font-weight: 600; padding: 2px 9px; border-radius: 10px; background: rgba(255,152,0,0.15); color: #ffb74d; border: 1px solid rgba(255,152,0,0.3); }

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

  start = isoDate(new Date(Date.now() - 13 * 86400000));
  end = isoDate(new Date());

  loading = signal(false);
  fetched = signal(false);
  error = signal('');
  members = signal<TimesheetApprovalMember[]>([]);
  approving = signal(false);

  reviewing = signal<number | null>(null);
  currentMember = computed(() => {
    const idx = this.reviewing();
    return idx === null ? null : this.members()[idx] ?? null;
  });

  totalViolations = computed(() => this.members().reduce((sum, m) => sum + m.violationCount, 0));

  fetch() {
    this.loading.set(true);
    this.error.set('');
    this.fetched.set(false);
    const cookie = this.credentials.getValue();
    this.svc.fetchOutstanding({ cookie, start: this.start, end: this.end }).subscribe({
      next: (members) => {
        this.members.set(members);
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
    const idx = member ? this.members().indexOf(member) : 0;
    this.reviewing.set(idx < 0 ? 0 : idx);
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
    this.reviewing.set(next < this.members().length ? next : null);
  }

  private advanceAfterApprove() {
    const idx = this.reviewing();
    if (idx === null) return;
    // Member was removed from the array — same index now points at the next one
    this.reviewing.set(idx < this.members().length ? idx : null);
  }
}
