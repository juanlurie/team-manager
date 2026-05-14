import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SlotLocation } from '../../../core/models/slot-location.model';
import { SessionDefinitionSlot, SessionDefinitionBooking } from '../../../core/models/session-definition.model';

export type BookingGridMode = 'create' | 'book' | 'view';

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] as const;

@Component({
  selector: 'app-booking-grid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid-container">
      <!-- Active location chips (create mode only) -->
      @if (mode() === 'create') {
        <div style="margin-bottom:10px">
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
      }

      <!-- Legend (book/view mode) -->
      @if (mode() !== 'create' && locations().length > 0) {
        <div class="legend">
          @for (loc of locations(); track loc.id) {
            <span class="legend-item">
              <span class="dot" [style.background]="loc.color"></span>
              {{ loc.name }}
            </span>
          }
        </div>
      }

      <!-- Week nav -->
      <div class="week-nav">
        <button class="nav-btn" (click)="weekOffset.set(weekOffset() - 1)">
          <span style="font-size:1.1rem">‹</span>
        </button>
        <span class="week-label">Week of {{ weekLabel() }}</span>
        <button class="nav-btn" (click)="weekOffset.set(weekOffset() + 1)">
          <span style="font-size:1.1rem">›</span>
        </button>
      </div>

      <!-- Time grid -->
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
                @let slot = slotMap()[key];
                @let myBooking = slot ? myBookings()[slot.id] : null;
                <div class="grid-cell slot-cell"
                     [class.selectable]="mode() === 'create' && !existingSlotsMap()[key]"
                     [class.selected]="mode() === 'create' && selectedKeys().has(key)"
                     [class.--sel-color]="selectedLocColors()[key]"
                     [style.--sel-color]="selectedLocColors()[key]"
                     [class.slot-available]="mode() === 'book' && slot && !myBooking && !slot.isConfirmed"
                     [class.slot-partial]="mode() === 'book' && slot && !myBooking && !slot.isConfirmed && slot.bookingCount > 0"
                     [class.slot-mine]="mode() === 'book' && !!myBooking"
                     [class.slot-confirmed]="slot?.isConfirmed"
                     [style.--loc-color]="slot?.locationColor || null"
                     (click)="onCellClick(key, slot)">
                  @if (mode() === 'create') {
                    <!-- empty cell -->
                  } @else if (slot) {
                    @if (myBooking) {
                      <span class="mine-label">You</span>
                    } @else if (slot.isConfirmed) {
                      <span class="confirmed-badge">✓ Confirmed</span>
                    } @else {
                      <span class="slot-count" [class.warn]="slot.bookingCount < slot.mandatoryCount">
                        {{ slot.bookingCount }}/{{ slot.mandatoryCount }}
                      </span>
                    }
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .grid-container { width:100%; }
    .section-label { font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.4;font-weight:600;margin-bottom:4px; }
    .chips { display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px; }
    .chip { padding:5px 14px;border-radius:14px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:inherit;font-size:0.8rem;cursor:pointer;transition:all 0.12s;font-family:inherit;display:flex;align-items:center;gap:5px; }
    .chip:hover { border-color:rgba(255,255,255,0.25);background:rgba(255,255,255,0.04); }
    .loc-chip.active { background:color-mix(in srgb, var(--loc-color) 20%, transparent);border-color:color-mix(in srgb, var(--loc-color) 50%, transparent);color:var(--loc-color); }
    .dot { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
    .legend { display:flex;gap:16px;margin-bottom:8px;font-size:0.75rem;opacity:0.6; }
    .legend-item { display:flex;align-items:center;gap:4px; }
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
    .slot-cell { background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);transition:all 0.1s; }
    .slot-cell.selectable { cursor:pointer; }
    .slot-cell.selectable:hover { background:rgba(100,181,246,0.12);border-color:rgba(100,181,246,0.25); }
    .slot-cell.selected { background:color-mix(in srgb, var(--sel-color) 30%, transparent);border-color:var(--sel-color);box-shadow:inset 0 0 0 1px var(--sel-color); }
    .slot-available { background:color-mix(in srgb, var(--loc-color) 25%, transparent);border-color:var(--loc-color);cursor:pointer; }
    .slot-available:hover { filter:brightness(1.2); }
    .slot-partial { background:color-mix(in srgb, var(--loc-color) 35%, transparent);border-color:var(--loc-color);cursor:pointer; }
    .slot-partial:hover { filter:brightness(1.2); }
    .slot-mine { background:rgba(100,181,246,0.08);border-color:rgba(100,181,246,0.3);box-shadow:inset 0 0 0 2px rgba(100,181,246,0.4);cursor:pointer; }
    .slot-mine:hover { filter:brightness(1.1); }
    .slot-confirmed { background:color-mix(in srgb, var(--loc-color) 45%, transparent);border-color:var(--loc-color);cursor:default;opacity:0.85; }
    .mine-label { font-size:0.7rem;color:#64b5f6;font-weight:600; }
    .confirmed-badge { background:rgba(255,215,0,0.15);color:#FFD700;font-size:0.65rem;font-weight:600;padding:2px 6px;border-radius:8px;text-transform:uppercase;letter-spacing:0.05em; }
    .slot-count { font-size:0.68rem;opacity:0.8; }
    .slot-count.warn { color:#ff9800;font-weight:600; }
  `]
})
export class BookingGridComponent {
  mode = input<BookingGridMode>('create');
  locations = input<SlotLocation[]>([]);
  existingSlots = input<SessionDefinitionSlot[]>([]);
  currentMemberId = input<string | null>(null);
  weekOffset = signal(0);
  activeLocationId = signal<string | null>(null);

  cellClicked = output<{ date: string; startTime: string; endTime: string }>();
  slotClicked = output<SessionDefinitionSlot>();
  weekChanged = output<number>();

  readonly weekDays = computed(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const monday = new Date(now);
    monday.setDate(monday.getDate() + (monday.getDay() === 0 ? -6 : 1 - monday.getDay()));
    monday.setDate(monday.getDate() + this.weekOffset() * 7);
    const days: { date: string; name: string; num: string }[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({ date: dateStr, name: d.toLocaleDateString('en-US', { weekday: 'short' }), num: d.getDate().toString() });
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
    const rows: string[] = [];
    for (const h of HOURS) {
      rows.push(`${h.toString().padStart(2, '0')}:00`);
      rows.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return rows;
  });

  readonly existingSlotsMap = computed(() => {
    const map: Record<string, SessionDefinitionSlot> = {};
    for (const slot of this.existingSlots()) {
      const key = `${slot.date}|${slot.startTime}`;
      map[key] = slot;
    }
    return map;
  });

  readonly slotMap = computed(() => this.existingSlotsMap());

  readonly myBookings = computed(() => {
    const map: Record<string, SessionDefinitionBooking> = {};
    const memberId = this.currentMemberId();
    if (!memberId) return map;
    for (const slot of this.existingSlots()) {
      for (const booking of slot.bookings) {
        if (booking.teamMemberId === memberId) {
          map[slot.id] = booking;
        }
      }
    }
    return map;
  });

  selectedKeys = signal<Set<string>>(new Set());
  selectedLocColors = computed(() => {
    const map: Record<string, string> = {};
    const locs = this.locations();
    const activeId = this.activeLocationId();
    if (activeId) {
      const loc = locs.find(l => l.id === activeId);
      if (loc) {
        for (const key of this.selectedKeys()) map[key] = loc.color;
      }
    }
    return map;
  });

  onCellClick(key: string, slot: SessionDefinitionSlot | undefined) {
    if (this.mode() === 'create') {
      if (this.existingSlotsMap()[key]) return;
      const set = new Set(this.selectedKeys());
      if (set.has(key)) set.delete(key);
      else set.add(key);
      this.selectedKeys.set(set);
      if (set.has(key)) {
        const [date, startTime] = key.split('|');
        const [h, m] = startTime.split(':').map(Number);
        const endMin = h * 60 + m + 30;
        this.cellClicked.emit({
          date,
          startTime,
          endTime: `${Math.floor(endMin / 60).toString().padStart(2, '0')}:${(endMin % 60).toString().padStart(2, '0')}`
        });
      }
    } else if (this.mode() === 'book' && slot) {
      if (slot.isConfirmed) return;
      this.slotClicked.emit(slot);
    }
  }
}
