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
import { DashboardService } from '../../../core/services/dashboard.service';
import { SprintService } from '../../../core/services/sprint.service';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { FeatureFormDialogComponent } from '../feature-form-dialog/feature-form-dialog.component';
import { RapidFireDialogComponent } from '../rapid-fire-dialog/rapid-fire-dialog.component';
import { FeatureService } from '../../../core/services/feature.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { SprintWorkloadSummaryComponent } from '../sprint-workload-summary/sprint-workload-summary.component';
import { SprintMemberCardComponent } from '../sprint-member-card/sprint-member-card.component';
import { SprintRetroComponent } from '../sprint-retro/sprint-retro.component';
import { SprintVotePanelComponent } from '../sprint-vote-panel/sprint-vote-panel.component';

@Component({
  selector: 'app-sprint-detail',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatSelectModule, MatFormFieldModule, FormsModule, MatTooltipModule,
    MatProgressSpinnerModule, MatTabsModule,
    SprintWorkloadSummaryComponent, SprintMemberCardComponent,
    SprintRetroComponent, SprintVotePanelComponent,
  ],
  template: `
    <!-- Header -->
    <div style="margin-bottom:20px">
      <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:0">
          <h2 style="margin:0;font-size:1.2rem">{{ dashboard?.sprint?.name }}</h2>
          <div style="font-size:0.8rem;opacity:0.5;margin-top:2px">
            {{ dashboard?.sprint?.startDate | date:'d MMM' }} – {{ dashboard?.sprint?.endDate | date:'d MMM yyyy' }}
          </div>
          @if (dashboard?.sprint?.goal) {
            <div style="font-size:0.8rem;color:#64b5f6;margin-top:4px;opacity:0.85">
              <mat-icon style="font-size:12px;width:12px;height:12px;line-height:12px;vertical-align:middle">flag</mat-icon>
              {{ dashboard!.sprint!.goal }}
            </div>
          }
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
          <mat-form-field appearance="outline" style="width:160px" subscriptSizing="dynamic">
            <mat-label>Team lead</mat-label>
            <mat-select [(ngModel)]="selectedTeamLeadId" (ngModelChange)="load()">
              <mat-option value="">All</mat-option>
              @for (tl of teamLeads; track tl.id) {
                <mat-option [value]="tl.id">{{ tl.firstName }} {{ tl.lastName }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button mat-stroked-button (click)="initializeMembers()">
            <mat-icon>group_add</mat-icon> Init members
          </button>
          <button mat-stroked-button style="color:#ff9800;border-color:rgba(255,152,0,0.4)"
                  matTooltip="Rapid fire task entry"
                  [disabled]="!dashboard?.members?.length"
                  (click)="rapidFire()">
            <mat-icon>bolt</mat-icon> Rapid Fire
          </button>
        </div>
      </div>
    </div>

    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    } @else {
      <mat-tab-group animationDuration="0ms" [mat-stretch-tabs]="false">

        <!-- ── Members ── -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px;margin-right:6px">group</mat-icon>
            Members
          </ng-template>
          <div style="padding-top:16px">
            @if ((dashboard?.members?.length ?? 0) > 0) {
              <app-sprint-workload-summary [members]="dashboard!.members" [sprint]="dashboard!.sprint"></app-sprint-workload-summary>
              <!-- Member search -->
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
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
                  <button mat-icon-button style="width:28px;height:28px" (click)="memberSearch.set('')"
                          matTooltip="Clear search">
                    <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px">close</mat-icon>
                  </button>
                }
              </div>
            }
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr));gap:12px">
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
          </div>
        </mat-tab>

        <!-- ── Retrospective ── -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px;margin-right:6px">rate_review</mat-icon>
            Retro
          </ng-template>
          <div style="padding-top:16px">
            @if (dashboard) {
              <app-sprint-retro [sprintId]="sprintId" [sprint]="dashboard.sprint"></app-sprint-retro>
            }
          </div>
        </mat-tab>

        <!-- ── MVP Vote ── -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px;margin-right:6px">emoji_events</mat-icon>
            Vote
          </ng-template>
          <div style="padding-top:16px">
            <app-sprint-vote-panel
              [sprintId]="sprintId"
              [members]="dashboard?.members ?? []">
            </app-sprint-vote-panel>
          </div>
        </mat-tab>

      </mat-tab-group>
    }
  `
})
export class SprintDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private dashSvc = inject(DashboardService);
  private sprintSvc = inject(SprintService);
  private memberSvc = inject(TeamMemberService);
  private featureSvc = inject(FeatureService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  loading = signal(true);
  dashboard: SprintDashboard | null = null;
  teamLeads: TeamMember[] = [];
  allMembers: TeamMember[] = [];
  selectedTeamLeadId = '';
  sprintId = '';
  memberSearch = signal('');

  get filteredMembers() {
    const q = this.memberSearch().trim().toLowerCase();
    if (!q) return this.dashboard?.members ?? [];
    return (this.dashboard?.members ?? []).filter(m =>
      m.fullName.toLowerCase().includes(q)
    );
  }

  ngOnInit() {
    this.sprintId = this.route.snapshot.paramMap.get('id')!;
    this.selectedTeamLeadId = this.route.snapshot.queryParamMap.get('teamLeadId') ?? '';
    this.load();
    this.memberSvc.getAll({ role: 'TeamLead' }).subscribe(m => this.teamLeads = m);
    this.memberSvc.getAll({ isActive: true }).subscribe(m => this.allMembers = m);
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
      width: '500px',
      maxWidth: '100vw',
      data: { sprintId: this.sprintId, members, features: this.dashboard?.features ?? [] }
    });
    ref.afterClosed().subscribe(() => this.load());
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
