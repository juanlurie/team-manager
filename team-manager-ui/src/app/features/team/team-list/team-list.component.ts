import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TeamMember } from '../../../core/models/team-member.model';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { SquadService } from '../../../core/services/squad.service';
import { SquadSummary } from '../../../core/models/squad.model';
import { TeamMemberFormComponent } from '../team-member-form/team-member-form.component';
import { SquadManagerDialogComponent } from '../squad-manager-dialog/squad-manager-dialog.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IconButtonComponent } from '../../../shared/components/icon-btn/icon-btn.component';
import { SearchableSelectComponent } from '../../../shared/components/searchable-select/searchable-select.component';

const CRAFT_LABELS: Record<string, string> = {
  DevBE: 'Dev BE', DevFE: 'Dev FE', DevIOS: 'iOS', DevAndroid: 'Android',
  Dev: 'Developer', Analysis: 'Analyst', Design: 'Designer', QA: 'QA',
};

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatChipsModule, MatTooltipModule, MatFormFieldModule, FormsModule,
    MatProgressSpinnerModule, IconButtonComponent, SearchableSelectComponent],
  template: `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <h2 style="margin:0;font-size:1.2rem">Team Members</h2>
      <span style="flex:1"></span>
      <app-searchable-select [options]="roleOptions" label="Role" width="150px"
        nullableLabel="All roles" [(ngModel)]="roleFilter" (valueChange)="load()" />
      <app-searchable-select [options]="craftOptions" label="Craft" width="170px"
        nullableLabel="All crafts" [(ngModel)]="craftFilter" (valueChange)="applyFilters()" />
      <app-searchable-select [options]="squads" label="Squad" width="170px"
        nullableLabel="All squads" [(ngModel)]="squadFilter" (valueChange)="applyFilters()" />
      <app-searchable-select [options]="teamLeads" label="Team Lead" width="170px"
        nullableLabel="All leads" [(ngModel)]="teamLeadFilter" (valueChange)="applyFilters()" />
      <button mat-stroked-button (click)="openSquadManager()">
        <mat-icon>groups</mat-icon> Squads
      </button>
      <button mat-raised-button color="primary" (click)="openForm()">
        <mat-icon>add</mat-icon> Add
      </button>
    </div>

    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    } @else {

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:10px;grid-auto-rows:1fr">
      @for (m of members; track m.id) {
        <div (click)="openPersonal(m)" class="member-card"
             style="border-radius:10px;border:1px solid rgba(255,255,255,0.08);padding:12px 14px;cursor:pointer;display:flex;flex-direction:column">
          <div style="display:flex;align-items:center;gap:12px">
            <!-- Avatar -->
            <div style="width:36px;height:36px;border-radius:50%;background:rgba(100,181,246,0.15);
                        color:#64b5f6;font-size:0.75rem;font-weight:700;display:flex;align-items:center;
                        justify-content:center;flex-shrink:0;border:1px solid rgba(100,181,246,0.2)">
              {{ m.firstName.charAt(0) }}{{ m.lastName.charAt(0) }}
            </div>

            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:0.9rem">{{ m.firstName }} {{ m.lastName }}</div>
            </div>
            <div style="flex-shrink:0" (click)="$event.stopPropagation()">
              <app-icon-btn icon="edit" size="sm" tooltip="Edit member" (btnClick)="openForm(m)" />
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;margin-top:8px;flex-wrap:wrap">
            @for (craft of m.crafts; track craft) {
              <span style="font-size:0.68rem;font-weight:600;padding:2px 7px;border-radius:6px;background:rgba(76,175,80,0.12);color:#81c784">
                {{ craftLabel(craft) }}
              </span>
            }
          </div>
          <div style="margin-top:auto;padding-top:8px;display:flex;align-items:center;gap:8px">
            <div style="flex:1;display:flex;flex-wrap:wrap;gap:3px">
              @for (b of m.achievements?.slice(0,6) ?? []; track b.id) {
                <span [matTooltip]="b.name" style="font-size:1.1rem;line-height:1;cursor:default">{{ b.icon }}</span>
              }
              @if ((m.achievements?.length ?? 0) > 6) {
                <span style="font-size:0.65rem;opacity:0.4;align-self:center">+{{ m.achievements!.length - 6 }}</span>
              }
            </div>
            <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
              @for (sq of m.squads; track sq.id) {
                <span style="font-size:0.68rem;font-weight:600;padding:2px 7px;border-radius:6px"
                      [style.background]="squadBg(sq.color)"
                      [style.color]="sq.color ?? '#9e9e9e'">
                  {{ sq.name }}
                </span>
              }
            </div>
          </div>
        </div>
      }
    </div>

    @if (members.length === 0) {
      <div style="text-align:center;padding:64px;opacity:0.35;font-size:0.9rem">No members found</div>
    }
    } <!-- end @else -->
  `,
  styles: [`
    .role-member    { background:rgba(158,158,158,0.12);color:#9e9e9e; }
    .role-teamlead  { background:rgba(100,181,246,0.15);color:#64b5f6; }
    .role-techlead  { background:rgba(171,71,188,0.15);color:#ce93d8; }
    .member-card    { background:rgba(255,255,255,0.04);transition:background 0.15s;min-height:80px; }
    .member-card:hover { background:rgba(255,255,255,0.08); }
  `]
})
export class TeamListComponent implements OnInit {
  private svc = inject(TeamMemberService);
  private squadSvc = inject(SquadService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  members: TeamMember[] = [];
  loading = signal(true);
  allMembers: TeamMember[] = [];
  squads: SquadSummary[] = [];
  teamLeads: TeamMember[] = [];
  roleFilter = '';
  craftFilter = '';
  squadFilter = '';
  teamLeadFilter = '';

  readonly roleOptions = [
    { id: 'Member', name: 'Member' },
    { id: 'TeamLead', name: 'Team Lead' },
    { id: 'TechLead', name: 'Tech Lead' },
  ];

  readonly craftOptions = [
    { id: 'DevBE', name: 'Dev — Backend' },
    { id: 'DevFE', name: 'Dev — Frontend' },
    { id: 'DevIOS', name: 'Dev — Mobile iOS' },
    { id: 'DevAndroid', name: 'Dev — Mobile Android' },
    { id: 'Analysis', name: 'Analyst' },
    { id: 'Design', name: 'Designer' },
    { id: 'QA', name: 'QA' },
  ];

  roleClass(role: string) { return `role-${role.toLowerCase()}`; }
  roleLabel(role: string) { return role === 'TeamLead' ? 'Team Lead' : role === 'TechLead' ? 'Tech Lead' : 'Member'; }
  craftLabel(craft: string) { return CRAFT_LABELS[craft] ?? craft; }
  squadBg(color: string | null) { return color ? color + '28' : 'rgba(158,158,158,0.12)'; }

  ngOnInit() {
    this.squadSvc.getAll().subscribe(s => this.squads = s.map(sq => ({ id: sq.id, name: sq.name, color: sq.color })));
    this.svc.getAll({ role: 'TeamLead', isActive: true }).subscribe(m => this.teamLeads = m);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.getAll({ role: this.roleFilter || undefined, isActive: true })
      .subscribe(m => { this.allMembers = m; this.applyFilters(); this.loading.set(false); });
  }

  applyFilters() {
    let filtered = this.allMembers;
    if (this.craftFilter) {
      filtered = filtered.filter(m => m.crafts.includes(this.craftFilter));
    }
    if (this.squadFilter) {
      filtered = filtered.filter(m => m.squads.some(s => s.id === this.squadFilter));
    }
    if (this.teamLeadFilter) {
      filtered = filtered.filter(m => m.teamLeadId === this.teamLeadFilter);
    }
    this.members = filtered;
  }

  openForm(member?: TeamMember) {
    const ref = this.dialog.open(TeamMemberFormComponent, {
      width: '480px',
      data: { member, allMembers: this.allMembers }
    });
    ref.afterClosed().subscribe(result => { if (result) this.load(); });
  }

  openSquadManager() {
    const ref = this.dialog.open(SquadManagerDialogComponent, { width: '560px' });
    ref.afterClosed().subscribe(() => this.load());
  }

  openPersonal(member: TeamMember) {
    this.router.navigate(['/team', member.id]);
  }
}
