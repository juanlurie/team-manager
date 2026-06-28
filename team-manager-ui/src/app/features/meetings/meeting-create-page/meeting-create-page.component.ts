import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MeetingSessionService } from '../../../core/services/meeting-session.service';
import { SlotLocationService } from '../../../core/services/slot-location.service';
import { SessionTypeService } from '../../../core/services/session-type.service';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { SlotDefinition } from '../../../core/models/meeting-session.model';
import { SlotLocation } from '../../../core/models/slot-location.model';
import { SessionType as SessionTypeModel } from '../../../core/models/session-type.model';
import { TeamMember } from '../../../core/models/team-member.model';

const DURATIONS = [15, 30, 45, 60, 90] as const;
const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17] as const;

type SlotKey = string;

@Component({
  selector: 'app-meeting-create-page',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="page">
      <!-- Header -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
        <button class="back-btn" (click)="goBack()">← Back</button>
        <h2 style="margin:0;font-size:1.3rem;font-weight:700">Create Meeting Session</h2>
      </div>

      <!-- Step 1: Pick Duration (always visible, disabled after step 2) -->
      <div class="section" [class.muted]="phase() === 'grid'">
        <div class="section-label">Step 1: Set Slot Duration</div>
        <div class="chips">
          @for (d of durations; track d) {
            <button class="chip" [class.active]="duration() === d"
                    [disabled]="phase() === 'grid'" (click)="pickDuration(d)">
              {{ d }}m
            </button>
          }
        </div>
      </div>

      <!-- Step 2: Type -->
      <div class="section" [class.muted]="phase() === 'grid'">
        <div class="section-label">Step 2: Meeting Type</div>
        <div class="chips">
          @for (t of types(); track t.id) {
            <button class="chip type-chip"
                    [class.active]="selectedTypeId() === t.id"
                    [style.--typ-color]="t.color"
                    [disabled]="phase() === 'grid'" (click)="selectedTypeId.set(t.id)">
              <span class="dot" [style.background]="t.color"></span>
              {{ t.name }}
            </button>
          }
        </div>
      </div>

      <!-- Step 3: Grid -->
      @if (phase() === 'grid') {
        <div class="section">
          <div class="section-label">Step 3: Select Time Slots</div>

          <!-- Active location chips -->
          <div style="margin-bottom:10px">
            <div style="font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.4;font-weight:600;margin-bottom:4px">Active Location</div>
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

          <!-- Week nav -->
          <div class="week-nav">
            <button class="nav-btn" (click)="weekOffset.set(weekOffset() - 1)">
              <span style="font-size:1.1rem">‹</span>
            </button>
            <span class="week-label">Week of {{ weekLabel() }}</span>
            <button class="nav-btn" (click)="weekOffset.set(weekOffset() + 1)">
              <span style="font-size:1.1rem">›</span>
            </button>
            @if (selectedCount() > 0) {
              <button class="reset-btn" (click)="confirmReset()">Change Duration</button>
            }
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

          <!-- Summary -->
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

        <!-- Step 4: Required Attendees -->
        <div class="section">
          <div class="section-label">Step 4: Required Attendees (optional)</div>
          <div class="chips">
            @for (m of allMembers(); track m.id) {
              <button class="chip member-chip"
                      [class.active]="requiredMemberIds().has(m.id)"
                      (click)="toggleMember(m.id)">
                {{ m.firstName }} {{ m.lastName }}
              </button>
            }
          </div>
          @if (requiredMemberIds().size > 0) {
            <div style="font-size:0.75rem;opacity:0.5;margin-top:6px">
              {{ requiredMemberIds().size }} attendee{{ requiredMemberIds().size !== 1 ? 's' : '' }} will get pre-assigned slots
            </div>
          }
        </div>

        <!-- Title + Create -->
        <div class="bottom-row">
          <mat-form-field appearance="fill" class="title-field">
            <mat-label>Session title</mat-label>
            <input matInput [ngModel]="title()" (ngModelChange)="title.set($event)" maxlength="200" placeholder="e.g. Sprint Planning">
          </mat-form-field>
          <button mat-raised-button color="primary" class="create-btn"
                  [disabled]="!canCreate()" (click)="save()">
            Quick Create
          </button>
        </div>
      }

      @if (error()) {
        <div class="error">{{ error() }}</div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .page { max-width:900px;margin:0 auto;padding:8px; }
    .back-btn { background:none;border:1px solid rgba(255,255,255,0.1);color:inherit;padding:6px 14px;border-radius:8px;cursor:pointer;font-size:0.85rem;font-family:inherit; }
    .back-btn:hover { background:rgba(255,255,255,0.05); }
    .section { margin-bottom:16px;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02); }
    .section.muted { opacity:0.5;pointer-events:none; }
    .section-label { font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.4;font-weight:600;margin-bottom:8px; }
    .chips { display:flex;gap:4px;flex-wrap:wrap; }
    .chip {
      padding:5px 14px;border-radius:14px;border:1px solid rgba(255,255,255,0.12);
      background:transparent;color:inherit;font-size:0.8rem;cursor:pointer;transition:all 0.12s;
      font-family:inherit;display:flex;align-items:center;gap:5px;
    }
    .chip:hover:not(:disabled) { border-color:rgba(255,255,255,0.25);background:rgba(255,255,255,0.04); }
    .chip.active { background:rgba(100,181,246,0.2);border-color:rgba(100,181,246,0.5);color:#64b5f6; }
    .chip:disabled { opacity:0.4;cursor:default; }
    .loc-chip.active { background:color-mix(in srgb, var(--loc-color) 20%, transparent);border-color:color-mix(in srgb, var(--loc-color) 50%, transparent);color:var(--loc-color); }
    .type-chip.active { background:color-mix(in srgb, var(--typ-color) 20%, transparent);border-color:color-mix(in srgb, var(--typ-color) 50%, transparent);color:var(--typ-color); }
    .member-chip.active { background:rgba(76,175,80,0.15);border-color:rgba(76,175,80,0.4);color:#81c784; }
    .dot { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
    .week-nav { display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:10px;padding:6px 0; }
    .nav-btn { width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,0.1);background:transparent;color:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.12s; }
    .nav-btn:hover { background:rgba(255,255,255,0.06); }
    .week-label { font-size:0.85rem;font-weight:600;min-width:160px;text-align:center; }
    .reset-btn { font-size:0.72rem;padding:3px 10px;border-radius:10px;border:1px solid rgba(255,152,0,0.3);color:#ff9800;background:transparent;cursor:pointer;font-family:inherit;margin-left:8px; }
    .reset-btn:hover { background:rgba(255,152,0,0.1); }
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
    .title-field { flex:1; }
    .create-btn { flex-shrink:0;height:48px; }
    .error { color:#ef5350;font-size:0.82rem;margin-top:6px; }
  `]
})
export class MeetingCreatePageComponent implements OnInit {
  private router = inject(Router);
  private svc = inject(MeetingSessionService);
  private locSvc = inject(SlotLocationService);
  private typeSvc = inject(SessionTypeService);
  private memberSvc = inject(TeamMemberService);
  private snack = inject(MatSnackBar);

  phase = signal<'duration' | 'grid'>('duration');
  duration = signal<number>(30);
  weekOffset = signal(0);
  selectedTypeId = signal<string | null>(null);
  activeLocationId = signal<string | null>(null);
  selectedSlots = signal<Map<SlotKey, string>>(new Map());
  title = signal('');
  error = signal<string | null>(null);

  locations = signal<SlotLocation[]>([]);
  types = signal<SessionTypeModel[]>([]);
  allMembers = signal<TeamMember[]>([]);
  requiredMemberIds = signal<Set<string>>(new Set());

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

  readonly canCreate = computed(() =>
    this.title().trim().length > 0 && this.selectedCount() > 0
  );

  ngOnInit() {
    this.locSvc.getAll(true).subscribe(locs => {
      this.locations.set(locs);
      if (locs.length > 0 && !this.activeLocationId()) this.activeLocationId.set(locs[0].id);
    });
    this.typeSvc.getAll(true).subscribe(types => {
      this.types.set(types);
      if (types.length > 0 && !this.selectedTypeId()) this.selectedTypeId.set(types[0].id);
    });
    this.memberSvc.getAll({ isActive: true }).subscribe(members => {
      this.allMembers.set(members.sort((a, b) => a.firstName.localeCompare(b.firstName)));
    });
  }

  pickDuration(d: number) {
    if (this.phase() === 'grid' && this.selectedCount() > 0) {
      this.confirmReset(() => this.duration.set(d));
    } else {
      this.duration.set(d);
      this.phase.set('grid');
    }
  }

  confirmReset(onConfirm?: () => void) {
    if (this.selectedCount() === 0) {
      if (onConfirm) onConfirm();
      else this.phase.set('duration');
      return;
    }
    if (onConfirm) {
      if (confirm('Changing the duration will clear all selected slots. Continue?')) {
        this.selectedSlots.set(new Map());
        onConfirm();
      }
    } else {
      if (confirm('Changing the duration will clear all selected slots. Continue?')) {
        this.phase.set('duration');
        this.selectedSlots.set(new Map());
      }
    }
  }

  toggleMember(id: string) {
    const set = new Set(this.requiredMemberIds());
    if (set.has(id)) set.delete(id);
    else set.add(id);
    this.requiredMemberIds.set(set);
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

  clearSlots() { this.selectedSlots.set(new Map()); }

  goBack() { this.router.navigate(['/meetings']); }

  save() {
    const slots: SlotDefinition[] = [];
    const dur = this.duration();
    const locId = this.activeLocationId();
    for (const [key, slotLocId] of this.selectedSlots()) {
      const [date, startTime] = key.split('|');
      const [h, m] = startTime.split(':').map(Number);
      const totalMin = h * 60 + m + dur;
      slots.push({
        date,
        startTime,
        endTime: `${Math.floor(totalMin / 60).toString().padStart(2, '0')}:${(totalMin % 60).toString().padStart(2, '0')}`,
        slotType: 'TeamMember',
        locationId: slotLocId
      });
    }
    for (const memberId of this.requiredMemberIds()) {
      const found = slots.some(s => s.teamMemberId === memberId);
      if (!found && slots.length > 0) {
        slots.push({
          ...slots[0],
          teamMemberId: memberId
        });
      }
    }
    if (slots.length === 0) { this.error.set('Select at least one time slot'); return; }
    if (!this.title().trim()) { this.error.set('Enter a session title'); return; }

    this.error.set(null);
    this.svc.create({
      title: this.title().trim(),
      description: null,
      location: 'Remote',
      type: this.types().find(t => t.id === this.selectedTypeId())?.name ?? 'Workshop',
      slots
    }).subscribe({
      next: () => {
        this.snack.open('Session created!', 'OK', { duration: 2000 });
        this.router.navigate(['/meetings']);
      },
      error: () => this.error.set('Failed to create session')
    });
  }
}
