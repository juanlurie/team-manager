import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, Subject } from 'rxjs';
import { MemberSprintCard } from '../../../core/models/dashboard.model';
import { Feature } from '../../../core/models/feature.model';
import { TeamMember } from '../../../core/models/team-member.model';
import { WorkItem } from '../../../core/models/work-item.model';
import { DashboardService } from '../../../core/services/dashboard.service';
import { WorkItemService } from '../../../core/services/work-item.service';
import { LeaveService } from '../../../core/services/leave.service';
import { WorkItemFormComponent } from '../../dashboard/work-item-form/work-item-form.component';
import { LeaveFormDialogComponent } from '../../leave/leave-form-dialog/leave-form-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CarryOverDialogComponent } from '../carry-over-dialog/carry-over-dialog.component';

@Component({
  selector: 'app-sprint-member-card',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, MatTooltipModule, CarryOverDialogComponent],
  template: `
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
        <button mat-icon-button style="width:28px;height:28px" matTooltip="Add task" (click)="addWorkItem()">
          <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px">add</mat-icon>
        </button>
      </div>

      <!-- Work items grouped by feature -->
      <div style="padding:0 14px 8px">
        @if (member.workItems.length === 0) {
          <div style="font-size:0.78rem;opacity:0.3;font-style:italic;padding:2px 0 6px">No tasks</div>
        }
        @for (group of groupedWorkItems(); track group.featureId) {
          @if (group.featureTitle) {
            <div style="font-size:0.68rem;font-weight:600;opacity:0.4;text-transform:uppercase;
                        letter-spacing:0.06em;padding:4px 0 2px;margin-top:4px">
              {{ group.featureTitle }}
            </div>
          }
          @for (wi of group.items; track wi.id) {
            <div class="wi-row" style="padding:3px 0">
              <div style="display:flex;align-items:center;gap:6px;font-size:0.8rem">
                <span [class]="wiTypeClass(wi.type)" style="flex-shrink:0">{{ wi.type }}</span>
                <span [class]="wiStatusClass(wi.status)" style="flex-shrink:0">{{ wi.status }}</span>
                <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" [title]="wi.title">
                  {{ wi.title }}{{ wi.externalTicketRef ? ' · ' + wi.externalTicketRef : '' }}
                </span>
                <button mat-icon-button style="width:20px;height:20px;flex-shrink:0" (click)="editWorkItem(wi)">
                  <mat-icon style="font-size:12px;width:12px;height:12px;line-height:12px">edit</mat-icon>
                </button>
                @if (wi.status !== 'Completed' && wi.status !== 'Released') {
                  <button mat-icon-button class="wi-carryover" style="width:20px;height:20px;flex-shrink:0"
                          matTooltip="Carry over to another sprint" (click)="carryOver(wi)">
                    <mat-icon style="font-size:12px;width:12px;height:12px;line-height:12px">move_down</mat-icon>
                  </button>
                }
                <button mat-icon-button class="wi-delete" style="width:20px;height:20px;flex-shrink:0" color="warn" (click)="deleteWorkItem(wi.id)">
                  <mat-icon style="font-size:12px;width:12px;height:12px;line-height:12px">delete</mat-icon>
                </button>
              </div>
              @if (wi.status === 'Blocked' && wi.blockedReason) {
                <div style="font-size:0.7rem;color:#ef9a9a;opacity:0.85;padding:1px 0 2px 4px;
                            white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
                     [title]="wi.blockedReason">
                  ⚠ {{ wi.blockedReason }}
                </div>
              }
            </div>
          }
        }
      </div>

      <!-- Leave -->
      @if (member.leaveRecords.length > 0) {
        <div style="border-top:1px solid rgba(255,255,255,0.06);padding:8px 14px">
          @for (l of member.leaveRecords; track l.id) {
            <div class="leave-row" style="display:flex;align-items:center;gap:6px;font-size:0.78rem;padding:2px 0">
              <span [class]="leaveBadgeClass(l.type)" style="flex-shrink:0">{{ l.type }}</span>
              <span style="opacity:0.65">{{ l.startDate | date:'d MMM' }} – {{ l.endDate | date:'d MMM' }} · {{ l.daysCount }}d</span>
              <span style="flex:1"></span>
              <button mat-icon-button class="leave-delete" style="width:20px;height:20px" color="warn" (click)="deleteLeave(l.id)">
                <mat-icon style="font-size:12px;width:12px;height:12px;line-height:12px">delete</mat-icon>
              </button>
            </div>
          }
        </div>
      }

      <!-- Notes -->
      @if (member.notes || editingNotes) {
        <div style="border-top:1px solid rgba(255,255,255,0.06);padding:8px 14px">
          <textarea
            style="width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);
                   border-radius:6px;padding:6px 8px;font-family:inherit;font-size:0.78rem;
                   resize:vertical;color:inherit;box-sizing:border-box;min-height:54px"
            rows="2"
            placeholder="Notes..."
            [value]="member.notes ?? ''"
            (input)="notesChange$.next($any($event.target).value)"
            (blur)="onNoteBlur()">
          </textarea>
        </div>
      }

      <!-- Capacity -->
      @if (editingCapacity || (member.capacity !== null && member.capacity < 100)) {
        <div style="border-top:1px solid rgba(255,255,255,0.06);padding:8px 14px;display:flex;align-items:center;gap:8px">
          <mat-icon style="font-size:14px;width:14px;height:14px;line-height:14px;opacity:0.4">bolt</mat-icon>
          <span style="font-size:0.72rem;opacity:0.5;flex-shrink:0">Capacity</span>
          <input type="number" min="10" max="100" step="10"
                 style="width:56px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);
                        border-radius:6px;padding:3px 6px;font-size:0.8rem;color:inherit;text-align:center"
                 [value]="member.capacity ?? 100"
                 (change)="setCapacity($any($event.target).valueAsNumber)">
          <span style="font-size:0.72rem;opacity:0.4">%</span>
          @if (member.capacity !== null && member.capacity < 100) {
            <span style="font-size:0.7rem;color:#ffb74d;opacity:0.8">reduced capacity</span>
          }
        </div>
      }

      <!-- Card footer -->
      <div style="display:flex;justify-content:flex-end;align-items:center;padding:4px 10px 6px;gap:4px;border-top:1px solid rgba(255,255,255,0.04)">
        <button mat-button style="height:26px;min-width:0;padding:0 6px;font-size:0.75rem;opacity:0.55;line-height:26px" (click)="toggleNote()">
          <mat-icon style="font-size:14px;width:14px;height:14px;line-height:14px;margin-right:3px">note_add</mat-icon>Note
        </button>
        <button mat-icon-button style="width:26px;height:26px" matTooltip="Add leave" (click)="addLeave()">
          <mat-icon style="font-size:14px;width:14px;height:14px;line-height:14px;opacity:0.45">event_busy</mat-icon>
        </button>
        <button mat-icon-button style="width:26px;height:26px" matTooltip="Set capacity" (click)="toggleCapacity()">
          <mat-icon style="font-size:14px;width:14px;height:14px;line-height:14px"
                    [style.opacity]="member.capacity !== null && member.capacity < 100 ? 1 : 0.45"
                    [style.color]="member.capacity !== null && member.capacity < 100 ? '#ffb74d' : 'inherit'">bolt</mat-icon>
        </button>
      </div>

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
    .wi-planned         { background:rgba(158,158,158,0.12);color:#9e9e9e; }
    .wi-inprogress      { background:rgba(33,150,243,0.12);color:#64b5f6; }
    .wi-blocked         { background:rgba(244,67,54,0.12);color:#f44336; }
    .wi-completed       { background:rgba(76,175,80,0.12);color:#4caf50; }
    .wi-readyforrelease { background:rgba(255,193,7,0.15);color:#ffd54f; }
    .wi-released        { background:rgba(255,255,255,0.1);color:#e0e0e0;border:1px solid rgba(255,255,255,0.2); }
    .leave-badge { padding:1px 6px;border-radius:8px;font-size:0.68rem;font-weight:600;text-transform:uppercase; }
    .annual              { background:rgba(76,175,80,0.15);color:#4caf50; }
    .sick                { background:rgba(244,67,54,0.15);color:#f44336; }
    .birthday            { background:rgba(156,39,176,0.15);color:#ce93d8; }
    .loyalty             { background:rgba(33,150,243,0.15);color:#64b5f6; }
    .discretionary       { background:rgba(0,188,212,0.15);color:#4dd0e1; }
    .familyresponsibility{ background:rgba(255,152,0,0.15);color:#ff9800; }
    .other               { background:rgba(158,158,158,0.15);color:#9e9e9e; }
    .wi-row .wi-delete, .wi-row .wi-carryover { opacity: 0; transition: opacity 0.15s; }
    .wi-row:hover .wi-delete, .wi-row:hover .wi-carryover { opacity: 1; }
    .leave-row .leave-delete { opacity: 0; transition: opacity 0.15s; }
    .leave-row:hover .leave-delete { opacity: 1; }
    @media (hover: none) {
      .wi-row .wi-delete, .wi-row .wi-carryover, .leave-row .leave-delete { opacity: 1; }
    }
  `]
})
export class SprintMemberCardComponent implements OnInit {
  @Input({ required: true }) member!: MemberSprintCard;
  @Input({ required: true }) sprintId!: string;
  @Input() features: Feature[] = [];
  @Input() allMembers: TeamMember[] = [];
  @Output() reload = new EventEmitter<void>();

