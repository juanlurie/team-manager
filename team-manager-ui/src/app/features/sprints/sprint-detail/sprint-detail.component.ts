import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { SprintDashboard, MemberSprintCard } from '../../../core/models/dashboard.model';
import { Feature } from '../../../core/models/feature.model';
import { TeamMember } from '../../../core/models/team-member.model';
import { DashboardService } from '../../../core/services/dashboard.service';
import { SprintService } from '../../../core/services/sprint.service';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { WorkItemFormComponent } from '../../dashboard/work-item-form/work-item-form.component';
import { LeaveFormDialogComponent } from '../../leave/leave-form-dialog/leave-form-dialog.component';
import { FeatureFormDialogComponent } from '../feature-form-dialog/feature-form-dialog.component';
import { RapidFireDialogComponent } from '../rapid-fire-dialog/rapid-fire-dialog.component';
import { WorkItemService } from '../../../core/services/work-item.service';
import { LeaveService } from '../../../core/services/leave.service';
import { FeatureService } from '../../../core/services/feature.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-sprint-detail',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule,
    MatDialogModule, MatChipsModule, MatSelectModule, MatFormFieldModule, FormsModule, MatTooltipModule],
  template: `
    <!-- Header -->
    <div style="margin-bottom:20px">
      <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:0">
          <h2 style="margin:0;font-size:1.2rem">{{ dashboard?.sprint?.name }}</h2>
          <div style="font-size:0.8rem;opacity:0.5;margin-top:2px">
            {{ dashboard?.sprint?.startDate | date:'d MMM' }} – {{ dashboard?.sprint?.endDate | date:'d MMM yyyy' }}
          </div>
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
          <button mat-stroked-button [matTooltip]="'Initialize members'" (click)="initializeMembers()">
            <mat-icon>group_add</mat-icon>
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


    <!-- Member cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr));gap:12px">
      @for (member of dashboard?.members; track member.sprintMemberId) {
        <div style="border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);overflow:hidden">

          <!-- Card header -->
          <div style="display:flex;align-items:center;gap:8px;padding:12px 14px 10px">
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                {{ member.fullName }}
              </div>
            </div>
            @if (member.teamLeadName) {
              <div [matTooltip]="member.teamLeadName"
                   style="width:26px;height:26px;border-radius:50%;background:rgba(100,181,246,0.15);
                          color:#64b5f6;font-size:0.6rem;font-weight:700;display:flex;align-items:center;
                          justify-content:center;flex-shrink:0;cursor:default;border:1px solid rgba(100,181,246,0.2)">
                {{ initials(member.teamLeadName) }}
              </div>
            }
            <button mat-icon-button style="width:28px;height:28px" matTooltip="Add task" (click)="addWorkItem(member)">
              <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px">add</mat-icon>
            </button>
          </div>

          <!-- Work items grouped by feature -->
          <div style="padding:0 14px 8px">
            @if (member.workItems.length === 0) {
              <div style="font-size:0.78rem;opacity:0.3;font-style:italic;padding:2px 0 6px">No tasks</div>
            }

            @for (group of groupedWorkItems(member); track group.featureId) {
              @if (group.featureTitle) {
                <div style="font-size:0.68rem;font-weight:600;opacity:0.4;text-transform:uppercase;
                            letter-spacing:0.06em;padding:4px 0 2px;margin-top:4px">
                  {{ group.featureTitle }}
                </div>
              }
              @for (wi of group.items; track wi.id) {
                <div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:0.8rem">
                  <span [class]="wiTypeClass(wi.type)" style="flex-shrink:0">{{ wi.type }}</span>
                  <span [class]="wiStatusClass(wi.status)" style="flex-shrink:0">{{ wi.status }}</span>
                  <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" [title]="wi.title">
                    {{ wi.title }}{{ wi.externalTicketRef ? ' · ' + wi.externalTicketRef : '' }}
                  </span>
                  <button mat-icon-button style="width:20px;height:20px;flex-shrink:0" (click)="editWorkItem(member, wi)">
                    <mat-icon style="font-size:12px;width:12px;height:12px;line-height:12px">edit</mat-icon>
                  </button>
                  <button mat-icon-button style="width:20px;height:20px;flex-shrink:0" color="warn" (click)="deleteWorkItem(wi.id)">
                    <mat-icon style="font-size:12px;width:12px;height:12px;line-height:12px">delete</mat-icon>
                  </button>
                </div>
              }
            }
          </div>

          <!-- Leave (only if present) -->
          @if (member.leaveRecords.length > 0) {
            <div style="border-top:1px solid rgba(255,255,255,0.06);padding:8px 14px">
              @for (l of member.leaveRecords; track l.id) {
                <div style="display:flex;align-items:center;gap:6px;font-size:0.78rem;padding:2px 0">
                  <span [class]="leaveBadgeClass(l.type)" style="flex-shrink:0">{{ l.type }}</span>
                  <span style="opacity:0.65">{{ l.startDate | date:'d MMM' }} – {{ l.endDate | date:'d MMM' }} · {{ l.daysCount }}d</span>
                  <span style="flex:1"></span>
                  <button mat-icon-button style="width:20px;height:20px" color="warn" (click)="deleteLeave(l.id)">
                    <mat-icon style="font-size:12px;width:12px;height:12px;line-height:12px">delete</mat-icon>
                  </button>
                </div>
              }
            </div>
          }

          <!-- Notes (only if present or editing) -->
          @if (member.notes || editingNotes.has(member.sprintMemberId)) {
            <div style="border-top:1px solid rgba(255,255,255,0.06);padding:8px 14px">
              <textarea
                style="width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
                       border-radius:6px;padding:6px 8px;font-family:inherit;font-size:0.78rem;
                       resize:vertical;color:inherit;box-sizing:border-box;min-height:54px"
                rows="2"
                placeholder="Notes..."
                [value]="member.notes ?? ''"
                (input)="notesChange$.next({ sprintMemberId: member.sprintMemberId, notes: $any($event.target).value })"
                (blur)="onNoteBlur(member)">
              </textarea>
            </div>
          }

          <!-- Card footer -->
          <div style="display:flex;justify-content:flex-end;padding:4px 10px 6px;gap:2px;border-top:1px solid rgba(255,255,255,0.04)">
            <button mat-icon-button style="width:26px;height:26px" matTooltip="Add leave" (click)="addLeave(member)">
              <mat-icon style="font-size:14px;width:14px;height:14px;line-height:14px;opacity:0.45">event_busy</mat-icon>
            </button>
            <button mat-icon-button style="width:26px;height:26px" matTooltip="Add note" (click)="toggleNote(member)">
              <mat-icon style="font-size:14px;width:14px;height:14px;line-height:14px;opacity:0.45">note_add</mat-icon>
            </button>
          </div>

        </div>
      }
    </div>
  `,
  styles: [`
    .wi-type  { padding:1px 5px;border-radius:6px;font-size:0.65rem;font-weight:700;text-transform:uppercase; }
    .wi-badge { padding:1px 5px;border-radius:6px;font-size:0.65rem;font-weight:600;text-transform:uppercase; }
    .type-analysis  { background:rgba(156,39,176,0.15);color:#ce93d8; }
    .type-design    { background:rgba(0,188,212,0.15);color:#4dd0e1; }
    .type-dev       { background:rgba(33,150,243,0.15);color:#64b5f6; }
    .type-qa        { background:rgba(255,152,0,0.15);color:#ff9800; }
    .type-bug       { background:rgba(244,67,54,0.15);color:#f44336; }
    .type-task      { background:rgba(158,158,158,0.15);color:#9e9e9e; }
    .type-release   { background:rgba(76,175,80,0.15);color:#4caf50; }
    .wi-planned     { background:rgba(158,158,158,0.12);color:#9e9e9e; }
    .wi-inprogress  { background:rgba(33,150,243,0.12);color:#64b5f6; }
    .wi-completed   { background:rgba(76,175,80,0.12);color:#4caf50; }
    .wi-readyforrelease { background:rgba(255,193,7,0.15);color:#ffd54f; }
    .wi-released        { background:rgba(255,255,255,0.1);color:#e0e0e0;border:1px solid rgba(255,255,255,0.2); }
    .fs-planned         { padding:1px 6px;border-radius:8px;font-size:0.68rem;font-weight:600;background:rgba(158,158,158,0.15);color:#9e9e9e; }
    .fs-inprogress      { padding:1px 6px;border-radius:8px;font-size:0.68rem;font-weight:600;background:rgba(33,150,243,0.15);color:#64b5f6; }
    .fs-completed       { padding:1px 6px;border-radius:8px;font-size:0.68rem;font-weight:600;background:rgba(76,175,80,0.15);color:#4caf50; }
    .fs-readyforrelease { padding:1px 6px;border-radius:8px;font-size:0.68rem;font-weight:600;background:rgba(255,193,7,0.15);color:#ffd54f; }
    .fs-released        { padding:1px 6px;border-radius:8px;font-size:0.68rem;font-weight:600;background:rgba(255,255,255,0.1);color:#e0e0e0;border:1px solid rgba(255,255,255,0.2); }
    .leave-badge { padding:1px 6px;border-radius:8px;font-size:0.68rem;font-weight:600;text-transform:uppercase; }
    .annual              { background:rgba(76,175,80,0.15);color:#4caf50; }
    .sick                { background:rgba(244,67,54,0.15);color:#f44336; }
    .birthday            { background:rgba(156,39,176,0.15);color:#ce93d8; }
    .loyalty             { background:rgba(33,150,243,0.15);color:#64b5f6; }
    .discretionary       { background:rgba(0,188,212,0.15);color:#4dd0e1; }
    .familyresponsibility{ background:rgba(255,152,0,0.15);color:#ff9800; }
    .other               { background:rgba(158,158,158,0.15);color:#9e9e9e; }
  `]
})
export class SprintDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private dashSvc = inject(DashboardService);
  private sprintSvc = inject(SprintService);
  private memberSvc = inject(TeamMemberService);
  private workItemSvc = inject(WorkItemService);
  private leaveSvc = inject(LeaveService);
  private featureSvc = inject(FeatureService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  dashboard: SprintDashboard | null = null;
  teamLeads: TeamMember[] = [];
  allMembers: TeamMember[] = [];
  selectedTeamLeadId = '';
  editingNotes = new Set<string>();
  sprintId = '';

  notesChange$ = new Subject<{ sprintMemberId: string; notes: string }>();

  ngOnInit() {
    this.sprintId = this.route.snapshot.paramMap.get('id')!;
    this.selectedTeamLeadId = this.route.snapshot.queryParamMap.get('teamLeadId') ?? '';
    this.load();
    this.memberSvc.getAll({ role: 'TeamLead' }).subscribe(m => this.teamLeads = m);
    this.memberSvc.getAll({ isActive: true }).subscribe(m => this.allMembers = m);
    this.notesChange$.pipe(
      debounceTime(800),
      distinctUntilChanged((a, b) => a.sprintMemberId === b.sprintMemberId && a.notes === b.notes)
    ).subscribe(({ sprintMemberId, notes }) =>
      this.dashSvc.updateNotes(sprintMemberId, notes).subscribe()
    );
  }

  load() {
    this.dashSvc.getSprintDashboard(this.sprintId, this.selectedTeamLeadId || undefined)
      .subscribe(d => this.dashboard = d);
  }

  initializeMembers() {
    this.sprintSvc.initializeMembers(this.sprintId).subscribe(r => {
      this.snack.open(`${r.addedCount} members added`, 'OK', { duration: 3000 });
      this.load();
    });
  }

  groupedWorkItems(member: MemberSprintCard) {
    const groups = new Map<string | null, { featureId: string | null; featureTitle: string | null; items: typeof member.workItems }>();
    for (const wi of member.workItems) {
      const key = wi.featureId ?? null;
      if (!groups.has(key)) groups.set(key, { featureId: key, featureTitle: wi.featureTitle, items: [] });
      groups.get(key)!.items.push(wi);
    }
    // unlinked tasks first, then by feature title
    return [...groups.values()].sort((a, b) => {
      if (!a.featureId) return -1;
      if (!b.featureId) return 1;
      return (a.featureTitle ?? '').localeCompare(b.featureTitle ?? '');
    });
  }

  initials(name: string) {
    return name.split(' ').filter(p => p).slice(0, 2).map(p => p[0].toUpperCase()).join('');
  }

  wiTypeClass(type: string)   { return `wi-type type-${type.toLowerCase()}`; }
  wiStatusClass(status: string) { return `wi-badge wi-${status.toLowerCase()}`; }
  featureStatusClass(status: string) { return `fs-${status.toLowerCase()}`; }
  leaveBadgeClass(type: string) { return `leave-badge ${type.toLowerCase().replace(/\s+/g, '')}`; }

  toggleNote(member: MemberSprintCard) {
    if (this.editingNotes.has(member.sprintMemberId)) {
      this.editingNotes.delete(member.sprintMemberId);
    } else {
      this.editingNotes.add(member.sprintMemberId);
    }
  }

  onNoteBlur(member: MemberSprintCard) {
    if (!member.notes) this.editingNotes.delete(member.sprintMemberId);
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

  addWorkItem(member: MemberSprintCard) {
    const ref = this.dialog.open(WorkItemFormComponent, {
      width: '480px',
      data: { sprintId: this.sprintId, sprintMemberId: member.sprintMemberId, memberCrafts: member.crafts, features: this.dashboard?.features ?? [] }
    });
    ref.afterClosed().subscribe(r => { if (r) this.load(); });
  }

  editWorkItem(member: MemberSprintCard, wi: any) {
    const ref = this.dialog.open(WorkItemFormComponent, {
      width: '480px',
      data: { sprintId: this.sprintId, sprintMemberId: member.sprintMemberId, memberCrafts: member.crafts, workItem: wi, features: this.dashboard?.features ?? [] }
    });
    ref.afterClosed().subscribe(r => { if (r) this.load(); });
  }

  deleteWorkItem(id: string) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete work item?', danger: true }
    }).afterClosed().subscribe(ok => {
      if (ok) this.workItemSvc.delete(id).subscribe(() => this.load());
    });
  }

  addLeave(member: MemberSprintCard) {
    const ref = this.dialog.open(LeaveFormDialogComponent, {
      width: '480px',
      data: { members: this.allMembers, preselectedMemberId: member.teamMemberId }
    });
    ref.afterClosed().subscribe(r => { if (r) this.load(); });
  }

  deleteLeave(id: string) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete leave record?', danger: true }
    }).afterClosed().subscribe(ok => {
      if (ok) this.leaveSvc.delete(id).subscribe(() => this.load());
    });
  }
}
