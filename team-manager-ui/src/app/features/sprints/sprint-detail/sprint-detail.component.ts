import { Component, OnInit, inject, signal, computed } from '@angular/core';
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
import { SprintSettingsDialogComponent } from '../sprint-settings-dialog/sprint-settings-dialog.component';
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
    SquadFilterComponent, SearchableSelectComponent, SprintSettingsDialogComponent,
  ],
  template: `
    <!-- Top row: Sprint info left, tabs right -->
    <div class="top-row">
      <div class="sprint-info">
        <h2 class="sprint-name">{{ dashboard?.sprint?.name }}</h2>
        <div class="sprint-dates">
          {{ dashboard?.sprint?.startDate | date:'d MMM' }} – {{ dashboard?.sprint?.endDate | date:'d MMM yyyy' }}
        </div>
        @if (dashboard?.sprint?.goal) {
          <div class="sprint-goal">
            <mat-icon style="font-size:12px;width:12px;height:12px;line-height:12px;vertical-align:middle">flag</mat-icon>
            {{ dashboard!.sprint!.goal }}
          </div>
        }
      </div>
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

    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    } @else {
      <!-- Filters row (under tabs) -->
      <div class="filters-row">
        <app-searchable-select
          [options]="teamLeads"
          label="Team lead"
          placeholder="Filter by lead…"
          width="200px"
          [nullable]="true"
          nullableLabel="All"
          nullValue=""
          (valueChange)="load()">
        </app-searchable-select>
        @if (activeTab === 0) {
          <div style="position:relative;flex:1;max-width:280px">
            <mat-icon style="position:absolute;left:10px;top:50%;transform:translateY(-50%);
                             font-size:18px;width:18px;height:18px;line-height:18px;
                             opacity:0.35;pointer-events:none">search</mat-icon>
            <input [ngModel]="memberSearch()" (ngModelChange)="memberSearch.set($event)"
                   placeholder="Search members…"
                   style="width:100%;box-sizing:border-box;padding:7px 10px 7px 34px;
                          background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
                          border-radius:8px;color:inherit;font-size:0.85rem;outline:none">
          </div>
          @if (memberSearch()) {
            <app-icon-btn icon="close" size="sm" tooltip="Clear search" (btnClick)="memberSearch.set('')" />
          }
          <app-squad-filter [squads]="squads" [value]="squadFilter()" (valueChange)="squadFilter.set($event)" />
        }
        <div class="filters-spacer"></div>
        <button mat-stroked-button (click)="initializeMembers()">
          <mat-icon>group_add</mat-icon> Init members
        </button>
        <button mat-stroked-button class="rapid-btn"
                matTooltip="Rapid fire task entry"
                [disabled]="!dashboard?.members?.length"
                (click)="rapidFire()">
          <mat-icon>bolt</mat-icon> Rapid Fire
        </button>
      </div>

      <!-- Tab content -->
      @if (activeTab === 0) {
        <!-- ── Members ── -->
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,380px),1fr));gap:14px;margin-top:12px">
          @for (member of filteredMembers; track member.sprintMemberId) {
            <app-sprint-member-card
              [member]="member"
              [sprintId]="sprintId"
              [features]="dashboard?.features ?? []"
              [allMembers]="allMembers"
              (reload)="load()">
            </app-sprint-member-card>
          }
        </div>
      } @else if (activeTab === 1) {
        <!-- ── Workload ── -->
        <div style="padding-top:12px">
          @if (dashboard) {
            <app-sprint-workload-summary [members]="dashboard.members" [sprint]="dashboard.sprint"></app-sprint-workload-summary>
          }
        </div>
      } @else if (activeTab === 2) {
        <!-- ── Retrospective ── -->
        <div style="padding-top:12px">
          @if (dashboard) {
            <app-sprint-retro [sprintId]="sprintId" [sprint]="dashboard.sprint"></app-sprint-retro>
          }
        </div>
      } @else if (activeTab === 3) {
        <!-- ── MVP Vote ── -->
        <div style="padding-top:12px">
          <app-sprint-vote-panel
            [sprintId]="sprintId"
            [members]="dashboard?.members ?? []">
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
    .filters-row {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      padding: 8px 0;
    }
    .filter-field { width: 160px; }
    .filters-spacer { flex: 1; }
    .filters-spacer { flex: 1; }
    .rapid-btn { color: #ff9800; border-color: rgba(255,152,0,0.4); }
    .gear-btn { flex-shrink:0; }
    ::ng-deep .top-tabs .mat-mdc-tab-header { border-bottom: none; }
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

  loading = signal(true);
  dashboard: SprintDashboard | null = null;
  teamLeads: TeamMember[] = [];
  allMembers: TeamMember[] = [];
  squads: SquadSummary[] = [];
  pis: PI[] = [];
  selectedTeamLeadId = '';
  sprintId = '';
  memberSearch = signal('');
  squadFilter = signal('');
  activeTab = 0;

  get filteredMembers() {
    const q = this.memberSearch().trim().toLowerCase();
    let filtered = this.dashboard?.members ?? [];
    if (q) {
      filtered = filtered.filter(m => m.fullName.toLowerCase().includes(q));
    }
    const squadId = this.squadFilter();
    if (squadId) {
      const squad = this.squads.find(s => s.id === squadId);
      if (squad) {
        filtered = filtered.filter(m => m.squadNames?.includes(squad.name));
      }
    }
    return filtered;
  }

  ngOnInit() {
    this.sprintId = this.route.snapshot.paramMap.get('id')!;
    this.selectedTeamLeadId = this.route.snapshot.queryParamMap.get('teamLeadId') ?? '';
    this.load();
    this.memberSvc.getAll({ role: 'TeamLead' }).subscribe(m => this.teamLeads = m);
    this.memberSvc.getAll({ isActive: true }).subscribe(m => this.allMembers = m);
    this.squadSvc.getAll().subscribe(s => this.squads = s.map(sq => ({ id: sq.id, name: sq.name, color: sq.color })));
    this.sprintSvc.getPIs().subscribe(p => this.pis = p);
  }

  load() {
    this.loading.set(true);
    this.dashSvc.getSprintDashboard(this.sprintId, this.selectedTeamLeadId || undefined)
      .subscribe(d => { this.dashboard = d; this.loading.set(false); });
  }

  initializeMembers() {
    this.sprintSvc.initializeMembers(this.sprintId).subscribe(r => {
      this.snack.open(`${r.addedCount} members added`, 'OK', { duration: 3000 });
      this.load();
    });
  }

  rapidFire() {
    const members = this.dashboard?.members ?? [];
    if (!members.length) return;
    const ref = this.dialog.open(RapidFireDialogComponent, {
      width: '95vw',
      maxWidth: '1100px',
      height: '92vh',
      data: { sprintId: this.sprintId, members, features: this.dashboard?.features ?? [] }
    });
    ref.afterClosed().subscribe(() => this.load());
  }

  openSettings() {
    const sprint = this.dashboard?.sprint;
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
