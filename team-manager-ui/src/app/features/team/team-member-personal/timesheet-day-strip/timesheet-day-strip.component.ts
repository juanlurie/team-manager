import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

import { DayStatus } from '../timesheet-sidebar/timesheet-sidebar.component';

const DN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

@Component({
  selector: 'app-timesheet-day-strip',
  standalone: true,
  imports: [],
  styles: [`
    .strip { display:flex; gap:2px; flex-shrink:0; padding:4px 4px 0; width:100%; overflow:hidden; }
    .wrap { overflow-x:hidden; }
    .btn { display:flex; flex-direction:column; align-items:center; gap:1px; padding:6px 2px 4px; flex:1; border-radius:8px; background:none; border:1.5px solid transparent; cursor:pointer; transition:background 0.1s; min-width:0; position:relative; }
    .btn:hover { background:rgba(255,255,255,0.04); }
    .dname { font-size:8px; font-weight:700; color:rgba(255,255,255,0.28); text-transform:uppercase; letter-spacing:0.05em; }
    .btn.sel .dname { color:#64b5f6; }
    .dnum { width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:500; border:1.5px solid transparent; }
    .dnum.today { background:#64b5f6; color:#0f1923; border-color:#64b5f6; }
    .dnum.complete { border-color:#66bb6a; }
    .dnum.error { border-color:#ef5350; }
    .dnum.today.error, .dnum.today.complete { background:transparent; color:inherit; }
    .dbar { height:2px; width:80%; background:rgba(255,255,255,0.06); border-radius:1px; overflow:hidden; }
    .dbar-f { height:100%; border-radius:1px; transition:width 0.3s; }
    .dhrs { font-size:8px; color:rgba(255,255,255,0.28); }
    .btn.sel .dhrs { color:#64b5f6; }
    .err-banner { display:flex; align-items:center; gap:6px; margin:4px 4px 0; padding:6px 10px; background:rgba(239,83,80,0.1); border:1px solid rgba(239,83,80,0.25); border-radius:8px; font-size:11px; color:#ef9a9a; overflow:hidden; }
    .err-banner svg { flex-shrink:0; }
    .err-banner span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  `],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="wrap">
    <div class="strip">
      @for (d of week(); track d.getTime()) {
        <button class="btn" [class.sel]="isSel(d)" (click)="selectDay.emit(d)">
          <span class="dname">{{ dn(d) }}</span>
          <span class="dnum" [class.today]="isToday(d)" [class.error]="isError(d)" [class.complete]="isComplete(d)">{{ d.getDate() }}</span>
          <div class="dbar"><div class="dbar-f" [style.width]="dayBarPctFn()(d)+'%'" [style.background]="dayStatusFn()(d).color"></div></div>
          <span class="dhrs">{{ dayHrs(d) || '·' }}</span>
        </button>
      }
    </div>
    @if (selectedDate() && isError(selectedDate())) {
      <div class="err-banner">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="7" fill="#ef5350"/><path d="M7 4v3.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/><circle cx="7" cy="9.5" r="0.75" fill="#fff"/></svg>
        <span>{{ dayStatusFn()(selectedDate()).error }}</span>
      </div>
    }
    </div>
  `
})
export class TimesheetDayStripComponent {
  week = input.required<Date[]>();
  selectedDate = input.required<Date>();
  today = input.required<Date>();
  dayHrsLabel = input<(d: Date) => string>();
  dayBarPctFn = input.required<(d: Date) => number>();
  dayStatusFn = input.required<(d: Date) => DayStatus>();

  selectDay = output<Date>();

  isSel = (d: Date) => d.getFullYear() === this.selectedDate().getFullYear() && d.getMonth() === this.selectedDate().getMonth() && d.getDate() === this.selectedDate().getDate();
  isToday = (d: Date) => d.getFullYear() === this.today().getFullYear() && d.getMonth() === this.today().getMonth() && d.getDate() === this.today().getDate();
  isError = (d: Date) => this.dayStatusFn()(d).error !== null;
  isComplete = (d: Date) => this.dayBarPctFn()(d) >= 100 && !this.isError(d);
  dn = (d: Date) => DN[d.getDay()];
  dayHrs = (d: Date) => this.dayHrsLabel()?.(d) ?? '';
}
