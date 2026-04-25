import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TeamMember } from '../../../core/models/team-member.model';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { TeamMemberFormComponent } from '../team-member-form/team-member-form.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

const CRAFT_LABELS: Record<string, string> = {
  DevBE: 'Dev BE', DevFE: 'Dev FE', DevIOS: 'iOS', DevAndroid: 'Android',
  Dev: 'Developer', Analysis: 'Analyst', Design: 'Designer', QA: 'QA',
};

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatChipsModule, MatTooltipModule, MatSelectModule, MatFormFieldModule, FormsModule,
    MatProgressSpinnerModule],
  template: `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <h2 style="margin:0;font-size:1.2rem">Team Members</h2>
      <span style="flex:1"></span>
      <mat-form-field appearance="outline" subscriptSizing="dynamic" style="width:150px">
        <mat-label>Role</mat-label>
        <mat-select [(ngModel)]="roleFilter" (ngModelChange)="load()">
          <mat-option value="">All roles</mat-option>
          <mat-option value="Member">Member</mat-option>
          <mat-option value="TeamLead">Team Lead</mat-option>
          <mat-option value="TechLead">Tech Lead</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic" style="width:170px">
        <mat-label>Craft</mat-label>
        <mat-select [(ngModel)]="craftFilter" (ngModelChange)="applyFilters()">
          <mat-option value="">All crafts</mat-option>
          <mat-option value="DevBE">Dev — Backend</mat-option>
          <mat-option value="DevFE">Dev — Frontend</mat-option>
          <mat-option value="DevIOS">Dev — Mobile iOS</mat-option>
          <mat-option value="DevAndroid">Dev — Mobile Android</mat-option>
          <mat-option value="Analysis">Analyst</mat-option>
          <mat-option value="Design">Designer</mat-option>
          <mat-option value="QA">QA</mat-option>
        </mat-select>
      </mat-form-field>
      <button mat-raised-button color="primary" (click)="openForm()">
        <mat-icon>add</mat-icon> Add
      </button>
    </div>

    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    } @else {

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:10px">
      @for (m of members; track m.id) {
        <div (click)="openPersonal(m)" style="border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);padding:12px 14px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:background 0.15s"
             onmouseenter="this.style.background='rgba(255,255,255,0.08)'"
             onmouseleave="this.style.background='rgba(255,255,255,0.04)'">
          <!-- Avatar -->
          <div style="width:36px;height:36px;border-radius:50%;background:rgba(100,181,246,0.15);
                      color:#64b5f6;font-size:0.75rem;font-weight:700;display:flex;align-items:center;
                      justify-content:center;flex-shrink:0;border:1px solid rgba(100,181,246,0.2)">
            {{ m.firstName.charAt(0) }}{{ m.lastName.charAt(0) }}
          </div>

          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:0.9rem">{{ m.firstName }} {{ m.lastName }}</div>
            <div style="font-size:0.75rem;opacity:0.45;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px">{{ m.email }}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:8px;flex-wrap:wrap">
              <span [class]="roleClass(m.role)" style="font-size:0.68rem;font-weight:700;text-transform:uppercase;padding:2px 7px;border-radius:6px">
                {{ roleLabel(m.role) }}
              </span>
              @for (craft of m.crafts; track craft) {
                <span style="font-size:0.68rem;font-weight:600;padding:2px 7px;border-radius:6px;background:rgba(76,175,80,0.12);color:#81c784">
                  {{ craftLabel(craft) }}
                </span>
              }
              @if (m.teamLeadName) {
                <span style="font-size:0.7rem;opacity:0.4">· {{ m.teamLeadName }}</span>
              }
            </div>
            @if (m.achievements?.length) {
              <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:8px">
                @for (b of m.achievements.slice(0,6); track b.id) {
                  <span [matTooltip]="b.name" style="font-size:1.1rem;line-height:1;cursor:default">{{ b.icon }}</span>
                }
                @if (m.achievements.length > 6) {
                  <span style="font-size:0.65rem;opacity:0.4;align-self:center">+{{ m.achievements.length - 6 }}</span>
                }
              </div>
            }
          </div>
          <div style="flex-shrink:0;display:flex;flex-direction:column;gap:2px;align-self:center" (click)="$event.stopPropagation()">
            <button mat-icon-button (click)="openForm(m)" matTooltip="Edit member"
                    style="width:28px;height:28px">
              <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px;opacity:0.45">edit</mat-icon>
            </button>
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
  `]
})
export class TeamListComponent implements OnInit {
  private svc = inject(TeamMemberService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  members: TeamMember[] = [];
  loading = signal(true);
  allMembers: TeamMember[] = [];
  roleFilter = '';
  craftFilter = '';

  roleClass(role: string) { return `role-${role.toLowerCase()}`; }
  roleLabel(role: string) { return role === 'TeamLead' ? 'Team Lead' : role === 'TechLead' ? 'Tech Lead' : 'Member'; }
  craftLabel(craft: string) { return CRAFT_LABELS[craft] ?? craft; }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAll({ role: this.roleFilter || undefined, isActive: true })
      .subscribe(m => { this.allMembers = m; this.applyFilters(); this.loading.set(false); });
  }

  applyFilters() {
    this.members = this.craftFilter
      ? this.allMembers.filter(m => m.crafts.includes(this.craftFilter))
      : this.allMembers;
  }

  openForm(member?: TeamMember) {
    const ref = this.dialog.open(TeamMemberFormComponent, {
      width: '480px',
      data: { member, allMembers: this.allMembers }
    });
    ref.afterClosed().subscribe(result => { if (result) this.load(); });
  }

  openPersonal(member: TeamMember) {
    this.router.navigate(['/team', member.id]);
  }
}
