import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { LeaveService } from '../../../core/services/leave.service';
import { SprintService } from '../../../core/services/sprint.service';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { LeaveRecord } from '../../../core/models/leave-record.model';
import { Sprint } from '../../../core/models/sprint.model';
import { TeamMember } from '../../../core/models/team-member.model';
import { LeaveFormDialogComponent } from '../leave-form-dialog/leave-form-dialog.component';
import { LeaveImportDialogComponent } from '../leave-import-dialog/leave-import-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { IconButtonComponent } from '../../../shared/components/icon-btn/icon-btn.component';
import { FilterBarComponent, FilterGroup } from '../../../shared/components/filter-bar/filter-bar.component';

interface MemberLeaveGroup {
  teamMemberId: string;
  memberName: string;
  records: LeaveRecord[];
  totalDays: number;
  annualDays: number;
  sickDays: number;
  otherDays: number;
}

interface LaneSlot {
  record: LeaveRecord;
  isStart: boolean;
  isEnd: boolean;
}

interface WeekRow {
  cells: { date: Date; dateStr: string; isCurrentMonth: boolean; isToday: boolean; slots: Array<LaneSlot | null> }[];
  numLanes: number;
  laneIndices: number[];
}

@Component({
  selector: 'app-leave-overview',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatExpansionModule,
    MatIconModule, MatButtonModule, MatProgressSpinnerModule, MatTooltipModule,
    MatDialogModule, MatChipsModule, IconButtonComponent, FilterBarComponent
  ],
  template: `
    <div style="margin-bottom:24px">
      <div style="display:flex;align-items:center;gap:4px;margin-bottom:12px">
        <h2 style="margin:0;font-size:1.3rem;font-weight:500;flex:1;min-width:0">Leave Overview</h2>
        <app-icon-btn icon="add_circle" size="md" tooltip="Add leave" color="primary" (btnClick)="openAdd()" />
        <app-icon-btn icon="upload" size="md" tooltip="Import leave" (btnClick)="openImport()" />
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <app-filter-bar
          [groups]="filterGroups()"
          searchPlaceholder="Search leave…"
          [searchVal]="search()"
          [selectedValues]="filterValues()"
          (searchChange)="search.set($event)"
          (apply)="onFilterApply($event)" />
        <!-- View toggle -->
        <div style="display:inline-flex;border:1px solid rgba(255,255,255,0.15);border-radius:8px;overflow:hidden;height:40px;flex-shrink:0">
          <button mat-icon-button
                  style="border-radius:0;width:40px;height:40px"
                  [style.background]="view() === 'list' ? 'rgba(255,255,255,0.1)' : 'transparent'"
                  matTooltip="List view"
                  (click)="view.set('list')">
            <mat-icon style="font-size:20px;width:20px;height:20px;line-height:20px"
                      [style.color]="view() === 'list' ? '#64b5f6' : 'rgba(255,255,255,0.5)'">view_list</mat-icon>
          </button>
          <div style="width:1px;background:rgba(255,255,255,0.12);flex-shrink:0"></div>
          <button mat-icon-button
                  style="border-radius:0;width:40px;height:40px"
                  [style.background]="view() === 'calendar' ? 'rgba(255,255,255,0.1)' : 'transparent'"
                  matTooltip="Calendar view"
                  (click)="view.set('calendar')">
            <mat-icon style="font-size:20px;width:20px;height:20px;line-height:20px"
                      [style.color]="view() === 'calendar' ? '#64b5f6' : 'rgba(255,255,255,0.5)'">calendar_month</mat-icon>
          </button>
        </div>
      </div>
    </div>

    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:64px">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    } @else {
      <!-- Summary cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,150px),1fr));gap:12px;margin-bottom:24px">
        <mat-card appearance="outlined">
          <mat-card-content style="padding:20px">
            <div style="display:flex;align-items:center;gap:12px">
              <mat-icon style="font-size:2rem;width:2rem;height:2rem;opacity:0.7">people</mat-icon>
              <div>
                <div style="font-size:1.75rem;font-weight:600;line-height:1">{{ totalDays() }}</div>
                <div style="font-size:0.8rem;opacity:0.6;margin-top:2px">Total Leave Days</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card appearance="outlined">
          <mat-card-content style="padding:20px">
            <div style="display:flex;align-items:center;gap:12px">
              <mat-icon style="font-size:2rem;width:2rem;height:2rem;color:#4caf50">beach_access</mat-icon>
              <div>
                <div style="font-size:1.75rem;font-weight:600;line-height:1">{{ annualDays() }}</div>
                <div style="font-size:0.8rem;opacity:0.6;margin-top:2px">Annual</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card appearance="outlined">
          <mat-card-content style="padding:20px">
            <div style="display:flex;align-items:center;gap:12px">
              <mat-icon style="font-size:2rem;width:2rem;height:2rem;color:#f44336">sick</mat-icon>
              <div>
                <div style="font-size:1.75rem;font-weight:600;line-height:1">{{ sickDays() }}</div>
                <div style="font-size:0.8rem;opacity:0.6;margin-top:2px">Sick</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card appearance="outlined">
          <mat-card-content style="padding:20px">
            <div style="display:flex;align-items:center;gap:12px">
              <mat-icon style="font-size:2rem;width:2rem;height:2rem;color:#ff9800">event_note</mat-icon>
              <div>
                <div style="font-size:1.75rem;font-weight:600;line-height:1">{{ otherDays() }}</div>
                <div style="font-size:0.8rem;opacity:0.6;margin-top:2px">Other</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      @if (view() === 'calendar') {
        <!-- Calendar view -->
        <div style="border-radius:10px;border:1px solid rgba(255,255,255,0.08);overflow:hidden"
             (click)="clickedLeave.set(null)">
          <div style="background:rgba(255,255,255,0.03)">

            <!-- Month nav -->
            <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;
                        border-bottom:1px solid rgba(255,255,255,0.07)">
              <app-icon-btn icon="chevron_left" size="md" tooltip="Previous month" (btnClick)="prevMonth()" />
              <span style="font-size:1rem;font-weight:600;flex:1;text-align:center">
                {{ calendarMonth() | date:'MMMM yyyy' }}
              </span>
              <app-icon-btn icon="chevron_right" size="md" tooltip="Next month" (btnClick)="nextMonth()" />
              <button mat-button style="font-size:0.8rem;height:32px;line-height:32px;padding:0 12px"
                      (click)="goToday()">Today</button>
            </div>

                <!-- Tap info strip (mobile click state) -->
            @if (clickedLeave()) {
              <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;
                          background:rgba(255,255,255,0.08);border-bottom:2px solid rgba(255,255,255,0.1)"
                   [style.borderLeft]="'4px solid ' + leaveColor(clickedLeave()!.type).text"
                   (click)="$event.stopPropagation()">
                <div style="min-width:0;flex:1">
                  <div style="font-size:0.9rem;font-weight:700;line-height:1.3">{{ clickedLeave()!.memberName }}</div>
                  <div style="font-size:0.78rem;opacity:0.65;margin-top:2px">
                    {{ clickedLeave()!.type }} · {{ formatDateRange(clickedLeave()!) }}
                  </div>
                </div>
                <app-icon-btn icon="close" size="sm" tooltip="Dismiss" (btnClick)="clickedLeave.set(null); $event.stopPropagation()" />
              </div>
            }

            <!-- Day name headers -->
            <div style="display:grid;grid-template-columns:repeat(5,1fr);
                        border-bottom:2px solid rgba(255,255,255,0.08)">
              @for (d of dayNames; track d) {
                <div style="padding:8px 4px 6px;font-size:0.65rem;font-weight:700;
                            text-transform:uppercase;letter-spacing:0.04em;opacity:0.4;text-align:center;
                            border-right:1px solid rgba(255,255,255,0.04)">{{ d }}</div>
              }
            </div>

            <!-- Week rows -->
            @for (week of calendarWeeks(); track week.cells[0].dateStr) {
              <!-- Date numbers row -->
              <div style="display:grid;grid-template-columns:repeat(5,1fr);
                          border-bottom:1px solid rgba(255,255,255,0.05)">
                @for (day of week.cells; track day.dateStr) {
                  <div style="padding:4px 4px;border-right:1px solid rgba(255,255,255,0.04);display:flex;justify-content:center"
                       [style.background]="day.isToday ? 'rgba(100,181,246,0.08)' : 'transparent'"
                       [style.opacity]="day.isCurrentMonth ? '1' : '0.3'">
                    <span style="font-size:0.75rem;font-weight:600;display:inline-flex;align-items:center;
                                  justify-content:center;width:22px;height:22px;border-radius:50%"
                          [style.background]="day.isToday ? '#64b5f6' : 'transparent'"
                          [style.color]="day.isToday ? '#000' : 'rgba(255,255,255,0.6)'">
                      {{ day.date | date:'d' }}
                    </span>
                  </div>
                }
              </div>

              <!-- Lane rows: one row per concurrent leave -->
              @if (week.numLanes === 0) {
                <div style="display:grid;grid-template-columns:repeat(5,1fr);
                            border-bottom:1px solid rgba(255,255,255,0.06)">
                  @for (day of week.cells; track day.dateStr) {
                    <div style="height:14px;border-right:1px solid rgba(255,255,255,0.04)"
                         [style.background]="day.isToday ? 'rgba(100,181,246,0.04)' : 'transparent'">
                    </div>
                  }
                </div>
              } @else {
                @for (laneIdx of week.laneIndices; track laneIdx; let last = $last) {
                  <div style="display:grid;grid-template-columns:repeat(5,1fr)"
                       [style.borderBottom]="last ? '1px solid rgba(255,255,255,0.06)' : 'none'">
                    @for (day of week.cells; track day.dateStr) {
                      <div style="height:28px;border-right:1px solid rgba(255,255,255,0.04)"
                           [style.background]="day.isToday ? 'rgba(100,181,246,0.04)' : 'transparent'">
                        @if (day.slots[laneIdx]; as slot) {
                          <div [style.background]="leaveColor(slot.record.type).bg"
                               [style.color]="leaveColor(slot.record.type).text"
                               [style.borderRadius]="chipRadius(slot.isStart, slot.isEnd)"
                               [style.marginLeft]="slot.isStart ? '3px' : '-1px'"
                               [style.marginRight]="slot.isEnd ? '3px' : '-1px'"
                               [style.opacity]="chipDimmed(slot.record) ? '0.2' : '1'"
                               [style.boxShadow]="chipActive(slot.record) ? 'inset 0 0 0 2px ' + leaveColor(slot.record.type).text : 'none'"
                               (mouseenter)="hoveredLeaveId.set(slot.record.id)"
                               (mouseleave)="hoveredLeaveId.set(null)"
                               (click)="toggleClick(slot.record); $event.stopPropagation()"
                               style="height:22px;margin-top:3px;display:flex;align-items:center;
                                      padding:0 6px;font-size:0.65rem;font-weight:600;white-space:nowrap;
                                      cursor:pointer;transition:opacity 0.1s,box-shadow 0.1s;overflow:hidden">
                            @if (slot.isStart) {
                              {{ firstName(slot.record.memberName) }}
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              }
            }
          </div>
        </div>

      } @else {
        <!-- List view -->
        @if (groups().length === 0) {
          <mat-card appearance="outlined">
            <mat-card-content style="padding:48px;text-align:center;opacity:0.5">
              <mat-icon style="font-size:3rem;width:3rem;height:3rem;display:block;margin:0 auto 16px">event_busy</mat-icon>
              <div>No leave records found</div>
            </mat-card-content>
          </mat-card>
        } @else {
          <mat-accordion multi>
            @for (g of groups(); track g.teamMemberId) {
              <mat-expansion-panel [expanded]="true" style="margin-bottom:8px">
                <mat-expansion-panel-header collapsedHeight="auto" expandedHeight="auto" style="padding:12px 16px">
                  <mat-panel-title style="flex-shrink:0;margin-right:8px">
                    <div style="display:flex;align-items:center;gap:10px">
                      <div style="width:34px;height:34px;border-radius:50%;background:var(--mat-sys-primary);
                                  display:flex;align-items:center;justify-content:center;
                                  font-size:0.75rem;font-weight:600;flex-shrink:0">
                        {{ initials(g.memberName) }}
                      </div>
                      <span style="font-weight:500;font-size:0.9rem">{{ g.memberName }}</span>
                    </div>
                  </mat-panel-title>
                  <mat-panel-description style="gap:6px;align-items:center;flex-wrap:wrap;
                                                justify-content:flex-end;min-width:0">
                    @if (g.annualDays > 0) {
                      <span class="leave-badge leave-annual">{{ g.annualDays }}d annual</span>
                    }
                    @if (g.sickDays > 0) {
                      <span class="leave-badge leave-sick">{{ g.sickDays }}d sick</span>
                    }
                    @if (g.otherDays > 0) {
                      <span class="leave-badge leave-other">{{ g.otherDays }}d other</span>
                    }
                    <span style="opacity:0.5;font-size:0.8rem;white-space:nowrap">{{ g.totalDays }}d total</span>
                  </mat-panel-description>
                </mat-expansion-panel-header>

                <div style="display:flex;flex-direction:column;gap:6px;padding:8px 0">
                  @for (r of g.records; track r.id) {
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;
                                padding:10px 12px;border-radius:8px;background:rgba(255,255,255,0.03)">
                      <span [class]="'leave-badge leave-' + r.type.toLowerCase()">{{ r.type }}</span>
                      <span style="font-size:0.85rem;white-space:nowrap">
                        {{ r.startDate | date:'d MMM' }} – {{ r.endDate | date:'d MMM y' }}
                      </span>
                      <span style="font-weight:600;font-size:0.85rem;white-space:nowrap">{{ r.daysCount }}d</span>
                      @if (r.notes) {
                        <span style="opacity:0.55;font-size:0.8rem;flex:1;min-width:0;
                                     overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                              [matTooltip]="r.notes">{{ r.notes }}</span>
                      } @else {
                        <span style="flex:1"></span>
                      }
                      <div style="display:flex;gap:2px;flex-shrink:0;margin-left:auto">
                        <app-icon-btn icon="edit" size="sm" tooltip="Edit" (btnClick)="openEdit(r)" />
                        <app-icon-btn icon="delete" size="sm" tooltip="Delete" [danger]="true" (btnClick)="delete(r)" />
                      </div>
                    </div>
                  }
                </div>
              </mat-expansion-panel>
            }
          </mat-accordion>
        }
      }
    }
  `,
  styles: [`
    .leave-badge { padding:3px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap; }
    .leave-annual { background:rgba(76,175,80,0.15);color:#4caf50; }
    .leave-sick   { background:rgba(244,67,54,0.15);color:#f44336; }
    .leave-other  { background:rgba(255,152,0,0.15);color:#ff9800; }

    ::ng-deep .mat-expansion-panel-header {
      height: auto !important;
      min-height: 48px;
    }
    ::ng-deep .mat-expansion-panel-header .mat-content {
      flex-wrap: wrap;
      row-gap: 4px;
    }
  `]
})
export class LeaveOverviewComponent implements OnInit {
  private leaveSvc = inject(LeaveService);
  private sprintSvc = inject(SprintService);
  private memberSvc = inject(TeamMemberService);
  private dialog = inject(MatDialog);

