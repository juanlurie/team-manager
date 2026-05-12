import { Component, OnInit, inject, signal, computed, effect, untracked } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { skip } from 'rxjs';
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
import { MatMenuModule } from '@angular/material/menu';
import { LeaveService } from '../../../core/services/leave.service';
import { SprintService } from '../../../core/services/sprint.service';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { SquadService } from '../../../core/services/squad.service';
import { GlobalFilterService } from '../../../core/services/global-filter.service';
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
    MatDialogModule, MatChipsModule, MatMenuModule, IconButtonComponent, FilterBarComponent
  ],
  templateUrl: './leave-overview.component.html',
  styleUrls: ['./leave-overview.component.scss']
})
export class LeaveOverviewComponent implements OnInit {
  private leaveSvc = inject(LeaveService);
  private sprintSvc = inject(SprintService);
  private memberSvc = inject(TeamMemberService);
  private squadSvc = inject(SquadService);
  private dialog = inject(MatDialog);
  private globalFilterSvc = inject(GlobalFilterService);

  selectedSprintId: string | null = null;
  selectedLeadId: string | null = null;
  selectedSquadId: string | null = null;
  selectedCraft: string | null = null;

  constructor() {
    effect(() => {
      const hint = this.globalFilterSvc.searchHint();
      untracked(() => this.search.set(hint));
    });

    toObservable(this.globalFilterSvc.filters)
      .pipe(skip(1))
      .subscribe(({ squadId }) => {
        this.selectedSquadId = squadId;
        this.selectedLeadId = null;
        this.load();
      });
  }
  search = signal('');
  loading = signal(true);
  records = signal<LeaveRecord[]>([]);
  sprints = signal<Sprint[]>([]);
  members = signal<TeamMember[]>([]);
  teamLeads = signal<TeamMember[]>([]);
  squads = signal<{ id: string; name: string }[]>([]);
  crafts = signal<string[]>([]);
  view = signal<'list' | 'calendar'>('calendar');

