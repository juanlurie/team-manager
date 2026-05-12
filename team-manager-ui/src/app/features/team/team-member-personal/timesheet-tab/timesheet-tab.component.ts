import { Component, OnInit, inject, input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { TimesheetService } from '../../../../core/services/timesheet.service';
import { TimesheetConfigService } from '../../../../core/services/timesheet-config.service';
import { TimesheetEntry, CreateTimesheetEntryRequest } from '../../../../core/models/timesheet.model';
import { TimesheetConfig, QuickActionConfig } from '../../../../core/models/timesheet-config.model';
import {
  ActivityCombo, ACTIVITY_COMBOS,
  TIMESHEET_PROJECTS, CATEGORIES_BY_PROJECT, minutesToDurationLabel, PUBLIC_HOLIDAYS_2026,
} from '../timesheet-data.constants';
import { TimesheetConfigDialogComponent } from '../timesheet-config-dialog/timesheet-config-dialog.component';
import { TimesheetEntryCardComponent } from '../timesheet-entry-card/timesheet-entry-card.component';

interface Recent { project: string; category: string; durationMins: number; combo: QuickActionConfig | undefined; }
const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

@Component({
  selector: 'app-timesheet-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatTooltipModule, TimesheetEntryCardComponent],
  templateUrl: './timesheet-tab.component.html',
  styleUrls: ['./timesheet-tab.component.scss']
})
export class TimesheetTabComponent implements OnInit {
  memberId = input.required<string>();
  private svc = inject(TimesheetService);
  private cfgSvc = inject(TimesheetConfigService);
  private dialog = inject(MatDialog);

  private today = new Date();
  weekOffset = signal(0);
  selectedDate = signal(new Date());
  entries = signal<TimesheetEntry[]>([]);
  loading = signal(false);

  formProject = signal('');
  formCategory = signal('');
  formDurMins = signal(60);
  formNote = signal('');
  mobileAddOpen = signal(false);
  projectSearch = signal('');
  categorySearch = signal('');

  tsConfig = signal<TimesheetConfig>({ extraProjects: [], extraCategories: {}, quickActions: [] });

  readonly durChips: [string, number][] = [['15m', 15], ['30m', 30], ['1h', 60], ['2h', 120], ['4h', 240], ['8h', 480]];
  readonly fmtDur = minutesToDurationLabel;

  activeQuickActions = computed<QuickActionConfig[]>(() => {
    const custom = this.tsConfig().quickActions;
    return custom.length > 0 ? custom : ACTIVITY_COMBOS;
  });

  allProjects = computed<string[]>(() => {
    const extras = this.tsConfig().extraProjects;
    return [...TIMESHEET_PROJECTS, ...extras.filter(p => !TIMESHEET_PROJECTS.includes(p))];
  });

  filteredProjects = computed(() => {
    const q = this.projectSearch().trim().toLowerCase();
    if (!q) return this.allProjects();
    return this.allProjects().filter(p => p.toLowerCase().includes(q));
  });

  viewYear = computed(() => this.selectedDate().getFullYear());
  viewMonth = computed(() => this.selectedDate().getMonth() + 1);

  week = computed(() => {
    const base = new Date(this.today);
    base.setDate(base.getDate() + this.weekOffset() * 7);
    const dow = base.getDay();
    const mon = new Date(base);
    mon.setDate(base.getDate() - (dow === 0 ? 6 : dow - 1));
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
  });

  byDate = computed(() => {
    const m: Record<string, TimesheetEntry[]> = {};
    for (const e of this.entries()) { (m[e.date] ??= []).push(e); }
    return m;
  });

  selKey = computed(() => this.dk(this.selectedDate()));
  dayEntries = computed(() => this.byDate()[this.selKey()] ?? []);
  dayTotal = computed(() => this.dayEntries().reduce((s, e) => s + e.hours * 60 + e.minutes, 0));

  monthEntries = computed(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    return this.entries().filter(e => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  });
  monthTotal = computed(() => minutesToDurationLabel(this.monthEntries().reduce((s, e) => s + e.hours * 60 + e.minutes, 0)));
  monthDaysLogged = computed(() => new Set(this.monthEntries().map(e => e.date)).size);
  weekRange = computed(() => { const w = this.week(); return `${w[0].getDate()} ${MN[w[0].getMonth()]} – ${w[6].getDate()} ${MN[w[6].getMonth()]}`; });
  monthYear = computed(() => this.week()[3].toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }));
  selDateLabel = computed(() => this.selectedDate().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }));
  selDateShort = computed(() => this.selectedDate().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }));

  recents = computed(() => {
    const seen = new Set<string>(); const result: Recent[] = [];
    for (const e of [...this.entries()].sort((a, b) => b.date.localeCompare(a.date))) {
      const key = `${e.project}|${e.category}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ project: e.project, category: e.category, durationMins: e.hours * 60 + e.minutes, combo: this.activeQuickActions().find(c => c.project === e.project && c.category === e.category) });
      }
      if (result.length >= 4) break;
    }
    return result;
  });

  formCats = computed(() => {
    const p = this.formProject();
    if (!p) return [];
    const defaults = CATEGORIES_BY_PROJECT[p] ?? [];
    const extras = this.tsConfig().extraCategories[p] ?? [];
    return [...defaults, ...extras.filter(c => !defaults.includes(c))];
  });

  filteredCategories = computed(() => {
    const q = this.categorySearch().trim().toLowerCase();
    if (!q) return this.formCats();
    return this.formCats().filter(c => c.toLowerCase().includes(q));
  });

  canAdd = computed(() => !!this.formProject() && !!this.formCategory() && !!this.formNote().trim());

  ngOnInit() {
    this.cfgSvc.get(this.memberId()).subscribe({
      next: cfg => this.tsConfig.set(cfg),
      error: () => {},
    });

    this.load();
  }

  private load() {
    const w = this.week();
    const start = w[0];
    const end = w[6];

    const startYear = start.getFullYear();
    const startMonth = start.getMonth() + 1;
    const endYear = end.getFullYear();
    const endMonth = end.getMonth() + 1;

    const monthsToLoad: {year: number, month: number}[] = [{year: startYear, month: startMonth}];
    if (startYear !== endYear || startMonth !== endMonth) {
      monthsToLoad.push({year: endYear, month: endMonth});
    }

    this.loading.set(true);
    const loaders = monthsToLoad.map(({year, month}) => this.svc.getByMonth(this.memberId(), year, month));
    forkJoin(loaders).subscribe({
      next: results => {
        const allEntries = results.flat();
        this.entries.set(allEntries);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  prevWeek() {
    const dayOfWeek = this.selectedDate().getDay();
    const indexInWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    this.weekOffset.update(n => n - 1);
    this.selectDay(this.week()[indexInWeek]);
  }
  nextWeek() {
    const dayOfWeek = this.selectedDate().getDay();
    const indexInWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    this.weekOffset.update(n => n + 1);
    this.selectDay(this.week()[indexInWeek]);
  }
  selectDay(d: Date) {
    this.selectedDate.set(d);
    this.mobileAddOpen.set(false);
  }
  isSel(d: Date) { return this.dk(d) === this.selKey(); }
  isToday(d: Date) { return this.dk(d) === this.dk(this.today); }
  dn(d: Date) { return DN[d.getDay()]; }
  dayMins(d: Date) { return (this.byDate()[this.dk(d)] ?? []).reduce((s, e) => s + e.hours * 60 + e.minutes, 0); }
  dayHrsLabel(d: Date) { const m = this.dayMins(d); return m ? minutesToDurationLabel(m) : ''; }
  dayBarPct(d: Date) { return Math.min(this.dayMins(d) / 480, 1) * 100; }

  getDayStatus(d: Date): { color: string; error: string | null } {
    const mins = this.dayMins(d);
    const dayOfWeek = d.getDay(); // 0=Sun, 6=Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dateKey = this.dk(d);
    const isPublicHoliday = PUBLIC_HOLIDAYS_2026.includes(dateKey);

    if (mins > 0) {
      if (isWeekend) {
        return { color: '#ef5350', error: 'Time logged on a weekend' };
      }
      if (isPublicHoliday) {
        return { color: '#ef5350', error: 'Time logged on a public holiday' };
      }
    }

    if (mins > 600) { // Over 10 hours
      return { color: '#ef5350', error: 'Over 10 hours logged' };
    }

    if (!isWeekend && !isPublicHoliday) { // It's a workday
      if (mins > 0 && mins < 480) { // Under 8 hours
        return { color: '#ef5350', error: 'Under 8 hours logged' };
      }
      if (mins >= 480) { // 8 hours or more (but not > 10)
        return { color: '#4caf50', error: null };
      }
    }

    // Default for in-progress on workday, or 0 hours.
    return { color: '#64b5f6', error: null };
  }

  addEntry() {
    if (!this.canAdd()) return;
    const config = this.tsConfig();
    const isBillable = (config.billableProjects ?? []).includes(this.formProject());

    const dayName = this.selectedDate().toLocaleDateString('en-US', { weekday: 'long' });
    let workedFrom = (config.workWeek ?? {})[dayName] ?? 'Home';
    const appliedCombo = this.activeQuickActions().find(c => c.project === this.formProject() && c.category === this.formCategory());
    if (appliedCombo && appliedCombo.workedFrom) {
      workedFrom = appliedCombo.workedFrom;
    }

    const req: CreateTimesheetEntryRequest = { date: this.selKey(), project: this.formProject(), category: this.formCategory(), hours: Math.floor(this.formDurMins() / 60), minutes: this.formDurMins() % 60, billable: isBillable, workedFrom, sentiment: 'Neutral', description: this.formNote(), ticketNumber: null };
    this.svc.create(this.memberId(), req).subscribe({ next: () => {
      this.formProject.set('');
      this.formCategory.set('');
      this.formNote.set('');
      this.formDurMins.set(60);
      this.load();
    } });
  }

  handleSave({ id, req }: { id: string; req: CreateTimesheetEntryRequest }) {
    this.svc.update(this.memberId(), id, req).subscribe({ next: () => this.load() });
  }

  deleteEntry(id: string) {
    this.svc.delete(this.memberId(), id).subscribe({ next: () => this.load() });
  }

  applyRecent(r: Recent) { this.formProject.set(r.project); this.formCategory.set(r.category); }

  applyCombo(c: QuickActionConfig) {
    this.formProject.set(c.project);
    this.formCategory.set(c.category);
    if (c.note) this.formNote.set(c.note);
    if (c.durationMins) this.formDurMins.set(c.durationMins);
  }

  adjustDuration(minutes: number) {
    this.formDurMins.update(current => Math.max(0, current + minutes));
  }

  setFormProject(p: string) { this.formProject.set(p); this.formCategory.set(''); this.categorySearch.set(''); }

  logRecent(r: Recent) {
    const config = this.tsConfig();
    const isBillable = (config.billableProjects ?? []).includes(r.project);

    const dayName = this.selectedDate().toLocaleDateString('en-US', { weekday: 'long' });
    let workedFrom = (config.workWeek ?? {})[dayName] ?? 'Home';
    if (r.combo && r.combo.workedFrom) {
      workedFrom = r.combo.workedFrom;
    }

    const req: CreateTimesheetEntryRequest = { date: this.selKey(), project: r.project, category: r.category, hours: Math.floor(r.durationMins / 60), minutes: r.durationMins % 60, billable: isBillable, workedFrom, sentiment: 'Neutral', description: r.category, ticketNumber: null };
    this.svc.create(this.memberId(), req).subscribe({ next: () => this.load() });
  }

  getCombo(entry: TimesheetEntry): QuickActionConfig | undefined {
    return this.activeQuickActions().find(c => c.project === entry.project && c.category === entry.category);
  }

  openConfig() {
    const currentConfig = this.tsConfig();
    const configForDialog: TimesheetConfig = {
      ...currentConfig,
      billableProjects: currentConfig.billableProjects ?? [],
      workWeek: currentConfig.workWeek ?? {},
    };
    const ref = this.dialog.open(TimesheetConfigDialogComponent, {
      data: { memberId: this.memberId(), config: configForDialog },
      panelClass: 'dark-dialog',
      maxWidth: '100vw',
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.tsConfig.set(result);
    });
  }

  exportMonth() {
    this.svc.exportMonth(this.memberId(), this.viewYear(), this.viewMonth()).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `timesheet-${this.viewYear()}-${String(this.viewMonth()).padStart(2,'0')}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    });
  }

  private dk(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
}
