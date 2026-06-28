import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MeetingSeriesService } from '../../core/services/meeting-series.service';
import { MyMeetingSeries } from '../../core/models/meeting-series.model';

@Component({
  selector: 'app-my-meeting-series',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      <div class="header">
        <h2>My Meeting Series</h2>
        <p class="subtitle">Series where you are a required or optional attendee</p>
      </div>

      @if (loading()) {
        <div class="spinner-wrap"><mat-spinner diameter="48"></mat-spinner></div>
      } @else if (series().length === 0) {
        <div class="empty-state">
          <mat-icon style="font-size:48px;width:48px;height:48px;opacity:0.3">event_available</mat-icon>
          <p>No meeting series assigned</p>
          <span>You haven't been added to any meeting series yet.</span>
        </div>
      } @else {
        @for (s of series(); track s.seriesId) {
          <div class="series-card">
            <div class="series-info">
              <div class="series-header">
                <h3>{{ s.seriesTitle }}</h3>
                <span class="role-badge" [class.role-mandatory]="s.role === 'Mandatory'" [class.role-optional]="s.role === 'Optional'">
                  {{ s.role }}
                </span>
              </div>
              @if (s.seriesDescription) {
                <p class="description">{{ s.seriesDescription }}</p>
              }
              <div class="stats">
                <span class="stat" [class.has-open]="s.openItems > 0">
                  <mat-icon style="font-size:16px;width:16px;height:16px">event_note</mat-icon>
                  {{ s.openItems }} open session{{ s.openItems !== 1 ? 's' : '' }}
                </span>
                @if (s.confirmedItems > 0) {
                  <span class="stat confirmed">
                    <mat-icon style="font-size:16px;width:16px;height:16px">check_circle</mat-icon>
                    {{ s.confirmedItems }} confirmed
                  </span>
                }
              </div>
            </div>
            <div class="actions">
              @if (s.openItems > 0) {
                <button mat-raised-button color="primary"
                        [routerLink]="['/meeting-series', s.seriesId, 'availability']">
                  <mat-icon style="font-size:18px;margin-right:4px">event_available</mat-icon>
                  Set Availability
                </button>
              } @else {
                <span class="all-set">All sessions confirmed</span>
              }
              <button mat-stroked-button
                      [routerLink]="['/meeting-series', s.seriesId]">
                View Series
              </button>
            </div>
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .page { max-width:900px;margin:0 auto;padding:8px; }
    .header { margin-bottom:24px; }
    .header h2 { margin:0;font-size:1.3rem;font-weight:700; }
    .subtitle { margin:4px 0 0;font-size:0.85rem;opacity:0.5; }
    .spinner-wrap { display:flex;justify-content:center;padding:60px; }
    .empty-state { text-align:center;padding:60px 20px;display:flex;flex-direction:column;align-items:center;gap:8px; }
    .empty-state p { font-weight:600;margin:0; }
    .empty-state span { font-size:0.85rem;opacity:0.5; }
    .series-card {
      display:flex;align-items:flex-start;justify-content:space-between;gap:16px;
      padding:16px;border-radius:10px;margin-bottom:12px;
      background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
      transition:background 0.15s;
    }
    .series-card:hover { background:rgba(255,255,255,0.05); }
    .series-info { flex:1;min-width:0; }
    .series-header { display:flex;align-items:center;gap:10px;margin:0 0 6px; }
    .series-header h3 { margin:0;font-size:1rem;font-weight:600; }
    .description { margin:0 0 10px;font-size:0.82rem;opacity:0.6; }
    .stats { display:flex;gap:16px;flex-wrap:wrap; }
    .stat {
      display:inline-flex;align-items:center;gap:4px;
      font-size:0.78rem;opacity:0.6;
    }
    .stat.has-open { opacity:1;color:#64b5f6; }
    .stat.confirmed { color:#81c784; }
    .actions { display:flex;flex-direction:column;gap:8px;flex-shrink:0; }
    .all-set { font-size:0.78rem;color:#81c784;text-align:center;padding:8px 0; }
    .role-badge {
      font-size:0.65rem;font-weight:600;padding:2px 8px;border-radius:10px;
      text-transform:uppercase;letter-spacing:0.05em;
    }
    .role-mandatory { background:rgba(100,181,246,0.15);color:#64b5f6; }
    .role-optional { background:rgba(129,199,132,0.15);color:#81c784; }
  `]
})
export class MyMeetingSeriesComponent implements OnInit {
  private svc = inject(MeetingSeriesService);

  loading = signal(true);
  series = signal<MyMeetingSeries[]>([]);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getMySeries().subscribe({
      next: data => {
        this.series.set(data);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
  }
}
