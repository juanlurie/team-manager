import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

import { QuickActionConfig } from '../../../../core/models/timesheet-config.model';

@Component({
  selector: 'app-timesheet-quick-log',
  standalone: true,
  imports: [],
  styles: [`
    .ql { padding:4px 6px 5px; flex-shrink:0; overflow-x:hidden; }
    .ql-lbl { font-size:10px; font-weight:700; color:rgba(255,255,255,0.28); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px; }
    .ql-grid { display:grid; grid-template-columns:1fr 1fr; gap:5px; }
    .ql-card { padding:10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-left:3px solid; border-radius:8px; cursor:pointer; transition:all 0.12s; }
    .ql-card:active { transform:scale(0.97); border-color:rgba(100,181,246,0.6); }
    .ql-name { font-size:12px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .ql-time { font-size:10px; color:rgba(255,255,255,0.3); margin-top:2px; }
    .ql-empty { padding:16px; background:rgba(255,255,255,0.03); border:1px dashed rgba(255,255,255,0.12); border-radius:8px; display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center; }
    .ql-empty p { font-size:11px; color:rgba(255,255,255,0.3); margin:0; }
    .ql-empty button { padding:6px 14px; background:rgba(100,181,246,0.15); border:1px solid rgba(100,181,246,0.3); border-radius:6px; color:#90caf9; font-size:11px; font-weight:600; cursor:pointer; transition:all 0.12s; font-family:inherit; }
    .ql-empty button:hover { background:rgba(100,181,246,0.25); border-color:rgba(100,181,246,0.5); }
  `],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="ql">
      <div class="ql-lbl">Quick log</div>
      @if (items().length > 0) {
        <div class="ql-grid">
          @for (qa of items(); track qa.label) {
            <div class="ql-card" [style.border-left-color]="qa.color??'rgba(255,255,255,0.3)'" (click)="select.emit(qa)">
              <div class="ql-name">{{ qa.label }}</div>
              <div class="ql-time">{{ qa.durationMins ? fmtDur()(qa.durationMins) : '·' }}</div>
            </div>
          }
        </div>
      } @else {
        <div class="ql-empty">
          <p>No quick actions configured yet.</p>
          <button (click)="openConfig.emit()">Set up quick actions</button>
        </div>
      }
    </div>
  `
})
export class TimesheetQuickLogComponent {
  items = input.required<QuickActionConfig[]>();
  fmtDur = input.required<(m: number) => string>();
  select = output<QuickActionConfig>();
  openConfig = output<void>();
}
