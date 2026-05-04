import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { QuickActionConfig } from '../../../../../core/models/timesheet-config.model';

const PRESET_COLORS = [
  { color: '#82aaff', bg: 'rgba(130,170,255,0.15)' }, { color: '#4caf50', bg: 'rgba(76,175,80,0.13)' },
  { color: '#ff9800', bg: 'rgba(255,152,0,0.14)' }, { color: '#ce93d8', bg: 'rgba(206,147,216,0.14)' },
  { color: '#4dd0e1', bg: 'rgba(77,208,225,0.13)' }, { color: '#ffb74d', bg: 'rgba(255,183,77,0.14)' },
  { color: '#ef5350', bg: 'rgba(239,83,80,0.13)' }, { color: '#aed581', bg: 'rgba(174,213,129,0.13)' },
];

const DUR_CHIPS: [string, number][] = [['15m', 15], ['30m', 30], ['1h', 60], ['2h', 120], ['4h', 240], ['8h', 480]];

@Component({
  selector: 'app-config-quick-actions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .hint { font-size:11px; color:rgba(255,255,255,0.28); margin-bottom:10px; }
    .qa-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:8px; padding:12px 14px; margin-bottom:8px; }
    .qa-card-hdr { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
    .qa-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
    .qa-label { flex:1; font-size:12px; font-weight:500; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .qa-label-empty { color:rgba(255,255,255,0.2); }
    .qa-btn { background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.25); font-size:18px; line-height:1; padding:2px; }
    .qa-btn:hover { color:#ef5350; }
    .qa-btn.expand { color:rgba(255,255,255,0.15); } .qa-btn.expand:hover { color:#64b5f6; }
    .qa-fields { display:grid; grid-template-columns:1fr 1fr; gap:7px; padding-top:12px; border-top:1px solid rgba(255,255,255,0.06); margin-top:4px; }
    .qa-fields .full { grid-column:1/-1; }
    .inp { width:100%; box-sizing:border-box; padding:8px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:inherit; font-size:12px; font-family:inherit; outline:none; }
    .inp:focus { border-color:rgba(100,181,246,0.7); }
    .inp::placeholder { color:rgba(255,255,255,0.2); }
    .sel { width:100%; box-sizing:border-box; padding:8px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:inherit; font-size:12px; font-family:inherit; outline:none; cursor:pointer; appearance:none; }
    .sel:focus { border-color:rgba(100,181,246,0.7); }
    .sel option { background:#1a1c2a; } .sel:disabled { opacity:0.35; }
    .sec-lbl { font-size:10px; font-weight:700; color:rgba(255,255,255,0.28); text-transform:uppercase; letter-spacing:0.07em; margin-bottom:4px; }
    .dur-chips { display:flex; gap:4px; flex-wrap:wrap; margin-top:4px; }
    .dur-chip { padding:4px 9px; border-radius:5px; font-size:11px; font-weight:600; border:1px solid rgba(255,255,255,0.09); background:rgba(255,255,255,0.03); color:rgba(255,255,255,0.45); cursor:pointer; transition:all 0.1s; }
    .dur-chip:hover { border-color:rgba(255,255,255,0.18); } .dur-chip.sel { border-color:rgba(100,181,246,0.7); background:rgba(100,181,246,0.09); color:#64b5f6; }
    .color-row { display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
    .color-dot { width:20px; height:20px; border-radius:50%; cursor:pointer; border:2px solid transparent; transition:all 0.1s; }
    .color-dot.sel { border-color:rgba(255,255,255,0.7); transform:scale(1.15); }
    .btn-add { padding:7px 12px; background:rgba(100,181,246,0.1); border:1px solid rgba(100,181,246,0.3); border-radius:6px; color:#64b5f6; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; white-space:nowrap; }
    .btn-add:hover { background:rgba(100,181,246,0.18); }
    .qa-scroll { max-height:60vh; overflow-y:auto; padding-right:4px; }
    .qa-scroll::-webkit-scrollbar { width:3px; }
    .qa-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); border-radius:2px; }
    @media (max-width:640px) { .qa-fields { grid-template-columns:1fr; } .qa-btn { font-size:22px; } .color-dot { width:24px; height:24px; } .dur-chip { padding:8px 10px; font-size:13px; } .qa-scroll { max-height:65vh; } }
  `],
  template: `
    <div class="hint">Quick actions appear in the form and let you pre-fill project, category, and an optional note.</div>
    <button class="btn-add" (click)="add.emit()" style="margin-bottom:10px">+ Add quick action</button>
    <div class="qa-scroll">
    @for (qa of quickActions(); track qa_idx; let qa_idx = $index) {
      <div class="qa-card">
        <div class="qa-card-hdr">
          <span class="qa-dot" [style.background]="qa.color"></span>
          <span class="qa-label" [class.qa-label-empty]="!qa.label">{{ qa.label || 'Untitled' }}</span>
          <button class="qa-btn expand" (click)="toggleCollapse.emit(qa_idx)" [title]="expandedIndex()===qa_idx ? 'Collapse' : 'Expand'">
            @if (expandedIndex()===qa_idx) {
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 5l4 4 4-4"/></svg>
            } @else {
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 3l4 4-4 4"/></svg>
            }
          </button>
          <button class="qa-btn" (click)="remove.emit(qa_idx)" title="Remove">×</button>
        </div>
        @if (expandedIndex()===qa_idx) {
          <div class="qa-fields">
            <input class="inp" placeholder="Label (e.g. Dev)" [ngModel]="qa.label" (ngModelChange)="labelChange.emit({idx:qa_idx,value:$event})" />
            <select class="sel" [ngModel]="qa.project" (ngModelChange)="projectChange.emit({idx:qa_idx,value:$event})">
              <option value="">Project…</option>
              @for (p of allProjects(); track p) { <option [value]="p">{{ p }}</option> }
            </select>
            <select class="sel" [ngModel]="qa.category" (ngModelChange)="categoryChange.emit({idx:qa_idx,value:$event})" [disabled]="!qa.project">
              <option value="">Category…</option>
              @for (c of catsByProject()[qa.project] ?? []; track c) { <option [value]="c">{{ c }}</option> }
            </select>
            <select class="sel" [ngModel]="qa.workedFrom || ''" (ngModelChange)="locationChange.emit({idx:qa_idx,value:$event})">
              <option value="">Location: Default</option>
              <option value="Home">Home</option>
              <option value="Office">Office</option>
              <option value="Other">Other</option>
            </select>
            <input class="inp" placeholder="Note (optional)" [ngModel]="qa.note || ''" (ngModelChange)="noteChange.emit({idx:qa_idx,value:$event})" />
            <div class="full">
              <div class="sec-lbl">Default duration <span style="font-weight:400;text-transform:none;letter-spacing:0">(optional)</span></div>
              <div class="dur-chips">
                <button class="dur-chip" [class.sel]="!qa.durationMins" (click)="durationChange.emit({idx:qa_idx,value:null})">—</button>
                @for (d of durChips; track d) {
                  <button class="dur-chip" [class.sel]="qa.durationMins===d[1]" (click)="durationChange.emit({idx:qa_idx,value:d[1]})">{{ d[0] }}</button>
                }
              </div>
            </div>
            <div class="full">
              <div class="sec-lbl">Colour</div>
              <div class="color-row">
                @for (p of presetColors; track p.color) {
                  <span class="color-dot" [style.background]="p.color" [class.sel]="qa.color===p.color" (click)="colorChange.emit({idx:qa_idx,value:p})"></span>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }
    </div>
  `
})
export class ConfigQuickActionsComponent {
  quickActions = input.required<QuickActionConfig[]>();
  allProjects = input.required<string[]>();
  catsByProject = input.required<Record<string, string[]>>();
  expandedIndex = input.required<number | null>();

  readonly durChips = DUR_CHIPS;
  readonly presetColors = PRESET_COLORS;

  add = output<void>();
  remove = output<number>();
  toggleCollapse = output<number>();
  labelChange = output<{idx:number;value:string}>();
  projectChange = output<{idx:number;value:string}>();
  categoryChange = output<{idx:number;value:string}>();
  noteChange = output<{idx:number;value:string}>();
  locationChange = output<{idx:number;value:string}>();
  durationChange = output<{idx:number;value:number|null}>();
  colorChange = output<{idx:number;value:{color:string;bg:string}}>();
}
