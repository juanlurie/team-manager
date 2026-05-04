import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface DayStatus { color: string; error: string | null; }

const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

@Component({
  selector: 'app-timesheet-sidebar',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  styles: [`
    .sb { width:346px; flex-shrink:0; border-right:1px solid rgba(255,255,255,0.07); overflow-y:auto; padding:14px 0; }
    .sb::-webkit-scrollbar { width:3px; }
    .sb::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
    .sb-hdr { display:flex; align-items:center; justify-content:space-between; padding:0 10px 10px; font-size:12px; font-weight:600; color:rgba(255,255,255,0.45); }
    .sb-btn { background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.3); padding:3px; border-radius:4px; display:flex; align-items:center; }
    .sb-btn:hover { color:rgba(255,255,255,0.85); background:rgba(255,255,255,0.06); }
    .wk-lbl { padding:0 10px 6px; font-size:10px; font-weight:700; color:rgba(255,255,255,0.28); letter-spacing:0.07em; text-transform:uppercase; }
    .day-row { display:flex; align-items:center; gap:7px; padding:8px 10px; cursor:pointer; transition:background 0.1s; position:relative; }
    .day-row:hover { background:rgba(255,255,255,0.04); }
    .day-row.sel { background:rgba(100,181,246,0.09); }
    .day-row.sel::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:#64b5f6; border-radius:0 2px 2px 0; }
    .dname { font-size:10px; font-weight:700; color:rgba(255,255,255,0.28); width:24px; letter-spacing:0.04em; text-transform:uppercase; flex-shrink:0; }
    .day-row.sel .dname { color:#64b5f6; }
    .dnum { width:22px; height:22px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:500; border-radius:50%; flex-shrink:0; }
    .dnum.today { background:#64b5f6; color:#0f1923; }
    .dnum.today.error, .dnum.today.complete { background:transparent; color:inherit; }
    .dbar-w { flex:1; }
    .dbar-t { height:3px; background:rgba(255,255,255,0.06); border-radius:2px; overflow:hidden; }
    .dbar-f { height:100%; border-radius:2px; transition:width 0.3s; }
    .dhrs { font-size:10px; color:rgba(255,255,255,0.35); flex-shrink:0; font-family:'DM Mono',monospace; }
    .tot { margin:10px; padding:10px; background:rgba(255,255,255,0.04); border-radius:10px; border:1px solid rgba(255,255,255,0.07); }
    .tot-lbl { font-size:10px; color:rgba(255,255,255,0.28); font-weight:700; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:3px; }
    .tot-val { font-size:19px; font-weight:700; }
    .tot-sub { font-size:11px; color:rgba(255,255,255,0.28); margin-top:2px; }
  `],
  template: `
    <div class="sb">
      <div class="sb-hdr">
        <button class="sb-btn" (click)="prevWeek.emit()"><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 2L4 7l5 5"/></svg></button>
        <span>{{ monthYear() }}</span>
        <button class="sb-btn" (click)="nextWeek.emit()"><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 2l5 5-5 5"/></svg></button>
      </div>
      <div class="wk-lbl">{{ weekRange() }}</div>
      @for (d of week(); track d.getTime()) {
        <div class="day-row" [class.sel]="isSel(d)" (click)="selectDay.emit(d)">
          <span class="dname">{{ dn(d) }}</span>
          <span class="dnum" [class.today]="isToday(d)" [class.error]="isError(d)" [class.complete]="isComplete(d)">{{ d.getDate() }}</span>
          <div class="dbar-w" [matTooltip]="dayStatusFn()(d).error ?? ''" [matTooltipDisabled]="!dayStatusFn()(d).error"><div class="dbar-t"><div class="dbar-f" [style.width]="dayBarPctFn()(d)+'%'" [style.background]="dayStatusFn()(d).color"></div></div></div>
          @if (dayHrsFn()(d)) { <span class="dhrs">{{ dayHrsFn()(d) }}</span> }
        </div>
      }
      <div class="tot">
        <div class="tot-lbl">This month</div>
        <div class="tot-val">{{ monthTotal() }}</div>
        <div class="tot-sub">{{ monthDaysLogged() }} day{{ monthDaysLogged()!==1?'s':'' }} logged</div>
      </div>
    </div>
  `
})
export class TimesheetSidebarComponent {
  week = input.required<Date[]>();
  selectedDate = input.required<Date>();
  today = input.required<Date>();
  dayHrsFn = input.required<(d: Date) => string>();
  dayBarPctFn = input.required<(d: Date) => number>();
  dayStatusFn = input.required<(d: Date) => DayStatus>();
  weekRange = input.required<string>();
  monthYear = input.required<string>();
  monthTotal = input.required<string>();
  monthDaysLogged = input.required<number>();

  prevWeek = output<void>();
  nextWeek = output<void>();
  selectDay = output<Date>();

  isSel = (d: Date) => d.getFullYear() === this.selectedDate().getFullYear() && d.getMonth() === this.selectedDate().getMonth() && d.getDate() === this.selectedDate().getDate();
  isToday = (d: Date) => d.getFullYear() === this.today().getFullYear() && d.getMonth() === this.today().getMonth() && d.getDate() === this.today().getDate();
  isError = (d: Date) => this.dayStatusFn()(d).error !== null;
  isComplete = (d: Date) => this.dayBarPctFn()(d) >= 100 && this.dayStatusFn()(d).error === null;
  dn = (d: Date) => DN[d.getDay()];
}
