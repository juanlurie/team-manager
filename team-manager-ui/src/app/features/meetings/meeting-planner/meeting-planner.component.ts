import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { RouterLink, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MeetingSession } from '../../../core/models/meeting-session.model';
import { MeetingSessionService } from '../../../core/services/meeting-session.service';
import { MeetingFormDialogComponent } from '../meeting-form-dialog/meeting-form-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-meeting-planner',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule],
  template: `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap">
      <h2 style="margin:0;flex:1;min-width:120px">Meeting Planner</h2>
      <button mat-raised-button color="primary" routerLink="/meetings/create">
        <mat-icon>add</mat-icon> Create Session
      </button>
    </div>

    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    } @else {
      <!-- Filter tabs -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <button mat-stroked-button [class.active-filter]="selectedFilter() === 'all'"
                style="min-width:0;padding:0 12px;height:32px;font-size:0.8rem"
                (click)="selectedFilter.set('all')">All</button>
        <button mat-stroked-button [class.active-filter]="selectedFilter() === 'open'"
                style="min-width:0;padding:0 12px;height:32px;font-size:0.8rem"
                (click)="selectedFilter.set('open')">Open</button>
      </div>

      <!-- Session list -->
      <div style="display:flex;flex-direction:column;gap:8px">
        @for (s of filteredSessions(); track s.id) {
          <a class="session-card" [routerLink]="['/meetings', s.id]">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span style="font-weight:500;font-size:0.9rem">{{ s.title }}</span>
                <span style="font-size:0.68rem;opacity:0.45;margin-left:4px">{{ s.type }}</span>
                <span class="status-badge" [class.status-open]="s.status === 'Open'"
                      [class.status-filled]="s.status === 'Filled'"
                      [class.status-cancelled]="s.status === 'Cancelled'">
                  {{ s.status }}
                </span>
              </div>
              <div style="font-size:0.78rem;opacity:0.5;margin-top:2px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span>{{ formatDate(s.date) }}, {{ s.startTime }} – {{ s.endTime }}</span>
                <span>·</span>
                <span>{{ locationIcon(s.location) }} {{ s.location }}</span>
                <span>·</span>
                <span>{{ filledCount(s) }}/{{ s.slots.length }} slots filled</span>
                @if (s.createdByMemberName) {
                  <span>· Created by {{ s.createdByMemberName }}</span>
                }
              </div>
              <!-- Progress bar -->
              <div class="slot-progress-bar">
                <div class="slot-progress-fill" [style.width.%]="fillPercent(s)"></div>
              </div>
            </div>
            <button mat-icon-button style="flex-shrink:0" (click)="$event.preventDefault(); $event.stopPropagation(); deleteSession(s)">
              <mat-icon>delete</mat-icon>
            </button>
          </a>
        }
        @if (filteredSessions().length === 0) {
          <div style="text-align:center;padding:64px 24px;opacity:0.4">
            <mat-icon style="font-size:40px;width:40px;height:40px;margin-bottom:12px">event</mat-icon>
            <div style="font-size:0.95rem;margin-bottom:4px">No meeting sessions yet</div>
            <div style="font-size:0.8rem">Create the first session to get started!</div>
          </div>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    .active-filter { background: rgba(100,181,246,0.15) !important; border-color: rgba(100,181,246,0.4) !important; color: #64b5f6 !important; }
    .session-card {
      display: flex; align-items: center; padding: 14px 16px; border-radius: 8px; gap: 12px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
      text-decoration: none; color: inherit; cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }
    .session-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.14); }
    .status-badge {
      font-size: 0.65rem; font-weight: 600; padding: 2px 8px; border-radius: 10px;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .status-open { background: rgba(76,175,80,0.15); color: #81c784; }
    .status-filled { background: rgba(33,150,243,0.15); color: #64b5f6; }
    .status-cancelled { background: rgba(158,158,158,0.15); color: #bdbdbd; }
    .slot-progress-bar {
      margin-top: 6px; height: 3px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden;
    }
    .slot-progress-fill {
      height: 100%; background: rgba(100,181,246,0.5); border-radius: 2px; transition: width 0.3s;
    }
  `]
})
export class MeetingPlannerComponent implements OnInit {
  private svc = inject(MeetingSessionService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  loading = signal(true);
  sessions = signal<MeetingSession[]>([]);
  selectedFilter = signal<'all' | 'open'>('all');

  filteredSessions = () => {
    const filter = this.selectedFilter();
    const all = this.sessions();
    switch (filter) {
      case 'open': return all.filter(s => s.status === 'Open');
      default: return all;
    }
  };

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: (sessions) => { this.sessions.set(sessions); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  locationIcon(location: string): string {
    switch (location) {
      case 'Remote': return '🏠';
      case 'OnSite': return '🏢';
      case 'Hybrid': return '🔄';
      default: return '📍';
    }
  }

  filledCount(s: MeetingSession): number {
    return s.slots.filter(sl => sl.teamMemberId !== null).length;
  }

  fillPercent(s: MeetingSession): number {
    if (s.slots.length === 0) return 0;
    return (this.filledCount(s) / s.slots.length) * 100;
  }

  openCreateDialog() {
    this.router.navigate(['/meetings', 'create']);
  }

  deleteSession(session: MeetingSession) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete session?', message: `Remove "${session.title}"? This cannot be undone.`, danger: true, confirmLabel: 'Delete' }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.svc.delete(session.id).subscribe({
        next: () => { this.snack.open('Session deleted', 'OK', { duration: 2000 }); this.load(); },
        error: () => this.snack.open('Failed to delete', 'OK', { duration: 2000 })
      });
    });
  }
}
