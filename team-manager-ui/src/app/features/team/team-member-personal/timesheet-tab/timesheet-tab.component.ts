import { Component, OnInit, inject, input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TimesheetService } from '../../../../core/services/timesheet.service';
import { TimesheetEntry } from '../../../../core/models/timesheet.model';
import { TimesheetWeekRowComponent } from '../timesheet-week-row/timesheet-week-row.component';
import { TimesheetEntryDialogComponent, TimesheetEntryDialogData } from '../timesheet-entry-dialog/timesheet-entry-dialog.component';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

@Component({
  selector: 'app-timesheet-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    TimesheetWeekRowComponent,
  ],
  template: `
    <div style="padding-top:20px">

      <!-- Month navigation + Export -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <button mat-icon-button (click)="prevMonth()" matTooltip="Previous month">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <span style="font-size:1rem;font-weight:700;min-width:130px;text-align:center">
          {{ monthName() }} {{ viewYear() }}
        </span>
        <button mat-icon-button (click)="nextMonth()" matTooltip="Next month">
          <mat-icon>chevron_right</mat-icon>
        </button>
        <div style="flex:1"></div>
        <button mat-stroked-button (click)="exportMonth()" style="font-size:0.8rem">
          <mat-icon style="font-size:16px;margin-right:4px">download</mat-icon>
          Export Excel
        </button>
      </div>

      <!-- Week navigation -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <button mat-icon-button (click)="prevWeek()" [disabled]="!canGoPrevWeek()" matTooltip="Previous week">
          <mat-icon>chevron_left</mat-icon>
        </button>
        <span style="font-size:0.88rem;opacity:0.6;min-width:160px;text-align:center">{{ weekLabel() }}</span>
        <button mat-icon-button (click)="nextWeek()" [disabled]="!canGoNextWeek()" matTooltip="Next week">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>

      <!-- Week rows -->
      @if (loading()) {
        <div style="display:flex;justify-content:center;padding:40px">
          <mat-spinner diameter="36"></mat-spinner>
        </div>
      } @else {
        @for (day of weekDays(); track day) {
          <app-timesheet-week-row
            [date]="toDateStr(day)"
            [entries]="entriesForDate(toDateStr(day))"
            [isToday]="isToday(day)"
            [isInCurrentMonth]="isInCurrentMonth(day)"
            (openDay)="openDayDialog($event)"
          />
        }
      }

      <!-- Month total -->
      <div style="margin-top:14px;text-align:right;font-size:0.85rem;opacity:0.5">
        Total this month: <strong style="opacity:1;color:rgba(255,255,255,0.8)">{{ monthTotal() }}</strong>
      </div>

    </div>
  `
})
export class TimesheetTabComponent implements OnInit {
  memberId = input.required<string>();

  private timesheetSvc = inject(TimesheetService);
  private dialog = inject(MatDialog);

  private now = new Date();

  viewYear = signal(this.now.getFullYear());
  viewMonth = signal(this.now.getMonth() + 1);
  weekStartDate = signal<Date>(this.getMonWeekStart(this.now));
  entries = signal<TimesheetEntry[]>([]);
  loading = signal(false);

  monthName = computed(() => MONTH_NAMES[this.viewMonth() - 1]);

  monthStart = computed(() => new Date(this.viewYear(), this.viewMonth() - 1, 1));
  monthEnd = computed(() => new Date(this.viewYear(), this.viewMonth(), 0));

  weekDays = computed(() => {
    const start = this.weekStartDate();
    return Array.from({ length: 7 }, (_, i) => this.addDays(start, i));
  });

  weekLabel = computed(() => {
    const days = this.weekDays();
    const first = days[0];
    const last = days[6];
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const fmtY = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    if (first.getFullYear() === last.getFullYear() && first.getMonth() === last.getMonth()) {
      return fmtY(last).replace(String(last.getDate()), `${fmt(first)} – ${last.getDate()}`);
    }
    return `${fmt(first)} – ${fmtY(last)}`;
  });

  entriesByDate = computed(() => {
    const map: Record<string, TimesheetEntry[]> = {};
    for (const e of this.entries()) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  });

  monthTotal = computed(() => {
    const total = this.entries().reduce((s, e) => s + e.hours * 60 + e.minutes, 0);
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (!total) return '0h';
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    return `${m}m`;
  });

  canGoPrevWeek = computed(() => {
    const prevStart = this.addDays(this.weekStartDate(), -7);
    const prevEnd = this.addDays(prevStart, 6);
    return prevEnd >= this.monthStart();
  });

  canGoNextWeek = computed(() => {
    const nextStart = this.addDays(this.weekStartDate(), 7);
    return nextStart <= this.monthEnd();
  });

  constructor() {
    effect(() => {
      const year = this.viewYear();
      const month = this.viewMonth();
      this.loadEntries(year, month);
    });
  }

  ngOnInit() {}

  private loadEntries(year: number, month: number) {
    this.loading.set(true);
    this.timesheetSvc.getByMonth(this.memberId(), year, month).subscribe({
      next: entries => { this.entries.set(entries); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  entriesForDate(dateStr: string): TimesheetEntry[] {
    return this.entriesByDate()[dateStr] ?? [];
  }

  isToday(d: Date): boolean {
    return this.toDateStr(d) === this.toDateStr(this.now);
  }

  isInCurrentMonth(d: Date): boolean {
    return d.getFullYear() === this.viewYear() && d.getMonth() + 1 === this.viewMonth();
  }

  openDayDialog(dateStr: string) {
    const data: TimesheetEntryDialogData = { memberId: this.memberId(), defaultDate: dateStr };
    this.dialog.open(TimesheetEntryDialogComponent, { data, width: '560px', maxWidth: '100vw' })
      .afterClosed()
      .subscribe(() => this.loadEntries(this.viewYear(), this.viewMonth()));
  }

  exportMonth() {
    this.timesheetSvc.exportMonth(this.memberId(), this.viewYear(), this.viewMonth())
      .subscribe(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `timesheet-${this.viewYear()}-${String(this.viewMonth()).padStart(2, '0')}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  prevWeek() { this.weekStartDate.update(d => this.addDays(d, -7)); }
  nextWeek() { this.weekStartDate.update(d => this.addDays(d, 7)); }

  prevMonth() {
    this.viewMonth.update(m => {
      if (m === 1) { this.viewYear.update(y => y - 1); return 12; }
      return m - 1;
    });
    this.weekStartDate.set(this.getMonWeekStart(this.monthStart()));
  }

  nextMonth() {
    this.viewMonth.update(m => {
      if (m === 12) { this.viewYear.update(y => y + 1); return 1; }
      return m + 1;
    });
    this.weekStartDate.set(this.getMonWeekStart(this.monthStart()));
  }

  toDateStr(d: Date): string { return d.toISOString().substring(0, 10); }
  addDays(d: Date, n: number): Date { return new Date(d.getTime() + n * 86400000); }

  getMonWeekStart(d: Date): Date {
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  }
}
