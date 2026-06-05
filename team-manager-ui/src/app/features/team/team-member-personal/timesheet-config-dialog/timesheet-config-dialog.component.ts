import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { TimesheetConfig, QuickActionConfig } from '../../../../core/models/timesheet-config.model';
import { TimesheetConfigService } from '../../../../core/services/timesheet-config.service';
import { TimesheetDefaultsService } from '../../../../core/services/timesheet-defaults.service';
import {
  ACTIVITY_COMBOS,
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
  imports: [CommonModule, FormsModule, MatIconModule, MatSnackBarModule],
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
    .cat-id-list { display:flex; flex-direction:column; gap:6px; margin-bottom:8px; }
    .cat-id-row { display:flex; align-items:center; gap:8px; }
    .cat-name { font-size:12px; min-width:120px; flex-shrink:0; }
    .cat-name.custom { color:#64b5f6; }
    .cat-id-inp { flex:1; font-size:11px; padding:5px 8px; font-family:monospace; }
    .tag.custom { background:rgba(100,181,246,0.08); border-color:rgba(100,181,246,0.25); }
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
    .projects-header { display:flex; align-items:center; justify-content:space-between; gap:12px; }
    .btn-sync { display:flex; align-items:center; gap:5px; padding:5px 10px; background:rgba(255,152,0,0.1); border:1px solid rgba(255,152,0,0.3); border-radius:6px; color:#ff9800; font-size:11px; font-weight:600; cursor:pointer; font-family:inherit; white-space:nowrap; flex-shrink:0; }
    .btn-sync:hover { background:rgba(255,152,0,0.18); }
    .btn-sync:disabled { opacity:0.5; cursor:not-allowed; }
    .loc-row { display:flex; align-items:center; gap:10px; padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:6px; margin-bottom:8px; }
    .loc-name { font-size:13px; flex:1; display:flex; align-items:center; gap:8px; }
    .loc-name mat-icon { font-size:18px; width:18px; height:18px; color:rgba(255,255,255,0.5); }
    .icon-picker { display:flex; gap:4px; flex-wrap:wrap; }
    .corr-input { width:60px; padding:4px 6px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:4px; color:inherit; font-size:11px; font-family:monospace; outline:none; text-align:center; }
    .corr-input:focus { border-color:rgba(100,181,246,0.6); }
    .icon-opt { width:30px; height:30px; display:flex; align-items:center; justify-content:center; border-radius:6px; cursor:pointer; border:1px solid rgba(255,255,255,0.08); background:none; color:rgba(255,255,255,0.4); transition:all 0.1s; }
    .icon-opt:hover { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.8); }
    .icon-opt.sel { border-color:rgba(100,181,246,0.6); background:rgba(100,181,246,0.12); color:#64b5f6; }
    .icon-opt mat-icon { font-size:16px; width:16px; height:16px; }
    .proj-sel-row { display:flex; gap:7px; align-items:center; margin-bottom:10px; }
    .proj-list { display:flex; flex-direction:column; gap:8px; margin-bottom:12px; }
    .proj-row { display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:6px; }
    .billable-check { display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12px; }
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
        <button class="dlg-tab" [class.active]="tab()===3" (click)="tab.set(3)">Work Location</button>
        <button class="dlg-tab" [class.active]="tab()===4" (click)="tab.set(4)">Location Options</button>
        <button class="dlg-tab" [class.active]="tab()===5" (click)="tab.set(5)">General</button>
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
                  <input class="inp" placeholder="Note (optional)" [(ngModel)]="qa.note" (ngModelChange)="markDirty()" />
                  <select class="sel" [(ngModel)]="qa.workedFrom" (ngModelChange)="markDirty()">
                    <option [ngValue]="null">Location: Default</option>
                    @for (opt of workLocationOptions(); track opt) { <option [value]="opt">{{ opt }}</option> }
                  </select>
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
            <div class="projects-header">
              <div class="hint" style="margin-bottom:0">These projects are added to the default Entelect list. Use this for client projects or custom work categories.</div>
              <button class="btn-sync" [disabled]="syncingProjects()" (click)="enqueueFetchProjects()">
                <mat-icon style="font-size:14px;width:14px;height:14px;">sync</mat-icon>
                {{ syncingProjects() ? 'Queued...' : 'Sync Projects' }}
              </button>
              <button class="btn-sync" [disabled]="syncingCategories()" (click)="enqueueFetchCategories()">
                <mat-icon style="font-size:14px;width:14px;height:14px;">category</mat-icon>
                {{ syncingCategories() ? 'Queued...' : 'Sync Categories' }}
              </button>
            </div>
            <div class="proj-list" style="margin-top:10px">
              @for (p of allProjects(); track p) {
                <div class="proj-row">
                  <span>{{ p }}</span>
                  <div style="margin-left:auto; display:flex; align-items:center; gap:16px;">
                    <label class="billable-check">
                      <input type="checkbox" [checked]="isBillable(p)" (change)="toggleBillable(p, $event)">
                      <span>Billable</span>
                    </label>
                    @if (isExtraProject(p)) {
                      <button class="tag-rm" (click)="removeProject(p)">×</button>
                    }
                  </div>
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
            <div class="hint">Add custom categories to any project. Set a Correlation ID to map to the external system's category ID.</div>
            <div class="proj-sel-row">
              <select class="sel" [(ngModel)]="catProject" style="flex:1">
                <option value="">Select project…</option>
                @for (p of allProjects(); track p) { <option [value]="p">{{ p }}</option> }
              </select>
            </div>
            @if (catProject) {
              <div class="sec-lbl">Categories for "{{ catProject }}"</div>
              <div class="cat-id-list">
                @for (c of catsFor(catProject); track c) {
                  <div class="cat-id-row">
                    <span class="cat-name" [class.custom]="isExtraCategory(catProject, c)">{{ c }}</span>
                    <input class="inp cat-id-inp" placeholder="Correlation ID"
                           [ngModel]="categoryCorrelationIds()[c] ?? ''"
                           (ngModelChange)="setCategoryCorrelationId(c, $event)"
                           title="External system ID for this category" />
                    @if (isExtraCategory(catProject, c)) {
                      <button class="tag-rm" (click)="removeCategory(catProject, c)" style="font-size:16px">×</button>
                    }
                  </div>
                }
                @if (catsFor(catProject).length===0) { <span style="font-size:12px;color:rgba(255,255,255,0.25)">No categories for this project.</span> }
              </div>
              <div class="add-row" style="margin-top:8px">
                <input class="inp" placeholder="Category name" [(ngModel)]="newCategory" (keydown.enter)="addCategory()" style="flex:1" />
                <button class="btn-add" [disabled]="!newCategory.trim()" (click)="addCategory()">Add</button>
              </div>
            }
          </div>
        }

        @if (tab()===3) {
          <div class="sec">
            <div class="hint">Set your default work location for each day of the week.</div>
            @for (day of weekDays; track day) {
              <div class="row" style="justify-content:space-between; margin-bottom:8px;">
                <span>{{ day }}</span>
                <select class="sel" style="width:120px" [ngModel]="workWeek()[day]" (ngModelChange)="setWorkDay(day, $event)">
                  @for (opt of workLocationOptions(); track opt) { <option [value]="opt">{{ opt }}</option> }
                </select>
              </div>
            }
          </div>
        }

        @if (tab()===4) {
          <div class="sec">
            <div class="hint">Configure work location options, icons, and the external correlation ID used when submitting timesheets.</div>
            @for (opt of workLocationOptions(); track opt) {
              <div class="loc-row">
                <span class="loc-name">
                  <mat-icon>{{ iconFor(opt) }}</mat-icon>
                  {{ opt }}
                </span>
                <div class="icon-picker">
                  @for (ic of ICON_OPTIONS; track ic.icon) {
                    <button class="icon-opt" [class.sel]="iconFor(opt) === ic.icon" [title]="ic.label" (click)="setLocationIcon(opt, ic.icon)">
                      <mat-icon>{{ ic.icon }}</mat-icon>
                    </button>
                  }
                </div>
                <input class="corr-input" placeholder="ID" [ngModel]="workLocationCorrelationIds()[opt] ?? ''"
                       (ngModelChange)="setLocationCorrelationId(opt, $event)" title="Correlation ID for external system" />
                <button class="tag-rm" (click)="removeLocation(opt)">×</button>
              </div>
            }
            <div class="add-row">
              <input class="inp" placeholder="Location name" [(ngModel)]="newLocation" (keydown.enter)="addLocation()" style="flex:1" />
              <button class="btn-add" [disabled]="!newLocation.trim()" (click)="addLocation()">Add</button>
            </div>
          </div>
        }
        @if (tab()===5) {
          <div class="sec">
            <div class="hint">General behaviour settings for timesheet entry logging.</div>
            <label class="billable-check" style="gap:12px;font-size:13px;padding:8px 0">
              <input type="checkbox" [checked]="mergeEntriesEnabled()" (change)="mergeEntriesEnabled.set($any($event.target).checked); markDirty()">
              <div>
                <div style="font-weight:500">Merge duplicate entries</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px">When adding an entry with the same project &amp; category on the same day, combine it with the existing one and merge the notes.</div>
              </div>
            </label>
            <label class="billable-check" style="gap:12px;font-size:13px;padding:8px 0">
              <input type="checkbox" [checked]="deduplicatePendingEditSync()" (change)="deduplicatePendingEditSync.set($any($event.target).checked); markDirty()">
              <div>
                <div style="font-weight:500">Deduplicate pending edit syncs</div>
                <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px">When an edit is queued for an entry that already has a pending edit sync event, replace it instead of adding a new one. Matches on the entry's correlation ID.</div>
              </div>
            </label>
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

  readonly weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  readonly presetColors = PRESET_COLORS;
  readonly durChips = DURATION_CHIPS;
  readonly chipMins = DURATION_CHIP_MINUTES;

  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private tsd = inject(TimesheetDefaultsService);

  tab = signal(0);
  saving = signal(false);
  dirty = signal(false);
  syncingProjects = signal(false);
  syncingCategories = signal(false);

  quickActions = signal<QuickActionConfig[]>([]);
  extraProjects = signal<string[]>([]);
  extraCategories = signal<Record<string, string[]>>({});
  billableProjects = signal<string[]>([]);
  workWeek = signal<Record<string, string>>({});
  workLocationOptions = signal<string[]>([]);
  mergeEntriesEnabled = signal(false);
  deduplicatePendingEditSync = signal(false);
  locationIcons = signal<Record<string, string>>({});
  workLocationCorrelationIds = signal<Record<string, string>>({});
  categoryCorrelationIds = signal<Record<string, string>>({});

  readonly ICON_OPTIONS = [
    { icon: 'home',          label: 'Home' },
    { icon: 'business',      label: 'Office' },
    { icon: 'laptop',        label: 'Laptop' },
    { icon: 'location_city', label: 'City' },
    { icon: 'work',          label: 'Work' },
    { icon: 'local_cafe',    label: 'Café' },
    { icon: 'flight',        label: 'Travel' },
    { icon: 'apartment',     label: 'Building' },
    { icon: 'public',        label: 'Remote' },
    { icon: 'store',         label: 'Client' },
  ];

  readonly DEFAULT_ICONS: Record<string, string> = {
    'Home': 'home', 'Client': 'store', 'Entelect': 'laptop', 'Other': 'location_on',
  };

  iconFor(loc: string): string {
    return this.locationIcons()[loc] ?? this.DEFAULT_ICONS[loc] ?? 'location_on';
  }

  setLocationIcon(loc: string, icon: string) {
    this.locationIcons.update(m => ({ ...m, [loc]: icon }));
    this.markDirty();
  }

  setLocationCorrelationId(loc: string, id: string) {
    this.workLocationCorrelationIds.update(m => {
      const updated = { ...m };
      if (id) updated[loc] = id; else delete updated[loc];
      return updated;
    });
    this.markDirty();
  }

  newProject = '';
  newCategory = '';
  newLocation = '';
  catProject = '';

  allProjects = computed(() => [
    ...this.tsd.projects(),
    ...this.extraProjects().filter(p => !this.tsd.projects().includes(p))
  ]);

  ngOnInit() {
    const c = this.data.config as any;
    this.quickActions.set(c.quickActions.map((q: any) => ({ ...q })));
    this.extraProjects.set([...c.extraProjects]);
    this.extraCategories.set({ ...c.extraCategories });
    this.billableProjects.set([...(c.billableProjects ?? [])]);
    this.workWeek.set({ ...(c.workWeek ?? {}) });
    this.workLocationOptions.set([...(c.workLocationOptions ?? ['Home', 'Other', 'Client', 'Entelect'])]);
    this.mergeEntriesEnabled.set(c.mergeEntriesEnabled ?? false);
    this.deduplicatePendingEditSync.set(c.deduplicatePendingEditSync ?? false);
    this.locationIcons.set({ ...(c.locationIcons ?? {}) });
    this.workLocationCorrelationIds.set({ ...(c.workLocationCorrelationIds ?? {}) });
    this.categoryCorrelationIds.set({ ...(c.categoryCorrelationIds ?? {}) });
  }

  enqueueFetchProjects() {
    this.syncingProjects.set(true);
    this.http.post<any>('/api/v1/sync-queue/enqueue', {
      action: 'GetTimesheetProjects',
      label: 'Fetch Timesheet Projects',
      sourceId: this.data.memberId,
      sourceType: 'Member'
    }).subscribe({
      next: () => {
        this.snackBar.open('Added to sync queue — run it from the Sync Queue page', 'Close', { duration: 4000 });
        this.syncingProjects.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to queue sync event', 'Close', { duration: 3000 });
        this.syncingProjects.set(false);
      }
    });
  }

  enqueueFetchCategories() {
    this.syncingCategories.set(true);
    this.http.post<any>('/api/v1/sync-queue/enqueue', {
      action: 'GetTimesheetProjectCategories',
      label: 'Fetch Timesheet Project Categories',
      sourceId: this.data.memberId,
      sourceType: 'Member'
    }).subscribe({
      next: () => {
        this.snackBar.open('Added to sync queue — run it from the Sync Queue page', 'Close', { duration: 4000 });
        this.syncingCategories.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to queue sync event', 'Close', { duration: 3000 });
        this.syncingCategories.set(false);
      }
    });
  }

  catsFor(project: string): string[] {
    const defaults = this.tsd.categoriesFor(project);
    const extras = this.extraCategories()[project] ?? [];
    return [...defaults, ...extras.filter(c => !defaults.includes(c))];
  }

  extraCategoriesFor(project: string): string[] {
    return this.extraCategories()[project] ?? [];
  }

  isExtraCategory(project: string, category: string): boolean {
    return this.extraCategoriesFor(project).includes(category);
  }

  isBillable(project: string): boolean {
    return this.billableProjects().includes(project);
  }

  isExtraProject(project: string): boolean {
    return !this.tsd.projects().includes(project);
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

  setWorkDay(day: string, location: string) {
    this.workWeek.update(ww => ({ ...ww, [day]: location }));
    this.markDirty();
  }

  addLocation() {
    const val = this.newLocation.trim();
    if (!val || this.workLocationOptions().includes(val)) return;
    this.workLocationOptions.update(list => [...list, val]);
    this.newLocation = '';
    this.markDirty();
  }

  removeLocation(location: string) {
    this.workLocationOptions.update(list => list.filter(l => l !== location));
    this.markDirty();
  }

  addQa() {
    this.quickActions.update(list => [...list, {
      label: '', project: '', category: '', note: null, workedFrom: null,
      color: PRESET_COLORS[list.length % PRESET_COLORS.length].color,
      bg: PRESET_COLORS[list.length % PRESET_COLORS.length].bg,
    } as QuickActionConfig]);
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

  removeCategory(project: string, category: string) {
    this.extraCategories.update(map => ({
      ...map,
      [project]: (map[project] ?? []).filter(c => c !== category)
    }));
    this.markDirty();
  }

  setCategoryCorrelationId(category: string, id: string) {
    this.categoryCorrelationIds.update(m => {
      const updated = { ...m };
      if (id.trim()) updated[category] = id.trim();
      else delete updated[category];
      return updated;
    });
    this.markDirty();
  }

  save() {
    this.saving.set(true);
    const payload: any = {
      extraProjects: this.extraProjects(),
      extraCategories: this.extraCategories(),
      quickActions: this.quickActions().filter(q => q.label && q.project && q.category),
      billableProjects: this.billableProjects(),
      workWeek: this.workWeek(),
      workLocationOptions: this.workLocationOptions(),
      mergeEntriesEnabled: this.mergeEntriesEnabled(),
      deduplicatePendingEditSync: this.deduplicatePendingEditSync(),
      locationIcons: this.locationIcons(),
      workLocationCorrelationIds: this.workLocationCorrelationIds(),
      categoryCorrelationIds: this.categoryCorrelationIds(),
    };
    this.svc.upsert(this.data.memberId, payload).subscribe({
      next: config => this.ref.close(config),
      error: () => this.saving.set(false),
    });
  }

  cancel() { this.ref.close(null); }
}
