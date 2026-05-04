import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-timesheet-week-nav',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .nav { display:flex; align-items:center; justify-content:space-between; padding:6px 6px 0; font-size:12px; font-weight:600; color:rgba(255,255,255,0.45); flex-shrink:0; overflow-x:hidden; }
    .btn { background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.3); padding:3px; border-radius:4px; display:flex; align-items:center; }
    .btn:hover { color:rgba(255,255,255,0.85); background:rgba(255,255,255,0.06); }
  `],
  template: `
    <div class="nav">
      <button class="btn" (click)="prev.emit()"><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 2L4 7l5 5"/></svg></button>
      <span>{{ weekRange() }}</span>
      <button class="btn" (click)="next.emit()"><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 2l5 5-5 5"/></svg></button>
    </div>
  `
})
export class TimesheetWeekNavComponent {
  weekRange = input.required<string>();
  prev = output<void>();
  next = output<void>();
}
