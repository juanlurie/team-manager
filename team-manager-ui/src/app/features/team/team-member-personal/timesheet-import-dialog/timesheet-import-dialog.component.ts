import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { OutlookCalendarService } from '../../../api-request-configs/outlook-calendar.service';
import { GoogleCalendarService } from '../../../api-request-configs/google-calendar.service';
import { CreateTimesheetEntryRequest } from '../../../../core/models/timesheet.model';
import { minutesToDurationLabel } from '../timesheet-data.constants';

export interface ImportDialogData {
  mode: 'day' | 'week';
  dates: string[];
  dateLabel: string;
  allCatMap: Record<string, string[]>;
  defaultProject?: string | null;
  defaultCategory?: string | null;
  billableProjects: string[];
  workLocationOptions: string[];
  locationIcons: Record<string, string>;
  defaultWorkedFrom: string;
}

export interface ImportResult {
  entries: { date: string; req: CreateTimesheetEntryRequest }[];
}

export interface ImportRow {
  id: string;
  date: string;
  timeLabel: string;
  note: string;
  project: string;
  category: string;
  durationMins: number;
  isAllDay: boolean;
}

@Component({
  selector: 'app-timesheet-import-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .dlg { display:flex; flex-direction:column; max-height:85vh; outline:none; min-width:min(720px,95vw); }
    .hdr { display:flex; align-items:center; gap:10px; padding:16px 20px 14px; border-bottom:1px solid rgba(255,255,255,0.07); flex-shrink:0; }
    .hdr-title { font-size:15px; font-weight:700; flex:1; }
    .hdr-sub { font-size:12px; color:rgba(255,255,255,0.4); }
    .hdr-close { background:none; border:none; color:rgba(255,255,255,0.3); cursor:pointer; font-size:22px; line-height:1; padding:2px 6px; flex-shrink:0; }
    .hdr-close:hover { color:rgba(255,255,255,0.8); }

    .body { flex:1; overflow-y:auto; }
    .body::-webkit-scrollbar { width:3px; }
    .body::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }

    .loading { display:flex; align-items:center; justify-content:center; gap:8px; padding:40px; color:rgba(255,255,255,0.3); font-size:13px; }
    .empty { text-align:center; padding:40px; color:rgba(255,255,255,0.3); font-size:13px; }

    .col-hdr { display:grid; grid-template-columns:80px 1fr 140px 140px 148px; gap:8px; padding:6px 16px; border-bottom:1px solid rgba(255,255,255,0.07); font-size:10px; font-weight:700; color:rgba(255,255,255,0.22); text-transform:uppercase; letter-spacing:0.06em; }

    .day-label { padding:7px 16px 5px; font-size:11px; font-weight:700; color:rgba(255,255,255,0.32); text-transform:uppercase; letter-spacing:0.05em; background:rgba(255,255,255,0.02); border-bottom:1px solid rgba(255,255,255,0.05); display:flex; align-items:center; gap:8px; }
    .day-count { font-size:10px; font-weight:500; color:rgba(255,255,255,0.18); text-transform:none; letter-spacing:0; }

    .row { display:grid; grid-template-columns:80px 1fr 140px 140px 148px; gap:8px; align-items:center; padding:7px 16px; border-bottom:1px solid rgba(255,255,255,0.04); transition:background 0.1s; }
    .row-top { display:contents; }
    .row:last-child { border-bottom:none; }
    .row:hover { background:rgba(255,255,255,0.02); }
    .row.desel { opacity:0.38; }

    .cb { width:15px; height:15px; cursor:pointer; accent-color:#64b5f6; flex-shrink:0; margin:0; }
    .time { font-size:11px; color:rgba(255,255,255,0.35); white-space:nowrap; }
    .inp { width:100%; padding:5px 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:5px; color:inherit; font-size:12px; font-family:inherit; outline:none; box-sizing:border-box; }
    .inp:focus { border-color:rgba(100,181,246,0.5); background:rgba(100,181,246,0.04); }
    .sel { width:100%; padding:4px 6px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:5px; color:inherit; font-size:12px; font-family:inherit; outline:none; cursor:pointer; box-sizing:border-box; }
    .sel:focus { border-color:rgba(100,181,246,0.5); }

    .dur-ctrl { display:flex; align-items:center; gap:3px; }
    .dur-val { font-size:12px; font-weight:700; min-width:40px; text-align:center; color:rgba(255,255,255,0.85); flex-shrink:0; }
    .d-btn { padding:4px 7px; border-radius:5px; font-size:11px; font-weight:600; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.03); color:rgba(255,255,255,0.45); cursor:pointer; flex-shrink:0; line-height:1; transition:all 0.1s; }
    .d-btn:hover { border-color:rgba(100,181,246,0.45); color:#64b5f6; background:rgba(100,181,246,0.08); }
    .d-btn.hi { border-color:rgba(100,181,246,0.35); color:rgba(100,181,246,0.75); background:rgba(100,181,246,0.06); }
    .d-btn.hi:hover { background:rgba(100,181,246,0.18); border-color:#64b5f6; color:#64b5f6; }

    .ftr { display:flex; align-items:center; gap:8px; padding:12px 16px; border-top:1px solid rgba(255,255,255,0.08); flex-shrink:0; flex-wrap:wrap; }
    .ftr-info { flex:1; font-size:12px; color:rgba(255,255,255,0.38); min-width:120px; }
    .ftr-info strong { color:rgba(255,255,255,0.7); }
    .btn { padding:7px 14px; border-radius:6px; font-size:13px; cursor:pointer; font-family:inherit; border:1px solid; transition:all 0.12s; }
    .btn-ghost { background:transparent; border-color:rgba(255,255,255,0.1); color:rgba(255,255,255,0.4); }
    .btn-ghost:hover { border-color:rgba(255,255,255,0.22); color:rgba(255,255,255,0.7); }
    .btn-primary { background:rgba(100,181,246,0.13); border-color:rgba(100,181,246,0.4); color:#64b5f6; font-weight:600; }
    .btn-primary:hover:not(:disabled) { background:rgba(100,181,246,0.25); }
    .btn-primary:disabled { opacity:0.35; cursor:not-allowed; }

    @media (max-width: 640px) {
      .dlg { min-width:unset; width:100vw; max-height:100dvh; border-radius:16px 16px 0 0; overflow-x:hidden; }
      .body { overflow-x:hidden; }
      .col-hdr { display:none; }
      .row {
        display:flex; flex-direction:column; align-items:stretch; gap:6px;
        padding:10px 14px; border-bottom:1px solid rgba(255,255,255,0.06);
      }
      .row-top { display:flex; align-items:center; gap:8px; flex-shrink:0; }
      .inp, .sel { width:100%; box-sizing:border-box; }
      .dur-ctrl { justify-content:center; flex-wrap:wrap; }
      .ftr { gap:6px; }
      .btn { flex:1; text-align:center; }
      .ftr-info { width:100%; flex:none; order:-1; text-align:center; }
    }
  `],
  template: `
    <div class="dlg">
      <div class="hdr">
        <div>
          <div class="hdr-title">Import Calendar Events</div>
          <div class="hdr-sub">{{ data.dateLabel }}</div>
        </div>
        <button class="hdr-close" (click)="close()">×</button>
      </div>

      <div class="body">
        @if (loading()) {
          <div class="loading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></path></svg>
            Loading events…
          </div>
        } @else if (rows().length === 0) {
          <div class="empty">No calendar events found for this period.</div>
        } @else {
          <div class="col-hdr">
            <span>Time</span><span>Note</span><span>Project</span><span>Category</span><span>Duration</span>
          </div>
          @for (group of grouped(); track group.date) {
            @if (data.mode === 'week') {
              <div class="day-label">
                {{ group.label }}
                <span class="day-count">{{ group.rows.length }} event{{ group.rows.length !== 1 ? 's' : '' }}</span>
              </div>
            }
            @for (row of group.rows; track row.id) {
              <div class="row" [class.desel]="!isSelected(row.id)">
                <!-- mobile: checkbox + time on same line -->
                <ng-container *ngTemplateOutlet="desktopRow; context: { row }"></ng-container>
              </div>
            }
          }
        }
      </div>

      <ng-template #desktopRow let-row="row">
        <div class="row-top">
          <input type="checkbox" class="cb" [checked]="isSelected(row.id)" (change)="toggleSelected(row.id)">
          <span class="time">{{ row.timeLabel }}</span>
        </div>
        <input class="inp" [value]="getNote(row.id)" (input)="setNote(row.id, $any($event.target).value)" (focus)="ensureSelected(row.id)" placeholder="Note…">
        <select class="sel" [ngModel]="getProject(row.id)" (ngModelChange)="setProject(row.id, $event); ensureSelected(row.id)">
          <option value="">— Project —</option>
          @for (p of allProjects(); track p) { <option [value]="p">{{ p }}</option> }
        </select>
        <select class="sel" [ngModel]="getCategory(row.id)" (ngModelChange)="setCategory(row.id, $event); ensureSelected(row.id)">
          <option value="">— Category —</option>
          @for (c of catsFor(getProject(row.id)); track c) { <option [value]="c">{{ c }}</option> }
        </select>
        <div class="dur-ctrl">
          <button class="d-btn" (click)="adjustDur(row.id, -60); ensureSelected(row.id)">−1h</button>
          <button class="d-btn hi" (click)="adjustDur(row.id, -30); ensureSelected(row.id)">−30m</button>
          <span class="dur-val">{{ fmtDur(getDur(row.id)) }}</span>
          <button class="d-btn hi" (click)="adjustDur(row.id, 30); ensureSelected(row.id)">+30m</button>
          <button class="d-btn" (click)="adjustDur(row.id, 60); ensureSelected(row.id)">+1h</button>
        </div>
      </ng-template>

      <div class="ftr">
        <button class="btn btn-ghost" (click)="toggleAll()">{{ allSelected() ? 'Deselect all' : 'Select all' }}</button>
        <div class="ftr-info">
          <strong>{{ selectedCount() }}</strong> of {{ rows().length }} · <strong>{{ totalDuration() }}</strong>
        </div>
        <button class="btn btn-ghost" (click)="close()">Cancel</button>
        <button class="btn btn-primary" [disabled]="selectedCount() === 0" (click)="confirm()">
          Import {{ selectedCount() }} entr{{ selectedCount() !== 1 ? 'ies' : 'y' }}
        </button>
      </div>
    </div>
  `
})
export class TimesheetImportDialogComponent implements OnInit {
  data = inject<ImportDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<TimesheetImportDialogComponent>);
  private outlook = inject(OutlookCalendarService);
  private google = inject(GoogleCalendarService);
  private http = inject(HttpClient);

  readonly fmtDur = minutesToDurationLabel;

  loading = signal(true);
  rows = signal<ImportRow[]>([]);

  // Separate reactive state for mutable per-row fields
  private selectedIds = signal<Set<string>>(new Set());
  private notes = signal<Record<string, string>>({});
  private projects = signal<Record<string, string>>({});
  private categories = signal<Record<string, string>>({});
  private durations = signal<Record<string, number>>({});

  allProjects = computed(() => Object.keys(this.data.allCatMap));

  catsFor(project: string): string[] {
    return this.data.allCatMap[project] ?? [];
  }

  isSelected(id: string) { return this.selectedIds().has(id); }
  getNote(id: string) { return this.notes()[id] ?? ''; }
  getProject(id: string) { return this.projects()[id] ?? ''; }
  getCategory(id: string) { return this.categories()[id] ?? ''; }
  getDur(id: string) { return this.durations()[id] ?? 60; }

  selectedCount = computed(() => this.selectedIds().size);
  allSelected = computed(() => this.rows().length > 0 && this.selectedIds().size === this.rows().length);

  totalDuration = computed(() => {
    const ids = this.selectedIds();
    const durs = this.durations();
    let total = 0;
    for (const id of ids) total += durs[id] ?? 60;
    return minutesToDurationLabel(total);
  });

  grouped = computed(() => {
    const map = new Map<string, ImportRow[]>();
    for (const row of this.rows()) {
      if (!map.has(row.date)) map.set(row.date, []);
      map.get(row.date)!.push(row);
    }
    return Array.from(map.entries()).map(([date, rows]) => ({
      date, label: this.dayLabel(date), rows
    }));
  });

  ngOnInit() { this.loadEvents(); }

  toggleSelected(id: string) {
    this.selectedIds.update(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  ensureSelected(id: string) {
    if (!this.selectedIds().has(id)) {
      this.selectedIds.update(s => { const n = new Set(s); n.add(id); return n; });
    }
  }

  setNote(id: string, v: string) { this.notes.update(n => ({ ...n, [id]: v })); }

  setProject(id: string, v: string) {
    this.projects.update(p => ({ ...p, [id]: v }));
    const cats = this.catsFor(v);
    if (!cats.includes(this.getCategory(id))) {
      this.categories.update(c => ({ ...c, [id]: cats[0] ?? '' }));
    }
  }

  setCategory(id: string, v: string) { this.categories.update(c => ({ ...c, [id]: v })); }

  adjustDur(id: string, delta: number) {
    this.durations.update(d => ({ ...d, [id]: Math.max(15, (d[id] ?? 60) + delta) }));
  }

  toggleAll() {
    if (this.allSelected()) {
      this.selectedIds.set(new Set());
    } else {
      this.selectedIds.set(new Set(this.rows().map(r => r.id)));
    }
  }

  confirm() {
    const durs = this.durations();
    const notes = this.notes();
    const projs = this.projects();
    const cats = this.categories();
    const ids = this.selectedIds();

    const entries = this.rows()
      .filter(r => ids.has(r.id))
      .filter(r => projs[r.id] && cats[r.id] && (durs[r.id] ?? 0) > 0)
      .map(r => ({
        date: r.date,
        req: {
          date: r.date,
          project: projs[r.id],
          category: cats[r.id],
          hours: Math.floor((durs[r.id] ?? 60) / 60),
          minutes: (durs[r.id] ?? 60) % 60,
          description: notes[r.id] ?? r.note,
          workedFrom: this.data.defaultWorkedFrom,
          billable: this.data.billableProjects.includes(projs[r.id]),
          sentiment: '',
          ticketNumber: null,
        } as CreateTimesheetEntryRequest
      }));

    this.ref.close({ entries } as ImportResult);
  }

  close() { this.ref.close(); }

  private loadEvents() {
    const start = this.data.dates[0] + 'T00:00:00';
    const end   = this.data.dates[this.data.dates.length - 1] + 'T23:59:59';
    const startE = encodeURIComponent(start);
    const endE   = encodeURIComponent(end);

    forkJoin({
      outlookStatus: this.outlook.getStatus().pipe(catchError(() => of({ isConnected: false, accounts: [] }))),
      googleStatus:  this.google.getStatus().pipe(catchError(() => of({ isConnected: false, accounts: [] }))),
      configurable:  this.http.get<any[]>(`/api/v1/integrations/calendar-events?start=${startE}&end=${endE}`).pipe(catchError(() => of([]))),
    }).pipe(
      switchMap(({ outlookStatus, googleStatus, configurable }) => {
        const outlookEvts$ = outlookStatus.isConnected
          ? this.outlook.getEvents(new Date(start), new Date(end)).pipe(catchError(() => of([])))
          : of([]);
        const googleEvts$ = googleStatus.isConnected
          ? this.google.getEvents(new Date(start), new Date(end)).pipe(catchError(() => of([])))
          : of([]);
        return forkJoin({ outlookEvts: outlookEvts$, googleEvts: googleEvts$, configurable: of(configurable) });
      })
    ).subscribe({
      next: ({ outlookEvts, googleEvts, configurable }) => {
        const all = [
          ...outlookEvts.map((e: any) => ({ ...e })),
          ...googleEvts.map((e: any) => ({ ...e })),
          ...configurable.map((e: any) => ({ ...e })),
        ]
          .filter(e => !this.isCancelled(e))
          .filter(e => this.data.dates.some(d => (e.start ?? '').startsWith(d)))
          .sort((a, b) => (a.start ?? '').localeCompare(b.start ?? ''));

        const defaultProject = this.data.defaultProject ?? this.allProjects()[0] ?? '';
        const defaultCategory = this.data.defaultCategory
          ?? (this.catsFor(defaultProject)[0] ?? '');

        const rows: ImportRow[] = all.map((e, i) => ({
          id: `${i}-${e.start}-${e.subject}`,
          date: (e.start ?? '').substring(0, 10),
          timeLabel: e.isAllDay ? 'All day' : this.fmtTime(e.start ?? ''),
          note: this.cleanSubject(e.subject ?? ''),
          project: defaultProject,
          category: defaultCategory,
          durationMins: e.isAllDay ? 480 : Math.max(15, this.roundTo15(this.calcDuration(e.start ?? '', e.end ?? ''))),
          isAllDay: !!e.isAllDay,
        }));

        // Initialise per-row state
        const initNotes: Record<string, string> = {};
        const initProjects: Record<string, string> = {};
        const initCats: Record<string, string> = {};
        const initDurs: Record<string, number> = {};
        const initSelected = new Set<string>();

        for (const r of rows) {
          initNotes[r.id]    = r.note;
          initProjects[r.id] = r.project;
          initCats[r.id]     = r.category;
          initDurs[r.id]     = r.durationMins;
          initSelected.add(r.id);
        }

        this.notes.set(initNotes);
        this.projects.set(initProjects);
        this.categories.set(initCats);
        this.durations.set(initDurs);
        this.selectedIds.set(initSelected);
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private isCancelled(e: any): boolean {
    const status = (e.status ?? '').toLowerCase();
    if (status === 'cancelled' || status === 'canceled') return true;
    const subject = (e.subject ?? '').toLowerCase();
    return subject.startsWith('cancelled:') || subject.startsWith('canceled:');
  }

  private cleanSubject(subject: string): string {
    return subject.replace(/^(fw|fwd|re|cancelled|canceled)\s*:\s*/i, '').trim();
  }

  private dayLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  private fmtTime(iso: string): string {
    const hasOffset = iso.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(iso);
    const d = new Date(hasOffset ? iso : iso + 'Z');
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  private calcDuration(start: string, end: string): number {
    const addZ = (s: string) => (s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s)) ? s : s + 'Z';
    return Math.max(0, Math.round((new Date(addZ(end)).getTime() - new Date(addZ(start)).getTime()) / 60000));
  }

  private roundTo15(mins: number): number {
    return Math.round(mins / 15) * 15 || 15;
  }
}
