import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MeetingSeriesService } from '../../core/services/meeting-series.service';
import { SlotLocationService } from '../../core/services/slot-location.service';
import { MeetingSeries, MeetingSeriesItem, CreateMeetingSeriesSlotRequest } from '../../core/models/meeting-series.model';
import { SlotLocation } from '../../core/models/slot-location.model';

type SlotKey = string;

@Component({
  selector: 'app-meeting-series-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      @if (loading()) {
        <div class="spinner-wrap"><mat-spinner diameter="40"></mat-spinner></div>
      } @else if (!series()) {
        <div class="error-state">
          <h2>Series not found</h2>
          <button mat-stroked-button (click)="router.navigate(['/meeting-series'])">Back to Series</button>
        </div>
      } @else {
        @let s = series()!;

        <div class="breadcrumb">
          <a (click)="router.navigate(['/meeting-series'])">Meeting Series</a>
          <span> › </span>
          <span>{{ s.title }}</span>
        </div>

        <div class="header">
          <div>
            <h2>{{ s.title }}</h2>
            @if (s.description) {
              <p class="desc">{{ s.description }}</p>
            }
            <div class="meta">
              Created by {{ s.createdByMemberName }} · {{ s.createdAt | date:'mediumDate' }}
              <span class="status-badge" [class.status-active]="s.isActive" [class.status-inactive]="!s.isActive">
                {{ s.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </div>
          <div class="header-actions">
            <button mat-stroked-button (click)="deleteSeries()">
              <mat-icon>delete</mat-icon> Delete
            </button>
          </div>
        </div>

        <div class="section">
          <div class="section-header">
            <div class="section-label">Availability Slots ({{ s.slots.length }})</div>
            <button mat-stroked-button class="edit-toggle" (click)="toggleEditMode()">
              <mat-icon>{{ editMode() ? 'visibility' : 'edit' }}</mat-icon>
              {{ editMode() ? 'Done' : 'Edit' }}
            </button>
          </div>

          @if (editMode()) {
            <div class="edit-section">
              <div class="section-sublabel">Slot Duration</div>
              <div class="chips">
                @for (d of durations; track d) {
                  <button class="chip" [class.active]="editDuration() === d" (click)="pickDuration(d)">
                    {{ d }}m
                  </button>
                }
              </div>

              <div class="section-sublabel" style="margin-top:12px">Active Location</div>
              <div class="chips">
                @for (loc of locations(); track loc.id) {
                  <button class="chip loc-chip"
                          [class.active]="editActiveLocationId() === loc.id"
                          [style.--loc-color]="loc.color"
                          (click)="editActiveLocationId.set(loc.id)">
                    <span class="dot" [style.background]="loc.color"></span>
                    {{ loc.name }}
                  </button>
                }
              </div>
            </div>
          }

          @if (s.slots.length === 0 && !editMode()) {
            <div class="empty-slots">
              <p>No availability slots defined yet.</p>
              <span>Add time windows so team members can indicate their availability.</span>
              <div style="margin-top:12px">
                <button mat-raised-button color="primary" (click)="toggleEditMode()">
                  <mat-icon>add</mat-icon> Add Slots
                </button>
              </div>
            </div>
          } @else {
            <div class="week-nav">
              <button class="nav-btn" (click)="editWeekOffset.set(editWeekOffset() - 1)">‹</button>
              <span class="week-label">Week of {{ editWeekLabel() }}</span>
              <button class="nav-btn" (click)="editWeekOffset.set(editWeekOffset() + 1)">›</button>
            </div>

            <div class="grid-wrap">
              <div class="grid">
                <div class="grid-row header-row">
                  <div class="grid-cell time-cell"></div>
                  @for (day of editWeekDays(); track day.date) {
                    <div class="grid-cell day-header">
                      <div class="day-name">{{ day.name }}</div>
                      <div class="day-num">{{ day.num }}</div>
                    </div>
                  }
                </div>
                @for (row of editTimeRows(); track row) {
                  <div class="grid-row">
                    <div class="grid-cell time-cell">{{ row }}</div>
                    @for (day of editWeekDays(); track day.date) {
                      @let key = day.date + '|' + row;
                      @let locId = editSelectedSlots().get(key);
                      @let locColor = locId ? editLocationMap()[locId] : null;
                      <div class="grid-cell slot-cell"
                           [class.selected]="!!locId"
                           [class.existing]="isExistingSlot(key)"
                           [class.readonly]="!editMode()"
                           [style.--sel-color]="locColor"
                           (click)="editMode() && toggleEditSlot(key)">
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

            @if (editMode()) {
              <div class="summary">
                @for (loc of locations(); track loc.id) {
                  @let count = editCountByLocation()[loc.id] ?? 0;
                  @if (count > 0) {
                    <span class="summary-loc">
                      <span class="dot" [style.background]="loc.color"></span>
                      {{ loc.name }}: {{ count }} new
                    </span>
                  }
                }
                @if (editSelectedCount() > 0) {
                  <span class="clear-btn" (click)="clearEditSlots()">Clear new</span>
                  <span class="save-btn" (click)="saveEditSlots()">Save {{ editSelectedCount() }} new slot(s)</span>
                }
              </div>
            }
          }
        </div>

        <div class="section">
          <div class="section-label">Meeting Items ({{ s.items.length }})</div>
          <div class="slot-actions" style="margin-bottom:12px">
            <button mat-raised-button color="primary" (click)="router.navigate(['/meeting-series', s.id, 'items', 'create'])">
              <mat-icon>add</mat-icon> Create Item
            </button>
          </div>
          @if (s.items.length === 0) {
            <div class="empty-items">
              <p>No meeting items yet.</p>
              <span>Create individual meetings and assign participants.</span>
            </div>
          } @else {
            <div class="item-list">
              @for (item of s.items; track item.id) {
                <div class="item-card" (click)="router.navigate(['/meeting-series', s.id, 'items', item.id])">
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                      <span class="item-icon">{{ item.isConfirmed ? '✅' : '⬜' }}</span>
                      <span style="font-weight:500;font-size:0.9rem">{{ item.title }}</span>
                      <span class="item-status" [class.confirmed]="item.isConfirmed">
                        {{ item.isConfirmed ? 'Confirmed' : 'Pending' }}
                      </span>
                    </div>
                    <div style="font-size:0.78rem;opacity:0.5;margin-top:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                      <span>Mandatory: {{ mandatoryCount(item) }}</span>
                      <span>·</span>
                      <span>Optional: {{ optionalCount(item) }}</span>
                      <span>·</span>
                      <span>{{ mandatoryFilledCount(item) }}/{{ mandatoryCount(item) }} filled</span>
                    </div>
                    @if (item.isConfirmed && item.confirmedSlotId) {
                      <div style="font-size:0.75rem;color:#81c784;margin-top:4px">
                        ✓ Confirmed slot
                      </div>
                    }
                  </div>
                  <button mat-icon-button style="flex-shrink:0" (click)="$event.stopPropagation(); deleteItem(item.id)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              }
            </div>
          }
        </div>

        <div class="section availability-action">
          <button mat-raised-button color="primary" [routerLink]="['/meeting-series', s.id, 'availability']">
            <mat-icon>event_available</mat-icon> Set My Availability
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width:900px;margin:0 auto;padding:8px; }
    .spinner-wrap { display:flex;justify-content:center;padding:60px; }
    .error-state { text-align:center;padding:60px; }
    .breadcrumb { font-size:0.75rem;opacity:0.5;margin-bottom:8px; }
    .breadcrumb a { color:#64b5f6;cursor:pointer; }
    .breadcrumb a:hover { text-decoration:underline; }
    .header { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px; }
    .header h2 { margin:0;font-size:1.3rem;font-weight:700; }
    .desc { margin:4px 0 0;font-size:0.85rem;opacity:0.6; }
    .meta { font-size:0.78rem;opacity:0.4;margin-top:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap; }
    .header-actions { display:flex;gap:8px; }
    .section { margin-bottom:16px;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02); }
    .section-label { font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.4;font-weight:600;margin-bottom:8px; }
    .section-header { display:flex;justify-content:space-between;align-items:center;margin-bottom:8px; }
    .edit-toggle { font-size:0.75rem;height:32px; }
    .status-badge {
      font-size:0.65rem;font-weight:600;padding:2px 8px;border-radius:10px;
      text-transform:uppercase;letter-spacing:0.05em;
    }
    .status-active { background:rgba(76,175,80,0.15);color:#81c784; }
    .status-inactive { background:rgba(158,158,158,0.15);color:#bdbdbd; }
    .empty-slots,.empty-items { text-align:center;padding:30px; }
    .empty-slots p,.empty-items p { margin:0 0 4px;font-weight:600; }
    .empty-slots span,.empty-items span { font-size:0.82rem;opacity:0.5; }
    .slot-list { display:flex;flex-direction:column;gap:4px;margin-bottom:12px; }
    .slot-row { display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:6px;background:rgba(255,255,255,0.03); }
    .slot-info { display:flex;align-items:center;gap:6px;font-size:0.82rem; }
    .slot-date { font-weight:600; }
    .slot-time { opacity:0.6; }
    .slot-loc-dot { width:6px;height:6px;border-radius:50%; }
    .slot-loc { opacity:0.5;font-size:0.75rem; }
    .slot-actions { display:flex;gap:8px; }
    .item-list { display:flex;flex-direction:column;gap:6px; }
    .item-card {
      display:flex;align-items:center;padding:10px 12px;border-radius:8px;gap:12px;
      background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
      cursor:pointer;transition:background 0.15s;
    }
    .item-card:hover { background:rgba(255,255,255,0.06); }
    .item-icon { font-size:1rem; }
    .item-status { font-size:0.65rem;font-weight:600;padding:2px 8px;border-radius:10px;text-transform:uppercase; }
    .item-status.confirmed { background:rgba(76,175,80,0.15);color:#81c784; }
    .availability-action { display:flex;justify-content:center;padding:20px; }
    .edit-section { margin-top:8px; }
    .section-sublabel { font-size:0.72rem;font-weight:600;opacity:0.6;margin-bottom:6px; }
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
    .week-nav { display:flex;align-items:center;justify-content:center;gap:12px;margin:10px 0;padding:6px 0; }
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
    .slot-cell.readonly { cursor:default; }
    .slot-cell.readonly:not(.existing):hover { background:rgba(255,255,255,0.04);border-color:rgba(255,255,255,0.06); }
    .slot-cell:hover { background:rgba(100,181,246,0.12);border-color:rgba(100,181,246,0.25); }
    .slot-cell.selected { background:color-mix(in srgb, var(--sel-color) 30%, transparent);border-color:var(--sel-color);box-shadow:inset 0 0 0 1px var(--sel-color); }
    .slot-cell.existing { background:rgba(100,181,246,0.08);border:1px solid rgba(100,181,246,0.2); }
    .summary { font-size:0.78rem;opacity:0.6;display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:8px; }
    .summary-loc { display:flex;align-items:center;gap:4px; }
    .clear-btn { cursor:pointer;color:#ef5350;text-decoration:underline;font-size:0.72rem;margin-left:auto; }
    .save-btn { cursor:pointer;color:#64b5f6;font-weight:600;font-size:0.78rem;margin-left:auto; }
  `]
})
export class MeetingSeriesDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(MeetingSeriesService);
  private locSvc = inject(SlotLocationService);
  private snack = inject(MatSnackBar);
  router = inject(Router);

  series = signal<MeetingSeries | null>(null);
  loading = signal(true);
  locations = signal<SlotLocation[]>([]);
  editMode = signal(false);
  editDuration = signal<number>(30);
  editWeekOffset = signal(0);
  editActiveLocationId = signal<string | null>(null);
  editSelectedSlots = signal<Map<SlotKey, string>>(new Map());
  durations = [15, 30, 45, 60, 90] as const;
  hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] as const;

  editLocationMap = computed(() => {
    const map: Record<string, string> = {};
    for (const loc of this.locations()) map[loc.id] = loc.color;
    return map;
  });

  editWeekDays = computed(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const monday = new Date(now);
    monday.setDate(monday.getDate() + (monday.getDay() === 0 ? -6 : 1 - monday.getDay()));
    monday.setDate(monday.getDate() + this.editWeekOffset() * 7);
    const days: { date: string; name: string; num: string }[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      days.push({ date: d.toISOString().split('T')[0], name: d.toLocaleDateString('en-US', { weekday: 'short' }), num: d.getDate().toString() });
    }
    return days;
  });

  editWeekLabel = computed(() => {
    const days = this.editWeekDays();
    if (days.length === 0) return '';
    const d = new Date(days[0].date + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  });

  editTimeRows = computed(() => {
    const step = this.editDuration();
    const rows: string[] = [];
    for (const h of this.hours) {
      for (let m = 0; m < 60; m += step) {
        rows.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return rows;
  });

  editSelectedCount = computed(() => this.editSelectedSlots().size);
  editCountByLocation = computed(() => {
    const counts: Record<string, number> = {};
    for (const locId of this.editSelectedSlots().values()) counts[locId] = (counts[locId] || 0) + 1;
    return counts;
  });

  ngOnInit() {
    this.locSvc.getAll(true).subscribe(locs => {
      this.locations.set(locs);
      if (locs.length > 0 && !this.editActiveLocationId()) this.editActiveLocationId.set(locs[0].id);
    });
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.load(id);
    });
  }

  load(id: string) {
    this.loading.set(true);
    this.svc.getById(id).subscribe({
      next: item => {
        this.series.set(item);
        const dur = this.inferDuration(item.slots);
        this.editDuration.set(dur);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private inferDuration(slots: { startTime: string; endTime: string }[]): number {
    if (slots.length === 0) return 30;
    const [sh, sm] = slots[0].startTime.split(':').map(Number);
    const [eh, em] = slots[0].endTime.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    const known = [15, 30, 45, 60, 90] as const;
    return known.includes(diff as any) ? diff : 30;
  }

  toggleEditMode() {
    this.editMode.set(!this.editMode());
    if (this.editMode()) {
      this.editSelectedSlots.set(new Map());
      this.editWeekOffset.set(0);
      const s = this.series();
      if (s) {
        const dur = this.inferDuration(s.slots);
        this.editDuration.set(dur);
      }
    }
  }

  pickDuration(d: number) {
    if (this.editSelectedCount() > 0) {
      if (confirm('Changing the duration will clear all selected slots. Continue?')) {
        this.editDuration.set(d);
        this.editSelectedSlots.set(new Map());
      }
    } else {
      this.editDuration.set(d);
    }
  }

  existingSlotKeys = computed(() => {
    const s = this.series();
    if (!s) return new Set<string>();
    const keys = new Set<string>();
    for (const slot of s.slots) {
      keys.add(slot.date + '|' + slot.startTime);
    }
    return keys;
  });

  isExistingSlot(key: string): boolean {
    return this.existingSlotKeys().has(key);
  }

  toggleEditSlot(key: SlotKey) {
    if (this.isExistingSlot(key)) return;
    const map = new Map(this.editSelectedSlots());
    if (map.has(key)) map.delete(key);
    else {
      const locId = this.editActiveLocationId();
      if (!locId) return;
      map.set(key, locId);
    }
    this.editSelectedSlots.set(map);
  }

  clearEditSlots() { this.editSelectedSlots.set(new Map()); }

  saveEditSlots() {
    const s = this.series();
    if (!s) return;
    const slots: CreateMeetingSeriesSlotRequest[] = [];
    const dur = this.editDuration();
    let sortOrder = s.slots.length;
    for (const [key, slotLocId] of this.editSelectedSlots()) {
      const [date, startTime] = key.split('|');
      const [h, m] = startTime.split(':').map(Number);
      const totalMin = h * 60 + m + dur;
      slots.push({
        date, startTime,
        endTime: `${Math.floor(totalMin / 60).toString().padStart(2, '0')}:${(totalMin % 60).toString().padStart(2, '0')}`,
        locationId: slotLocId, sortOrder: sortOrder++
      });
    }
    if (slots.length === 0) return;
    this.svc.createSlots(s.id, { slots }).subscribe({
      next: () => {
        this.snack.open('Slots added!', 'OK', { duration: 2000 });
        this.editSelectedSlots.set(new Map());
        this.load(s.id);
      },
      error: () => this.snack.open('Failed to add slots', 'OK', { duration: 2000 })
    });
  }

  mandatoryCount(item: MeetingSeriesItem): number {
    return item.participants.filter(p => p.role === 'Mandatory').length;
  }

  optionalCount(item: MeetingSeriesItem): number {
    return item.participants.filter(p => p.role === 'Optional').length;
  }

  mandatoryFilledCount(item: MeetingSeriesItem): number {
    const mandatoryIds = new Set(item.participants.filter(p => p.role === 'Mandatory').map(p => p.teamMemberId));
    const bookedIds = new Set(item.availabilities.map(a => a.teamMemberId));
    return [...mandatoryIds].filter(id => bookedIds.has(id)).length;
  }

  deleteSeries() {
    const s = this.series();
    if (!s) return;
    if (!confirm(`Delete "${s.title}"? This will also delete all items and connected meetings.`)) return;
    this.svc.delete(s.id).subscribe({
      next: () => { this.snack.open('Series deleted', 'OK', { duration: 2000 }); this.router.navigate(['/meeting-series']); },
      error: () => this.snack.open('Failed to delete', 'OK', { duration: 2000 })
    });
  }

  deleteSlot(slotId: string) {
    const s = this.series();
    if (!s) return;
    if (!confirm('Delete this slot?')) return;
    this.svc.deleteSlot(s.id, slotId).subscribe({
      next: () => { this.snack.open('Slot deleted', 'OK', { duration: 2000 }); this.load(s.id); },
      error: () => this.snack.open('Failed to delete slot', 'OK', { duration: 2000 })
    });
  }

  deleteItem(itemId: string) {
    const s = this.series();
    if (!s) return;
    if (!confirm('Delete this meeting item?')) return;
    this.svc.deleteItem(s.id, itemId).subscribe({
      next: () => { this.snack.open('Item deleted', 'OK', { duration: 2000 }); this.load(s.id); },
      error: () => this.snack.open('Failed to delete item', 'OK', { duration: 2000 })
    });
  }
}