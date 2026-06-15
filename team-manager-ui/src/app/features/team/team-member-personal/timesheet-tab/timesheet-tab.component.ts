import { Component, OnInit, OnDestroy, HostListener, inject, input, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { Subscription } from 'rxjs';

import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { TimesheetService } from '../../../../core/services/timesheet.service';
import { TimesheetConfigService } from '../../../../core/services/timesheet-config.service';
import { TimesheetEntry, CreateTimesheetEntryRequest } from '../../../../core/models/timesheet.model';
import { TimesheetConfig, QuickActionConfig } from '../../../../core/models/timesheet-config.model';
import {
  ActivityCombo, ACTIVITY_COMBOS,
  minutesToDurationLabel, PUBLIC_HOLIDAYS_2026,
} from '../timesheet-data.constants';
import { TimesheetDefaultsService } from '../../../../core/services/timesheet-defaults.service';
import { TimesheetConfigDialogComponent } from '../timesheet-config-dialog/timesheet-config-dialog.component';
import { WebSocketService } from '../../../../core/websocket/websocket.service';
import { TimesheetEntryCardComponent } from '../timesheet-entry-card/timesheet-entry-card.component';
import { TimesheetQuickAddModalComponent, QuickAddData } from '../timesheet-quick-add-modal/timesheet-quick-add-modal.component';
import { TimesheetImportDialogComponent, ImportDialogData, ImportResult } from '../timesheet-import-dialog/timesheet-import-dialog.component';

interface Recent { project: string; category: string; durationMins: number; combo: QuickActionConfig | undefined; }
const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

@Component({
  selector: 'app-timesheet-tab',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatTooltipModule, TimesheetEntryCardComponent, TimesheetImportDialogComponent],
  templateUrl: './timesheet-tab.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrls: ['./timesheet-tab.component.scss']
})
export class TimesheetTabComponent implements OnInit, OnDestroy {
  memberId = input.required<string>();
  private svc = inject(TimesheetService);
  private cfgSvc = inject(TimesheetConfigService);
  private dialog = inject(MatDialog);
  private ws = inject(WebSocketService);
  private tsd = inject(TimesheetDefaultsService);
  private http = inject(HttpClient);
  private wsSub?: Subscription;

  private today = new Date();
  weekOffset = signal(0);
  selectedDate = signal(new Date());
  entries = signal<TimesheetEntry[]>([]);
  loading = signal(false);
  syncing = signal(false);
  mobileAddOpen = signal(false);
  importOpen = signal(false);

  tsConfig = signal<TimesheetConfig>({ extraProjects: [], extraCategories: {}, quickActions: [] });

  hasSyncConfig = computed(() =>
    Object.keys(this.tsConfig().categoryCorrelationIds ?? {}).length > 0
  );

  dayHasPendingSync = computed(() => {
    if (!this.hasSyncConfig()) return false;
    return this.dayEntries().some(e => !e.externalId);
  });

  readonly fmtDur = minutesToDurationLabel;

  activeQuickActions = computed<QuickActionConfig[]>(() => {
    const custom = this.tsConfig().quickActions;
    return custom.length > 0 ? custom : ACTIVITY_COMBOS;
  });

  allProjects = computed<string[]>(() => {
    const extras = this.tsConfig().extraProjects;
    return [...this.tsd.projects(), ...extras.filter(p => !this.tsd.projects().includes(p))];
  });

  allCatMap = computed<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    for (const proj of this.allProjects()) {
      const defaults = this.tsd.categoriesFor(proj);
      const extras = this.tsConfig().extraCategories[proj] ?? [];
      map[proj] = [...defaults, ...extras.filter(c => !defaults.includes(c))];
    }
    return map;
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

  ngOnInit() {
    this.cfgSvc.get(this.memberId()).subscribe({
      next: cfg => this.tsConfig.set(cfg),
      error: () => {},
    });
    this.load();
    this.ws.connect();
    this.wsSub = this.ws.messages$.subscribe(msg => {
      if (!msg) return;
      const types = ['timesheet_entry_created', 'timesheet_entry_updated', 'timesheet_entry_deleted'];
      if (types.includes(msg.type) && msg.data['memberId'] === this.memberId()) {
        this.load();
      }
    });
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
  }

