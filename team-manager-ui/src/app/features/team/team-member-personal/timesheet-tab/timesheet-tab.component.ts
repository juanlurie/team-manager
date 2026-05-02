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

interface Recent { project: string; category: string; durationMins: number; combo: QuickActionConfig | undefined; }
const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

@Component({
  selector: 'app-timesheet-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatTooltipModule],
  styles: [`
    .ts-wrap { padding: 0 24px; }
    .ts-header { display:flex; align-items:center; justify-content:space-between; padding:12px 0 24px; }
    .ts-date-lbl { font-size:10px; font-weight:700; color:rgba(255,255,255,0.28); text-transform:uppercase; letter-spacing:0.07em; }
    .ts-date-val { font-size:1.3rem; font-weight:700; }
    .ts-logged { display:flex; align-items:center; gap:10px; }
    .ts-logged-lbl { font-size:10px; font-weight:700; color:rgba(255,255,255,0.28); text-transform:uppercase; letter-spacing:0.07em; }
    .ts-logged-val { font-size:1.3rem; font-weight:700; color:#64b5f6; }
    .ts-logged-bar { width:100px; height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden; }
    .ts-logged-bar-f { height:100%; background:#64b5f6; border-radius:2px; }
    .ts-logged-sub { font-size:12px; color:rgba(255,255,255,0.3); }

    .ts-recents { margin-bottom:20px; }
    .ts-rec-lbl { font-size:10px; font-weight:700; color:rgba(255,255,255,0.28); text-transform:uppercase; letter-spacing:0.07em; margin-bottom:8px; }
    .ts-rec-list { display:flex; flex-wrap:wrap; gap:6px; }
    .rec-chip { display:flex; align-items:center; gap:8px; padding:5px 10px; border-radius:16px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); cursor:pointer; transition:all 0.1s; }
    .rec-chip:hover { background:rgba(255,255,255,0.08); border-color:rgba(255,255,255,0.15); }
    .rec-dot { width:8px; height:8px; border-radius:50%; }
    .rec-proj { font-size:12px; font-weight:500; color:rgba(255,255,255,0.8); }
    .rec-cat { font-size:12px; color:rgba(255,255,255,0.4); }
    .rec-dur { font-size:11px; font-weight:600; color:rgba(255,255,255,0.4); padding:2px 6px; border-radius:5px; background:rgba(255,255,255,0.06); }

    .ts-form { display:flex; align-items:center; gap:6px; margin-bottom:8px; }
    .ts-sel { padding:8px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:inherit; font-size:12px; font-family:inherit; outline:none; cursor:pointer; appearance:none; }
    .ts-sel:focus { border-color:rgba(100,181,246,0.7); }
    .ts-sel option { background:#1a1c2a; }
    .ts-sel:disabled { opacity:0.35; cursor:not-allowed; }
    .ts-sel-proj { width:200px; }
    .ts-sel-cat { width:160px; }
    .ts-input { flex:1; padding:8px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:inherit; font-size:12px; font-family:inherit; outline:none; }
    .ts-input:focus { border-color:rgba(100,181,246,0.7); }
    .ts-input::placeholder { color:rgba(255,255,255,0.2); }
    .ts-dur-ctrls { display:flex; flex-direction:column; gap:4px; }
    .ts-dur-row { display:flex; align-items:center; justify-content:center; gap:4px; }
    .ts-dur-chip { padding:5px 9px; border-radius:5px; font-size:12px; font-weight:600; border:1px solid rgba(255,255,255,0.09); background:rgba(255,255,255,0.03); color:rgba(255,255,255,0.45); cursor:pointer; transition:all 0.1s; white-space:nowrap; }
    .ts-dur-chip:hover { border-color:rgba(255,255,255,0.18); }
    .ts-dur-chip.sel { border-color:rgba(100,181,246,0.7); background:rgba(100,181,246,0.09); color:#64b5f6; }
    .ts-add-btn { padding:8px 20px; background:#64b5f6; border:none; border-radius:6px; color:#0f1923; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; flex-shrink:0; transition:all 0.12s; white-space:nowrap; }
    .ts-add-btn:hover { background:#90caf9; }
    .ts-add-btn:disabled { opacity:0.35; cursor:not-allowed; }

    .ts-hint-bar { display:flex; align-items:center; gap:16px; font-size:11px; color:rgba(255,255,255,0.25); padding:4px 0 20px; }
    .ts-hint-key { padding:2px 5px; border-radius:4px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); font-size:10px; font-weight:600; }

    .ts-entries-hdr { display:grid; grid-template-columns:60px 1fr 1fr 2fr 100px; gap:10px; padding:8px 12px; font-size:10px; font-weight:700; color:rgba(255,255,255,0.28); text-transform:uppercase; letter-spacing:0.07em; border-bottom:1px solid rgba(255,255,255,0.07); }
    .ts-entries-list { display:flex; flex-direction:column; }
    .ts-entry-row { display:grid; grid-template-columns:60px 1fr 1fr 2fr 100px; gap:10px; align-items:center; padding:10px 12px; font-size:13px; border-bottom:1px solid rgba(255,255,255,0.04); }
    .ts-entry-time { font-size:12px; color:rgba(255,255,255,0.4); }
    .ts-entry-proj { display:flex; align-items:center; gap:8px; font-weight:500; }
    .ts-entry-dot { width:8px; height:8px; border-radius:50%; }
    .ts-entry-cat { color:rgba(255,255,255,0.6); }
    .ts-entry-note { color:rgba(255,255,255,0.6); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .ts-entry-dur { font-weight:600; text-align:right; padding:3px 8px; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); }
    .ts-empty { text-align:center; padding:60px; color:rgba(255,255,255,0.3); }
  `],
  template: `
    <div class="ts-wrap">
      <!-- Header -->
      <div class="ts-header">
        <div>
          <div class="ts-date-lbl">Today</div>
          <div class="ts-date-val">{{ selDateLabel() }}</div>
        </div>
        <div class="ts-logged">
          <div style="text-align:right">
            <div class="ts-logged-lbl">Logged</div>
            <div class="ts-logged-val">{{ fmtDur(dayTotal()) }}</div>
          </div>
          <div class="ts-logged-bar"><div class="ts-logged-bar-f" [style.width]="dayTotal()/480*100+'%'"></div></div>
          <span class="ts-logged-sub">/ 8h</span>
        </div>
      </div>

      <!-- Recents -->
      <div class="ts-recents">
        <div class="ts-rec-lbl">Recents</div>
        <div class="ts-rec-list">
          @for (r of recents(); track r.project+r.category) {
            <button class="rec-chip" (click)="applyRecent(r)">
              <span class="rec-dot" [style.background]="r.combo?.color??'#fff'"></span>
              <span class="rec-proj">{{ r.project }}</span>
              <span class="rec-cat">{{ r.category }}</span>
              <span class="rec-dur">{{ fmtDur(r.durationMins) }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Form -->
      <div class="ts-form">
        <select class="ts-sel ts-sel-proj" [ngModel]="formProject()" (ngModelChange)="setFormProject($event)">
          <option value="">Project…</option>
          @for (p of allProjects(); track p) { <option [value]="p">{{ p }}</option> }
        </select>
        <select class="ts-sel ts-sel-cat" [ngModel]="formCategory()" (ngModelChange)="formCategory.set($event)" [disabled]="!formProject()">
          <option value="">Category…</option>
          @for (c of formCats(); track c) { <option [value]="c">{{ c }}</option> }
        </select>
        <input class="ts-input" placeholder="Note (required)" [ngModel]="formNote()" (ngModelChange)="formNote.set($event)" (keydown.enter)="canAdd()&&addEntry()" />
        <div class="ts-dur-ctrls">
          <div class="ts-dur-row">
            @for (d of durChips; track d[0]) {
              <button class="ts-dur-chip" [class.sel]="formDurMins()===d[1]" (click)="formDurMins.set(d[1])">{{ d[0] }}</button>
            }
          </div>
          <div class="ts-dur-row">
            <button class="ts-dur-chip" (click)="adjustDuration(-60)">-1h</button>
            <button class="ts-dur-chip" (click)="adjustDuration(-15)">-15m</button>
            <span style="font-size:14px;font-weight:700;color:rgba(255,255,255,0.8);min-width:60px;text-align:center;">{{ fmtDur(formDurMins()) }}</span>
            <button class="ts-dur-chip" (click)="adjustDuration(15)">+15m</button>
            <button class="ts-dur-chip" (click)="adjustDuration(60)">+1h</button>
          </div>
        </div>
        <button class="ts-add-btn" [disabled]="!canAdd()" (click)="addEntry()">Add Entry</button>
      </div>

      <!-- Hint bar -->
      <div class="ts-hint-bar">
        <span><span class="ts-hint-key">Enter</span> Add entry</span>
        <span><span class="ts-hint-key">⌘ K</span> Add from anywhere</span>
        <span><span class="ts-hint-key">Scroll</span> on time to adjust</span>
        <span>Click a <b>Recent</b> to autofill</span>
      </div>

      <!-- Entries -->
      <div>
        <div class="ts-entries-hdr">
          <div>Time</div>
          <div>Project</div>
          <div>Category</div>
          <div>Note</div>
          <div style="text-align:right">Duration</div>
        </div>
        @if (loading()) {
          <div class="ts-empty">Loading…</div>
        } @else if (dayEntries().length === 0) {
          <div class="ts-empty">No entries for today.</div>
        } @else {
          <div class="ts-entries-list">
            @for (e of dayEntries(); track e.id) {
              <div class="ts-entry-row">
                <div class="ts-entry-time">{{ e.date | date:'h:mm a' }}</div>
                <div class="ts-entry-proj">
                  <span class="ts-entry-dot" [style.background]="getCombo(e)?.color??'#fff'"></span>
                  <span>{{ e.project }}</span>
                </div>
                <div class="ts-entry-cat">{{ e.category }}</div>
                <div class="ts-entry-note">{{ e.description }}</div>
                <div style="text-align:right"><span class="ts-entry-dur">{{ fmtDur(e.hours*60+e.minutes) }}</span></div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class TimesheetTabComponent implements OnInit {
  memberId = input.required<string>();
  private svc = inject(TimesheetService);
  private cfgSvc = inject(TimesheetConfigService);
  private dialog = inject(MatDialog);

  private today = new Date();
  selectedDate = signal(new Date());
  entries = signal<TimesheetEntry[]>([]);
  loading = signal(false);

  formProject = signal('');
  formCategory = signal('');
  formDurMins = signal(60);
  formNote = signal('');
  mobileAddOpen = signal(false);

  tsConfig = signal<TimesheetConfig>({ extraProjects: [], extraCategories: {}, quickActions: [] });

  readonly durChips: [string, number][] = [['15m', 15], ['30m', 30], ['1h', 60], ['1h 30m', 90], ['2h', 120], ['4h', 240], ['8h', 480]];
  readonly fmtDur = minutesToDurationLabel;

  activeQuickActions = computed<QuickActionConfig[]>(() => {
    const custom = this.tsConfig().quickActions;
    return custom.length > 0 ? custom : ACTIVITY_COMBOS;
  });

  allProjects = computed<string[]>(() => {
    const extras = this.tsConfig().extraProjects;
    return [...TIMESHEET_PROJECTS, ...extras.filter(p => !TIMESHEET_PROJECTS.includes(p))];
  });

  viewYear = computed(() => this.selectedDate().getFullYear());
  viewMonth = computed(() => this.selectedDate().getMonth() + 1);

  byDate = computed(() => {
    const m: Record<string, TimesheetEntry[]> = {};
    for (const e of this.entries()) { (m[e.date] ??= []).push(e); }
    return m;
  });

  selKey = computed(() => this.dk(this.selectedDate()));
  dayEntries = computed(() => (this.byDate()[this.selKey()] ?? []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  dayTotal = computed(() => this.dayEntries().reduce((s, e) => s + e.hours * 60 + e.minutes, 0));
  selDateLabel = computed(() => this.selectedDate().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }));

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

  canAdd = computed(() => !!this.formProject() && !!this.formCategory() && !!this.formNote().trim());

  ngOnInit() {
    this.cfgSvc.get(this.memberId()).subscribe({
      next: cfg => this.tsConfig.set(cfg),
      error: () => {},
    });

    effect(() => {
      this.load();
    });
  }

  private load() {
    this.loading.set(true);
    this.svc.getByMonth(this.memberId(), this.viewYear(), this.viewMonth()).subscribe({ next: d => { this.entries.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
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

  // TODO: Re-implement edit/delete functionality for new table layout
  // handleSave({ id, req }: { id: string; req: CreateTimesheetEntryRequest }) {
  //   this.svc.update(this.memberId(), id, req).subscribe({ next: () => this.load() });
  // }

  // deleteEntry(id: string) {
  //   this.svc.delete(this.memberId(), id).subscribe({ next: () => this.load() });
  // }

  applyRecent(r: Recent) {
    this.formProject.set(r.project);
    this.formCategory.set(r.category);
    this.formDurMins.set(r.durationMins);
    if (r.combo?.note) {
      this.formNote.set(r.combo.note);
    }
  }

  applyCombo(c: QuickActionConfig) {
    this.formProject.set(c.project);
    this.formCategory.set(c.category);
    if (c.note) this.formNote.set(c.note);
    if (c.durationMins) this.formDurMins.set(c.durationMins);
  }

  adjustDuration(minutes: number) {
    this.formDurMins.update(current => Math.max(0, current + minutes));
  }

  setFormProject(p: string) { this.formProject.set(p); this.formCategory.set(''); }

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
