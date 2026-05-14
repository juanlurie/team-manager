import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MeetingSessionService } from '../../../core/services/meeting-session.service';
import { SlotLocationService } from '../../../core/services/slot-location.service';
import { SessionTypeService } from '../../../core/services/session-type.service';
import { MeetingSession, SlotDefinition } from '../../../core/models/meeting-session.model';
import { SlotLocation } from '../../../core/models/slot-location.model';
import { SessionType } from '../../../core/models/session-type.model';

export interface MeetingFormData {
  session?: MeetingSession;
}
const DURATIONS = [15, 30, 45, 60, 90] as const;
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] as const;

type SlotKey = string;

@Component({
  selector: 'app-meeting-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule],
  template: `
    <div class="dialog">
      <h2 class="title">{{ isEdit ? 'Edit Session' : 'Quick Create Session' }}</h2>

      <!-- Row 1: Meeting Type · Duration -->
      <div class="chip-row">
        <div class="chip-group">
          <span class="chip-label">Type</span>
          <div class="chips">
              @for (t of types(); track t.id) {
              <button class="chip type-chip"
                      [class.active]="type() === t.name"
                      [style.--typ-color]="t.color"
                      (click)="type.set(t.name)">
                <span class="dot" [style.background]="t.color"></span>
                {{ t.name }}
              </button>
            }
          </div>
        </div>
        @if (!isEdit) {
          <div class="chip-group">
            <span class="chip-label">Duration</span>
            <div class="chips">
              @for (d of durations; track d) {
                <button class="chip" [class.active]="duration() === d" (click)="duration.set(d)">
                  {{ d }}m
                </button>
              }
            </div>
          </div>
        }
      </div>

      @if (!isEdit) {
        <!-- Row 2: Location chips (color-coded) -->
        <div class="chip-row">
          <div class="chip-group">
            <span class="chip-label">Active Location</span>
            <div class="chips">
              @for (loc of locations(); track loc.id) {
                <button class="chip loc-chip"
                        [class.active]="activeLocationId() === loc.id"
                        [style.--loc-color]="loc.color"
                        (click)="activeLocationId.set(loc.id)">
                  <span class="loc-dot" [style.background]="loc.color"></span>
                  {{ loc.name }}
                </button>
              }
            </div>
          </div>
        </div>

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

        <!-- Summary by location -->
        <div class="summary">
          @for (loc of locations(); track loc.id) {
            @let count = countByLocation()[loc.id] ?? 0;
            @if (count > 0) {
              <span class="summary-loc">
                <span class="loc-dot" [style.background]="loc.color"></span>
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
      }

      <!-- Title + Create -->
      <div class="bottom-row">
        <mat-form-field appearance="fill" class="title-field">
          <mat-label>Session title</mat-label>
          <input matInput [ngModel]="title()" (ngModelChange)="title.set($event)" maxlength="200" placeholder="e.g. Sprint Planning">
        </mat-form-field>
        <button mat-raised-button color="primary" class="create-btn"
                [disabled]="!canCreate()" (click)="save()">
          {{ isEdit ? 'Save' : 'Quick Create' }}
        </button>
      </div>

      @if (error()) {
        <div class="error">{{ error() }}</div>
      }
    </div>
  `,
  styles: [`
    .dialog { display:flex;flex-direction:column;gap:0;padding:0; }
    .title { margin:0 0 12px;font-size:1.15rem;font-weight:700; }
    .chip-row { display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px; }
    .chip-group { display:flex;flex-direction:column;gap:4px; }
    .chip-label { font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.5;font-weight:600; }
    .chips { display:flex;gap:4px;flex-wrap:wrap; }
    .chip {
      padding:4px 12px;border-radius:14px;border:1px solid rgba(255,255,255,0.12);
      background:transparent;color:inherit;font-size:0.78rem;cursor:pointer;transition:all 0.12s;
      font-family:inherit;display:flex;align-items:center;gap:5px;
    }
    .chip:hover { border-color:rgba(255,255,255,0.25);background:rgba(255,255,255,0.04); }
    .chip.active { background:rgba(100,181,246,0.2);border-color:rgba(100,181,246,0.5);color:#64b5f6; }
    .loc-chip.active { background:color-mix(in srgb, var(--loc-color) 20%, transparent);border-color:color-mix(in srgb, var(--loc-color) 50%, transparent);color:var(--loc-color); }
    .type-chip.active { background:color-mix(in srgb, var(--typ-color) 20%, transparent);border-color:color-mix(in srgb, var(--typ-color) 50%, transparent);color:var(--typ-color); }
    .dot { width:8px;height:8px;border-radius:50%;flex-shrink:0;display:inline-block; }
    .loc-dot { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
    .week-nav {
      display:flex;align-items:center;justify-content:center;gap:16px;
      margin-bottom:10px;padding:6px 0;
    }
    .nav-btn {
      width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,0.1);
      background:transparent;color:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;
      transition:background 0.12s;
    }
    .nav-btn:hover { background:rgba(255,255,255,0.06); }
    .week-label { font-size:0.85rem;font-weight:600;min-width:160px;text-align:center; }
    .grid-wrap { overflow-x:auto;margin-bottom:8px; }
    .grid { display:inline-flex;flex-direction:column;gap:1px;min-width:100%; }
    .grid-row { display:flex;gap:1px; }
    .grid-cell {
      width:64px;height:28px;display:flex;align-items:center;justify-content:center;
      font-size:0.72rem;border-radius:3px;flex-shrink:0;
    }
    .time-cell { width:44px;justify-content:flex-end;padding-right:6px;opacity:0.45;font-size:0.68rem; }
    .day-header { flex-direction:column;gap:0;height:40px; }
    .day-name { font-size:0.68rem;text-transform:uppercase;opacity:0.5; }
    .day-num { font-size:0.9rem;font-weight:700; }
    .slot-cell {
      background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);
      cursor:pointer;transition:all 0.1s;
    }
    .slot-cell:hover { background:rgba(100,181,246,0.12);border-color:rgba(100,181,246,0.25); }
    .slot-cell.selected { background:color-mix(in srgb, var(--sel-color) 30%, transparent);border-color:var(--sel-color);box-shadow:inset 0 0 0 1px var(--sel-color); }
    .summary { font-size:0.78rem;opacity:0.6;display:flex;gap:12px;align-items:center;margin-bottom:10px;flex-wrap:wrap; }
    .summary-loc { display:flex;align-items:center;gap:4px; }
    .clear-btn { cursor:pointer;color:#64b5f6;text-decoration:underline;font-size:0.72rem;margin-left:auto; }
    .bottom-row { display:flex;gap:10px;align-items:center; }
    .title-field { flex:1;margin-bottom:0; }
    :host ::ng-deep .title-field .mat-form-field-wrapper { padding-bottom:0; }
    .create-btn { flex-shrink:0;height:48px; }
    .error { color:#ef5350;font-size:0.82rem;margin-top:6px; }
  `]
})
export class MeetingFormDialogComponent implements OnInit {
  private svc = inject(MeetingSessionService);
  private locSvc = inject(SlotLocationService);
  private typeSvc = inject(SessionTypeService);
  private dialogRef = inject(MatDialogRef<MeetingFormDialogComponent>);
  private snack = inject(MatSnackBar);
  data: MeetingFormData = inject(MAT_DIALOG_DATA);

