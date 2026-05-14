import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MeetingSeriesService } from '../../core/services/meeting-series.service';
import { MeetingSeries } from '../../core/models/meeting-series.model';

@Component({
  selector: 'app-meeting-series-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      <div class="header">
        <h2>Meeting Series</h2>
        <button mat-raised-button color="primary" routerLink="create">
          <mat-icon>add</mat-icon> Create Series
        </button>
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
            <div class="series-card" (click)="router.navigate(['/meeting-series', s.id])">
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
                  @if (s.createdByMemberName) {
                    <span>· Created by {{ s.createdByMemberName }}</span>
                  }
                </div>
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="progressPercent(s)"></div>
                </div>
              </div>
              <button mat-icon-button style="flex-shrink:0" (click)="$event.stopPropagation(); deleteSeries(s)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width:900px;margin:0 auto;padding:8px; }
    .header { display:flex;justify-content:space-between;align-items:center;margin-bottom:24px; }
    .header h2 { margin:0;font-size:1.3rem;font-weight:700; }
    .spinner-wrap { display:flex;justify-content:center;padding:60px; }
    .empty-state { text-align:center;padding:60px 20px;display:flex;flex-direction:column;align-items:center;gap:8px; }
    .empty-state p { font-weight:600;margin:0; }
    .empty-state span { font-size:0.85rem;opacity:0.5;margin-bottom:12px; }
    .series-list { display:flex;flex-direction:column;gap:12px; }
    .series-card {
      display:flex;align-items:center;padding:14px 16px;border-radius:8px;gap:12px;
      background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
      cursor:pointer;transition:background 0.15s,border-color 0.15s;
    }
    .series-card:hover { background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.14); }
    .status-badge {
      font-size:0.65rem;font-weight:600;padding:2px 8px;border-radius:10px;
      text-transform:uppercase;letter-spacing:0.05em;
    }
    .status-active { background:rgba(76,175,80,0.15);color:#81c784; }
    .status-inactive { background:rgba(158,158,158,0.15);color:#bdbdbd; }
    .progress-bar {
      margin-top:6px;height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;
    }
    .progress-fill {
      height:100%;background:rgba(100,181,246,0.5);border-radius:2px;transition:width 0.3s;
    }
  `]
})
export class MeetingSeriesListComponent implements OnInit {
  private svc = inject(MeetingSeriesService);
  private snack = inject(MatSnackBar);
  router = inject(Router);

  loading = signal(true);
  series = signal<MeetingSeries[]>([]);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: items => { this.series.set(items); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  confirmedCount(s: MeetingSeries): number {
    return s.items.filter(i => i.isConfirmed).length;
  }

  progressPercent(s: MeetingSeries): number {
    if (s.items.length === 0) return 0;
    return Math.round((this.confirmedCount(s) / s.items.length) * 100);
  }

  deleteSeries(s: MeetingSeries) {
    if (!confirm(`Delete "${s.title}"? This will also delete all items and connected meetings.`)) return;
    this.svc.delete(s.id).subscribe({
      next: () => { this.snack.open('Series deleted', 'OK', { duration: 2000 }); this.load(); },
      error: () => this.snack.open('Failed to delete', 'OK', { duration: 2000 })
    });
  }
}