  @HostListener('document:keydown', ['$event'])
  onDocKey(e: KeyboardEvent) {
    if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (!['input', 'textarea', 'select'].includes(tag)) {
        e.preventDefault();
        this.openQuickAdd();
      }
    }
  }

  openQuickAdd(prefill?: { project?: string; category?: string; note?: string; durationMins?: number }) {
    const config = this.tsConfig();
    const dayName = this.selectedDate().toLocaleDateString('en-US', { weekday: 'long' });
    const defaultWorkedFrom = (config.workWeek ?? {})[dayName] ?? 'Home';

    const data: QuickAddData = {
      date: this.selKey(),
      dateLabel: this.selDateLabel(),
      allCatMap: this.allCatMap(),
      activeQuickActions: this.activeQuickActions(),
      defaultWorkedFrom,
      billableProjects: config.billableProjects ?? [],
      prefill: prefill ?? null,
      workLocationOptions: config.workLocationOptions,
      locationIcons: config.locationIcons,
    };

    const ref = this.dialog.open(TimesheetQuickAddModalComponent, {
      data,
      panelClass: 'dark-dialog',
      width: '520px',
      maxWidth: '96vw',
      autoFocus: false,
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const r = result as any;
      if (r.saveAsQuickAction !== undefined) {
        this.toggleQuickAction(result, r.saveAsQuickAction);
      } else if (r.editEntryId) {
        this.handleSave({ id: r.editEntryId, req: result });
      } else {
        this.handleQuickAdd(result);
        if (r.addAnother) this.openQuickAdd();
      }
    });
  }

  openImport(mode: 'day' | 'week') {
    const config = this.tsConfig();
    const dayName = this.selectedDate().toLocaleDateString('en-US', { weekday: 'long' });
    const dates = mode === 'day'
      ? [this.selKey()]
      : this.week().map(d => this.dk(d));

    const dateLabel = mode === 'day'
      ? this.selDateLabel()
      : this.weekRange();

    const data: ImportDialogData = {
      mode,
      dates,
      dateLabel,
      allCatMap: this.allCatMap(),
      defaultProject: this.tsConfig().calendarDefaultProject,
      defaultCategory: this.tsConfig().calendarDefaultCategory,
      billableProjects: config.billableProjects ?? [],
      workLocationOptions: config.workLocationOptions ?? ['Home', 'Client', 'Other'],
      locationIcons: config.locationIcons ?? {},
      defaultWorkedFrom: (config.workWeek ?? {})[dayName] ?? 'Home',
    };

    const ref = this.dialog.open(TimesheetImportDialogComponent, {
      data,
      panelClass: 'dark-dialog',
      width: '760px',
      maxWidth: '98vw',
      autoFocus: false,
    });

    ref.afterClosed().subscribe((result: ImportResult | undefined) => {
      if (!result?.entries?.length) return;
      for (const { req } of result.entries) {
        this.svc.create(this.memberId(), req).subscribe({
          next: (entry: TimesheetEntry) => { this.entries.update(es => [...es, entry]); },
          error: () => {}
        });
      }
    });
  }

  openEdit(entry: TimesheetEntry) {
    const config = this.tsConfig();
    const defaultWorkedFrom = entry.workedFrom || 'Home';

    const data: QuickAddData = {
      date: entry.date,
      dateLabel: new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
      allCatMap: this.allCatMap(),
      activeQuickActions: this.activeQuickActions(),
      defaultWorkedFrom,
      billableProjects: config.billableProjects ?? [],
      prefill: {
        project: entry.project,
        category: entry.category,
        note: entry.description ?? undefined,
        durationMins: entry.hours * 60 + entry.minutes,
      },
      editEntryId: entry.id,
      workLocationOptions: config.workLocationOptions,
      locationIcons: config.locationIcons,
    };

    const ref = this.dialog.open(TimesheetQuickAddModalComponent, {
      data,
      panelClass: 'dark-dialog',
      width: '520px',
      maxWidth: '96vw',
      autoFocus: false,
    });

    ref.afterClosed().subscribe(result => {
      if (!result) return;
      const r = result as any;
      if (r.saveAsQuickAction !== undefined) {
        this.toggleQuickAction(result, r.saveAsQuickAction);
      } else {
        this.handleSave({ id: entry.id, req: result });
      }
    });
  }

  private static readonly QA_COLORS = [
    { color: '#82aaff', bg: 'rgba(130,170,255,0.15)' },
    { color: '#4caf50', bg: 'rgba(76,175,80,0.13)' },
    { color: '#ff9800', bg: 'rgba(255,152,0,0.14)' },
    { color: '#ce93d8', bg: 'rgba(206,147,216,0.14)' },
    { color: '#4dd0e1', bg: 'rgba(77,208,225,0.13)' },
    { color: '#ffb74d', bg: 'rgba(255,183,77,0.14)' },
    { color: '#ef5350', bg: 'rgba(239,83,80,0.13)' },
    { color: '#aed581', bg: 'rgba(174,213,129,0.13)' },
  ];

  toggleQuickAction(req: CreateTimesheetEntryRequest, add: boolean) {
    const cfg = this.tsConfig();
    const existing = cfg.quickActions ?? [];
    let updated: typeof existing;
    if (add) {
      const palette = TimesheetTabComponent.QA_COLORS[existing.length % TimesheetTabComponent.QA_COLORS.length];
      const newQa = {
        label: req.description?.trim() || req.category,
        project: req.project,
        category: req.category,
        note: req.description?.trim() || undefined,
        durationMins: req.hours * 60 + req.minutes,
        color: palette.color,
        bg: palette.bg,
      };
      updated = [...existing, newQa];
    } else {
      const note = req.description?.trim() ?? '';
      updated = existing.filter(q => !(q.project === req.project && q.category === req.category && (q.note ?? '') === note));
    }
    this.cfgSvc.upsert(this.memberId(), { ...cfg, quickActions: updated }).subscribe({
      next: config => this.tsConfig.set(config),
    });
  }

  handleQuickAdd(req: CreateTimesheetEntryRequest) {
    if (this.tsConfig().mergeEntriesEnabled) {
      const existing = this.entries().find(e =>
        e.date === req.date && e.project === req.project && e.category === req.category
      );
      if (existing) {
        const totalMins = existing.hours * 60 + existing.minutes + req.hours * 60 + req.minutes;
        const notes = [existing.description, req.description].filter(n => n?.trim());
        const merged = notes.length > 1 ? notes.join('\n') : (notes[0] ?? null);
        this.svc.update(this.memberId(), existing.id, {
          ...req,
          hours: Math.floor(totalMins / 60),
          minutes: totalMins % 60,
          description: merged,
          workedFrom: existing.workedFrom,
        }).subscribe({ next: () => this.load() });
        return;
      }
    }
    this.svc.create(this.memberId(), req).subscribe({ next: () => this.load() });
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
    const loaders = monthsToLoad.map(({year, month}) => this.svc.getByMonth(this.memberId(), year, month));
    const isFirstLoad = this.entries().length === 0;
    const timer = isFirstLoad ? setTimeout(() => this.loading.set(true), 150) : null;
    forkJoin(loaders).subscribe({
      next: results => {
        if (timer) clearTimeout(timer);
        this.entries.set(results.flat());
        this.loading.set(false);
      },
      error: () => { if (timer) clearTimeout(timer); this.loading.set(false); }
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
  selectDay(d: Date) { this.selectedDate.set(d); this.mobileAddOpen.set(false); }
  isSel(d: Date) { return this.dk(d) === this.selKey(); }
  isToday(d: Date) { return this.dk(d) === this.dk(this.today); }
  dn(d: Date) { return DN[d.getDay()]; }
  dayMins(d: Date) { return (this.byDate()[this.dk(d)] ?? []).reduce((s, e) => s + e.hours * 60 + e.minutes, 0); }
  dayHrsLabel(d: Date) { const m = this.dayMins(d); return m ? minutesToDurationLabel(m) : ''; }
  dayBarPct(d: Date) { return Math.min(this.dayMins(d) / 480, 1) * 100; }

  getDayStatus(d: Date): { color: string; error: string | null } {
    const mins = this.dayMins(d);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const dateKey = this.dk(d);
    const isPublicHoliday = PUBLIC_HOLIDAYS_2026.includes(dateKey);
    if (mins > 0) {
      if (isWeekend) return { color: '#ef5350', error: 'Time logged on a weekend' };
      if (isPublicHoliday) return { color: '#ef5350', error: 'Time logged on a public holiday' };
    }
    if (mins > 600) return { color: '#ef5350', error: 'Over 10 hours logged' };
    if (!isWeekend && !isPublicHoliday) {
      if (mins > 0 && mins < 480) return { color: '#ef5350', error: 'Under 8 hours logged' };
      if (mins >= 480) return { color: '#4caf50', error: null };
    }
    return { color: '#64b5f6', error: null };
  }

  handleSave({ id, req }: { id: string; req: CreateTimesheetEntryRequest }) {
    this.svc.update(this.memberId(), id, req).subscribe({ next: () => this.load() });
  }

  deleteEntry(id: string) {
    this.svc.delete(this.memberId(), id).subscribe({ next: () => this.load() });
  }

  logRecent(r: Recent) {
    const config = this.tsConfig();
    const isBillable = (config.billableProjects ?? []).includes(r.project);
    const dayName = this.selectedDate().toLocaleDateString('en-US', { weekday: 'long' });
    let workedFrom = (config.workWeek ?? {})[dayName] ?? 'Home';
    if (r.combo?.workedFrom) workedFrom = r.combo.workedFrom;
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

  entrySyncStatus(e: TimesheetEntry): 'pending' | 'failed' | 'unsynced' | null {
    if (!this.hasSyncConfig()) return null;
    if (e.externalId) return null;
    if (e.syncStatus === 'failed') return 'failed';
    if (e.syncStatus === 'pending') return 'pending';
    return 'unsynced';
  }

  syncDay() {
    const ids = this.dayEntries().filter(e => !e.externalId).map(e => e.id);
    if (!ids.length || this.syncing()) return;
    this.syncing.set(true);
    this.http.post(`/api/v1/team-members/${this.memberId()}/timesheets/enqueue-sync`, { entryIds: ids }).subscribe({
      next: () => { this.syncing.set(false); this.load(); },
      error: () => { this.syncing.set(false); },
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