  private mentionMemberIds = computed(() => {
    const q = this.search().trim();
    const ids = new Set<string>();
    const atMatches = q.matchAll(/@([\w'-]+(?:\s[\w'-]+)*)/g);
    for (const match of atMatches) {
      const name = match[1].toLowerCase();
      const found = this.members().find(m =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(name)
      );
      if (found) ids.add(found.id);
    }
    return [...ids];
  });

  filteredRecords = computed(() => {
    const q = this.search().trim().toLowerCase();
    const mentionIds = this.mentionMemberIds();
    const records = this.records();
    if (mentionIds.length > 0) {
      return records.filter(r => mentionIds.includes(r.teamMemberId));
    }
    if (!q) return records;
    return records.filter(r => {
      const member = this.members().find(m => m.id === r.teamMemberId);
      const crafts = member?.crafts ?? [];
      return r.memberName.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        (r.notes ?? '').toLowerCase().includes(q) ||
        crafts.some(c => c.toLowerCase().includes(q));
    });
  });
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
    },
    {
      key: 'lead', label: 'Lead', icon: 'person',
      options: [
        { id: 'null', label: 'All' },
        ...this.teamLeads().map(m => ({ id: m.id, label: m.firstName + ' ' + m.lastName }))
      ]
    },
    {
      key: 'squad', label: 'Squad', icon: 'groups',
      options: [
        { id: 'null', label: 'All' },
        ...this.squads().map(s => ({ id: s.id, label: s.name }))
      ]
    },
    {
      key: 'craft', label: 'Craft', icon: 'construction',
      options: [
        { id: 'null', label: 'All' },
        ...this.crafts().map(c => ({ id: c, label: c }))
      ]
    }
  ]);

  filterValues = computed(() => ({
    sprint: this.selectedSprintId ? [this.selectedSprintId] : [],
    lead: this.selectedLeadId ? [this.selectedLeadId] : [],
    squad: this.selectedSquadId ? [this.selectedSquadId] : [],
    craft: this.selectedCraft ? [this.selectedCraft] : []
  }));

  readonly dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  calendarWeeks = computed((): WeekRow[] => {
    const month = this.calendarMonth();
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDay = new Date(year, m, 1);
    const lastDay = new Date(year, m + 1, 0);
    const toLocalDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todayStr = toLocalDateStr(new Date());

    const startOffset = (firstDay.getDay() + 6) % 7;
    const cur = new Date(firstDay);
    cur.setDate(cur.getDate() - startOffset);

    const allDays: { date: Date; dateStr: string; isCurrentMonth: boolean; isToday: boolean }[] = [];
    while (cur <= lastDay || allDays.length % 5 !== 0) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) {
        const dateStr = toLocalDateStr(cur);
        allDays.push({ date: new Date(cur), dateStr, isCurrentMonth: cur.getMonth() === m, isToday: dateStr === todayStr });
      }
      cur.setDate(cur.getDate() + 1);
    }

    const weeks: WeekRow[] = [];
    for (let wi = 0; wi < allDays.length; wi += 5) {
      const weekDays = allDays.slice(wi, wi + 5);
      const mondayStr = weekDays[0].dateStr;
      const fridayStr = weekDays[4].dateStr;

      const weekRecords = this.filteredRecords()
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
    const mentionIds = this.mentionMemberIds();
    const records = mentionIds.length > 0
      ? this.records().filter(r => mentionIds.includes(r.teamMemberId))
      : q
        ? this.records().filter(r => {
            const member = this.members().find(m => m.id === r.teamMemberId);
            const crafts = member?.crafts ?? [];
            return r.memberName.toLowerCase().includes(q) ||
              r.type.toLowerCase().includes(q) ||
              (r.notes ?? '').toLowerCase().includes(q) ||
              crafts.some(c => c.toLowerCase().includes(q));
          })
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
    this.memberSvc.getAll({ isActive: true }).subscribe(m => {
      this.members.set(m);
      this.teamLeads.set(m.filter(x => x.role === 'TeamLead' || x.role === 'TechLead'));
      const craftsSet = new Set<string>();
      m.forEach(mem => mem.crafts.forEach(c => craftsSet.add(c)));
      this.crafts.set([...craftsSet].sort());
    });
    this.squadSvc.getAll().subscribe(s => this.squads.set(s.map(x => ({ id: x.id, name: x.name }))));
    this.sprintSvc.getSprints().subscribe(s => {
      this.sprints.set(s);
      this.load();
    });
  }

  onFilterApply(filters: Record<string, string[]>) {
    const sprints = filters['sprint'] ?? [];
    this.selectedSprintId = sprints.length > 0 && sprints[0] !== 'null' ? sprints[0] : null;
    const leads = filters['lead'] ?? [];
    this.selectedLeadId = leads.length > 0 && leads[0] !== 'null' ? leads[0] : null;
    const squads = filters['squad'] ?? [];
    this.selectedSquadId = squads.length > 0 && squads[0] !== 'null' ? squads[0] : null;
    const crafts = filters['craft'] ?? [];
    this.selectedCraft = crafts.length > 0 && crafts[0] !== 'null' ? crafts[0] : null;
    this.load();
  }

  load() {
    this.loading.set(true);
    const memberIds = this.getFilteredMemberIds(this.selectedLeadId, this.selectedSquadId, this.selectedCraft);
    this.leaveSvc.getAll(this.selectedSprintId ? { sprintId: this.selectedSprintId } : undefined)
      .subscribe(r => {
        let filtered = r;
        if (memberIds) filtered = filtered.filter(rec => memberIds.includes(rec.teamMemberId));
        this.records.set(filtered);
        this.loading.set(false);
      });
  }

  private getFilteredMemberIds(leadId: string | null, squadId: string | null, craft: string | null): string[] | null {
    let ids: string[] | null = null;
    if (leadId) {
      const lead = this.members().find(m => m.id === leadId);
      const leadName = lead ? lead.firstName + ' ' + lead.lastName : '';
      ids = this.members().filter(m => m.teamLeadName === leadName).map(m => m.id);
    }
    if (squadId) {
      const squadMembers = this.members().filter(m => m.squads.some(s => s.id === squadId)).map(m => m.id);
      ids = ids ? ids.filter(id => squadMembers.includes(id)) : squadMembers;
    }
    if (craft) {
      const craftMembers = this.members().filter(m => m.crafts.includes(craft)).map(m => m.id);
      ids = ids ? ids.filter(id => craftMembers.includes(id)) : craftMembers;
    }
    return ids;
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

  exportingLeave = signal(false);

  exportLeaveImage() {
    if (this.exportingLeave()) return;
    this.exportingLeave.set(true);
    this.leaveSvc.getAll().subscribe({
      next: records => {
        try { this.drawLeaveImage(records); } finally { this.exportingLeave.set(false); }
      },
      error: () => this.exportingLeave.set(false)
    });
  }

  private drawLeaveImage(records: LeaveRecord[]) {
    const title = 'Planned Leave';

    const byMember = new Map<string, LeaveRecord[]>();
    for (const r of records) {
      if (!byMember.has(r.memberName)) byMember.set(r.memberName, []);
      byMember.get(r.memberName)!.push(r);
    }
    const members = [...byMember.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    const SCALE   = 2;
    const W       = 700;
    const PAD     = 32;
    const ROW_H   = 32;
    const HDR_H   = 44;
    const TITLE_H = 60;
    const COL_X   = [0, 260, 390, 510];

    const totalRows = members.reduce((s, [, rs]) => s + Math.max(rs.length, 1), 0);
    const H = TITLE_H + HDR_H + totalRows * ROW_H + PAD;

    const canvas = document.createElement('canvas');
    canvas.width  = W * SCALE;
    canvas.height = H * SCALE;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(SCALE, SCALE);

    ctx.fillStyle = '#16202e';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#1b3050';
    ctx.fillRect(0, 0, W, TITLE_H);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px Inter, Arial, sans-serif';
    ctx.fillText(title, PAD, TITLE_H / 2 + 7);

    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '11px Inter, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(dateStr, W - PAD, TITLE_H / 2 + 6);
    ctx.textAlign = 'left';

    const headers = ['Member', 'From', 'To', 'Days'];
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(0, TITLE_H, W, HDR_H);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = 'bold 10px Inter, Arial, sans-serif';
    headers.forEach((h, i) => {
      ctx.fillText(h.toUpperCase(), PAD + COL_X[i], TITLE_H + HDR_H / 2 + 4);
    });

    let rowY = TITLE_H + HDR_H;

    members.forEach(([name, leaves], mi) => {
      const sorted = leaves.slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
      const rowCount = sorted.length || 1;
      const bg = mi % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent';

      ctx.fillStyle = bg;
      ctx.fillRect(0, rowY, W, rowCount * ROW_H);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 13px Inter, Arial, sans-serif';
      ctx.fillText(
        name.length > 28 ? name.slice(0, 26) + '…' : name,
        PAD + COL_X[0],
        rowY + (rowCount * ROW_H) / 2 + 5
      );

      if (!sorted.length) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = '12px Inter, Arial, sans-serif';
        ctx.fillText('—', PAD + COL_X[1], rowY + ROW_H / 2 + 5);
        rowY += ROW_H;
      } else {
        sorted.forEach(lr => {
          const cy = rowY + ROW_H / 2 + 5;
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.font = '12px Inter, Arial, sans-serif';
          ctx.fillText(this.fmtDate(lr.startDate), PAD + COL_X[1], cy);
          ctx.fillText(this.fmtDate(lr.endDate),   PAD + COL_X[2], cy);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 12px Inter, Arial, sans-serif';
          ctx.fillText(String(lr.daysCount), PAD + COL_X[3], cy);

          ctx.strokeStyle = 'rgba(255,255,255,0.04)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(PAD + COL_X[1], rowY + ROW_H);
          ctx.lineTo(W - PAD, rowY + ROW_H);
          ctx.stroke();

          rowY += ROW_H;
        });
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, rowY);
      ctx.lineTo(W, rowY);
      ctx.stroke();
    });

    if (!members.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '15px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No leave in this range.', W / 2, TITLE_H + HDR_H + 60);
      ctx.textAlign = 'left';
    }

    const link = document.createElement('a');
    link.download = `leave-${new Date().toISOString().slice(0,10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  private fmtDate(d: string): string {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
