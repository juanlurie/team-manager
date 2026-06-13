import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MeetingSeriesService } from '../../core/services/meeting-series.service';
import { MyMeetingItem } from '../../core/models/meeting-series.model';

@Component({
  selector: 'app-my-meetings',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      <div class="header">
        <h2>My Meetings</h2>
      </div>

      @if (loading()) {
        <div class="spinner-wrap"><mat-spinner diameter="48"></mat-spinner></div>
      } @else if (items().length === 0) {
        <div class="empty-state">
          <mat-icon style="font-size:48px;width:48px;height:48px;opacity:0.3">event_available</mat-icon>
          <p>No meetings assigned</p>
          <span>You haven't been added to any meeting items yet.</span>
        </div>
      } @else {
        @for (group of groupedItems(); track group.seriesId) {
          <div class="series-group">
            <div class="series-header-row">
              <h3 class="series-title">{{ group.seriesTitle }}</h3>
              @if (hasOpenItems(group)) {
                <button mat-stroked-button class="series-avail-btn"
                        [routerLink]="['/meeting-series', group.seriesId, 'availability']">
                  <mat-icon style="font-size:1rem;width:1rem;height:1rem;margin-right:4px">event_available</mat-icon>
                  Set Availability
                </button>
              }
            </div>
            @for (item of group.items; track item.itemId) {
              <div class="item-card">
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                    <mat-icon style="font-size:1.1rem;color:{{ item.isConfirmed ? '#81c784' : 'rgba(255,255,255,0.3)' }}">
                      {{ item.isConfirmed ? 'check_circle' : 'radio_button_unchecked' }}
                    </mat-icon>
                    <span style="font-weight:500;font-size:0.9rem">{{ item.itemTitle }}</span>
                    <span class="role-badge" [class.role-mandatory]="item.role === 'Mandatory'" [class.role-optional]="item.role === 'Optional'">
                      {{ item.role }}
                    </span>
                  </div>
                  <div style="font-size:0.78rem;opacity:0.5;margin-top:4px">
                    @if (item.isConfirmed) {
                      <span style="color:#81c784">Confirmed</span>
                    } @else if (item.role === 'Mandatory') {
                      <span>{{ item.mandatoryFilled }}/{{ item.mandatoryCount }} mandatory filled</span>
                      @if (item.mandatoryFilled < item.mandatoryCount) {
                        <span> &middot; Waiting for others...</span>
                      }
                    } @else {
                      <span>Optional participant</span>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    .page { max-width:900px;margin:0 auto;padding:8px; }
    .header { margin-bottom:24px; }
    .header h2 { margin:0;font-size:1.3rem;font-weight:700; }
    .spinner-wrap { display:flex;justify-content:center;padding:60px; }
    .empty-state { text-align:center;padding:60px 20px;display:flex;flex-direction:column;align-items:center;gap:8px; }
    .empty-state p { font-weight:600;margin:0; }
    .empty-state span { font-size:0.85rem;opacity:0.5; }
    .series-group { margin-bottom:24px; }
    .series-header-row { display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid rgba(100,181,246,0.2); }
    .series-title { font-size:0.85rem;font-weight:600;color:#64b5f6;margin:0; }
    .series-avail-btn { flex-shrink:0;font-size:0.78rem;height:32px;padding:0 12px; }
    .item-card {
      display:flex;align-items:center;padding:12px 14px;border-radius:8px;gap:12px;
      background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
      margin-bottom:8px;transition:background 0.15s;
    }
    .item-card:hover { background:rgba(255,255,255,0.05); }
    .item-icon { font-size:1rem; }
    .role-badge {
      font-size:0.65rem;font-weight:600;padding:2px 8px;border-radius:10px;
      text-transform:uppercase;letter-spacing:0.05em;
    }
    .role-mandatory { background:rgba(100,181,246,0.15);color:#64b5f6; }
    .role-optional { background:rgba(129,199,132,0.15);color:#81c784; }
  `]
})
export class MyMeetingsComponent implements OnInit {
  private svc = inject(MeetingSeriesService);
  router = inject(Router);

  loading = signal(true);
  items = signal<MyMeetingItem[]>([]);

  groupedItems = signal<{ seriesId: string; seriesTitle: string; items: MyMeetingItem[] }[]>([]);

  hasOpenItems(group: { items: MyMeetingItem[] }): boolean {
    return group.items.some(i => !i.isConfirmed);
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getMyMeetings().subscribe({
      next: items => {
        this.items.set(items);
        // Group by series
        const groups = new Map<string, { seriesId: string; seriesTitle: string; items: MyMeetingItem[] }>();
        for (const item of items) {
          if (!groups.has(item.seriesId)) {
            groups.set(item.seriesId, { seriesId: item.seriesId, seriesTitle: item.seriesTitle, items: [] });
          }
          groups.get(item.seriesId)!.items.push(item);
        }
        this.groupedItems.set([...groups.values()]);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); }
    });
  }
}
