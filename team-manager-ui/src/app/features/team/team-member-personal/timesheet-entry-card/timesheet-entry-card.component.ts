import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimesheetEntry, CreateTimesheetEntryRequest } from '../../../../core/models/timesheet.model';
import {
  ActivityCombo, ACTIVITY_COMBOS, DURATION_CHIPS, DURATION_CHIP_MINUTES,
  TIMESHEET_PROJECTS, CATEGORIES_BY_PROJECT, minutesToDurationLabel,
} from '../timesheet-data.constants';

@Component({
  selector: 'app-timesheet-entry-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .card {
      display:flex; align-items:center; gap:10px; padding:13px 14px; border-radius:10px;
      background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07);
      cursor:pointer; transition:border-color 0.15s; animation:fadeIn 0.18s ease;
    }
    @keyframes fadeIn { from { opacity:0; transform:translateY(3px); } to { opacity:1; transform:translateY(0); } }
    .card:hover { border-color:rgba(255,255,255,0.13); }
    .card.editing { flex-direction:column; align-items:stretch; gap:10px; border-color:#64b5f6 !important; background:rgba(100,181,246,0.04); cursor:default; }
    .pill { font-size:11px; font-weight:700; padding:2px 8px; border-radius:20px; flex-shrink:0; text-transform:uppercase; letter-spacing:0.03em; }
    .info { flex:1; min-width:0; }
    .info-title { font-size:13px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .info-sub { font-size:11px; color:rgba(255,255,255,0.32); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .edit-hint { font-size:11px; color:#64b5f6; opacity:0; transition:opacity 0.15s; flex-shrink:0; }
    .card:not(.editing):hover .edit-hint { opacity:1; }
    .nudge { display:flex; align-items:center; opacity:0; transition:opacity 0.15s; flex-shrink:0; }
    .card:not(.editing):hover .nudge { opacity:1; }
    .nb {
      width:24px; height:24px; display:flex; align-items:center; justify-content:center;
      background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12);
      cursor:pointer; color:rgba(255,255,255,0.5); font-size:13px; font-weight:600; line-height:1; transition:all 0.1s;
    }
    .nb:first-child { border-radius:4px 0 0 4px; border-right:none; }
    .nb:last-child { border-radius:0 4px 4px 0; border-left:none; }
    .nb:hover { background:rgba(100,181,246,0.12); color:#64b5f6; border-color:rgba(100,181,246,0.5); z-index:1; }
    .nd {
      font-size:12px; font-weight:600; min-width:36px; text-align:center; padding:0 3px;
      background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12);
      height:24px; display:flex; align-items:center; justify-content:center;
    }
    .del {
      width:26px; height:26px; border:none; background:none; border-radius:5px; flex-shrink:0;
      cursor:pointer; color:rgba(255,255,255,0.28); display:flex; align-items:center; justify-content:center;
      opacity:0; transition:all 0.12s;
    }
    .card:hover .del { opacity:1; }
    .del:hover { background:rgba(239,83,80,0.1); color:#ef5350; }
    .del.always { opacity:1; color:rgba(255,255,255,0.4); }
    .ef-lbl { font-size:10px; font-weight:700; color:rgba(255,255,255,0.32); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:5px; }
    .chips { display:flex; gap:5px; flex-wrap:wrap; }
    .c-chip {
      padding:4px 10px; border-radius:16px; font-size:12px; font-weight:500;
      border:1px solid rgba(255,255,255,0.09); background:rgba(255,255,255,0.03);
      color:rgba(255,255,255,0.5); cursor:pointer; transition:all 0.1s;
    }
    .c-chip:hover { border-color:rgba(255,255,255,0.18); color:rgba(255,255,255,0.85); }
    .c-chip.sel { border-color:rgba(100,181,246,0.7); background:rgba(100,181,246,0.1); color:rgba(255,255,255,0.9); }
    .d-chip {
      padding:4px 9px; border-radius:5px; font-size:12px; font-weight:600;
      border:1px solid rgba(255,255,255,0.09); background:rgba(255,255,255,0.03);
      color:rgba(255,255,255,0.5); cursor:pointer; transition:all 0.1s;
    }
    .d-chip:hover { border-color:rgba(255,255,255,0.18); }
    .d-chip.sel { border-color:rgba(100,181,246,0.7); background:rgba(100,181,246,0.1); color:#64b5f6; }
    .e-sel {
      flex:1; min-width:110px; padding:7px 10px; background:rgba(255,255,255,0.04);
      border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:inherit;
      font-size:12px; font-family:inherit; outline:none; cursor:pointer; appearance:none;
    }
    .e-sel:focus { border-color:rgba(100,181,246,0.7); }
    .e-sel option { background:#1a1c2a; }
    .e-sel:disabled { opacity:0.4; cursor:not-allowed; }
    .e-inp {
      flex:1; padding:7px 10px; background:rgba(255,255,255,0.04); min-width:100px;
      border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:inherit;
      font-size:12px; font-family:inherit; outline:none;
    }
    .e-inp:focus { border-color:rgba(100,181,246,0.7); }
    .e-inp::placeholder { color:rgba(255,255,255,0.22); }
    .ea { display:flex; gap:6px; justify-content:flex-end; padding-top:4px; border-top:1px solid rgba(255,255,255,0.07); }
    .save-btn { padding:6px 16px; background:#64b5f6; border:none; border-radius:5px; color:#0f1923; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; }
    .save-btn:hover { background:#90caf9; }
    .cnl-btn { padding:6px 12px; background:none; border:1px solid rgba(255,255,255,0.12); border-radius:5px; color:rgba(255,255,255,0.5); font-size:12px; cursor:pointer; font-family:inherit; }
    .cnl-btn:hover { color:rgba(255,255,255,0.85); }
  `],
  template: `
    @if (!editing()) {
      <div class="card" (click)="startEdit()">
        <span class="pill" [style.background]="combo().bg" [style.color]="combo().color">{{ combo().label }}</span>
        <div class="info">
          <div class="info-title">{{ entry().category }}</div>
          <div class="info-sub">{{ entry().project }}</div>
        </div>
        <span class="edit-hint">click to edit</span>
        <div class="nudge" (click)="$event.stopPropagation()">
          <button class="nb" (click)="nudge(-15)" title="-15m">−</button>
          <span class="nd">{{ durLabel() }}</span>
          <button class="nb" (click)="nudge(15)" title="+15m">+</button>
        </div>
        <button class="del" (click)="$event.stopPropagation(); deleted.emit(entry().id)" title="Delete">
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 4h10M5 4V2h4v2M6 7v3M8 7v3M3 4l1 8h6l1-8"/></svg>
        </button>
      </div>
    } @else {
      <div class="card editing">
        <div>
          <div class="ef-lbl">Activity</div>
          <div class="chips">
            @for (c of combos; track c.label) {
              <button class="c-chip" [class.sel]="eProject() === c.project && eCategory() === c.category" (click)="applyCombo(c)">{{ c.label }}</button>
            }
          </div>
        </div>
        <div>
          <div class="ef-lbl">Duration</div>
          <div class="chips">
            @for (d of durChips; track d) {
              <button class="d-chip" [class.sel]="eDurMins() === chipMins[d]" (click)="eDurMins.set(chipMins[d])">{{ d }}</button>
            }
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <select class="e-sel" [ngModel]="eProject()" (ngModelChange)="setProject($event)">
            <option value="">Project…</option>
            @for (p of projects; track p) { <option [value]="p">{{ p }}</option> }
          </select>
          <select class="e-sel" [ngModel]="eCategory()" (ngModelChange)="eCategory.set($event)" [disabled]="!eProject()">
            <option value="">Category…</option>
            @for (c of editCats(); track c) { <option [value]="c">{{ c }}</option> }
          </select>
          <input class="e-inp" placeholder="Note (optional)"
            [ngModel]="eNote()" (ngModelChange)="eNote.set($event)"
            (keydown.enter)="saveEdit()" (keydown.escape)="cancelEdit()" />
        </div>
        <div class="ea">
          <button class="del always" style="margin-right:auto" (click)="deleted.emit(entry().id)" title="Delete">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 4h10M5 4V2h4v2M6 7v3M8 7v3M3 4l1 8h6l1-8"/></svg>
          </button>
          <button class="cnl-btn" (click)="cancelEdit()">Cancel</button>
          <button class="save-btn" (click)="saveEdit()">Save</button>
        </div>
      </div>
    }
  `
})
export class TimesheetEntryCardComponent {
  entry = input.required<TimesheetEntry>();
  saved = output<{ id: string; req: CreateTimesheetEntryRequest }>();
  deleted = output<string>();

  editing = signal(false);
  eProject = signal('');
  eCategory = signal('');
  eDurMins = signal(60);
  eNote = signal('');

  readonly combos = ACTIVITY_COMBOS;
  readonly durChips = DURATION_CHIPS;
  readonly chipMins = DURATION_CHIP_MINUTES;
  readonly projects = TIMESHEET_PROJECTS;

  editCats = computed(() => CATEGORIES_BY_PROJECT[this.eProject()] ?? []);

  combo = computed<ActivityCombo>(() => {
    const e = this.entry();
    return ACTIVITY_COMBOS.find(a => a.project === e.project && a.category === e.category)
      ?? { label: e.category.slice(0, 7), project: '', category: '', color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.08)' };
  });

  durLabel = computed(() => minutesToDurationLabel(this.entry().hours * 60 + this.entry().minutes));

  startEdit() {
    const e = this.entry();
    this.eProject.set(e.project);
    this.eCategory.set(e.category);
    this.eDurMins.set(e.hours * 60 + e.minutes);
    this.eNote.set(e.description ?? '');
    this.editing.set(true);
  }

  cancelEdit() { this.editing.set(false); }

  saveEdit() {
    if (!this.eProject() || !this.eCategory()) return;
    this.saved.emit({ id: this.entry().id, req: this.buildReq(this.eProject(), this.eCategory(), this.eDurMins(), this.eNote() || null) });
    this.editing.set(false);
  }

  nudge(delta: number) {
    const curr = this.entry().hours * 60 + this.entry().minutes;
    const next = Math.min(720, Math.max(15, curr + delta));
    this.saved.emit({ id: this.entry().id, req: this.buildReq(this.entry().project, this.entry().category, next, this.entry().description) });
  }

  applyCombo(c: ActivityCombo) { this.eProject.set(c.project); this.eCategory.set(c.category); }
  setProject(p: string) { this.eProject.set(p); this.eCategory.set(''); }

  private buildReq(project: string, category: string, totalMins: number, description: string | null): CreateTimesheetEntryRequest {
    const e = this.entry();
    return { date: e.date, project, category, hours: Math.floor(totalMins / 60), minutes: totalMins % 60, billable: e.billable, workedFrom: e.workedFrom, sentiment: e.sentiment, description, ticketNumber: e.ticketNumber };
  }
}