  isEdit = !!this.data?.session;

  description = this.data?.session?.description ?? '';

  title = signal(this.data?.session?.title ?? '');
  type = signal<string>('Workshop');
  duration = signal<number>(30);
  weekOffset = signal(0);
  activeLocationId = signal<string | null>(null);
  selectedSlots = signal<Map<SlotKey, string>>(new Map());
  error = signal<string | null>(null);

  locations = signal<SlotLocation[]>([]);
  types = signal<SessionType[]>([]);

  locationMap = computed(() => {
    const map: Record<string, string> = {};
    for (const loc of this.locations()) {
      map[loc.id] = loc.color;
    }
    return map;
  });

  durations = DURATIONS;

  readonly weekDays = computed(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const monday = new Date(now);
    monday.setDate(monday.getDate() + (monday.getDay() === 0 ? -6 : 1 - monday.getDay()));
    monday.setDate(monday.getDate() + this.weekOffset() * 7);
    const days: { date: string; name: string; num: string }[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      days.push({
        date: dateStr,
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        num: d.getDate().toString()
      });
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
        const mm = m.toString().padStart(2, '0');
        rows.push(`${h.toString().padStart(2, '0')}:${mm}`);
      }
    }
    return rows;
  });

  readonly selectedCount = computed(() => this.selectedSlots().size);

  readonly countByLocation = computed(() => {
    const counts: Record<string, number> = {};
    for (const locId of this.selectedSlots().values()) {
      counts[locId] = (counts[locId] || 0) + 1;
    }
    return counts;
  });

  readonly canCreate = computed(() => {
    if (this.isEdit) return this.title().trim().length > 0;
    return this.title().trim().length > 0 && this.selectedCount() > 0;
  });

  ngOnInit() {
    this.locSvc.getAll(true).subscribe(locs => {
      this.locations.set(locs);
      if (locs.length > 0 && !this.activeLocationId()) {
        this.activeLocationId.set(locs[0].id);
      }
    });
    this.typeSvc.getAll(true).subscribe(types => {
      this.types.set(types);
    });
    if (this.data?.session) {
      this.type.set(this.data.session.type);
    }
  }

  toggleSlot(key: SlotKey) {
    const map = new Map(this.selectedSlots());
    if (map.has(key)) {
      map.delete(key);
    } else {
      const locId = this.activeLocationId();
      if (!locId) return;
      map.set(key, locId);
    }
    this.selectedSlots.set(map);
  }

  clearSlots() {
    this.selectedSlots.set(new Map());
  }

  save() {
    if (this.isEdit) {
      this.saveEdit();
    } else {
      this.saveCreate();
    }
  }

  private saveCreate() {
    const slots: SlotDefinition[] = [];
    const dur = this.duration();

    for (const [key, locId] of this.selectedSlots()) {
      const [date, startTime] = key.split('|');
      const [h, m] = startTime.split(':').map(Number);
      const totalMin = h * 60 + m + dur;
      const endH = Math.floor(totalMin / 60);
      const endM = totalMin % 60;
      const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
      slots.push({ date, startTime, endTime, slotType: 'TeamMember', locationId: locId });
    }

    if (slots.length === 0) { this.error.set('Select at least one time slot'); return; }
    if (!this.title().trim()) { this.error.set('Enter a session title'); return; }

    this.error.set(null);
    this.svc.create({
      title: this.title().trim(),
      description: this.description || null,
      location: 'Remote',
      type: this.type(),
      slots
    }).subscribe({
      next: () => {
        this.snack.open('Session created!', 'OK', { duration: 2000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.error.set('Failed to create session');
      }
    });
  }

  private saveEdit() {
    if (!this.data.session) return;
    if (!this.title().trim()) { this.error.set('Enter a session title'); return; }

    this.svc.update(this.data.session.id, {
      title: this.title().trim(),
      description: this.description.trim() || null,
      date: this.data.session.date,
      startTime: this.data.session.startTime,
      endTime: this.data.session.endTime,
      location: this.data.session.location
    }).subscribe({
      next: () => {
        this.snack.open('Session updated', 'OK', { duration: 2000 });
        this.dialogRef.close(true);
      },
      error: () => { this.error.set('Failed to update session'); }
    });
  }
}
