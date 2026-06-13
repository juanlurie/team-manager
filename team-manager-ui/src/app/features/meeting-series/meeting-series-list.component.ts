import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MeetingSeriesService } from '../../core/services/meeting-series.service';
import { MeetingSeries, MeetingSeriesItem } from '../../core/models/meeting-series.model';
import { LocationsConfigDialogComponent } from './locations-config-dialog.component';

@Component({
  selector: 'app-meeting-series-list',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule, MatExpansionModule],
  template: `
    <div class="page">
      <div class="header">
        <h2>Meeting Series</h2>
        <div class="header-actions">
          <button mat-stroked-button (click)="openLocationsConfig()">
            <mat-icon>room</mat-icon> Locations
          </button>
          <button mat-raised-button color="primary" routerLink="create">
            <mat-icon>add</mat-icon> Create Series
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="spinner-wrap"><mat-spinner diameter="48"></mat-spinner></div>
      } @else if (series().length === 0) {
        <div class="empty-state">
          <mat-icon style="font-size:48px;width:48px;height:48px;opacity:0.3">event</mat-icon>
          <p>No meeting series yet</p>
          <span>Create the first series to start coordinating sessions.</span>
          <button mat-raised-button color="primary" routerLink="create">
            <mat-icon>add</mat-icon> Create Series
          </button>
        </div>
      } @else {
        <div class="series-list">
          @for (s of series(); track s.id) {
            <div class="series-card">
              <div class="card-header" (click)="router.navigate(['/meeting-series', s.id])">
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <span style="font-weight:500;font-size:0.95rem">{{ s.title }}</span>
                    <span class="status-badge" [class.status-active]="s.isActive" [class.status-inactive]="!s.isActive">
                      {{ s.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </div>
                  <div style="font-size:0.78rem;opacity:0.5;margin-top:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <span>{{ s.slots.length }} slots</span>
                    <span>·</span>
                    <span>{{ s.items.length }} items</span>
                    <span>·</span>
                    <span>{{ confirmedCount(s) }} confirmed</span>
                    @if (pendingCount(s) > 0) {
                      <span class="pending-badge">{{ pendingCount(s) }} pending</span>
                    }
                    @if (s.createdByMemberName) {
                      <span>· Created by {{ s.createdByMemberName }}</span>
                    }
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill" [style.width.%]="progressPercent(s)"></div>
                  </div>
                </div>
                <div class="card-actions" (click)="$event.stopPropagation()">
                  <button mat-icon-button (click)="toggleExpand(s.id)" class="expand-btn" [class.expanded]="expandedId() === s.id">
                    <mat-icon>{{ expandedId() === s.id ? 'expand_less' : 'expand_more' }}</mat-icon>
                  </button>
                  <button mat-icon-button (click)="deleteSeries(s)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>

              @if (expandedId() === s.id) {
                <div class="card-expanded">
                  <div class="expanded-header">
                    <span class="expanded-title">Booked Sessions</span>
                    <span class="expanded-count">{{ confirmedCount(s) }} booked, {{ pendingCount(s) }} pending</span>
                  </div>
                  @if (s.items.length === 0) {
                    <div class="empty-items">No sessions added yet</div>
                  } @else {
                    @for (item of s.items; track item.id) {
                      <div class="session-row" [class.confirmed]="item.isConfirmed" [class.pending]="!item.isConfirmed">
                        <div class="session-info">
                          <mat-icon class="session-icon">{{ item.isConfirmed ? 'check_circle' : 'schedule' }}</mat-icon>
                          <span class="session-title">{{ item.title }}</span>
                        </div>
                        <div class="session-meta">
                          @if (item.isConfirmed && item.confirmedSlotId) {
                            <span class="session-slot">{{ getSlotInfo(s, item.confirmedSlotId) }}</span>
                          }
                          @if (item.participants.length > 0) {
                            <span class="session-participants">
                              <mat-icon style="font-size:14px;width:14px;height:14px">people</mat-icon>
                              {{ item.participants.length }}
                            </span>
                          }
                        </div>
                      </div>
                    }
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    .page { max-width:900px;margin:0 auto;padding:8px; }
    .header { display:flex;justify-content:space-between;align-items:center;margin-bottom:24px; }
    .header-actions { display:flex;gap:8px; }
    .header h2 { margin:0;font-size:1.3rem;font-weight:700; }
    .spinner-wrap { display:flex;justify-content:center;padding:60px; }
    .empty-state { text-align:center;padding:60px 20px;display:flex;flex-direction:column;align-items:center;gap:8px; }
    .empty-state p { font-weight:600;margin:0; }
    .empty-state span { font-size:0.85rem;opacity:0.5;margin-bottom:12px; }
    .series-list { display:flex;flex-direction:column;gap:12px; }
    .series-card {
      background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
      border-radius:8px;overflow:hidden;transition:border-color 0.15s;
    }
    .series-card:hover { border-color:rgba(255,255,255,0.14); }
    .card-header {
      display:flex;align-items:center;padding:14px 16px;gap:12px;cursor:pointer;
    }
    .card-actions { display:flex;align-items:center;flex-shrink:0; }
    .expand-btn { transition:transform 0.2s; }
    .expand-btn.expanded mat-icon { transform:rotate(180deg); }
    .status-badge {
      font-size:0.65rem;font-weight:600;padding:2px 8px;border-radius:10px;
      text-transform:uppercase;letter-spacing:0.05em;
    }
    .status-active { background:rgba(76,175,80,0.15);color:#81c784; }
    .status-inactive { background:rgba(158,158,158,0.15);color:#bdbdbd; }
    .pending-badge {
      font-size:0.65rem;font-weight:600;padding:2px 8px;border-radius:10px;
      background:rgba(255,193,7,0.15);color:#ffc107;
    }
    .progress-bar {
      margin-top:6px;height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;
    }
    .progress-fill {
      height:100%;background:rgba(100,181,246,0.5);border-radius:2px;transition:width 0.3s;
    }
    .card-expanded {
      border-top:1px solid rgba(255,255,255,0.06);
      background:rgba(0,0,0,0.15);
      padding:12px 16px;
    }
    .expanded-header {
      display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;
    }
    .expanded-title { font-weight:600;font-size:0.85rem;color:rgba(255,255,255,0.7); }
    .expanded-count { font-size:0.75rem;color:rgba(255,255,255,0.4); }
    .empty-items { text-align:center;padding:16px;font-size:0.8rem;color:rgba(255,255,255,0.3); }
    .session-row {
      display:flex;align-items:center;justify-content:space-between;
      padding:8px 10px;border-radius:6px;margin-bottom:4px;
      background:rgba(255,255,255,0.02);
    }
    .session-row.confirmed { background:rgba(76,175,80,0.05); }
    .session-row.pending { background:rgba(255,193,7,0.03); }
    .session-info { display:flex;align-items:center;gap:8px;min-width:0;flex:1; }
    .session-icon { font-size:16px;width:16px;height:16px;flex-shrink:0; }
    .session-row.confirmed .session-icon { color:#81c784; }
    .session-row.pending .session-icon { color:#ffc107; }
    .session-title { font-size:0.82rem;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    .session-meta { display:flex;align-items:center;gap:10px;flex-shrink:0; }
    .session-slot { font-size:0.72rem;color:rgba(255,255,255,0.4); }
    .session-participants { display:flex;align-items:center;gap:4px;font-size:0.72rem;color:rgba(255,255,255,0.4); }
  `]
})
export class MeetingSeriesListComponent implements OnInit {
  private svc = inject(MeetingSeriesService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  router = inject(Router);

  loading = signal(true);
  series = signal<MeetingSeries[]>([]);
  expandedId = signal<string | null>(null);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: items => { this.series.set(items); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  toggleExpand(id: string) {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  confirmedCount(s: MeetingSeries): number {
    return s.items.filter(i => i.isConfirmed).length;
  }

  pendingCount(s: MeetingSeries): number {
    return s.items.filter(i => !i.isConfirmed).length;
  }

  progressPercent(s: MeetingSeries): number {
    if (s.items.length === 0) return 0;
    return Math.round((this.confirmedCount(s) / s.items.length) * 100);
  }

  getSlotInfo(s: MeetingSeries, slotId: string): string {
    const slot = s.slots.find(sl => sl.id === slotId);
    if (!slot) return '';
    const date = new Date(slot.date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${months[date.getMonth()]} ${date.getDate()}`;
    const timeStr = slot.startTime && slot.endTime ? `${slot.startTime}-${slot.endTime}` : '';
    const loc = slot.locationName ? ` @ ${slot.locationName}` : '';
    return `${dateStr} ${timeStr}${loc}`;
  }

  deleteSeries(s: MeetingSeries) {
    if (!confirm(`Delete "${s.title}"? This will also delete all items and connected meetings.`)) return;
    this.svc.delete(s.id).subscribe({
      next: () => { this.snack.open('Series deleted', 'OK', { duration: 2000 }); this.load(); },
      error: () => this.snack.open('Failed to delete', 'OK', { duration: 2000 })
    });
  }

  openLocationsConfig() {
    this.dialog.open(LocationsConfigDialogComponent, { width: '600px' });
  }
}