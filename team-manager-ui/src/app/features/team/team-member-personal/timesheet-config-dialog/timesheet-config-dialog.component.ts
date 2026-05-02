import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TimesheetConfig, QuickActionConfig } from '../../../../core/models/timesheet-config.model';
import { TimesheetConfigService } from '../../../../core/services/timesheet-config.service';
import {
  TIMESHEET_PROJECTS, CATEGORIES_BY_PROJECT, ACTIVITY_COMBOS,
  DURATION_CHIPS, DURATION_CHIP_MINUTES, minutesToDurationLabel,
} from '../timesheet-data.constants';

const PRESET_COLORS = [
  { color: '#82aaff', bg: 'rgba(130,170,255,0.15)' },
  { color: '#4caf50', bg: 'rgba(76,175,80,0.13)' },
  { color: '#ff9800', bg: 'rgba(255,152,0,0.14)' },
  { color: '#ce93d8', bg: 'rgba(206,147,216,0.14)' },
  { color: '#4dd0e1', bg: 'rgba(77,208,225,0.13)' },
  { color: '#ffb74d', bg: 'rgba(255,183,77,0.14)' },
  { color: '#ef5350', bg: 'rgba(239,83,80,0.13)' },
  { color: '#aed581', bg: 'rgba(174,213,129,0.13)' },
];

export interface TimesheetConfigDialogData {
  memberId: string;
  config: TimesheetConfig;
}