  selectedSprintId: string | null = null;
  search = signal('');
  loading = signal(true);
  records = signal<LeaveRecord[]>([]);
  sprints = signal<Sprint[]>([]);
  members = signal<TeamMember[]>([]);
  view = signal<'list' | 'calendar'>('calendar');
  calendarMonth = signal(new Date());
  hoveredLeaveId = signal<string | null>(null);
  clickedLeave = signal<LeaveRecord | null>(null);

  readonly filterGroups = computed<FilterGroup[]>(() => [
    {
      key: 'sprint', label: 'Sprint', icon: 'flag',
      options: [
        { id: 'null', label: 'All' },
        ...this.sprints().map(s => ({ id: s.id, label: s.name }))
      ]
    }
  ]);

  filterValues = computed(() => ({ sprint: this.selectedSprintId ? [this.selectedSprintId] : [] }));

  readonly dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  calendarWeeks = computed((): WeekRow[] => {
    const month = this.calendarMonth();
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDay = new Date(year, m, 1);
    const lastDay = new Date(year, m + 1, 0);
    const todayStr = new Date().toISOString().slice(0, 10);

    const startOffset = (firstDay.getDay() + 6) % 7;
    const cur = new Date(firstDay);
    cur.setDate(cur.getDate() - startOffset);

    const allDays: { date: Date; dateStr: string; isCurrentMonth: boolean; isToday: boolean }[] = [];
    while (cur <= lastDay || allDays.length % 5 !== 0) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) {
        const dateStr = cur.toISOString().slice(0, 10);
        allDays.push({ date: new Date(cur), dateStr, isCurrentMonth: cur.getMonth() === m, isToday: dateStr === todayStr });
      }
      cur.setDate(cur.getDate() + 1);
    }

