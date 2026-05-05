import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MemberSprintCard } from '../../../core/models/dashboard.model';
import { Feature } from '../../../core/models/feature.model';
import { TeamMember } from '../../../core/models/team-member.model';
import { WorkItem } from '../../../core/models/work-item.model';
import { Comment } from '../../../core/models/comment.model';
import { DashboardService } from '../../../core/services/dashboard.service';
import { WorkItemService } from '../../../core/services/work-item.service';
import { LeaveService } from '../../../core/services/leave.service';
import { CommentService } from '../../../core/services/comment.service';
import { WorkItemFormComponent } from '../../dashboard/work-item-form/work-item-form.component';
import { LeaveFormDialogComponent } from '../../leave/leave-form-dialog/leave-form-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CarryOverDialogComponent } from '../carry-over-dialog/carry-over-dialog.component';

@Component({
  selector: 'app-sprint-member-card',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatDialogModule, MatTooltipModule, CarryOverDialogComponent],
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
        @if (member.teamLeadName) {
          <div class="lead-avatar" [matTooltip]="member.teamLeadName">{{ initials(member.teamLeadName) }}</div>
        }
        <button class="add-task-btn" (click)="addWorkItem()">
          <mat-icon>add</mat-icon> Add task
        </button>
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
                    <button class="action-btn" [class.comment-active]="commentsOpen[wi.id]"
                            [matTooltip]="commentsOpen[wi.id] ? 'Hide comments' : 'Comments'"
                            (click)="toggleComments(wi)" style="position:relative">
                      <mat-icon>{{ commentsOpen[wi.id] ? 'chat_bubble' : 'chat_bubble_outline' }}</mat-icon>
                      @if (commentCount(wi) > 0) {
                        <span class="comment-badge">{{ commentCount(wi) }}</span>
                      }
                    </button>
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
              @if (commentsOpen[wi.id]) {
                <div class="comment-section">
                  @if (commentsLoading[wi.id]) {
                    <div class="comment-loading">···</div>
                  } @else {
                    @for (c of commentsData[wi.id] ?? []; track c.id) {
                      <div class="comment-row">
                        <span class="comment-date">{{ c.createdAt | date:'d MMM HH:mm' }}</span>
                        <span class="comment-text">{{ c.text }}</span>
                        <button class="action-btn small warn" (click)="deleteComment(wi.id, c.id)">
                          <mat-icon>close</mat-icon>
                        </button>
                      </div>
                    }
                    <div class="comment-add">
                      <input class="comment-input"
                             [ngModel]="commentDraftMap[wi.id] ?? ''"
                             (ngModelChange)="commentDraftMap[wi.id] = $event"
                             placeholder="Add comment…"
                             (keydown.enter)="addComment(wi)">
                      <button class="action-btn small"
                              [disabled]="!(commentDraftMap[wi.id] ?? '').trim() || commentSaving[wi.id]"
                              (click)="addComment(wi)">
                        <mat-icon>send</mat-icon>
                      </button>
                    </div>
                  }
                </div>
              }
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

      <!-- Footer -->
      <div class="card-footer">
        <button class="footer-btn" (click)="addLeave()">
          <mat-icon>event_busy</mat-icon> Leave
        </button>
        <button class="footer-btn" [class.capacity-active]="member.capacity !== null && member.capacity < 100"
                (click)="toggleCapacity()">
          <mat-icon>bolt</mat-icon> Capacity
        </button>
      </div>

    </div>
  `,
  styles: [`
    /* ── Card shell ── */
    .card { border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
            overflow:hidden;display:flex;flex-direction:column;height:100%; }

    /* ── Header ── */
    .card-header { display:flex;align-items:center;gap:10px;padding:12px 14px 10px;border-bottom:1px solid rgba(255,255,255,0.05); }
    .member-info { flex:1;min-width:0; }
    .member-name { font-weight:600;font-size:0.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
    .squad-chips { display:flex;flex-wrap:wrap;gap:4px;margin-top:4px; }
    .squad-chip  { font-size:0.65rem;font-weight:600;padding:2px 7px;border-radius:5px;
                   background:rgba(132,191,64,0.15);color:#84BF40; }
    .lead-avatar { width:28px;height:28px;border-radius:50%;background:rgba(100,181,246,0.15);
                   color:#64b5f6;font-size:0.62rem;font-weight:700;display:flex;align-items:center;
                   justify-content:center;flex-shrink:0;cursor:default;border:1px solid rgba(100,181,246,0.2); }
    .add-task-btn { display:flex;align-items:center;gap:4px;height:34px;padding:0 12px;
                    border:1px solid rgba(255,255,255,0.18);border-radius:8px;background:transparent;
                    color:rgba(255,255,255,0.75);font-size:0.82rem;font-weight:500;cursor:pointer;
                    flex-shrink:0;transition:background 0.15s,border-color 0.15s; }
    .add-task-btn:hover { background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.3); }
    .add-task-btn mat-icon { font-size:18px;width:18px;height:18px;line-height:18px; }

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

    /* Action buttons — plain <button>, no Material overrides */
    .wi-actions { display:flex;gap:2px;flex-shrink:0;opacity:0;transition:opacity 0.12s; }
    .wi-row:hover .wi-actions { opacity:1; }
    .action-btn { display:flex;align-items:center;justify-content:center;
                  width:36px;height:36px;border:none;border-radius:8px;
                  background:transparent;color:rgba(255,255,255,0.55);
                  cursor:pointer;transition:background 0.15s,color 0.15s;flex-shrink:0; }
    .action-btn:hover { background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.95); }
    .action-btn.warn:hover { background:rgba(244,67,54,0.14);color:#ef5350; }
    .action-btn.small { width:28px;height:28px; }
    .action-btn.comment-active { color:#64b5f6; }
    .comment-badge { position:absolute;top:3px;right:3px;min-width:14px;height:14px;border-radius:7px;
                     background:#64b5f6;color:#0f1923;font-size:0.6rem;font-weight:700;
                     display:flex;align-items:center;justify-content:center;padding:0 3px;
                     pointer-events:none;line-height:1; }
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

    /* ── Comments ── */
    .comment-section { margin:0 6px 4px;padding:4px 6px 6px;border-top:1px solid rgba(255,255,255,0.06);
                       background:rgba(255,255,255,0.02);border-radius:0 0 6px 6px; }
    .comment-loading { font-size:0.72rem;opacity:0.3;padding:4px 0;letter-spacing:0.1em; }
    .comment-row { display:flex;align-items:flex-start;gap:8px;padding:3px 0;min-height:28px; }
    .comment-date { font-size:0.68rem;color:rgba(255,255,255,0.3);white-space:nowrap;flex-shrink:0;padding-top:2px; }
    .comment-text { flex:1;font-size:0.78rem;line-height:1.4;color:rgba(255,255,255,0.75);word-break:break-word; }
    .comment-add { display:flex;align-items:center;gap:4px;margin-top:6px; }
    .comment-input { flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
                     border-radius:6px;padding:5px 8px;font-size:0.78rem;color:inherit;outline:none;
                     font-family:inherit; }
    .comment-input:focus { border-color:rgba(255,255,255,0.25); }

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

    /* ── Footer ── */
    .card-footer { display:flex;align-items:center;padding:4px 6px;gap:2px;border-top:1px solid rgba(255,255,255,0.05); }
    .footer-btn { flex:1;display:flex;align-items:center;justify-content:center;gap:6px;
                  height:38px;border:none;border-radius:8px;background:transparent;
                  color:rgba(255,255,255,0.5);font-size:0.82rem;font-weight:500;cursor:pointer;
                  transition:background 0.15s,color 0.15s; }
    .footer-btn:hover { background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.85); }
    .footer-btn.capacity-active { color:#ffb74d; }
    .footer-btn mat-icon { font-size:18px;width:18px;height:18px;line-height:18px; }
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
  private commentSvc = inject(CommentService);
  private dialog = inject(MatDialog);

  editingCapacity = false;
  leaveExpanded = false;

  commentsOpen: Record<string, boolean> = {};
  commentsLoading: Record<string, boolean> = {};
  commentsData: Record<string, Comment[]> = {};
  commentDraftMap: Record<string, string> = {};
  commentSaving: Record<string, boolean> = {};

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

  commentCount(wi: WorkItem): number {
    return this.commentsData[wi.id]?.length ?? wi.commentCount ?? 0;
  }

  toggleComments(wi: WorkItem) {
    const id = wi.id;
    if (!this.commentsOpen[id]) {
      this.commentsOpen[id] = true;
      if (!this.commentsData[id]) {
        this.commentsLoading[id] = true;
        this.commentSvc.getComments('WorkItem', id).subscribe(cs => {
          this.commentsData[id] = cs;
          this.commentsLoading[id] = false;
        });
      }
    } else {
      this.commentsOpen[id] = false;
    }
  }

  addComment(wi: WorkItem) {
    const text = (this.commentDraftMap[wi.id] ?? '').trim();
    if (!text || this.commentSaving[wi.id]) return;
    this.commentSaving[wi.id] = true;
    this.commentSvc.create({ entityType: 'WorkItem', entityId: wi.id, text }).subscribe(c => {
      this.commentsData[wi.id] = [...(this.commentsData[wi.id] ?? []), c];
      this.commentDraftMap[wi.id] = '';
      this.commentSaving[wi.id] = false;
    });
  }

  deleteComment(wiId: string, commentId: string) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete comment?', danger: true }
    }).afterClosed().subscribe(ok => {
      if (ok) this.commentSvc.delete(commentId).subscribe(() => {
        this.commentsData[wiId] = (this.commentsData[wiId] ?? []).filter(c => c.id !== commentId);
      });
    });
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