@Component({
  selector: 'app-timesheet-config-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    .dlg { display:flex; flex-direction:column; width:560px; max-width:100%; max-height:80vh; background:#131e2b; border-radius:12px; overflow:hidden; }
    .dlg-hdr { display:flex; align-items:center; justify-content:space-between; padding:18px 22px 14px; border-bottom:1px solid rgba(255,255,255,0.07); flex-shrink:0; }
    .dlg-title { font-size:16px; font-weight:700; }
    .dlg-close { background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.4); font-size:22px; line-height:1; padding:2px 4px; }
    .dlg-close:hover { color:rgba(255,255,255,0.9); }
    .dlg-tabs { display:flex; gap:2px; padding:10px 22px 0; border-bottom:1px solid rgba(255,255,255,0.07); flex-shrink:0; }
    .dlg-tab { padding:8px 14px; font-size:12px; font-weight:600; color:rgba(255,255,255,0.35); background:none; border:none; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-1px; transition:all 0.1s; font-family:inherit; }
    .dlg-tab.active { color:#64b5f6; border-bottom-color:#64b5f6; }
    .dlg-tab:hover:not(.active) { color:rgba(255,255,255,0.7); }
    .dlg-body { flex:1; overflow-y:auto; padding:18px 22px; }
    .dlg-body::-webkit-scrollbar { width:4px; }
    .dlg-body::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
    .dlg-footer { display:flex; justify-content:flex-end; gap:8px; padding:14px 22px; border-top:1px solid rgba(255,255,255,0.07); flex-shrink:0; }
    .sec-lbl { font-size:10px; font-weight:700; color:rgba(255,255,255,0.28); text-transform:uppercase; letter-spacing:0.07em; margin-bottom:8px; }
    .sec { margin-bottom:20px; }
    .hint { font-size:11px; color:rgba(255,255,255,0.28); margin-bottom:10px; }
    .inp { width:100%; box-sizing:border-box; padding:8px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:inherit; font-size:12px; font-family:inherit; outline:none; }
    .inp:focus { border-color:rgba(100,181,246,0.7); }
    .inp::placeholder { color:rgba(255,255,255,0.2); }
    .sel { width:100%; box-sizing:border-box; padding:8px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:inherit; font-size:12px; font-family:inherit; outline:none; cursor:pointer; appearance:none; }
    .sel:focus { border-color:rgba(100,181,246,0.7); }
    .sel option { background:#1a1c2a; }
    .sel:disabled { opacity:0.35; }
    .row { display:flex; gap:7px; align-items:center; }
    .add-row { display:flex; gap:7px; align-items:center; margin-top:8px; }
    .tag-list { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:8px; }
    .tag { display:flex; align-items:center; gap:5px; padding:4px 8px 4px 10px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:16px; font-size:12px; }
    .tag-rm { background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.3); font-size:14px; line-height:1; padding:0; }
    .tag-rm:hover { color:#ef5350; }
    .qa-card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:8px; padding:12px 14px; margin-bottom:8px; }
    .qa-card-hdr { display:flex; align-items:center; gap:8px; margin-bottom:10px; }
    .qa-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
    .qa-label-inp { flex:1; }
    .qa-rm-btn { background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.25); font-size:18px; line-height:1; padding:2px; }
    .qa-rm-btn:hover { color:#ef5350; }
    .qa-fields { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
    .qa-fields .full { grid-column:1/-1; }
    .dur-chips { display:flex; gap:4px; flex-wrap:wrap; margin-top:4px; }
    .dur-chip { padding:4px 9px; border-radius:5px; font-size:11px; font-weight:600; border:1px solid rgba(255,255,255,0.09); background:rgba(255,255,255,0.03); color:rgba(255,255,255,0.45); cursor:pointer; transition:all 0.1s; }
    .dur-chip:hover { border-color:rgba(255,255,255,0.18); }
    .dur-chip.sel { border-color:rgba(100,181,246,0.7); background:rgba(100,181,246,0.09); color:#64b5f6; }
    .color-row { display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
    .color-dot { width:20px; height:20px; border-radius:50%; cursor:pointer; border:2px solid transparent; transition:all 0.1s; }
    .color-dot.sel { border-color:rgba(255,255,255,0.7); transform:scale(1.15); }
    .btn { padding:8px 16px; border-radius:6px; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; border:none; transition:all 0.12s; }
    .btn-primary { background:#64b5f6; color:#0f1923; }
    .btn-primary:hover { background:#90caf9; }
    .btn-primary:disabled { opacity:0.35; cursor:not-allowed; }
    .btn-ghost { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.6); }
    .btn-ghost:hover { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.9); }
    .btn-add { padding:7px 12px; background:rgba(100,181,246,0.1); border:1px solid rgba(100,181,246,0.3); border-radius:6px; color:#64b5f6; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; white-space:nowrap; }
    .btn-add:hover { background:rgba(100,181,246,0.18); }
    .btn-add:disabled { opacity:0.35; cursor:not-allowed; }
    .proj-sel-row { display:flex; gap:7px; align-items:center; margin-bottom:10px; }
    .proj-list { display:flex; flex-direction:column; gap:8px; margin-bottom:12px; }
    .proj-row { display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:6px; }
    .billable-check { display:flex; align-items:center; gap:10px; cursor:pointer; font-size:12px; }
    .billable-check input { width:15px; height:15px; cursor:pointer; accent-color:#64b5f6; }
  `],
  template: `
    <div class="dlg">
      <div class="dlg-hdr">
        <span class="dlg-title">Timesheet Settings</span>
        <button class="dlg-close" (click)="cancel()">×</button>
      </div>
      <div class="dlg-tabs">
        <button class="dlg-tab" [class.active]="tab()===0" (click)="tab.set(0)">Quick Actions</button>
        <button class="dlg-tab" [class.active]="tab()===1" (click)="tab.set(1)">Projects</button>
        <button class="dlg-tab" [class.active]="tab()===2" (click)="tab.set(2)">Categories</button>
      </div>

      <div class="dlg-body">
        @if (tab()===0) {
          <div class="sec">
            <div class="hint">Quick actions appear in the form and let you pre-fill project, category, and an optional note.</div>
            @for (qa of quickActions(); track qa_idx; let qa_idx = $index) {
              <div class="qa-card">
                <div class="qa-card-hdr">
                  <span class="qa-dot" [style.background]="qa.color"></span>
                  <input class="inp qa-label-inp" placeholder="Label (e.g. Dev)" [(ngModel)]="qa.label" (ngModelChange)="markDirty()" />
                  <button class="qa-rm-btn" (click)="removeQa(qa_idx)">×</button>
                </div>
                <div class="qa-fields">
                  <select class="sel" [(ngModel)]="qa.project" (ngModelChange)="onQaProjectChange(qa, $event)">
                    <option value="">Project…</option>
                    @for (p of allProjects(); track p) { <option [value]="p">{{ p }}</option> }
                  </select>
                  <select class="sel" [(ngModel)]="qa.category" (ngModelChange)="markDirty()" [disabled]="!qa.project">
                    <option value="">Category…</option>
                    @for (c of catsFor(qa.project); track c) { <option [value]="c">{{ c }}</option> }
                  </select>
                  <input class="inp full" placeholder="Note (optional — pre-fills on click)" [(ngModel)]="qa.note" (ngModelChange)="markDirty()" />
                  <div class="full">
                    <div class="sec-lbl" style="margin-bottom:4px">Default duration <span style="font-weight:400;text-transform:none;letter-spacing:0">(optional)</span></div>
                    <div class="dur-chips">
                      <button class="dur-chip" [class.sel]="!qa.durationMins" (click)="setQaDuration(qa, null)">—</button>
                      @for (d of durChips; track d) {
                        <button class="dur-chip" [class.sel]="qa.durationMins===chipMins[d]" (click)="setQaDuration(qa, chipMins[d])">{{ d }}</button>
                      }
                    </div>
                  </div>
                  <div class="full">
                    <div class="sec-lbl" style="margin-bottom:4px">Colour</div>
                    <div class="color-row">
                      @for (p of presetColors; track p.color) {
                        <span class="color-dot" [style.background]="p.color" [class.sel]="qa.color===p.color" (click)="setQaColor(qa, p)"></span>
                      }
                    </div>
                  </div>
                </div>
              </div>
            }
            <button class="btn-add" (click)="addQa()">+ Add quick action</button>
          </div>
        }

        @if (tab()===1) {
          <div class="sec">
            <div class="hint">These projects are added to the default Entelect list. Use this for client projects or custom work categories.</div>
            <div class="proj-list">
              @for (p of allProjects(); track p) {
                <div class="proj-row">
                  <label class="billable-check">
                    <input type="checkbox" [checked]="isBillable(p)" (change)="toggleBillable(p, $event)">
                    <span>{{ p }}</span>
                  </label>
                  @if (isExtraProject(p)) {
                    <button class="tag-rm" (click)="removeProject(p)">×</button>
                  }
                </div>
              }
            </div>
            <div class="add-row">
              <input class="inp" placeholder="Project name" [(ngModel)]="newProject" (keydown.enter)="addProject()" style="flex:1" />
              <button class="btn-add" [disabled]="!newProject.trim()" (click)="addProject()">Add</button>
            </div>
          </div>
        }

        @if (tab()===2) {
          <div class="sec">
            <div class="hint">Add custom categories to any project (including your extra projects).</div>
            <div class="proj-sel-row">
              <select class="sel" [(ngModel)]="catProject" style="flex:1">
                <option value="">Select project…</option>
                @for (p of allProjects(); track p) { <option [value]="p">{{ p }}</option> }
              </select>
            </div>
            @if (catProject) {
              <div class="sec-lbl">Extra categories for "{{ catProject }}"</div>
              <div class="tag-list">
                @for (c of extraCategoriesFor(catProject); track c; let i = $index) {
                  <span class="tag">{{ c }}<button class="tag-rm" (click)="removeCategory(catProject, i)">×</button></span>
                }
                @if (extraCategoriesFor(catProject).length===0) { <span style="font-size:12px;color:rgba(255,255,255,0.25)">No extra categories for this project.</span> }
              </div>
              <div class="add-row">
                <input class="inp" placeholder="Category name" [(ngModel)]="newCategory" (keydown.enter)="addCategory()" style="flex:1" />
                <button class="btn-add" [disabled]="!newCategory.trim()" (click)="addCategory()">Add</button>
              </div>
            }
          </div>
        }
      </div>

      <div class="dlg-footer">
        <button class="btn btn-ghost" (click)="cancel()">Cancel</button>
        <button class="btn btn-primary" [disabled]="saving()" (click)="save()">{{ saving() ? 'Saving…' : 'Save' }}</button>
      </div>
    </div>
  `
})
export class TimesheetConfigDialogComponent implements OnInit {
  private ref = inject(MatDialogRef<TimesheetConfigDialogComponent>);
  private data: TimesheetConfigDialogData = inject(MAT_DIALOG_DATA);
  private svc = inject(TimesheetConfigService);

  readonly presetColors = PRESET_COLORS;
  readonly durChips = DURATION_CHIPS;
  readonly chipMins = DURATION_CHIP_MINUTES;

  tab = signal(0);
  saving = signal(false);
  dirty = signal(false);

  quickActions = signal<QuickActionConfig[]>([]);
  extraProjects = signal<string[]>([]);
  extraCategories = signal<Record<string, string[]>>({});
  billableProjects = signal<string[]>([]);

  newProject = '';
  newCategory = '';
  catProject = '';

  allProjects = computed(() => [
    ...TIMESHEET_PROJECTS,
    ...this.extraProjects().filter(p => !TIMESHEET_PROJECTS.includes(p))
  ]);

  ngOnInit() {
    const c = this.data.config;
    this.quickActions.set(c.quickActions.map(q => ({ ...q })));
    this.extraProjects.set([...c.extraProjects]);
    this.extraCategories.set({ ...c.extraCategories });
    this.billableProjects.set([...((c as any).billableProjects ?? [])]);
  }

  catsFor(project: string): string[] {
    const defaults = CATEGORIES_BY_PROJECT[project] ?? [];
    const extras = this.extraCategories()[project] ?? [];
    return [...defaults, ...extras.filter(c => !defaults.includes(c))];
  }

  extraCategoriesFor(project: string): string[] {
    return this.extraCategories()[project] ?? [];
  }

  isBillable(project: string): boolean {
    return this.billableProjects().includes(project);
  }

  isExtraProject(project: string): boolean {
    return !TIMESHEET_PROJECTS.includes(project);
  }

  toggleBillable(project: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.billableProjects.update(list => [...list, project]);
    } else {
      this.billableProjects.update(list => list.filter(p => p !== project));
    }
    this.markDirty();
  }

  markDirty() { this.dirty.set(true); }

  addQa() {
    this.quickActions.update(list => [...list, {
      label: '', project: '', category: '', note: null,
      color: PRESET_COLORS[list.length % PRESET_COLORS.length].color,
      bg: PRESET_COLORS[list.length % PRESET_COLORS.length].bg,
    }]);
    this.markDirty();
  }

  removeQa(i: number) {
    this.quickActions.update(list => list.filter((_, idx) => idx !== i));
    this.markDirty();
  }

  onQaProjectChange(qa: QuickActionConfig, project: string) {
    qa.project = project;
    qa.category = '';
    this.markDirty();
  }

  setQaDuration(qa: QuickActionConfig, mins: number | null) {
    qa.durationMins = mins;
    this.markDirty();
    this.quickActions.update(l => [...l]);
  }

  setQaColor(qa: QuickActionConfig, preset: { color: string; bg: string }) {
    qa.color = preset.color;
    qa.bg = preset.bg;
    this.markDirty();
    this.quickActions.update(l => [...l]);
  }

  addProject() {
    const val = this.newProject.trim();
    if (!val || this.allProjects().includes(val)) return;
    this.extraProjects.update(list => [...list, val]);
    this.newProject = '';
    this.markDirty();
  }

  removeProject(project: string) {
    this.extraProjects.update(list => list.filter(p => p !== project));
    this.billableProjects.update(list => list.filter(p => p !== project));
    this.markDirty();
  }

  addCategory() {
    const val = this.newCategory.trim();
    if (!val || !this.catProject) return;
    const existing = this.catsFor(this.catProject);
    if (existing.includes(val)) return;
    this.extraCategories.update(map => ({
      ...map,
      [this.catProject]: [...(map[this.catProject] ?? []), val]
    }));
    this.newCategory = '';
    this.markDirty();
  }

  removeCategory(project: string, i: number) {
    this.extraCategories.update(map => ({
      ...map,
      [project]: (map[project] ?? []).filter((_, idx) => idx !== i)
    }));
    this.markDirty();
  }

  save() {
    this.saving.set(true);
    const payload: any = {
      extraProjects: this.extraProjects(),
      extraCategories: this.extraCategories(),
      quickActions: this.quickActions().filter(q => q.label && q.project && q.category),
      billableProjects: this.billableProjects(),
    };
    this.svc.upsert(this.data.memberId, payload).subscribe({
      next: config => this.ref.close(config),
      error: () => this.saving.set(false),
    });
  }

  cancel() { this.ref.close(null); }
}
