import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet, Params } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TeamMember } from '../../../core/models/team-member.model';
import { SprintService } from '../../../core/services/sprint.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { SprintFormComponent } from '../sprint-form/sprint-form.component';
import { SprintCloneDialogComponent } from '../sprint-clone-dialog/sprint-clone-dialog.component';
import { RapidFireDialogComponent } from '../rapid-fire-dialog/rapid-fire-dialog.component';
import { IconButtonComponent } from '../../../shared/components/icon-btn/icon-btn.component';

@Component({
  selector: 'app-sprint-detail-layout',
  standalone: true,
  imports: [
    CommonModule, RouterLink, RouterLinkActive, RouterOutlet,
    MatButtonModule, MatIconModule, MatDialogModule,
    MatSelectModule, MatFormFieldModule, FormsModule, MatTooltipModule,
    SprintCloneDialogComponent, IconButtonComponent,
  ],
  template: `
    <!-- Header -->
    <div style="margin-bottom:16px">
      <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:0">
          <h2 style="margin:0;font-size:1.2rem">{{ sprintName() }}</h2>
          <div style="font-size:0.8rem;opacity:0.5;margin-top:2px">
            {{ sprintStartDate() | date:'d MMM' }} – {{ sprintEndDate() | date:'d MMM yyyy' }}
          </div>
          @if (sprintGoal()) {
            <div style="font-size:0.8rem;color:#64b5f6;margin-top:4px;opacity:0.85">
              <mat-icon style="font-size:12px;width:12px;height:12px;line-height:12px;vertical-align:middle">flag</mat-icon>
              {{ sprintGoal() }}
            </div>
          }
        </div>
        <div class="hdr-controls">
          <mat-form-field appearance="outline" class="hdr-select" subscriptSizing="dynamic">
            <mat-label>Team lead</mat-label>
            <mat-select [(ngModel)]="selectedTeamLeadId" (ngModelChange)="onTeamLeadChange()">
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
                  (click)="rapidFire()">
            <mat-icon>bolt</mat-icon> Rapid Fire
          </button>
          <app-icon-btn icon="edit" size="sm" tooltip="Edit sprint" (btnClick)="editSprint()" />
          <app-icon-btn icon="content_copy" size="sm" tooltip="Clone sprint" (btnClick)="cloneSprint()" />
        </div>
      </div>
    </div>

    <!-- Tab navigation -->
    <nav class="tab-nav" style="display:flex;gap:2px;margin-bottom:0;border-bottom:1px solid rgba(255,255,255,0.08)">
      <a routerLink="members" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}"
         class="tab-link">
        <mat-icon>group</mat-icon> Members
      </a>
      <a routerLink="workload" routerLinkActive="active" class="tab-link">
        <mat-icon>bar_chart</mat-icon> Workload
      </a>
      <a routerLink="retro" routerLinkActive="active" class="tab-link">
        <mat-icon>rate_review</mat-icon> Retro
      </a>
      <a routerLink="vote" routerLinkActive="active" class="tab-link">
        <mat-icon>emoji_events</mat-icon> Vote
      </a>
    </nav>

    <!-- Tab content -->
    <router-outlet></router-outlet>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    .tab-link {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 10px 16px; font-size: 0.85rem; font-weight: 500;
      color: rgba(255,255,255,0.5); text-decoration: none;
      border-bottom: 2px solid transparent; transition: all 0.15s;
    }
    .tab-link:hover { color: rgba(255,255,255,0.8); }
    .tab-link.active {
      color: #64b5f6; border-bottom-color: #64b5f6;
    }
    .tab-link mat-icon { font-size: 18px; width: 18px; height: 18px; line-height: 18px; }
    .hdr-controls {
      display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap;
    }
    .hdr-select { width: 160px; }
    @media (max-width: 767px) {
      .hdr-controls { width: 100%; flex-shrink: 1; }
      .hdr-select { flex: 1; min-width: 120px; width: auto; }
      .tab-link { padding: 10px 10px; font-size: 0.8rem; }
    }
  `]
})
export class SprintDetailLayoutComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sprintSvc = inject(SprintService);
  private dashSvc = inject(DashboardService);
  private memberSvc = inject(TeamMemberService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  sprintId = '';
  selectedTeamLeadId = '';
  teamLeads: TeamMember[] = [];

  sprintName = signal('');
  sprintStartDate = signal('');
  sprintEndDate = signal('');
  sprintGoal = signal<string | null>(null);

  ngOnInit() {
    this.sprintId = this.route.snapshot.paramMap.get('id')!;
    this.selectedTeamLeadId = this.route.snapshot.queryParamMap.get('teamLeadId') ?? '';
    this.memberSvc.getAll({ role: 'TeamLead' }).subscribe(m => this.teamLeads = m);
    this.loadSprint();
    this.route.queryParamMap.subscribe(params => {
      const newTeamLeadId = params.get('teamLeadId') ?? '';
      if (this.selectedTeamLeadId !== newTeamLeadId) {
        this.selectedTeamLeadId = newTeamLeadId;
      }
    });
  }

  loadSprint() {
    this.sprintSvc.getSprints().subscribe(sprints => {
      const sprint = sprints.find(s => s.id === this.sprintId);
      if (sprint) {
        this.sprintName.set(sprint.name);
        this.sprintStartDate.set(sprint.startDate);
        this.sprintEndDate.set(sprint.endDate);
        this.sprintGoal.set(sprint.goal ?? null);
      }
    });
  }

  onTeamLeadChange() {
    if (this.selectedTeamLeadId) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { teamLeadId: this.selectedTeamLeadId },
        queryParamsHandling: 'merge'
      });
    } else {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {}
      });
    }
  }

  initializeMembers() {
    this.sprintSvc.initializeMembers(this.sprintId).subscribe(r => {
      this.snack.open(`${r.addedCount} members added`, 'OK', { duration: 3000 });
    });
  }

  rapidFire() {
    const params = new URLSearchParams(window.location.search);
    const teamLeadId = params.get('teamLeadId') ?? '';
    this.dashSvc.getSprintDashboard(this.sprintId, teamLeadId || undefined).subscribe(d => {
      if (!d.members.length) return;
      const ref = this.dialog.open(RapidFireDialogComponent, {
        width: '95vw',
        maxWidth: '1100px',
        height: '92vh',
        data: { sprintId: this.sprintId, members: d.members, features: d.features ?? [] }
      });
      ref.afterClosed().subscribe(() => this.loadSprint());
    });
  }

  editSprint() {
    this.sprintSvc.getSprints().subscribe(sprints => {
      const sprint = sprints.find(s => s.id === this.sprintId);
      if (sprint) {
        this.sprintSvc.getPIs().subscribe(pis => {
          const ref = this.dialog.open(SprintFormComponent, { width: '480px', data: { sprint, pis } });
          ref.afterClosed().subscribe(r => { if (r) this.loadSprint(); });
        });
      }
    });
  }

  cloneSprint() {
    this.sprintSvc.getSprints().subscribe(sprints => {
      const sprint = sprints.find(s => s.id === this.sprintId);
      if (sprint) {
        const ref = this.dialog.open(SprintCloneDialogComponent, { width: '440px', data: sprint });
        ref.afterClosed().subscribe(r => {
          if (r) this.snack.open('Sprint cloned', 'OK', { duration: 2000 });
        });
      }
    });
  }
}
