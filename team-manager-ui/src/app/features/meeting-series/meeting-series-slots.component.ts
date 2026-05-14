import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MeetingSeriesService } from '../../core/services/meeting-series.service';
import { SlotLocationService } from '../../core/services/slot-location.service';
import { SlotLocation } from '../../core/models/slot-location.model';
import { MeetingSeries, CreateMeetingSeriesSlotRequest } from '../../core/models/meeting-series.model';

const DURATIONS = [15, 30, 45, 60, 90] as const;
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] as const;
type SlotKey = string;

@Component({
  selector: 'app-meeting-series-slots',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <div class="page">
      @if (!series()) {
        <div class="loading">Loading...</div>
      } @else {
        @let s = series()!;

        <div class="breadcrumb">
          <a (click)="router.navigate(['/meeting-series'])">Meeting Series</a>
          <span> › </span>
          <a (click)="router.navigate(['/meeting-series', s.id])">{{ s.title }}</a>
          <span> › </span>
          <span>Add Slots</span>
        </div>

        <div class="header">
          <h2>{{ s.title }} — Add Slots</h2>
        </div>

        <div class="section">
          <div class="section-label">Slot Duration</div>
          <div class="chips">
            @for (d of durations; track d) {
              <button class="chip" [class.active]="duration() === d" (click)="pickDuration(d)">
                {{ d }}m
              </button>
            }
          </div>
        </div>

        <div class="section">
          <div class="section-label">Active Location</div>
          <div class="chips">
            @for (loc of locations(); track loc.id) {
              <button class="chip loc-chip"
                      [class.active]="activeLocationId() === loc.id"
                      [style.--loc-color]="loc.color"
                      (click)="activeLocationId.set(loc.id)">
                <span class="dot" [style.background]="loc.color"></span>
                {{ loc.name }}
              </button>
            }
          </div>
        </div>

        <div class="section">
          <div class="section-label">Select Availability Slots</div>
          <div class="week-nav">
            <button class="nav-btn" (click)="weekOffset.set(weekOffset() - 1)">‹</button>
            <span class="week-label">Week of {{ weekLabel() }}</span>
            <button class="nav-btn" (click)="weekOffset.set(weekOffset() + 1)">›</button>
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
                    @let locId = selectedSlots().get(key);
                    @let locColor = locId ? locationMap()[locId] : null;
                    <div class="grid-cell slot-cell"
                         [class.selected]="!!locId"
                         [style.--sel-color]="locColor"
                         (click)="toggleSlot(key)">
                    </div>
                  }
                </div>
              }
            </div>
          </div>

          <div class="summary">
            @for (loc of locations(); track loc.id) {
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
          <button mat-raised-button color="primary" [disabled]="!canCreate()" (click)="save()">
            Add Slots
          </button>
        </div>

        @if (error()) {
          <div class="error">{{ error() }}</div>
        }
      }
    </div>
  `,
  styles: [`
    .page { max-width:900px;margin:0 auto;padding:8px; }
    .loading { text-align:center;padding:40px;opacity:0.5; }
    .breadcrumb { font-size:0.75rem;opacity:0.5;margin-bottom:8px; }
    .breadcrumb a { color:#64b5f6;cursor:pointer; }
    .breadcrumb a:hover { text-decoration:underline; }
    .header { margin-bottom:16px; }
    .header h2 { margin:0;font-size:1.2rem;font-weight:700; }
    .section { margin-bottom:16px;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02); }
    .section-label { font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.4;font-weight:600;margin-bottom:8px; }
    .chips { display:flex;gap:4px;flex-wrap:wrap; }
    .chip {
      padding:5px 14px;border-radius:14px;border:1px solid rgba(255,255,255,0.12);
      background:transparent;color:inherit;font-size:0.8rem;cursor:pointer;transition:all 0.12s;
      font-family:inherit;display:flex;align-items:center;gap:5px;
    }
    .chip:hover { border-color:rgba(255,255,255,0.25);background:rgba(255,255,255,0.04); }
    .chip.active { background:rgba(100,181,246,0.2);border-color:rgba(100,181,246,0.5);color:#64b5f6; }
    .loc-chip.active { background:color-mix(in srgb, var(--loc-color) 20%, transparent);border-color:color-mix(in srgb, var(--loc-color) 50%, transparent);color:var(--loc-color); }
    .dot { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
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
    .slot-cell:hover { background:rgba(100,181,246,0.12);border-color:rgba(100,181,246,0.25); }
    .slot-cell.selected { background:color-mix(in srgb, var(--sel-color) 30%, transparent);border-color:var(--sel-color);box-shadow:inset 0 0 0 1px var(--sel-color); }
    .summary { font-size:0.78rem;opacity:0.6;display:flex;gap:12px;align-items:center;flex-wrap:wrap; }
    .summary-loc { display:flex;align-items:center;gap:4px; }
    .clear-btn { cursor:pointer;color:#64b5f6;text-decoration:underline;font-size:0.72rem;margin-left:auto; }
    .bottom-row { display:flex;gap:10px;align-items:center;margin-top:16px; }
    .error { color:#ef5350;font-size:0.82rem;margin-top:6px; }
  `]
})
export class MeetingSeriesSlotsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  router = inject(Router);
  private svc = inject(MeetingSeriesService);
  private locSvc = inject(SlotLocationService);
  private snack = inject(MatSnackBar);

  series = signal<MeetingSeries | null>(null);
  locations = signal<SlotLocation[]>([]);
  duration = signal<number>(30);
  weekOffset = signal(0);
  activeLocationId = signal<string | null>(null);
  selectedSlots = signal<Map<SlotKey, string>>(new Map());
  error = signal<string | null>(null);
  durations = DURATIONS;

  locationMap = computed(() => {
    const map: Record<string, string> = {};
    for (const loc of this.locations()) map[loc.id] = loc.color;
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
    const step = this.duration();
    const rows: string[] = [];
    for (const h of HOURS) {
      for (let m = 0; m < 60; m += step) {
        rows.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return rows;
  });

  readonly selectedCount = computed(() => this.selectedSlots().size);
  readonly countByLocation = computed(() => {
    const counts: Record<string, number> = {};
    for (const locId of this.selectedSlots().values()) counts[locId] = (counts[locId] || 0) + 1;
    return counts;
  });
  readonly canCreate = computed(() => this.selectedCount() > 0);

  ngOnInit() {
    this.locSvc.getAll(true).subscribe(locs => {
      this.locations.set(locs);
      if (locs.length > 0 && !this.activeLocationId()) this.activeLocationId.set(locs[0].id);
    });
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.load(id);
    });
  }

  load(id: string) {
    this.svc.getById(id).subscribe({
      next: item => this.series.set(item),
      error: () => this.router.navigate(['/meeting-series'])
    });
  }

  pickDuration(d: number) {
    if (this.selectedCount() > 0) {
      if (confirm('Changing the duration will clear all selected slots. Continue?')) {
        this.duration.set(d);
        this.selectedSlots.set(new Map());
      }
    } else {
      this.duration.set(d);
    }
  }

  toggleSlot(key: SlotKey) {
    const map = new Map(this.selectedSlots());
    if (map.has(key)) map.delete(key);
    else {
      const locId = this.activeLocationId();
      if (!locId) return;
      map.set(key, locId);
    }
    this.selectedSlots.set(map);
  }

  clearSlots() { this.selectedSlots.set(new Map()); }
  goBack() { const s = this.series(); this.router.navigate(['/meeting-series', s?.id]); }

  save() {
    const s = this.series();
    if (!s) return;
    const slots: CreateMeetingSeriesSlotRequest[] = [];
    const dur = this.duration();
    let sortOrder = s.slots.length;
    for (const [key, slotLocId] of this.selectedSlots()) {
      const [date, startTime] = key.split('|');
      const [h, m] = startTime.split(':').map(Number);
      const totalMin = h * 60 + m + dur;
      slots.push({
        date, startTime,
        endTime: `${Math.floor(totalMin / 60).toString().padStart(2, '0')}:${(totalMin % 60).toString().padStart(2, '0')}`,
        locationId: slotLocId, sortOrder: sortOrder++
      });
    }
    if (slots.length === 0) { this.error.set('Select at least one slot'); return; }
    this.svc.createSlots(s.id, { slots }).subscribe({
      next: () => { this.snack.open('Slots added!', 'OK', { duration: 2000 }); this.router.navigate(['/meeting-series', s.id]); },
      error: () => this.error.set('Failed to add slots')
    });
  }
}