import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-config-work-location',
  standalone: true,
  imports: [FormsModule],
  styles: [`
    .hint { font-size:11px; color:rgba(255,255,255,0.28); margin-bottom:10px; }
    .row { display:flex; gap:7px; align-items:center; justify-content:space-between; margin-bottom:8px; }
    .sel { width:120px; box-sizing:border-box; padding:8px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:inherit; font-size:12px; font-family:inherit; outline:none; cursor:pointer; appearance:none; }
    .sel:focus { border-color:rgba(100,181,246,0.7); }
    .sel option { background:#1a1c2a; }
  `],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="hint">Set your default work location for each day of the week.</div>
    @for (day of weekDays; track day) {
      <div class="row">
        <span>{{ day }}</span>
        <select class="sel" [ngModel]="workWeek()[day] || 'Home'" (ngModelChange)="change.emit({day,value:$event})">
          @for (opt of options(); track opt) { <option [value]="opt">{{ opt }}</option> }
        </select>
      </div>
    }
  `
})
export class ConfigWorkLocationComponent {
  readonly weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  workWeek = input.required<Record<string, string>>();
  options = input<string[]>(['Home', 'Client', 'Other']);
  change = output<{day:string;value:string}>();
}
