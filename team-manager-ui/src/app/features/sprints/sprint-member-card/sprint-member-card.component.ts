import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MemberSprintCard } from '../../../core/models/dashboard.model';
import { Feature } from '../../../core/models/feature.model';
import { TeamMember } from '../../../core/models/team-member.model';
import { WorkItem } from '../../../core/models/work-item.model';
import { DashboardService } from '../../../core/services/dashboard.service';
import { WorkItemService } from '../../../core/services/work-item.service';
import { LeaveService } from '../../../core/services/leave.service';
import { CommentsComponent } from '../../../shared/comments/comments.component';
import { WorkItemFormComponent } from '../../dashboard/work-item-form/work-item-form.component';
import { LeaveFormDialogComponent } from '../../leave/leave-form-dialog/leave-form-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CarryOverDialogComponent } from '../carry-over-dialog/carry-over-dialog.component';

@Component({
  selector: 'app-sprint-member-card',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatDialogModule, MatTooltipModule, MatMenuModule, CommentsComponent, CarryOverDialogComponent],
  template: `
    <div class="card">

      <!-- Card header -->
      <div class="card-header">
        <div class="member-info">
          <div class="member-name">{{ member.fullName }}</div>
          @if (member.squadNames?.length) {
            <div class="squad-chips">
              @for (name of member.squadNames; track name) {
                <span class="squad-chip">{{ name }}</span>
              }
            </div>
          }
        </div>
        <button class="add-task-btn" mat-icon-button (click)="addWorkItem()" matTooltip="Add task">
          <mat-icon>add</mat-icon>
        </button>
        <button class="more-btn" mat-icon-button [matMenuTriggerFor]="menu" matTooltip="Actions">
          <mat-icon>more_vert</mat-icon>
        </button>
        <mat-menu #menu="matMenu" xPosition="before">
          <button mat-menu-item (click)="addLeave()">
            <mat-icon>event_busy</mat-icon>
            <span>Add Leave</span>
          </button>
          <button mat-menu-item (click)="toggleCapacity()">
            <mat-icon>bolt</mat-icon>
            <span>{{ member.capacity !== null && member.capacity < 100 ? 'Edit Capacity' : 'Set Capacity' }}</span>
          </button>
        </mat-menu>
      </div>

      <!-- Work items -->
      <div class="work-items">
        @if (member.workItems.length === 0) {
          <div class="empty-tasks">No tasks yet</div>
        }
        @for (group of groupedWorkItems(); track group.featureId) {
          @for (wi of group.items; track wi.id) {
            <div class="wi-row">
              <div class="wi-body">
                <div class="wi-feature-row">
                  @if (group.featureTitle) {
                    <span class="wi-feature" [title]="group.featureTitle">{{ group.featureTitle }}</span>
                  }
                </div>
                <div class="wi-title" [title]="wi.title">
                  {{ wi.title }}{{ wi.externalTicketRef ? ' · ' + wi.externalTicketRef : '' }}
                </div>
                <div class="wi-bottom">
                  <div class="wi-badges">
                    <span [class]="wiTypeClass(wi.type)">{{ wi.type }}</span>
                    <span [class]="wiStatusClass(wi.status)">{{ statusLabel(wi.status) }}</span>
                  </div>
                  <div class="wi-actions">
                    <button class="action-btn" matTooltip="Edit" (click)="editWorkItem(wi)">
                      <mat-icon>edit</mat-icon>
                    </button>
                    @if (wi.status !== 'Completed' && wi.status !== 'Released') {
                      <button class="action-btn" matTooltip="Carry over" (click)="carryOver(wi)">
                        <mat-icon>move_down</mat-icon>
                      </button>
                    }
                    <button class="action-btn warn" matTooltip="Delete" (click)="deleteWorkItem(wi.id)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>
              </div>
              @if (wi.status === 'Blocked' && wi.blockedReason) {
                <div class="blocked-reason">⚠ {{ wi.blockedReason }}</div>
              }
              <app-comments entityType="WorkItem" [entityId]="wi.id" [initialCount]="wi.commentCount" />
            </div>
          }
        }
      </div>

      <!-- Leave summary -->
      @if (member.leaveRecords.length > 0) {
        <div class="section leave-section">
          @if (!leaveExpanded) {
            <button class="leave-chip" (click)="leaveExpanded = true" [matTooltip]="leaveTooltip()">
              <mat-icon>event_busy</mat-icon>
              {{ totalLeaveDays() }}d leave
              @if (member.leaveRecords.length > 1) {<span class="leave-count">({{ member.leaveRecords.length }})</span>}
              <mat-icon class="expand-icon">expand_more</mat-icon>
            </button>
          } @else {
            <div class="leave-header">
              <span class="section-label">Leave</span>
              <button class="action-btn small" (click)="leaveExpanded = false">
                <mat-icon>expand_less</mat-icon>
              </button>
            </div>
            @for (l of member.leaveRecords; track l.id) {
              <div class="leave-row">
                <span [class]="leaveBadgeClass(l.type)">{{ l.type }}</span>
                <span class="leave-dates">{{ l.startDate | date:'d MMM' }} – {{ l.endDate | date:'d MMM' }} · {{ l.daysCount }}d</span>
                <button class="action-btn warn" matTooltip="Delete" (click)="deleteLeave(l.id)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            }
          }
        </div>
      }

      <!-- Capacity -->
      @if (editingCapacity || (member.capacity !== null && member.capacity < 100)) {
        <div class="section capacity-row">
          <mat-icon class="capacity-icon">bolt</mat-icon>
          <span class="capacity-label">Capacity</span>
          <input class="capacity-input" type="number" min="10" max="100" step="10"
                 [value]="member.capacity ?? 100"
                 (change)="setCapacity($any($event.target).valueAsNumber)">
          <span class="capacity-pct">%</span>
          @if (member.capacity !== null && member.capacity < 100) {
            <span class="capacity-reduced">reduced</span>
          }
        </div>
      }

    </div>
  `,
  styles: [`
    /* ── Card shell ── */
    .card { border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
            overflow:hidden;display:flex;flex-direction:column;height:100%; }

    /* ── Header ── */
    .card-header { display:flex;align-items:center;gap:6px;padding:12px 14px 10px;border-bottom:1px solid rgba(255,255,255,0.05); }
    .member-info { flex:1;min-width:0; }
    .member-name { font-weight:600;font-size:0.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
    .squad-chips { display:flex;flex-wrap:wrap;gap:4px;margin-top:4px; }
    .squad-chip  { font-size:0.65rem;font-weight:600;padding:2px 7px;border-radius:5px;
                   background:rgba(132,191,64,0.15);color:#84BF40; }
    .add-task-btn { color:rgba(255,255,255,0.6); }
    .add-task-btn:hover { color:rgba(255,255,255,0.95); background:rgba(255,255,255,0.08); }
    .more-btn { color:rgba(255,255,255,0.5); }
    .more-btn:hover { color:rgba(255,255,255,0.95); background:rgba(255,255,255,0.08); }

    /* ── Work items ── */
    .work-items { flex:1;padding:6px 8px 8px; }
    .empty-tasks { font-size:0.8rem;opacity:0.3;font-style:italic;padding:6px 4px; }

    .wi-row { border-radius:6px;padding:2px 0; }
    .wi-row:hover { background:rgba(255,255,255,0.04); }
    .wi-body { padding:4px 6px;min-height:38px; }
    .wi-feature-row { padding-bottom:1px; }
    .wi-feature { font-size:0.65rem;font-weight:600;opacity:0.45;max-width:200px;
                  overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    .wi-title { font-size:0.84rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
                margin:2px 0; }
    .wi-bottom { display:flex;align-items:center;gap:5px; }
    .wi-badges { display:flex;gap:4px;flex-shrink:0; }
    .wi-actions { display:flex;gap:2px;flex-shrink:0;margin-left:auto; }
    .wi-row:hover .wi-actions { opacity:1; }
    .blocked-reason { font-size:0.72rem;color:#ef9a9a;padding:0 6px 4px;
                      white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }

    /* Action buttons */
    .wi-actions { display:flex;gap:2px;flex-shrink:0;opacity:0;transition:opacity 0.12s; }
    .wi-row:hover .wi-actions { opacity:1; }
    .action-btn { display:flex;align-items:center;justify-content:center;
                  width:36px;height:36px;border:none;border-radius:8px;
                  background:transparent;color:rgba(255,255,255,0.55);
                  cursor:pointer;transition:background 0.15s,color 0.15s;flex-shrink:0; }
    .action-btn:hover { background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.95); }
    .action-btn.warn:hover { background:rgba(244,67,54,0.14);color:#ef5350; }
    .action-btn.small { width:28px;height:28px; }
    .action-btn mat-icon { font-size:19px;width:19px;height:19px;line-height:19px; }
    .action-btn.small mat-icon { font-size:16px;width:16px;height:16px;line-height:16px; }
    @media (hover:none) { .wi-actions { opacity:1; } }

    /* ── Type / status badges ── */
    .wi-type  { padding:2px 6px;border-radius:6px;font-size:0.67rem;font-weight:700;text-transform:uppercase;flex-shrink:0; }
    .wi-badge { padding:2px 6px;border-radius:6px;font-size:0.67rem;font-weight:600;text-transform:uppercase;flex-shrink:0; }
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

    /* ── Shared section wrapper ── */
    .section { border-top:1px solid rgba(255,255,255,0.06);padding:8px 12px; }

    /* ── Leave ── */
    .leave-section { padding:7px 12px; }
    .leave-chip { display:inline-flex;align-items:center;gap:5px;
                  background:rgba(255,152,0,0.08);border:1px solid rgba(255,152,0,0.2);
                  border-radius:20px;padding:4px 12px;cursor:pointer;color:inherit;
                  font-size:0.8rem;transition:background 0.15s; }
    .leave-chip:hover { background:rgba(255,152,0,0.16); }
    .leave-chip mat-icon { font-size:15px;width:15px;height:15px;line-height:15px;opacity:0.65; }
    .leave-chip .expand-icon { font-size:14px;width:14px;height:14px;line-height:14px;opacity:0.4; }
    .leave-count { opacity:0.5; }
    .leave-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:4px; }
    .section-label { font-size:0.7rem;opacity:0.4;text-transform:uppercase;letter-spacing:0.06em;font-weight:600; }
    .leave-row { display:flex;align-items:center;gap:8px;font-size:0.82rem;padding:3px 0;min-height:38px; }
    .leave-dates { opacity:0.65;flex:1; }
    .leave-badge { padding:2px 7px;border-radius:8px;font-size:0.68rem;font-weight:600;text-transform:uppercase;flex-shrink:0; }
    .annual              { background:rgba(76,175,80,0.15);color:#4caf50; }
    .sick                { background:rgba(244,67,54,0.15);color:#f44336; }
    .birthday            { background:rgba(156,39,176,0.15);color:#ce93d8; }
    .loyalty             { background:rgba(33,150,243,0.15);color:#64b5f6; }
    .discretionary       { background:rgba(0,188,212,0.15);color:#4dd0e1; }
    .familyresponsibility{ background:rgba(255,152,0,0.15);color:#ff9800; }
    .other               { background:rgba(158,158,158,0.15);color:#9e9e9e; }

    /* ── Capacity ── */
    .capacity-row { display:flex;align-items:center;gap:8px; }
    .capacity-icon { font-size:16px;width:16px;height:16px;line-height:16px;opacity:0.4; }
    .capacity-label { font-size:0.82rem;opacity:0.5;flex-shrink:0; }
    .capacity-input { width:62px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);
                      border-radius:6px;padding:5px 8px;font-size:0.85rem;color:inherit;text-align:center; }
    .capacity-pct { font-size:0.82rem;opacity:0.4; }
    .capacity-reduced { font-size:0.78rem;color:#ffb74d;opacity:0.9; }
  `]
})
export class SprintMemberCardComponent {
  @Input({ required: true }) member!: MemberSprintCard;
  @Input({ required: true }) sprintId!: string;
  @Input() features: Feature[] = [];
  @Input() allMembers: TeamMember[] = [];
  @Output() reload = new EventEmitter<void>();