  private dashSvc = inject(DashboardService);
  private workItemSvc = inject(WorkItemService);
  private leaveSvc = inject(LeaveService);
  private dialog = inject(MatDialog);

  editingNotes = false;
  editingCapacity = false;
  notesChange$ = new Subject<string>();

  ngOnInit() {
    this.notesChange$.pipe(debounceTime(800)).subscribe(notes =>
      this.dashSvc.updateNotes(this.member.sprintMemberId, notes).subscribe()
    );
  }

  groupedWorkItems() {
    const groups = new Map<string | null, { featureId: string | null; featureTitle: string | null; items: WorkItem[] }>();
    for (const wi of this.member.workItems) {
      const key = wi.featureId ?? null;
      if (!groups.has(key)) groups.set(key, { featureId: key, featureTitle: wi.featureTitle, items: [] });
      groups.get(key)!.items.push(wi);
    }
    return [...groups.values()].sort((a, b) => {
      if (!a.featureId) return -1;
      if (!b.featureId) return 1;
      return (a.featureTitle ?? '').localeCompare(b.featureTitle ?? '');
    });
  }

  initials(name: string) {
    return name.split(' ').filter(p => p).slice(0, 2).map(p => p[0].toUpperCase()).join('');
  }

  wiTypeClass(type: string) { return `wi-type type-${type.toLowerCase()}`; }
  wiStatusClass(status: string) { return `wi-badge wi-${status.toLowerCase()}`; }
  leaveBadgeClass(type: string) { return `leave-badge ${type.toLowerCase().replace(/\s+/g, '')}`; }

