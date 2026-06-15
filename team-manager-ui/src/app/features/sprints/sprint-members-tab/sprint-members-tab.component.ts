import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MemberSprintCard } from '../../../core/models/dashboard.model';
import { TeamMember } from '../../../core/models/team-member.model';
import { SquadSummary } from '../../../core/models/squad.model';
import { DashboardService } from '../../../core/services/dashboard.service';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { SquadService } from '../../../core/services/squad.service';
import { RapidFireDialogComponent } from '../rapid-fire-dialog/rapid-fire-dialog.component';
import { SprintMemberCardComponent } from '../sprint-member-card/sprint-member-card.component';
import { IconButtonComponent } from '../../../shared/components/icon-btn/icon-btn.component';
import { SquadFilterComponent } from '../../../shared/components/squad-filter/squad-filter.component';

@Component({
  selector: 'app-sprint-members-tab',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    SprintMemberCardComponent,
    IconButtonComponent,
    SquadFilterComponent
],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    } @else {
      @if ((members().length ?? 0) > 0) {
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
          <mat-form-field appearance="outline" style="flex:1;max-width:320px;margin:0">
            <mat-icon matPrefix style="font-size:18px;width:18px;height:18px;line-height:18px;
                             opacity:0.4;margin-right:6px">search</mat-icon>
            <input matInput [ngModel]="memberSearch()" (ngModelChange)="memberSearch.set($event)"
                   placeholder="Search members…"
                   style="font-size:0.85rem">
          </mat-form-field>
          @if (memberSearch()) {
            <app-icon-btn icon="close" size="sm" tooltip="Clear search" (btnClick)="memberSearch.set('')" />
          }
          <app-squad-filter [squads]="squads" [value]="squadFilter()" (valueChange)="squadFilter.set($event)" />
        </div>
      }
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,380px),1fr));gap:14px">
        @for (member of filteredMembers(); track member.sprintMemberId) {
          <app-sprint-member-card
            [member]="member"
            [sprintId]="sprintId"
            [features]="features()"
            [allMembers]="allMembers"
            (reload)="load()">
          </app-sprint-member-card>
        }
      </div>
    }
  `
})
export class SprintMembersTabComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private dashSvc = inject(DashboardService);
  private dialog = inject(MatDialog);
  private teamMemberSvc = inject(TeamMemberService);
  private squadSvc = inject(SquadService);

  sprintId = '';
  teamLeadId = '';
  loading = signal(true);
  members = signal<MemberSprintCard[]>([]);
  features = signal<any[]>([]);
  memberSearch = signal('');
  squadFilter = signal('');
  squads: SquadSummary[] = [];
  allMembers: TeamMember[] = [];

  filteredMembers = computed(() => {
    const q = this.memberSearch().trim().toLowerCase();
    let filtered = this.members();
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
  });

  ngOnInit() {
    this.sprintId = this.route.parent!.snapshot.paramMap.get('id')!;
    this.teamMemberSvc.getAll({ isActive: true }).subscribe(m => this.allMembers = m);
    this.squadSvc.getAll().subscribe(s => this.squads = s.map(sq => ({ id: sq.id, name: sq.name, color: sq.color })));
    this.teamLeadId = this.route.parent!.snapshot.queryParamMap.get('teamLeadId') ?? '';
    this.load();
    this.route.parent!.queryParamMap.subscribe(params => {
      const newTeamLeadId = params.get('teamLeadId') ?? '';
      if (newTeamLeadId !== this.teamLeadId) {
        this.teamLeadId = newTeamLeadId;
        this.load();
      }
    });
  }

  load() {
    this.loading.set(true);
    this.dashSvc.getSprintDashboard(this.sprintId, this.teamLeadId || undefined)
      .subscribe(d => {
        this.members.set(d.members);
        this.features.set(d.features ?? []);
        this.loading.set(false);
      });
  }

  rapidFire() {
    const members = this.members();
    if (!members.length) return;
    this.dashSvc.getSprintDashboard(this.sprintId, this.teamLeadId || undefined)
      .subscribe(d => {
        const ref = this.dialog.open(RapidFireDialogComponent, {
          width: '95vw',
          maxWidth: '1100px',
          height: '92vh',
          data: { sprintId: this.sprintId, members: d.members, features: d.features ?? [] }
        });
        ref.afterClosed().subscribe(() => this.load());
      });
  }
}
