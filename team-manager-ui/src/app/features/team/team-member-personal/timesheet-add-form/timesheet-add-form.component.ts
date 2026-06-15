import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { QuickActionConfig } from '../../../../core/models/timesheet-config.model';

@Component({
  selector: 'app-timesheet-add-form',
  standalone: true,
  imports: [FormsModule],
  styles: [`
    .panel { border-top:1px solid rgba(100,181,246,0.2); border-bottom:1px solid rgba(100,181,246,0.2); padding:10px 16px 12px; flex-shrink:0; }
    .r1 { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; }
    .combos { display:flex; gap:4px; flex-wrap:wrap; }
    .durs { display:flex; flex-direction:column; gap:6px; margin-left:auto; }
    .dur-row { display:flex; align-items:center; justify-content:center; gap:4px; }
    .r2 { display:flex; gap:6px; align-items:center; }
    .chip { padding:5px 11px; border-radius:16px; font-size:12px; font-weight:500; border:1px solid rgba(255,255,255,0.09); background:rgba(255,255,255,0.03); color:rgba(255,255,255,0.45); cursor:pointer; transition:all 0.1s; white-space:nowrap; }
    .chip:hover { border-color:rgba(255,255,255,0.18); color:rgba(255,255,255,0.85); }
    .chip.sel { border-color:rgba(100,181,246,0.7); background:rgba(100,181,246,0.09); color:rgba(255,255,255,0.9); }
    .dur-chip { padding:5px 9px; border-radius:5px; font-size:12px; font-weight:600; border:1px solid rgba(255,255,255,0.09); background:rgba(255,255,255,0.03); color:rgba(255,255,255,0.45); cursor:pointer; transition:all 0.1s; white-space:nowrap; }
    .dur-chip:hover { border-color:rgba(255,255,255,0.18); }
    .dur-chip.sel { border-color:rgba(100,181,246,0.7); background:rgba(100,181,246,0.09); color:#64b5f6; }
    .sel { padding:8px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:inherit; font-size:12px; font-family:inherit; outline:none; cursor:pointer; appearance:none; }
    .sel:focus { border-color:rgba(100,181,246,0.7); }
    .sel option { background:#1a1c2a; }
    .sel:disabled { opacity:0.35; cursor:not-allowed; }
    .sel-proj { width:180px; flex-shrink:0; }
    .sel-cat { flex:1.2; min-width:140px; }
    .inp { flex:2; min-width:160px; padding:8px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:inherit; font-size:12px; font-family:inherit; outline:none; }
    .inp:focus { border-color:rgba(100,181,246,0.7); }
    .inp::placeholder { color:rgba(255,255,255,0.2); }
    .btn { padding:8px 20px; background:#64b5f6; border:none; border-radius:6px; color:#0f1923; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; flex-shrink:0; transition:all 0.12s; white-space:nowrap; }
    .btn:hover { background:#90caf9; }
    .btn:disabled { opacity:0.35; cursor:not-allowed; }
  `],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="panel">
      <div class="r1">
        <div class="combos">
          @for (c of quickActions(); track c.label) {
            <button class="chip" [class.sel]="proj()===c.project&&cat()===c.category" (click)="applyCombo(c)">{{ c.label }}</button>
          }
        </div>
        <div class="durs">
          <div class="dur-row">
            @for (d of durChips; track d[0]) {
              <button class="dur-chip" [class.sel]="dur()===d[1]" (click)="durChange.emit(d[1])">{{ d[0] }}</button>
            }
          </div>
          <div class="dur-row">
            <button class="dur-chip" (click)="adjustDur.emit(-60)">-1h</button>
            <button class="dur-chip" (click)="adjustDur.emit(-15)">-15m</button>
            <span style="font-size:14px;font-weight:700;color:rgba(255,255,255,0.8);min-width:60px;text-align:center;margin:0 6px;">{{ fmtDur()(dur()) }}</span>
            <button class="dur-chip" (click)="adjustDur.emit(15)">+15m</button>
            <button class="dur-chip" (click)="adjustDur.emit(60)">+1h</button>
          </div>
        </div>
      </div>
      <div class="r2">
        <select class="sel sel-proj" [ngModel]="proj()" (ngModelChange)="projChange.emit($event)">
          <option value="">Project…</option>
          @for (p of projects(); track p) { <option [value]="p">{{ p }}</option> }
        </select>
        <select class="sel sel-cat" [ngModel]="cat()" (ngModelChange)="catChange.emit($event)" [disabled]="!proj()">
          <option value="">Category…</option>
          @for (c of categories(); track c) { <option [value]="c">{{ c }}</option> }
        </select>
        <input class="inp" placeholder="Note (required)" [ngModel]="note()" (ngModelChange)="noteChange.emit($event)" (keydown.enter)="canAdd()&&add.emit()" />
        <button class="btn" [disabled]="!canAdd()" (click)="add.emit()">Add Entry</button>
      </div>
    </div>
  `
})
export class TimesheetAddFormComponent {
  quickActions = input.required<QuickActionConfig[]>();
  projects = input.required<string[]>();
  categories = input.required<string[]>();
  fmtDur = input.required<(m: number) => string>();

  proj = input.required<string>();
  cat = input.required<string>();
  dur = input.required<number>();
  note = input.required<string>();
  canAdd = input.required<boolean>();

  add = output<void>();
  applyComboOut = output<QuickActionConfig>();
  projChange = output<string>();
  catChange = output<string>();
  durChange = output<number>();
  noteChange = output<string>();
  adjustDur = output<number>();

  readonly durChips: [string, number][] = [['15m', 15], ['30m', 30], ['1h', 60], ['2h', 120], ['4h', 240], ['8h', 480]];

  applyCombo(c: QuickActionConfig) { this.applyComboOut.emit(c); }
}
