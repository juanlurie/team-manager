import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MeetingSeriesService } from '../../core/services/meeting-series.service';
import { MeetingSeries, SetMyAvailabilityRequest } from '../../core/models/meeting-series.model';

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] as const;
type SlotKey = string;

@Component({
  selector: 'app-my-availability',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      @if (loading()) {
        <div class="spinner-wrap"><mat-spinner diameter="40"></mat-spinner></div>
      } @else if (!series()) {
        <div class="error-state">
          <h2>Series not found</h2>
          <button mat-stroked-button (click)="goBack()">Back to Series</button>
        </div>
      } @else if (series()!.slots.length === 0) {
        <div class="empty-state">
          <mat-icon style="font-size:48px;width:48px;height:48px;opacity:0.3">event_busy</mat-icon>
          <h2>No slots available</h2>
          <p>No availability slots have been created for this series yet.</p>
          <button mat-stroked-button (click)="router.navigate(['/meeting-series', series()!.id, 'slots'])">
            Go to Add Slots
          </button>
        </div>
      } @else {
        @let s = series()!;

        <div class="breadcrumb">
          <a (click)="router.navigate(['/meeting-series'])">Meeting Series</a>
          <span> &rsaquo; </span>
          <a (click)="router.navigate(['/meeting-series', s.id])">{{ s.title }}</a>
          <span> &rsaquo; </span>
          <span>Set Your Availability</span>
        </div>

        <div class="header">
          <h2>{{ s.title }} &mdash; Set Your Availability</h2>
          <div class="meta">Select the times you are available. These will apply to all {{ s.items.length }} meeting item(s).</div>
        </div>

        <div class="section">
          <div class="section-label">Select Your Available Slots</div>
          <div class="week-nav">
            <button class="nav-btn" (click)="weekOffset.set(weekOffset() - 1)">&#8249;</button>
            <span class="week-label">Week of {{ weekLabel() }}</span>
            <button class="nav-btn" (click)="weekOffset.set(weekOffset() + 1)">&#8250;</button>
          </div>

          <div class="grid-wrap">
            <div class="grid">
              <div class="grid-row header-row">
                <div class="grid-cell time-cell"></div>
                @for (day of weekDays(); track day.date) {
                  <div class="grid-cell day-header">
                    <div class="day-name">{{ day.name }}</div>
                    <div class="day-num">{{ day.num }}</div>
                  </div>
                }
              </div>
              @for (row of timeRows(); track row) {
                <div class="grid-row">
                  <div class="grid-cell time-cell">{{ row }}</div>
                  @for (day of weekDays(); track day.date) {
                    @let key = day.date + '|' + row;
                    @let slot = slotByKey()[key];
                    @let isSelected = selectedSlots().has(key);
                    @let locColor = slot ? locationMap()[slot.locationId ?? ''] : null;
                    <div class="grid-cell slot-cell"
                         [class.selected]="isSelected"
                         [class.has-slot]="!!slot"
                         [style.--sel-color]="locColor"
                         (click)="slot && toggleSlot(key)">
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <div class="summary">
            @for (loc of locationsInSlots(); track loc.id) {
              @let count = countByLocation()[loc.id] ?? 0;
              @if (count > 0) {
                <span class="summary-loc">
                  <span class="dot" [style.background]="loc.color"></span>
                  {{ loc.name }}: {{ count }}
                </span>
              }
            }
            @if (selectedCount() > 0) {
              <span class="clear-btn" (click)="clearSlots()">Clear all</span>
            } @else {
              <span style="opacity:0.5">No slots selected</span>
            }
          </div>
        </div>

        <div class="bottom-row">
          <button mat-stroked-button (click)="goBack()">Cancel</button>
          <button mat-raised-button color="primary" [disabled]="!canSave() || saving()" (click)="save()">
            @if (saving()) {
              <mat-spinner diameter="18" style="display:inline-block;margin-right:8px"></mat-spinner>
            }
            Save
          </button>
        </div>

        @if (error()) {
          <div class="error">{{ error() }}</div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .page { max-width:900px;margin:0 auto;padding:8px; }
    .spinner-wrap { display:flex;justify-content:center;padding:60px; }
    .error-state { text-align:center;padding:60px; }
    .error-state h2 { margin:12px 0 8px; }
    .empty-state { text-align:center;padding:60px;display:flex;flex-direction:column;align-items:center;gap:8px; }
    .empty-state h2 { margin:12px 0 8px; }
    .empty-state p { opacity:0.5;margin-bottom:16px; }
    .breadcrumb { font-size:0.75rem;opacity:0.5;margin-bottom:8px; }
    .breadcrumb a { color:#64b5f6;cursor:pointer; }
    .breadcrumb a:hover { text-decoration:underline; }
    .header { margin-bottom:16px; }
    .header h2 { margin:0;font-size:1.2rem;font-weight:700; }
    .meta { font-size:0.82rem;opacity:0.5;margin-top:4px; }
    .section { margin-bottom:16px;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02); }
    .section-label { font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.4;font-weight:600;margin-bottom:8px; }
    .week-nav { display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:10px;padding:6px 0; }
    .nav-btn { width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,0.1);background:transparent;color:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.12s; }
    .nav-btn:hover { background:rgba(255,255,255,0.06); }
    .week-label { font-size:0.85rem;font-weight:600;min-width:160px;text-align:center; }
    .grid-wrap { overflow-x:auto;margin-bottom:8px; }
    .grid { display:inline-flex;flex-direction:column;gap:1px;min-width:100%; }
    .grid-row { display:flex;gap:1px; }
    .grid-cell { width:64px;height:28px;display:flex;align-items:center;justify-content:center;font-size:0.72rem;border-radius:3px;flex-shrink:0; }
    .time-cell { width:44px;justify-content:flex-end;padding-right:6px;opacity:0.45;font-size:0.68rem; }
    .day-header { flex-direction:column;gap:0;height:40px; }
    .day-name { font-size:0.68rem;text-transform:uppercase;opacity:0.5; }
    .day-num { font-size:0.9rem;font-weight:700; }
    .slot-cell { background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);cursor:pointer;transition:all 0.1s; }
    .slot-cell.has-slot:hover { background:rgba(100,181,246,0.12);border-color:rgba(100,181,246,0.25); }
    .slot-cell:not(.has-slot) { cursor:default;opacity:0.3; }
    .slot-cell.selected { background:color-mix(in srgb, var(--sel-color) 30%, transparent);border-color:var(--sel-color);box-shadow:inset 0 0 0 1px var(--sel-color); }
    .slot-cell.selected.has-slot:hover { background:color-mix(in srgb, var(--sel-color) 40%, transparent); }
    .summary { font-size:0.78rem;opacity:0.6;display:flex;gap:12px;align-items:center;flex-wrap:wrap; }
    .summary-loc { display:flex;align-items:center;gap:4px; }
    .clear-btn { cursor:pointer;color:#64b5f6;text-decoration:underline;font-size:0.72rem;margin-left:auto; }
    .bottom-row { display:flex;gap:10px;align-items:center;margin-top:16px; }
    .error { color:#ef5350;font-size:0.82rem;margin-top:6px; }
    .dot { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
  `]
})
export class MyAvailabilityComponent implements OnInit {
  private route = inject(ActivatedRoute);
  router = inject(Router);
  private svc = inject(MeetingSeriesService);
  private snack = inject(MatSnackBar);

  series = signal<MeetingSeries | null>(null);
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  weekOffset = signal(0);
  selectedSlots = signal<Set<SlotKey>>(new Set());

  locationMap = computed(() => {
    const s = this.series();
    if (!s) return {};
    const map: Record<string, string> = {};
    for (const slot of s.slots) {
      if (slot.locationId && slot.locationColor) {
        map[slot.locationId] = slot.locationColor;
      }
    }
    return map;
  });

  locationsInSlots = computed(() => {
    const s = this.series();
    if (!s) return [];
    const seen = new Set<string>();
    const locs: { id: string; name: string; color: string }[] = [];
    for (const slot of s.slots) {
      if (slot.locationId && !seen.has(slot.locationId)) {
        seen.add(slot.locationId);
        locs.push({ id: slot.locationId, name: slot.locationName ?? 'Unknown', color: slot.locationColor ?? '#64b5f6' });
      }
    }
    return locs;
  });

  slotByKey = computed(() => {
    const s = this.series();
    if (!s) return {};
    const map: Record<SlotKey, typeof s.slots[0]> = {};
    for (const slot of s.slots) {
      const key = slot.date + '|' + slot.startTime;
      map[key] = slot;
    }
    return map;
  });

  readonly weekDays = computed(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const monday = new Date(now);
    monday.setDate(monday.getDate() + (monday.getDay() === 0 ? -6 : 1 - monday.getDay()));
    monday.setDate(monday.getDate() + this.weekOffset() * 7);
    const days: { date: string; name: string; num: string }[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      days.push({ date: d.toISOString().split('T')[0], name: d.toLocaleDateString('en-US', { weekday: 'short' }), num: d.getDate().toString() });
    }
    return days;
  });

  readonly weekLabel = computed(() => {
    const days = this.weekDays();
    if (days.length === 0) return '';
    const d = new Date(days[0].date + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  });

  readonly timeRows = computed(() => {
    const s = this.series();
    if (!s) return [];
    const days = this.weekDays();
    const dayDates = new Set(days.map(d => d.date));
    const rows = new Set<string>();
    for (const slot of s.slots) {
      if (dayDates.has(slot.date)) {
        rows.add(slot.startTime);
      }
    }
    return [...rows].sort();
  });

  readonly selectedCount = computed(() => this.selectedSlots().size);

  readonly countByLocation = computed(() => {
    const slots = this.slotByKey();
    const counts: Record<string, number> = {};
    for (const key of this.selectedSlots()) {
      const slot = slots[key];
      if (slot && slot.locationId) {
        counts[slot.locationId] = (counts[slot.locationId] || 0) + 1;
      }
    }
    return counts;
  });

  readonly canSave = computed(() => this.selectedCount() > 0);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.load(id);
    });
  }

  load(seriesId: string) {
    this.loading.set(true);
    this.error.set(null);

    this.svc.getById(seriesId).subscribe({
      next: series => {
        this.series.set(series);
        this.svc.getMyAvailability(seriesId).subscribe({
          next: slotIds => {
            const slotsByKey = this.slotByKey();
            const selected = new Set<SlotKey>();
            for (const slotId of slotIds) {
              for (const [key, slot] of Object.entries(slotsByKey)) {
                if (slot.id === slotId) {
                  selected.add(key);
                }
              }
            }
            this.selectedSlots.set(selected);
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
          }
        });
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load series');
      }
    });
  }

  toggleSlot(key: SlotKey) {
    const slots = this.slotByKey();
    if (!slots[key]) return;
    const set = new Set(this.selectedSlots());
    if (set.has(key)) set.delete(key);
    else set.add(key);
    this.selectedSlots.set(set);
  }

  clearSlots() {
    this.selectedSlots.set(new Set());
  }

  goBack() {
    const s = this.series();
    this.router.navigate(['/meeting-series', s?.id ?? '']);
  }

  save() {
    const s = this.series();
    if (!s) return;
    const slotsByKey = this.slotByKey();
    const slotIds: string[] = [];
    for (const key of this.selectedSlots()) {
      const slot = slotsByKey[key];
      if (slot) slotIds.push(slot.id);
    }
    if (slotIds.length === 0) { this.error.set('Select at least one slot'); return; }

    this.saving.set(true);
    this.error.set(null);

    const request: SetMyAvailabilityRequest = { slotIds };
    this.svc.setMyAvailability(s.id, request).subscribe({
      next: () => {
        this.snack.open('Availability saved!', 'OK', { duration: 2000 });
        this.router.navigate(['/meeting-series', s.id]);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Failed to save availability. Please try again.');
      }
    });
  }
}
