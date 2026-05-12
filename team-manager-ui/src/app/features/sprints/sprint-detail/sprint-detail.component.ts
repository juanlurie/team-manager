import { Component, OnInit, inject, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SprintDashboard } from '../../../core/models/dashboard.model';
import { Feature } from '../../../core/models/feature.model';
import { TeamMember } from '../../../core/models/team-member.model';
import { SquadSummary } from '../../../core/models/squad.model';
import { DashboardService } from '../../../core/services/dashboard.service';
import { SprintService } from '../../../core/services/sprint.service';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { SquadService } from '../../../core/services/squad.service';
import { FeatureFormDialogComponent } from '../feature-form-dialog/feature-form-dialog.component';
import { RapidFireDialogComponent } from '../rapid-fire-dialog/rapid-fire-dialog.component';
import { FeatureService } from '../../../core/services/feature.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { SprintWorkloadSummaryComponent } from '../sprint-workload-summary/sprint-workload-summary.component';
import { SprintMemberCardComponent } from '../sprint-member-card/sprint-member-card.component';
import { SprintRetroComponent } from '../sprint-retro/sprint-retro.component';
import { SprintVotePanelComponent } from '../sprint-vote-panel/sprint-vote-panel.component';
import { IconButtonComponent } from '../../../shared/components/icon-btn/icon-btn.component';
import { SquadFilterComponent } from '../../../shared/components/squad-filter/squad-filter.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';
import { SearchInputComponent } from '../../../shared/components/search-input/search-input.component';
import { SprintSettingsDialogComponent } from '../sprint-settings-dialog/sprint-settings-dialog.component';
import { FilterBarComponent, FilterGroup, stripMentions } from '../../../shared/components/filter-bar/filter-bar.component';
import { GlobalFilterService } from '../../../core/services/global-filter.service';
import { PI } from '../../../core/models/sprint.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sprint-detail',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatSelectModule, MatFormFieldModule, FormsModule, MatTooltipModule,
    MatProgressSpinnerModule, MatTabsModule, MatMenuModule,
    SprintWorkloadSummaryComponent, SprintMemberCardComponent,
    SprintRetroComponent, SprintVotePanelComponent, IconButtonComponent,
    SquadFilterComponent, SearchableSelectComponent, SearchInputComponent, SprintSettingsDialogComponent,
    FilterBarComponent,
  ],
  template: `
    <!-- Top row: Sprint info left, navigation right -->
    <div class="top-row">
      <div class="sprint-info">
        <h2 class="sprint-name">{{ dashboard()?.sprint?.name }}</h2>
        <div class="sprint-dates">
          {{ dashboard()?.sprint?.startDate | date:'d MMM' }} – {{ dashboard()?.sprint?.endDate | date:'d MMM yyyy' }}
        </div>
        @if (dashboard()?.sprint?.goal) {
          <div class="sprint-goal">
            <mat-icon style="font-size:12px;width:12px;height:12px;line-height:12px;vertical-align:middle">flag</mat-icon>
            {{ dashboard()!.sprint!.goal }}
          </div>
        }
      </div>
      <!-- Desktop: tabs -->
      <mat-tab-group class="top-tabs" animationDuration="0ms" [mat-stretch-tabs]="false"
                     [(selectedIndex)]="activeTab">
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">group</mat-icon> Members
          </ng-template>
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">bar_chart</mat-icon> Workload
          </ng-template>
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">rate_review</mat-icon> Retro
          </ng-template>
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">emoji_events</mat-icon> Vote
          </ng-template>
        </mat-tab>
      </mat-tab-group>
      <!-- Mobile: hamburger menu -->
      <button class="nav-btn" mat-icon-button [matMenuTriggerFor]="navMenu">
        <mat-icon>menu</mat-icon>
      </button>
      <mat-menu #navMenu="matMenu" xPosition="before" class="nav-menu-panel">
        @for (t of navTabs; track t.index; let idx = $index) {
          <button mat-menu-item [class.active-menu]="activeTab === t.index" (click)="activeTab = t.index">
            <mat-icon>{{ t.icon }}</mat-icon>
            <span>{{ t.label }}</span>
            @if (activeTab === t.index) {
              <mat-icon class="menu-check">check</mat-icon>
            }
          </button>
        }
      </mat-menu>
      <button class="gear-btn" mat-icon-button matTooltip="Sprint settings"
              [matMenuTriggerFor]="settingsMenu">
        <mat-icon>settings</mat-icon>
      </button>
      <mat-menu #settingsMenu="matMenu" xPosition="before">
        <button mat-menu-item (click)="openSettings()">
          <mat-icon>settings</mat-icon>
          <span>Sprint Settings</span>
        </button>
      </mat-menu>
    </div>

    <!-- Filters row (always visible, outside loading guard) -->
    <div class="filters-row">
      @if (activeTab === 0) {
        <app-filter-bar
          [groups]="filterGroups()"
          [searchPlaceholder]="'Search members…'"
          [searchVal]="memberSearch()"
          [selectedValues]="filterValues()"
          (searchChange)="memberSearch.set($event)"
          (apply)="onFilterApply($event)" />
      }
      <div class="filters-spacer"></div>
      <button mat-icon-button class="rapid-btn"
              matTooltip="Rapid fire task entry"
              [disabled]="!dashboard()?.members?.length"
              (click)="rapidFire()">
        <mat-icon>bolt</mat-icon>
      </button>
    </div>

    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    } @else {
      <!-- Tab content -->
      @if (activeTab === 0) {
        <!-- ── Members ── -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,380px),1fr));gap:14px;margin-top:12px">
          @for (member of filteredMembers; track member.sprintMemberId) {
            <app-sprint-member-card
              [member]="member"
              [sprintId]="sprintId"
              [features]="dashboard()?.features ?? []"
              [allMembers]="allMembers"
              (reload)="load()">
            </app-sprint-member-card>
          }
        </div>
      } @else if (activeTab === 1) {
        <!-- ── Workload ── -->
        <div style="padding-top:12px">
          @if (dashboard(); as d) {
            <app-sprint-workload-summary [members]="d.members" [sprint]="d.sprint"></app-sprint-workload-summary>
          }
        </div>
      } @else if (activeTab === 2) {
        <!-- ── Retrospective ── -->
        <div style="padding-top:12px">
          @if (dashboard(); as d) {
            <app-sprint-retro [sprintId]="sprintId" [sprint]="d.sprint"></app-sprint-retro>
          }
        </div>
      } @else if (activeTab === 3) {
        <!-- ── MVP Vote ── -->
        <div style="padding-top:12px">
          <app-sprint-vote-panel
            [sprintId]="sprintId"
            [members]="dashboard()?.members ?? []">
          </app-sprint-vote-panel>
        </div>
      }
    }
  `,
  styles: [`
    .tab-icon {
      font-size: 18px; width: 18px; height: 18px; line-height: 18px;
      margin-right: 6px; vertical-align: middle;
    }
    .top-row {
      display: flex; align-items: flex-end; gap: 16px;
      margin-bottom: 12px; flex-wrap: wrap;
      padding-top: 8px; padding-left: 8px;
    }
    .sprint-info { flex: 1; min-width: 0; }
    .sprint-name { margin: 0; font-size: 1.2rem; }
    .sprint-dates { font-size: 0.8rem; opacity: 0.5; margin-top: 2px; }
    .sprint-goal {
      font-size: 0.8rem; color: #64b5f6; margin-top: 4px; opacity: 0.85;
      display: flex; align-items: center; gap: 4px;
    }
    .top-tabs {
      flex-shrink: 0;
    }
    .top-tabs .mdc-tab { min-width: 90px; }
    .nav-btn { display:none; flex-shrink:0; }
    .gear-btn { flex-shrink:0; }
    ::ng-deep .top-tabs .mat-mdc-tab-header { border-bottom: none; }
    ::ng-deep .nav-menu-panel .active-menu { background:rgba(100,181,246,0.1); }
    ::ng-deep .nav-menu-panel .menu-check { color:#2196f3; font-size:18px; width:18px; height:18px; line-height:18px; }
    .filters-row {
      display: flex; align-items: center; gap: 0; flex-wrap: wrap;
      padding: 8px 0;
    }
    .filters-row ::ng-deep app-filter-bar { flex:1; min-width:0; }
    .filters-spacer { flex: 1; }
    .rapid-btn {
      height:40px !important; min-width:40px !important; padding:0 !important;
      background:#ff9800 !important; border-radius:10px !important;
      color:#fff !important; flex-shrink:0 !important;
      transition:background 0.15s !important; display:inline-flex !important;
      align-items:center !important; justify-content:center !important;
    }
    .rapid-btn:hover { background:#f57c00 !important; }
    .rapid-btn:disabled { background:rgba(255,255,255,0.1) !important; color:rgba(255,255,255,0.2) !important; }
    .rapid-btn .mat-mdc-button-touch-target { width:40px !important; height:40px !important; }
    .rapid-btn mat-icon { font-size:28px !important; width:28px !important; height:28px !important; line-height:28px !important; color:#0f1923 !important; margin:0 !important; padding:0 !important; }
    @media (max-width: 767px) {
      .top-tabs { display: none !important; }
      .nav-btn { display: flex !important; }
      .filters-row { flex-wrap:nowrap !important; gap:6px !important; }
      .filters-spacer { display:none !important; }
      .rapid-btn { flex-shrink:0 !important; }
    }
  `]
})
export class SprintDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private dashSvc = inject(DashboardService);
  private sprintSvc = inject(SprintService);
  private memberSvc = inject(TeamMemberService);
  private squadSvc = inject(SquadService);
  private featureSvc = inject(FeatureService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  private globalFilterSvc = inject(GlobalFilterService);

  constructor() {
    effect(() => { const h = this.globalFilterSvc.searchHint(); untracked(() => this.memberSearch.set(h)); });

    effect(() => {
      const globalFilters = this.globalFilterSvc.filters();
      untracked(() => {
        // Sync squad filter (client-side, no load() needed)
        if (globalFilters.squadId !== null) {
          this.squadFilters.set([globalFilters.squadId]);
        }

        // Sync feature filter (client-side, no load() needed)
        if (globalFilters.featureId !== null) {
          this.featureFilters.set([globalFilters.featureId]);
        }

        // Sync lead filter – only call load() if lead actually changed and sprintId is ready
        if (globalFilters.leadId !== null) {
          const currentLead = this.leadFilters();
          if (currentLead.length === 0 || currentLead[0] !== globalFilters.leadId) {
            this.leadFilters.set([globalFilters.leadId]);

            // Guard: sprintId is set in ngOnInit from route params; don't load before that
            if (this.sprintId && this.sprintId.length > 0) {
              this.load();
            }
          }
        }
      });
    });
  }

  loading = signal(true);
  dashboard = signal<SprintDashboard | null>(null);
  teamLeads = signal<TeamMember[]>([]);
  allMembers: TeamMember[] = [];
  squads = signal<SquadSummary[]>([]);
  pis: PI[] = [];
  sprintId = '';
  memberSearch = signal('');
  squadFilters = signal<string[]>([]);
  featureFilters = signal<string[]>([]);
  leadFilters = signal<string[]>([]);
  activeTab = 0;

  features = computed(() => this.dashboard()?.features ?? []);

  filterGroups = computed<FilterGroup[]>(() => {
    const groups: FilterGroup[] = [];
    groups.push({
      key: 'squad',
      label: 'Squad',
      icon: 'groups',
      options: this.squads().map(s => ({ id: s.id, label: s.name })),
    });
    const feats = this.features();
    if (feats.length > 0) {
      groups.push({
        key: 'feature',
        label: 'Feature',
        icon: 'flag',
        options: feats.map(f => ({ id: f.id, label: f.title })),
      });
    }
    const leads = this.teamLeads();
    if (leads.length > 0) {
      groups.push({
        key: 'lead',
        label: 'Lead',
        icon: 'person',
        options: leads.map(t => ({ id: t.id, label: `${t.firstName} ${t.lastName}` })),
      });
    }
    return groups;
  });

  filterValues = computed<Record<string, string[]>>(() => ({
    squad: this.squadFilters(),
    feature: this.featureFilters(),
    lead: this.leadFilters(),
  }));

  navTabs = [
    { index: 0, icon: 'group', label: 'Members' },
    { index: 1, icon: 'bar_chart', label: 'Workload' },
    { index: 2, icon: 'rate_review', label: 'Retro' },
    { index: 3, icon: 'emoji_events', label: 'Vote' },
  ];

  get filteredMembers() {
    const q = stripMentions(this.memberSearch()).toLowerCase();
    let filtered = this.dashboard()?.members ?? [];
    if (q) {
      filtered = filtered.filter(m => m.fullName.toLowerCase().includes(q));
    }
    const squads = this.squadFilters();
    if (squads.length > 0) {
      const squadNames = squads.map(id => this.squads().find(s => s.id === id)?.name).filter(Boolean) as string[];
      filtered = filtered.filter(m => m.squadNames?.some(sn => squadNames.includes(sn)));
    }
    const features = this.featureFilters();
    if (features.length > 0) {
      filtered = filtered.filter(m => m.workItems.some(w => w.featureId !== null && features.includes(w.featureId)));
    }
    const leads = this.leadFilters();
    if (leads.length > 0) {
      const allLeads = this.teamLeads();
      const leadNameSet = new Set(leads.map(id => allLeads.find(t => t.id === id)).filter(Boolean).map(l => `${l!.firstName} ${l!.lastName}`));
      filtered = filtered.filter(m => m.teamLeadName !== null && leadNameSet.has(m.teamLeadName));
    }
    return filtered;
  }

  ngOnInit() {
    this.sprintId = this.route.snapshot.paramMap.get('id')!;
    const qTeamLeadId = this.route.snapshot.queryParamMap.get('teamLeadId') ?? '';
    if (qTeamLeadId) this.leadFilters.set([qTeamLeadId]);
    this.load();
    this.memberSvc.getAll({ role: 'TeamLead' }).subscribe(m => this.teamLeads.set(m));
    this.memberSvc.getAll({ isActive: true }).subscribe(m => this.allMembers = m);
    this.squadSvc.getAll().subscribe(s => this.squads.set(s.map(sq => ({ id: sq.id, name: sq.name, color: sq.color }))));
    this.sprintSvc.getPIs().subscribe(p => this.pis = p);
  }

  load() {
    this.loading.set(true);
    const leadId = this.leadFilters();
    this.dashSvc.getSprintDashboard(this.sprintId, leadId.length > 0 ? leadId[0] : undefined)
      .subscribe(d => { this.dashboard.set(d); this.loading.set(false); });
  }

  onFilterApply(filters: Record<string, string[]>) {
    const newLeads = filters['lead'] ?? [];
    const leadChanged = newLeads.join(',') !== this.leadFilters().join(',');
    this.squadFilters.set(filters['squad'] ?? []);
    this.featureFilters.set(filters['feature'] ?? []);
    this.leadFilters.set(newLeads);
    if (leadChanged) this.load();
  }

  rapidFire() {
    const members = this.dashboard()?.members ?? [];
    if (!members.length) return;
    const ref = this.dialog.open(RapidFireDialogComponent, {
      width: '95vw',
      maxWidth: '1100px',
      height: '92vh',
      data: { sprintId: this.sprintId, members, features: this.dashboard()?.features ?? [] }
    });
    ref.afterClosed().subscribe(() => this.load());
  }

  openSettings() {
    const sprint = this.dashboard()?.sprint;
    if (!sprint) return;
    const ref = this.dialog.open(SprintSettingsDialogComponent, {
      width: '420px',
      data: { sprint, pis: this.pis }
    });
    ref.afterClosed().subscribe(result => {
      if (result === 'delete') {
        this.router.navigate(['/sprints']);
      } else if (result === 'reload') {
        this.load();
      }
    });
  }

  addFeature() {
    const ref = this.dialog.open(FeatureFormDialogComponent, { width: '440px', data: { sprintId: this.sprintId } });
    ref.afterClosed().subscribe(r => { if (r) this.load(); });
  }

  editFeature(feature: Feature) {
    const ref = this.dialog.open(FeatureFormDialogComponent, { width: '440px', data: { sprintId: this.sprintId, feature } });
    ref.afterClosed().subscribe(r => { if (r) this.load(); });
  }

  deleteFeature(id: string) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete feature?', message: 'This will remove the feature and unlink any associated work items.', danger: true }
    }).afterClosed().subscribe(ok => {
      if (ok) this.featureSvc.delete(this.sprintId, id).subscribe(() => this.load());
    });
  }
}