    const weeks: WeekRow[] = [];
    for (let wi = 0; wi < allDays.length; wi += 5) {
      const weekDays = allDays.slice(wi, wi + 5);
      const mondayStr = weekDays[0].dateStr;
      const fridayStr = weekDays[4].dateStr;

      const weekRecords = this.records()
        .filter(r => r.startDate <= fridayStr && r.endDate >= mondayStr)
        .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.memberName.localeCompare(b.memberName));

      // Greedy lane packing: assign each record to the first lane it fits in
      const laneEnds: string[] = [];
      const recordToLane = new Map<string, number>();
      weekRecords.forEach(r => {
        const li = laneEnds.findIndex(e => e < r.startDate);
        if (li >= 0) { laneEnds[li] = r.endDate; recordToLane.set(r.id, li); }
        else { recordToLane.set(r.id, laneEnds.length); laneEnds.push(r.endDate); }
      });

      const numLanes = laneEnds.length;
      const cells = weekDays.map(day => {
        const slots: Array<LaneSlot | null> = Array(numLanes).fill(null);
        weekRecords.forEach(r => {
          if (r.startDate <= day.dateStr && r.endDate >= day.dateStr) {
            const lane = recordToLane.get(r.id)!;
            // isStart: first visible day of this block (either record start or week Monday)
            const isStart = r.startDate <= mondayStr ? day.dateStr === mondayStr : r.startDate === day.dateStr;
            // isEnd: last visible day of this block (either record end or week Friday)
            const isEnd = r.endDate >= fridayStr ? day.dateStr === fridayStr : r.endDate === day.dateStr;
            slots[lane] = { record: r, isStart, isEnd };
          }
        });
        return { ...day, slots };
      });