  private dashSvc = inject(DashboardService);
  private workItemSvc = inject(WorkItemService);
  private leaveSvc = inject(LeaveService);
  private dialog = inject(MatDialog);

  editingCapacity = false;
  leaveExpanded = false;

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
  statusLabel(status: string): string {
    const map: Record<string, string> = {
      Planned: 'Planned', InProgress: 'In Prog', Blocked: 'Blocked',
      Completed: 'Done', ReadyForRelease: 'Ready', Released: 'Released',
    };
    return map[status] ?? status;
  }
  leaveBadgeClass(type: string) { return `leave-badge ${type.toLowerCase().replace(/\s+/g, '')}`; }
  totalLeaveDays() { return this.member.leaveRecords.reduce((s, r) => s + r.daysCount, 0); }
  leaveTooltip() {
    return this.member.leaveRecords
      .map(r => `${r.type}: ${new Date(r.startDate).toLocaleDateString('en-US',{month:'short',day:'numeric'})} – ${new Date(r.endDate).toLocaleDateString('en-US',{month:'short',day:'numeric'})} (${r.daysCount}d)`)
      .join('\n');
  }

  toggleCapacity() { this.editingCapacity = !this.editingCapacity; }

  setCapacity(value: number) {
    const capacity = value >= 100 ? null : Math.max(10, Math.min(100, value));
    this.dashSvc.updateCapacity(this.member.sprintMemberId, capacity).subscribe(() => {
      this.member.capacity = capacity;
      if (capacity === null) this.editingCapacity = false;
    });
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