  toggleCapacity() { this.editingCapacity = !this.editingCapacity; }

  setCapacity(value: number) {
    const capacity = value >= 100 ? null : Math.max(10, Math.min(100, value));
    this.dashSvc.updateCapacity(this.member.sprintMemberId, capacity).subscribe(() => {
      this.member.capacity = capacity;
      if (capacity === null) this.editingCapacity = false;
    });
  }

  toggleNote() { this.editingNotes = !this.editingNotes; }

  onNoteBlur() {
    if (!this.member.notes) this.editingNotes = false;
  }

  addWorkItem() {
    const ref = this.dialog.open(WorkItemFormComponent, {
      width: '480px',
      data: { sprintId: this.sprintId, sprintMemberId: this.member.sprintMemberId, memberCrafts: this.member.crafts, features: this.features }
    });
    ref.afterClosed().subscribe(r => { if (r) this.reload.emit(); });
  }

  editWorkItem(wi: any) {
    const ref = this.dialog.open(WorkItemFormComponent, {
      width: '480px',
      data: { sprintId: this.sprintId, sprintMemberId: this.member.sprintMemberId, memberCrafts: this.member.crafts, workItem: wi, features: this.features }
    });
    ref.afterClosed().subscribe(r => { if (r) this.reload.emit(); });
  }

  carryOver(wi: WorkItem) {
    const ref = this.dialog.open(CarryOverDialogComponent, {
      width: '400px',
      data: { workItem: wi, currentSprintId: this.sprintId }
    });
    ref.afterClosed().subscribe(r => { if (r) this.reload.emit(); });
  }

  deleteWorkItem(id: string) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete work item?', danger: true }
    }).afterClosed().subscribe(ok => {
      if (ok) this.workItemSvc.delete(id).subscribe(() => this.reload.emit());
    });
  }

  addLeave() {
    const ref = this.dialog.open(LeaveFormDialogComponent, {
      width: '480px',
      data: { members: this.allMembers, preselectedMemberId: this.member.teamMemberId }
    });
    ref.afterClosed().subscribe(r => { if (r) this.reload.emit(); });
  }

  deleteLeave(id: string) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete leave record?', danger: true }
    }).afterClosed().subscribe(ok => {
      if (ok) this.leaveSvc.delete(id).subscribe(() => this.reload.emit());
    });
  }
}
