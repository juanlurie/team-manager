import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { QuickActionConfig } from '../../../core/models/timesheet-config.model';
import { TimesheetConfigService } from '../../../core/services/timesheet-config.service';
import { ReferenceDataService, ProjectDto, CategoryDto } from '../../../core/services/reference-data.service';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { TimesheetDefaultsService } from '../../../core/services/timesheet-defaults.service';
import { ConfigQuickActionsComponent } from '../team-member-personal/timesheet-config-dialog/tabs/config-quick-actions.component';
import { ConfigProjectsComponent } from '../team-member-personal/timesheet-config-dialog/tabs/config-projects.component';
import { ConfigCategoriesComponent } from '../team-member-personal/timesheet-config-dialog/tabs/config-categories.component';
import { ConfigWorkLocationComponent } from '../team-member-personal/timesheet-config-dialog/tabs/config-work-location.component';

const PRESET_COLORS = [
  { color: '#82aaff', bg: 'rgba(130,170,255,0.15)' }, { color: '#4caf50', bg: 'rgba(76,175,80,0.13)' },
  { color: '#ff9800', bg: 'rgba(255,152,0,0.14)' }, { color: '#ce93d8', bg: 'rgba(206,147,216,0.14)' },
  { color: '#4dd0e1', bg: 'rgba(77,208,225,0.13)' }, { color: '#ffb74d', bg: 'rgba(255,183,77,0.14)' },
  { color: '#ef5350', bg: 'rgba(239,83,80,0.13)' }, { color: '#aed581', bg: 'rgba(174,213,129,0.13)' },
];

const SECTION_KEYS = ['quick-actions', 'projects', 'categories', 'work-location'];
const SECTION_LABELS = ['Quick Actions', 'Projects', 'Categories', 'Work Location'];

const DEFAULT_LOCATION_OPTIONS = ['Home', 'Client', 'Other'];