      weeks.push({ cells, numLanes, laneIndices: Array.from({ length: numLanes }, (_, i) => i) });
    }
    return weeks;
  });

  groups = computed<MemberLeaveGroup[]>(() => {
    const map = new Map<string, MemberLeaveGroup>();
    const q = this.search().trim().toLowerCase();
    const records = q
      ? this.records().filter(r =>
          r.memberName.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          (r.notes ?? '').toLowerCase().includes(q))
      : this.records();
    for (const r of records) {
      if (!map.has(r.teamMemberId)) {
        map.set(r.teamMemberId, { teamMemberId: r.teamMemberId, memberName: r.memberName, records: [], totalDays: 0, annualDays: 0, sickDays: 0, otherDays: 0 });
      }
      const g = map.get(r.teamMemberId)!;
      g.records.push(r);
      g.totalDays += r.daysCount;
      if (r.type === 'Annual') g.annualDays += r.daysCount;
      else if (r.type === 'Sick') g.sickDays += r.daysCount;
      else g.otherDays += r.daysCount;
    }
    return Array.from(map.values()).sort((a, b) => a.memberName.localeCompare(b.memberName));
  });

  totalDays  = computed(() => this.records().reduce((s, r) => s + r.daysCount, 0));
  annualDays = computed(() => this.records().filter(r => r.type === 'Annual').reduce((s, r) => s + r.daysCount, 0));
  sickDays   = computed(() => this.records().filter(r => r.type === 'Sick').reduce((s, r) => s + r.daysCount, 0));
  otherDays  = computed(() => this.records().filter(r => r.type === 'Other').reduce((s, r) => s + r.daysCount, 0));

  ngOnInit() {
    this.memberSvc.getAll({ isActive: true }).subscribe(m => this.members.set(m));
    this.sprintSvc.getSprints().subscribe(s => {
      this.sprints.set(s);
      const today = new Date().toISOString().slice(0, 10);
      const current = s.find(sp => sp.startDate <= today && sp.endDate >= today);
      if (current) this.selectedSprintId = current.id;
      this.load();
    });
  }

  onFilterApply(filters: Record<string, string[]>) {
    const sprints = filters['sprint'] ?? [];
    this.selectedSprintId = sprints.length > 0 && sprints[0] !== 'null' ? sprints[0] : null;
    this.load();
  }

  load() {
    this.loading.set(true);
    this.leaveSvc.getAll(this.selectedSprintId ? { sprintId: this.selectedSprintId } : undefined)
      .subscribe(r => { this.records.set(r); this.loading.set(false); });
  }

  openImport() {
    this.dialog.open(LeaveImportDialogComponent, { width: '740px', data: { members: this.members() } })
      .afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  openAdd() {
    this.dialog.open(LeaveFormDialogComponent, { width: '500px', data: { members: this.members() } })
      .afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  openEdit(record: LeaveRecord) {
    this.dialog.open(LeaveFormDialogComponent, { width: '500px', data: { members: this.members(), record } })
      .afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  delete(record: LeaveRecord) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete leave record?', message: `Remove leave entry for ${record.memberName}?`, danger: true }
    }).afterClosed().subscribe(ok => {
      if (ok) this.leaveSvc.delete(record.id).subscribe(() => this.load());
    });
  }

  prevMonth() { const d = new Date(this.calendarMonth()); d.setMonth(d.getMonth() - 1); this.calendarMonth.set(d); }
  nextMonth() { const d = new Date(this.calendarMonth()); d.setMonth(d.getMonth() + 1); this.calendarMonth.set(d); }
  goToday()  { this.calendarMonth.set(new Date()); }

  firstName(name: string) { return name.split(' ')[0]; }

  chipRadius(isStart: boolean, isEnd: boolean): string {
    const l = isStart ? '4px' : '0';
    const r = isEnd ? '4px' : '0';
    return `${l} ${r} ${r} ${l}`;
  }

  chipTooltip(r: LeaveRecord): string {
    const fmt = (d: string) => {
      const dt = new Date(d + 'T00:00:00');
      return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };
    const range = r.startDate !== r.endDate ? ` · ${fmt(r.startDate)} – ${fmt(r.endDate)}` : ` · ${fmt(r.startDate)}`;
    return `${r.memberName} · ${r.type}${range} · ${r.daysCount}d`;
  }

  leaveColor(type: string): { bg: string; text: string } {
    const map: Record<string, { bg: string; text: string }> = {
      Annual:              { bg: 'rgba(76,175,80,0.25)',  text: '#81c784' },
      Sick:                { bg: 'rgba(244,67,54,0.25)',  text: '#ef9a9a' },
      Birthday:            { bg: 'rgba(156,39,176,0.25)', text: '#ce93d8' },
      Loyalty:             { bg: 'rgba(33,150,243,0.25)', text: '#90caf9' },
      Discretionary:       { bg: 'rgba(0,188,212,0.25)',  text: '#80deea' },
      FamilyResponsibility:{ bg: 'rgba(255,152,0,0.25)',  text: '#ffcc80' },
    };
    return map[type] ?? { bg: 'rgba(158,158,158,0.25)', text: '#eeeeee' };
  }

  toggleClick(r: LeaveRecord) {
    this.clickedLeave.set(this.clickedLeave()?.id === r.id ? null : r);
  }

  chipActive(r: LeaveRecord): boolean {
    return this.hoveredLeaveId() === r.id || this.clickedLeave()?.id === r.id;
  }

  chipDimmed(r: LeaveRecord): boolean {
    const anyActive = !!this.hoveredLeaveId() || !!this.clickedLeave();
    return anyActive && !this.chipActive(r);
  }

  formatDateRange(r: LeaveRecord): string {
    const fmt = (d: string) => {
      const dt = new Date(d + 'T00:00:00');
      return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };
    const range = r.startDate !== r.endDate ? `${fmt(r.startDate)} – ${fmt(r.endDate)}` : fmt(r.startDate);
    return `${range} · ${r.daysCount}d`;
  }

  initials(name: string) {
    return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }
}
