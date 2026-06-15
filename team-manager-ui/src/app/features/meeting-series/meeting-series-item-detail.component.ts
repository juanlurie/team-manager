import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MeetingSeriesService } from '../../core/services/meeting-series.service';
import { MeetingSeries, MeetingSeriesItem } from '../../core/models/meeting-series.model';

@Component({
  selector: 'app-meeting-series-item-detail',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      @if (loading()) {
        <div class="spinner-wrap"><mat-spinner diameter="40"></mat-spinner></div>
      } @else if (!series() || !item()) {
        <div class="error-state">
          <h2>Item not found</h2>
          <button mat-stroked-button (click)="goBack()">Back to Series</button>
        </div>
      } @else {
        @let s = series()!;
        @let i = item()!;

        <div class="breadcrumb">
          <a (click)="router.navigate(['/meeting-series'])">Meeting Series</a>
          <span> › </span>
          <a (click)="router.navigate(['/meeting-series', s.id])">{{ s.title }}</a>
          <span> › </span>
          <span>{{ i.title }}</span>
        </div>

        <div class="header">
          <div>
            <h2>{{ i.title }}</h2>
            @if (i.description) {
              <p class="desc">{{ i.description }}</p>
            }
            <div class="meta">
              <span class="item-status" [class.confirmed]="i.isConfirmed">
                {{ i.isConfirmed ? '✅ Confirmed' : '⏳ Pending' }}
              </span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-label">Participants</div>
          <div class="participant-group">
            <div class="group-label" style="color:#64b5f6">
              <span class="dot" style="background:#64b5f6"></span>
              Mandatory ({{ mandatoryCount() }})
            </div>
            <div class="member-chips">
              @for (p of mandatoryParticipants(); track p.id) {
                <span class="chip"><span class="dot" style="background:#64b5f6"></span>{{ p.teamMemberName }}</span>
              }
            </div>
          </div>
          <div class="participant-group">
            <div class="group-label" style="color:#81c784">
              <span class="dot" style="background:#81c784"></span>
              Optional ({{ optionalCount() }})
            </div>
            <div class="member-chips">
              @for (p of optionalParticipants(); track p.id) {
                <span class="chip"><span class="dot" style="background:#81c784"></span>{{ p.teamMemberName }}</span>
              }
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-label">Availability Matrix</div>
          @if (availabilitiesBySlot().length === 0) {
            <div class="empty-state">
              <p>No team members have added their availability yet.</p>
              <span>They'll appear here once they select their preferred slots.</span>
            </div>
          } @else {
            <div class="availability-list">
              @for (entry of availabilitiesBySlot(); track entry.slotId) {
                <div class="slot-avail-row">
                  <div class="slot-info">
                    <span class="slot-date">{{ entry.slot.date }}</span>
                    <span class="slot-time">{{ entry.slot.startTime }}–{{ entry.slot.endTime }}</span>
                    @if (entry.slot.locationName) {
                      <span class="slot-loc-dot" [style.background]="entry.slot.locationColor"></span>
                      <span class="slot-loc">{{ entry.slot.locationName }}</span>
                    }
                  </div>
                  <div class="avail-names">
                    @for (a of entry.availabilities; track a.id) {
                      <span class="avail-name">{{ a.teamMemberName }}</span>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>

        @if (item()?.isConfirmed) {
          <div class="confirmed-banner">
            🎉 This meeting is confirmed! A meeting session has been created.
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .page { max-width:900px;margin:0 auto;padding:8px; }
    .spinner-wrap { display:flex;justify-content:center;padding:60px; }
    .error-state { text-align:center;padding:60px; }
    .breadcrumb { font-size:0.75rem;opacity:0.5;margin-bottom:8px; }
    .breadcrumb a { color:#64b5f6;cursor:pointer; }
    .breadcrumb a:hover { text-decoration:underline; }
    .header { margin-bottom:24px; }
    .header h2 { margin:0;font-size:1.3rem;font-weight:700; }
    .desc { margin:4px 0 0;font-size:0.85rem;opacity:0.6; }
    .meta { font-size:0.78rem;opacity:0.4;margin-top:4px; }
    .item-status { font-size:0.8rem;font-weight:600; }
    .item-status.confirmed { color:#81c784; }
    .section { margin-bottom:16px;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02); }
    .section-label { font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.4;font-weight:600;margin-bottom:8px; }
    .participant-group { margin-bottom:10px; }
    .group-label { display:flex;align-items:center;gap:6px;font-size:0.78rem;font-weight:600;margin-bottom:4px; }
    .dot { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
    .member-chips { display:flex;flex-wrap:wrap;gap:4px; }
    .chip { padding:4px 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);font-size:0.78rem;display:inline-flex;align-items:center;gap:4px; }
    .empty-state { text-align:center;padding:30px; }
    .empty-state p { margin:0 0 4px;font-weight:600; }
    .empty-state span { font-size:0.82rem;opacity:0.5; }
    .availability-list { display:flex;flex-direction:column;gap:6px; }
    .slot-avail-row { display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:6px;background:rgba(255,255,255,0.03);flex-wrap:wrap;gap:8px; }
    .slot-info { display:flex;align-items:center;gap:6px;font-size:0.82rem; }
    .slot-date { font-weight:600; }
    .slot-time { opacity:0.6; }
    .slot-loc-dot { width:6px;height:6px;border-radius:50%; }
    .slot-loc { opacity:0.5;font-size:0.75rem; }
    .avail-names { display:flex;gap:6px;flex-wrap:wrap; }
    .avail-name { font-size:0.75rem;padding:2px 8px;border-radius:8px;background:rgba(100,181,246,0.1);color:#64b5f6; }
    .confirmed-banner { padding:12px;border-radius:8px;background:rgba(76,175,80,0.1);border:1px solid rgba(76,175,80,0.2);color:#81c784;font-size:0.9rem;text-align:center;margin-top:16px; }
  `]
})
export class MeetingSeriesItemDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(MeetingSeriesService);
  router = inject(Router);

  series = signal<MeetingSeries | null>(null);
  loading = signal(true);

  item = computed(() => {
    const s = this.series();
    const itemId = this.route.snapshot.paramMap.get('itemId');
    if (!s || !itemId) return null;
    return s.items.find(i => i.id === itemId) || null;
  });

  mandatoryParticipants = computed(() => this.item()?.participants.filter(p => p.role === 'Mandatory') ?? []);
  optionalParticipants = computed(() => this.item()?.participants.filter(p => p.role === 'Optional') ?? []);
  mandatoryCount = computed(() => this.mandatoryParticipants().length);
  optionalCount = computed(() => this.optionalParticipants().length);

  availabilitiesBySlot = computed(() => {
    const i = this.item();
    const s = this.series();
    if (!i || !s) return [];
    return s.slots.map(slot => ({
      slotId: slot.id,
      slot,
      availabilities: i.availabilities.filter(a => a.meetingSeriesSlotId === slot.id)
    })).filter(entry => entry.availabilities.length > 0);
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.load(id);
    });
  }

  load(id: string) {
    this.loading.set(true);
    this.svc.getById(id).subscribe({
      next: s => { this.series.set(s); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  goBack() { const s = this.series(); this.router.navigate(['/meeting-series', s?.id]); }
}