@Component({
  selector: 'app-timesheet-config-page',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatIconModule, MatButtonModule, MatMenuModule, ConfigQuickActionsComponent, ConfigProjectsComponent, ConfigCategoriesComponent, ConfigWorkLocationComponent],
  styles: [`
    @media (max-width:640px) {
      .wrap { padding:12px 4px 40px; }
      .desktop-tabs { display:none !important; }
      .mobile-hdr { display:block !important; }
      .btn { padding:12px 18px; font-size:14px; }
    }
    @media (min-width:641px) {
      .mobile-hdr { display:none !important; }
    }
    .wrap { max-width:720px; margin:0 auto; padding:24px 16px 80px; }
    .hdr { display:flex; align-items:center; gap:12px; margin-bottom:24px; }
    .back-btn { background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.5); display:flex; align-items:center; gap:4px; font-size:13px; font-weight:500; padding:4px 8px; border-radius:6px; transition:all 0.12s; font-family:inherit; }
    .back-btn:hover { color:rgba(255,255,255,0.9); background:rgba(255,255,255,0.06); }
    .title { font-size:20px; font-weight:700; }
    .member-lbl { font-size:13px; color:rgba(255,255,255,0.4); margin-left:auto; }
    .desktop-tabs { display:flex; gap:2px; padding:0 0 0; border-bottom:1px solid rgba(255,255,255,0.07); margin-bottom:16px; }
    .dtab { padding:10px 14px; font-size:12px; font-weight:600; color:rgba(255,255,255,0.35); background:none; border:none; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-1px; transition:all 0.1s; font-family:inherit; white-space:nowrap; }
    .dtab.active { color:#64b5f6; border-bottom-color:#64b5f6; }
    .dtab:hover:not(.active) { color:rgba(255,255,255,0.7); }
    .body { min-height:400px; padding:8px 0; }
    .footer { display:flex; justify-content:flex-end; gap:8px; padding:16px 0; border-top:1px solid rgba(255,255,255,0.07); margin-top:16px; }
    .btn { padding:10px 20px; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; border:none; transition:all 0.12s; }
    .btn-primary { background:#64b5f6; color:#0f1923; } .btn-primary:hover { background:#90caf9; } .btn-primary:disabled { opacity:0.35; cursor:not-allowed; }
    .loading { display:flex; justify-content:center; padding:80px; color:rgba(255,255,255,0.3); }
  `],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div class="wrap">
      <div class="hdr">
        <button class="back-btn" (click)="goBack()">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 2L4 7l5 5"/></svg>
          Back
        </button>
        <span class="title">Timesheet Settings</span>
        @if (memberName()) { <span class="member-lbl">{{ memberName() }}</span> }
      </div>

      @if (loading()) {
        <div class="loading">Loading…</div>
      } @else {
        <div class="desktop-tabs">
          @for (s of sections; track s; let i = $index) {
            <button class="dtab" [class.active]="sectionIdx()===i" (click)="goToSection(i)">{{ s }}</button>
          }
        </div>

        <!-- Mobile hamburger -->
        <div class="mobile-hdr" style="margin-bottom:16px">
          <button [matMenuTriggerFor]="secMenu" style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:8px;color:rgba(255,255,255,0.8);font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap">
            <span>{{ sections[sectionIdx()] }}</span>
            <mat-icon style="font-size:18px">menu</mat-icon>
          </button>
          <mat-menu #secMenu="matMenu" class="dark-menu">
            @for (s of sections; track s; let i = $index) {
              <button mat-menu-item (click)="goToSection(i)">{{ s }}</button>
            }
          </mat-menu>
        </div>

        <div class="body">
          @if (sectionIdx()===0) {
            <app-config-quick-actions [quickActions]="quickActions()" [allProjects]="allProjects()" [catsByProject]="catsByProject()" [expandedIndex]="expandedQa()"
              (add)="addQa()" (remove)="removeQa($event)" (toggleCollapse)="setExpandedQa($event)"
              (labelChange)="updateQaField($event.idx,'label',$event.value)" (projectChange)="onQaProjectChange($event.idx,$event.value)"
              (categoryChange)="updateQaField($event.idx,'category',$event.value)" (noteChange)="updateQaField($event.idx,'note',$event.value)"
              (locationChange)="updateQaField($event.idx,'workedFrom',$event.value||null)" (durationChange)="updateQaField($event.idx,'durationMins',$event.value)"
              (colorChange)="setQaColor($event.idx,$event.value)" />
          }
          @if (sectionIdx()===1) {
            <app-config-projects [allProjects]="allProjects()" [billable]="billableProjects()" [isExtra]="isExtraProject.bind(this)" [newProject]="newProject()"
              (newProjectChange)="newProject.set($event)" (toggleBillable)="toggleBillable($event.project,$event.checked)" (remove)="removeProject($event)" (add)="addProject()" />
          }
          @if (sectionIdx()===2) {
            <app-config-categories [allProjects]="allProjects()" [catsByProject]="catsByProject()" [extraCats]="extraCategories()"
              [catProject]="catProject()" [newCat]="newCategory()" (catProjectChange)="catProject.set($event)" (newCatChange)="newCategory.set($event)"
              (remove)="removeCategory($event.project,$event.category)" (add)="addCategory()" />
          }
          @if (sectionIdx()===3) {
            <app-config-work-location [workWeek]="workWeek()" [options]="workLocationOptions()" (change)="setWorkDay($event.day,$event.value)" />
            <div style="margin-top:20px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.07);">
              <div class="hint">Configure available location options.</div>
              <div style="display:flex; flex-wrap:wrap; gap:5px; margin-bottom:8px;">
                @for (opt of workLocationOptions(); track opt) {
                  <span style="display:flex; align-items:center; gap:5px; padding:4px 8px 4px 10px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:16px; font-size:12px;">
                    {{ opt }}
                    <button style="background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.3); font-size:14px; line-height:1; padding:0;" (click)="removeLocation(opt)">×</button>
                  </span>
                }
              </div>
              <div style="display:flex; gap:7px; align-items:center; margin-top:8px;">
                <input style="flex:1; box-sizing:border-box; padding:8px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:inherit; font-size:12px; font-family:inherit; outline:none;" placeholder="Location name" [(ngModel)]="newLocation" (keydown.enter)="addLocation()" />
                <button style="padding:7px 12px; background:rgba(100,181,246,0.1); border:1px solid rgba(100,181,246,0.3); border-radius:6px; color:#64b5f6; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; white-space:nowrap;" [disabled]="!newLocation().trim()" (click)="addLocation()">Add</button>
              </div>
            </div>
          }
        </div>
        <div class="footer">
          <button class="btn btn-primary" [disabled]="saving()" (click)="save()">{{ saving() ? 'Saving…' : 'Save' }}</button>
        </div>
      }
    </div>
  `
})
export class TimesheetConfigPageComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private svc = inject(TimesheetConfigService);
  private refDataSvc = inject(ReferenceDataService);
  private memberSvc = inject(TeamMemberService);
  private dialog = inject(MatDialog);
  private tsd = inject(TimesheetDefaultsService);

  readonly sections = SECTION_LABELS;
  sectionIdx = signal(0);
  loading = signal(true);
  saving = signal(false);
  expandedQa = signal<number | null>(null);
  memberId = '';
  memberName = signal<string | null>(null);
  quickActions = signal<QuickActionConfig[]>([]);
  extraProjects = signal<string[]>([]);
  extraCategories = signal<Record<string, string[]>>({});
  billableProjects = signal<string[]>([]);
  workWeek = signal<Record<string, string>>({});
  workLocationOptions = signal<string[]>(['Home', 'Client', 'Other']);
  projects = signal<ProjectDto[]>([]);
  categories = signal<CategoryDto[]>([]);
  newProject = signal('');
  newCategory = signal('');
  newLocation = signal('');
  catProject = signal('');

  allProjects = computed(() => {
    const base = this.projects().map(p => p.name);
    const defaults = this.tsd.projects().filter(p => !base.includes(p));
    const extras = this.extraProjects().filter(p => ![...base, ...defaults].includes(p));
    return [...base, ...defaults, ...extras];
  });

  catsByProject = computed<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {};
    const baseProjects = this.projects().map(p => p.name);
    for (const p of this.projects()) {
      map[p.name] = this.categories().filter(c => c.projectId === p.id).sort((a, b) => a.displayOrder - b.displayOrder).map(c => c.name);
    }
    for (const p of this.tsd.projects()) { if (!baseProjects.includes(p) && !map[p]) map[p] = []; }
    for (const p of this.extraProjects()) { map[p] = [...(map[p] ?? []), ...(this.extraCategories()[p] ?? [])]; }
    for (const [project, cats] of Object.entries(this.extraCategories())) {
      if (map[project]) { for (const c of cats) { if (!map[project].includes(c)) map[project].push(c); } }
      else { map[project] = [...cats]; }
    }
    return map;
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.memberId = params.get('id')!;
      const section = params.get('section');
      const idx = SECTION_KEYS.indexOf(section ?? '');
      this.sectionIdx.set(idx >= 0 ? idx : 0);
      this.loadConfig();
      this.loadReferenceData();
    });
  }

  loadConfig() {
    this.svc.get(this.memberId).subscribe(config => {
      const c = config as any;
      this.quickActions.set((c.quickActions ?? []).map((q: any) => ({ ...q })));
      this.extraProjects.set([...(c.extraProjects ?? [])]);
      this.extraCategories.set({ ...(c.extraCategories ?? {}) });
      this.billableProjects.set([...(c.billableProjects ?? [])]);
      this.workWeek.set({ ...(c.workWeek ?? {}) });
      this.workLocationOptions.set([...(c.workLocationOptions ?? ['Home', 'Client', 'Other'])]);
      this.loading.set(false);
    });
    this.memberSvc.getById(this.memberId).subscribe(m => {
      this.memberName.set(m.firstName + ' ' + m.lastName);
    });
  }

  loadReferenceData() {
    this.refDataSvc.getProjects().subscribe(p => this.projects.set(p));
    this.refDataSvc.getCategories().subscribe(c => this.categories.set(c));
  }

  goBack() {
    this.router.navigate(['/team', this.memberId, 'timesheets']);
  }

  isExtraProject = (project: string): boolean => {
    return !this.projects().some(p => p.name === project) && !this.tsd.projects().includes(project);
  };

  toggleBillable(project: string, checked: boolean) {
    if (checked) this.billableProjects.update(l => [...l, project]);
    else this.billableProjects.update(l => l.filter(p => p !== project));
  }

  goToSection(idx: number) { this.router.navigate(['/team', this.memberId, 'timesheet-config', SECTION_KEYS[idx]]); }
  setWorkDay(day: string, location: string) { this.workWeek.update(w => ({ ...w, [day]: location })); }

  addLocation() {
    const val = this.newLocation().trim();
    if (!val || this.workLocationOptions().includes(val)) return;
    this.workLocationOptions.update(list => [...list, val]);
    this.newLocation.set('');
  }

  removeLocation(location: string) {
    this.workLocationOptions.update(list => list.filter(l => l !== location));
  }

  addQa() {
    const idx = this.quickActions().length;
    const preset = PRESET_COLORS[idx % PRESET_COLORS.length];
    this.quickActions.update(l => [...l, { label: '', project: '', category: '', note: null, workedFrom: null, durationMins: null, color: preset.color, bg: preset.bg } as QuickActionConfig]);
    this.expandedQa.set(idx);
  }

  setExpandedQa(idx: number) { this.expandedQa.update(exp => exp === idx ? null : idx); }

  removeQa(i: number) {
    this.dialog.open(ConfirmDialogComponent, { data: { title: 'Delete quick action?', message: 'This action cannot be undone.', danger: true } as ConfirmDialogData, width: '360px' })
      .afterClosed().subscribe(result => {
        if (result) {
          this.quickActions.update(l => l.filter((_, idx) => idx !== i));
          const exp = this.expandedQa();
          if (exp === i) this.expandedQa.set(null);
          else if (exp !== null && exp > i) this.expandedQa.update(e => e! - 1);
        }
      });
  }

  updateQaField(idx: number, field: string, value: any) { this.quickActions.update(l => { const n = [...l]; (n[idx] as any)[field] = value; return n; }); }

  onQaProjectChange(idx: number, project: string) { this.quickActions.update(l => { const n = [...l]; n[idx].project = project; n[idx].category = ''; return n; }); }

  setQaColor(idx: number, preset: { color: string; bg: string }) { this.quickActions.update(l => { const n = [...l]; n[idx].color = preset.color; n[idx].bg = preset.bg; return n; }); }

  addProject() {
    const val = this.newProject().trim();
    if (!val || this.allProjects().includes(val)) return;
    this.refDataSvc.createProject({ name: val }).subscribe({ next: p => { this.projects.update(l => [...l, p]); } });
    this.newProject.set('');
  }

  removeProject(project: string) { this.extraProjects.update(l => l.filter(p => p !== project)); this.billableProjects.update(l => l.filter(p => p !== project)); }

  addCategory() {
    const val = this.newCategory().trim();
    if (!val || !this.catProject()) return;
    const cats = this.catsByProject()[this.catProject()] ?? [];
    if (cats.includes(val)) return;
    const projectId = this.projects().find(p => p.name === this.catProject())?.id;
    if (projectId) { this.refDataSvc.createCategory({ projectId, name: val }).subscribe({ next: c => { this.categories.update(l => [...l, c]); } }); }
    else { this.extraCategories.update(m => ({ ...m, [this.catProject()]: [...(m[this.catProject()] ?? []), val] })); }
    this.newCategory.set('');
  }

  removeCategory(project: string, category: string) { this.extraCategories.update(m => ({ ...m, [project]: (m[project] ?? []).filter(c => c !== category) })); }

  save() {
    this.saving.set(true);
    const payload = { extraProjects: this.extraProjects(), extraCategories: this.extraCategories(), quickActions: this.quickActions().filter(q => q.label && q.project && q.category), billableProjects: this.billableProjects(), workWeek: this.workWeek(), workLocationOptions: this.workLocationOptions() };
    this.svc.upsert(this.memberId, payload).subscribe({ next: () => this.goBack(), error: () => this.saving.set(false) });
  }
}
