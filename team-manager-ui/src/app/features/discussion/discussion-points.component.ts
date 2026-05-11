import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { DiscussionPoint, CreateDiscussionPointRequest, DiscussionTask, CreateDiscussionTaskRequest } from '../../core/models/discussion-point.model';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DiscussionPointsTaskDialogComponent } from './discussion-points-task-dialog/discussion-points-task-dialog.component';
import { DiscussionPointService } from '../../core/services/discussion-point.service';
import { CommentsComponent } from '../../shared/comments/comments.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { IconButtonComponent } from '../../shared/components/icon-btn/icon-btn.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DiscussionPointsEditDialogComponent } from './discussion-points-edit-dialog/discussion-points-edit-dialog.component';
import { FilterBarComponent, FilterGroup, stripMentions } from '../../shared/components/filter-bar/filter-bar.component';

const STATUS_ORDER = ['Open', 'InProgress', 'Resolved', 'Deferred'] as const;
const PRIORITY_ORDER = ['High', 'Medium', 'Low'] as const;

@Component({
  selector: 'app-discussion-points',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule,
    MatTooltipModule, MatDialogModule, CommentsComponent, MatProgressSpinnerModule,
    MatDatepickerModule, MatCheckboxModule, IconButtonComponent, FilterBarComponent],
  template: `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
      <h2 style="margin:0;font-size:1.2rem">Discussion Points</h2>
      <button mat-icon-button (click)="openNew()" matTooltip="Add discussion point"
              style="flex-shrink:0;background:rgba(100,181,246,0.12);color:#64b5f6;border-radius:10px">
        <mat-icon>add</mat-icon>
      </button>
    </div>
    <div style="display:flex;margin-bottom:16px">
      <app-filter-bar
        [groups]="filterGroups"
        searchPlaceholder="Search…"
        [searchVal]="search()"
        [selectedValues]="filterValues()"
        (searchChange)="search.set($event)"
        (apply)="onFilterApply($event)" />
    </div>

    <!-- Overdue banner -->
    @if (overdueCount() > 0 && filterStatuses().length === 0) {
      <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;margin-bottom:14px;
                  border-radius:8px;background:rgba(239,83,80,0.1);border:1px solid rgba(239,83,80,0.25)">
        <mat-icon style="color:#ef5350;font-size:18px;width:18px;height:18px;line-height:18px">warning</mat-icon>
        <span style="font-size:0.85rem;color:#ef9a9a">
          {{ overdueCount() }} discussion {{ overdueCount() === 1 ? 'point is' : 'points are' }} past their target date
        </span>
      </div>
    }

    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    } @else {

    @if (filtered().length === 0) {
      <div style="text-align:center;opacity:0.3;padding:60px 0;font-size:0.95rem">
        No discussion points yet. Add one to start tracking leadership items.
      </div>
    }

    <div style="display:flex;flex-direction:column;gap:12px">
      @for (dp of filtered(); track dp.id) {
        <div style="background:rgba(255,255,255,0.04);border-radius:10px;
                    border-left:3px solid {{ priorityColor(dp.priority) }};
                    opacity:{{ dp.status === 'Resolved' || dp.status === 'Deferred' ? '0.55' : '1' }}">

          <!-- Row 1: Badges and Actions -->
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px 8px">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <div style="font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:10px;
                          background:{{ priorityBg(dp.priority) }};color:{{ priorityColor(dp.priority) }}">
                {{ dp.priority.toUpperCase() }}
              </div>
              <div style="font-size:0.68rem;font-weight:600;padding:2px 8px;border-radius:10px;
                          background:{{ statusBg(dp.status) }};color:{{ statusColor(dp.status) }}">
                {{ statusLabel(dp.status) }}
              </div>
              @if (isOverdue(dp)) {
                <div style="font-size:0.65rem;font-weight:700;padding:2px 8px;border-radius:10px;
                            background:rgba(239,83,80,0.15);color:#ef5350">
                  OVERDUE
                </div>
              }
            </div>

            <!-- Actions -->
            <div style="display:flex;gap:2px" (click)="$event.stopPropagation()">
              <app-icon-btn [icon]="expandedIds().has(dp.id) ? 'chat_bubble' : 'chat_bubble_outline'" size="md" [tooltip]="expandedIds().has(dp.id) ? 'Hide comments & tasks' : 'Comments & tasks'" (btnClick)="toggleExpand(dp.id)" />
              <app-icon-btn [icon]="nextStatusIcon(dp.status)" size="md" [tooltip]="nextStatusLabel(dp.status)" (btnClick)="cycleStatus(dp)" />
              <app-icon-btn icon="edit" size="md" tooltip="Edit" (btnClick)="openEdit(dp)" />
              <app-icon-btn icon="delete_outline" size="md" tooltip="Delete" [danger]="true" (btnClick)="remove(dp)" />
            </div>
          </div>

          <!-- Row 2: Title/Notes -->
          <div (click)="openEdit(dp)" style="padding:0 16px 8px;cursor:pointer">
            <div style="font-size:1rem;font-weight:600;margin-bottom:4px">{{ dp.title }}</div>
            @if (dp.notes) {
              <div style="font-size:0.85rem;opacity:0.6;white-space:pre-wrap;line-height:1.5">{{ dp.notes }}</div>
            }
            @if (dp.assigneeName) {
              <div style="font-size:0.8rem;color:#ffb74d;margin-top:6px">Assigned to: {{ dp.assigneeName }}</div>
            }
          </div>

          <!-- Row 3: Dates -->
          <div style="display:flex;gap:12px;padding:0 16px 12px;font-size:0.75rem;opacity:0.4;flex-wrap:wrap">
            @if (dp.startDate) {
              <span>Started {{ fmtDate(dp.startDate) }}</span>
            }
            @if (dp.targetDate) {
              <span [style.color]="isOverdue(dp) ? '#ef9a9a' : 'inherit'"
                    [style.opacity]="isOverdue(dp) ? '0.9' : 'inherit'">
                Target {{ fmtDate(dp.targetDate) }}
              </span>
            }
            <span>Added {{ relativeDate(dp.createdAt) }}</span>
          </div>

          @if (expandedIds().has(dp.id)) {
            <div style="border-top:1px solid rgba(255,255,255,0.07);padding:12px 18px">
              <!-- Tasks Section -->
              <div style="margin-bottom:12px">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                  <mat-icon style="font-size:16px;width:16px;height:16px;color:#ffb74d">task_alt</mat-icon>
                  <span style="font-size:0.75rem;font-weight:700;opacity:0.6;text-transform:uppercase;letter-spacing:0.05em">
                    Tasks ({{ tasksFor(dp.id).length }})
                  </span>
                </div>

                @if (tasksLoading(dp.id)) {
                  <div style="display:flex;justify-content:center;padding:20px">
                    <mat-spinner diameter="24"></mat-spinner>
                  </div>
                } @else {
                  <!-- Task list -->
                  @for (task of tasksFor(dp.id); track task.id) {
                    <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 8px;margin-bottom:4px;
                                background:rgba(255,255,255,0.03);border-radius:6px;border:1px solid rgba(255,255,255,0.05)">
                      <mat-checkbox [checked]="task.isCompleted"
                                    (change)="toggleTask(dp.id, task)"></mat-checkbox>
                      <div style="flex:1;min-width:0">
                        <div style="font-size:0.85rem;font-weight:{{ task.isCompleted ? 500 : 600 }};
                                    text-decoration:{{ task.isCompleted ? 'line-through' : 'none' }};
                                    opacity:{{ task.isCompleted ? 0.6 : 1 }};word-break:break-word">
                          {{ task.title }}
                        </div>
                        @if (task.assigneeName || task.dueDate) {
                          <div style="display:flex;gap:8px;font-size:0.7rem;opacity:0.5;margin-top:2px;flex-wrap:wrap">
                            @if (task.assigneeName) {
                              <span>{{ task.assigneeName }}</span>
                            }
                            @if (task.dueDate) {
                              <span [style.color]="isTaskOverdue(task) ? '#ef5350' : 'inherit'">
                                Due {{ fmtDate(task.dueDate) }}
                              </span>
                            }
                          </div>
                        }
                      </div>
                      <app-icon-btn icon="edit" size="sm" tooltip="Edit" (btnClick)="openTaskEdit(dp.id, task)" />
                      <app-icon-btn icon="delete_outline" size="sm" tooltip="Delete" [danger]="true" (btnClick)="deleteTask(dp.id, task)" />
                    </div>
                  }

                  @if (tasksFor(dp.id).length === 0) {
                    <div style="font-size:0.8rem;opacity:0.4;padding:8px 0">No tasks yet</div>
                  }

                  <!-- Add task -->
                  <div style="display:flex;gap:8px;margin-top:8px">
                    <button mat-stroked-button (click)="openTaskAdd(dp.id)" style="font-size:0.8rem">
                      <mat-icon style="font-size:16px;width:16px;height:16px;margin-right:4px">add</mat-icon>
                      Add Task
                    </button>
                  </div>
                }
              </div>

              <!-- Comments -->
              <app-comments entityType="DiscussionPoint" [entityId]="dp.id"></app-comments>
            </div>
          }
        </div>
      }
    </div>
    } <!-- end @else -->
  `
})
export class DiscussionPointsComponent implements OnInit {
  private svc    = inject(DiscussionPointService);
  private dialog = inject(MatDialog);

  loading     = signal(true);
  items       = signal<DiscussionPoint[]>([]);
  saving      = signal(false);
  expandedIds = signal<Set<string>>(new Set());
  tasks       = signal<Record<string, DiscussionTask[]>>({});
  tasksLoadingMap = signal<Record<string, boolean>>({});

  search          = signal('');
  filterStatuses  = signal<string[]>([]);
  filterPriorities = signal<string[]>([]);

  readonly filterGroups: FilterGroup[] = [
    {
      key: 'status', label: 'Status', icon: 'flag',
      options: [
        { id: 'Open', label: 'Open' },
        { id: 'InProgress', label: 'In Progress' },
        { id: 'Resolved', label: 'Resolved' },
        { id: 'Deferred', label: 'Deferred' },
      ]
    },
    {
      key: 'priority', label: 'Priority', icon: 'priority_high',
      options: [
        { id: 'High', label: 'High' },
        { id: 'Medium', label: 'Medium' },
        { id: 'Low', label: 'Low' },
      ]
    },
  ];

  filterValues = computed(() => ({
    status: this.filterStatuses(),
    priority: this.filterPriorities(),
  }));

  filtered = computed(() => {
    const statuses  = this.filterStatuses();
    const priorities = this.filterPriorities();
    const q = stripMentions(this.search()).toLowerCase();
    let list = this.items().slice().sort((a, b) => {
      const pA = PRIORITY_ORDER.indexOf(a.priority as any);
      const pB = PRIORITY_ORDER.indexOf(b.priority as any);
      if (pA !== pB) return pA - pB;
      const sA = STATUS_ORDER.indexOf(a.status as any);
      const sB = STATUS_ORDER.indexOf(b.status as any);
      return sA - sB;
    });
    if (statuses.length > 0)   list = list.filter(d => statuses.includes(d.status));
    if (priorities.length > 0) list = list.filter(d => priorities.includes(d.priority));
    if (q) list = list.filter(d =>
      d.title.toLowerCase().includes(q) ||
      (d.notes ?? '').toLowerCase().includes(q) ||
      (d.assigneeName ?? '').toLowerCase().includes(q)
    );
    return list;
  });

  overdueCount = computed(() =>
    this.items().filter(d => this.isOverdue(d)).length
  );

  ngOnInit() { this.load(); }

  onFilterApply(filters: Record<string, string[]>) {
    this.filterStatuses.set(filters['status'] ?? []);
    this.filterPriorities.set(filters['priority'] ?? []);
  }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe(items => { this.items.set(items); this.loading.set(false); });
  }

  toggleExpand(id: string) {
    this.toggleTasks(id);
    this.expandedIds.update(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  tasksFor(discussionPointId: string): DiscussionTask[] {
    return this.tasks()[discussionPointId] || [];
  }

  tasksLoading(discussionPointId: string): boolean {
    return this.tasksLoadingMap()[discussionPointId] || false;
  }

  loadTasks(discussionPointId: string) {
    if (this.tasks()[discussionPointId]) return;
    this.tasksLoadingMap.update(m => ({ ...m, [discussionPointId]: true }));
    this.svc.getTasks(discussionPointId).subscribe({
      next: tasks => {
        this.tasks.update(t => ({ ...t, [discussionPointId]: tasks }));
        this.tasksLoadingMap.update(m => ({ ...m, [discussionPointId]: false }));
      },
      error: () => this.tasksLoadingMap.update(m => ({ ...m, [discussionPointId]: false }))
    });
  }

  toggleTasks(discussionPointId: string) {
    if (!this.tasks()[discussionPointId]) {
      this.loadTasks(discussionPointId);
    }
  }

  toggleTask(discussionPointId: string, task: DiscussionTask) {
    this.svc.toggleTask(discussionPointId, task.id).subscribe(updated => {
      this.tasks.update(t => ({
        ...t,
        [discussionPointId]: t[discussionPointId]?.map(x => x.id === updated.id ? updated : x) || []
      }));
    });
  }

  deleteTask(discussionPointId: string, task: DiscussionTask) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete task?', message: `"${task.title}" will be permanently removed.`, danger: true }
    }).afterClosed().subscribe(ok => {
      if (ok) this.svc.deleteTask(discussionPointId, task.id).subscribe(() =>
        this.tasks.update(t => ({
          ...t,
          [discussionPointId]: t[discussionPointId]?.filter(x => x.id !== task.id) || []
        }))
      );
    });
  }

  isTaskOverdue(task: DiscussionTask): boolean {
    if (!task.dueDate || task.isCompleted) return false;
    return task.dueDate < new Date().toISOString().slice(0, 10);
  }

  openTaskAdd(discussionPointId: string) {
    const dialogRef = this.dialog.open(DiscussionPointsTaskDialogComponent, {
      width: '420px',
      data: { discussionPointId, teamMembers: [] }
    });
    dialogRef.afterClosed().subscribe((result?: DiscussionTask) => {
      if (result) {
        this.tasks.update(t => ({
          ...t,
          [discussionPointId]: [...(t[discussionPointId] || []), result]
        }));
      }
    });
  }

  openTaskEdit(discussionPointId: string, task: DiscussionTask) {
    const dialogRef = this.dialog.open(DiscussionPointsTaskDialogComponent, {
      width: '420px',
      data: { discussionPointId, task, teamMembers: [] }
    });
    dialogRef.afterClosed().subscribe((result?: DiscussionTask) => {
      if (result) {
        this.tasks.update(t => ({
          ...t,
          [discussionPointId]: t[discussionPointId]?.map(x => x.id === result!.id ? result! : x) || []
        }));
      }
    });
  }

  openNew() {
    const form: CreateDiscussionPointRequest = { title: '', notes: null, status: 'Open', priority: 'Medium', startDate: null, targetDate: null };
    const dialogRef = this.dialog.open(DiscussionPointsEditDialogComponent, {
      width: '500px',
      data: { editId: null, form }
    });
    dialogRef.afterClosed().subscribe((result?: CreateDiscussionPointRequest) => {
      if (result) {
        this.svc.create(result).subscribe(dp => this.items.update(list => [...list, dp]));
      }
    });
  }

  openEdit(dp: DiscussionPoint) {
    const form: CreateDiscussionPointRequest = {
      title: dp.title, notes: dp.notes, status: dp.status, priority: dp.priority,
      startDate: dp.startDate, targetDate: dp.targetDate
    };
    const dialogRef = this.dialog.open(DiscussionPointsEditDialogComponent, {
      width: '500px',
      data: { editId: dp.id, form }
    });
    dialogRef.afterClosed().subscribe((result?: CreateDiscussionPointRequest) => {
      if (result) {
        this.svc.update(dp.id, result).subscribe(updated =>
          this.items.update(list => list.map(x => x.id === updated.id ? updated : x))
        );
      }
    });
  }

  remove(dp: DiscussionPoint) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete discussion point?', message: `"${dp.title}" will be permanently removed.`, danger: true }
    }).afterClosed().subscribe(ok => {
      if (ok) this.svc.delete(dp.id).subscribe(() =>
        this.items.update(list => list.filter(x => x.id !== dp.id))
      );
    });
  }

  cycleStatus(dp: DiscussionPoint) {
    const cycle: Record<string, string> = {
      Open: 'InProgress', InProgress: 'Resolved', Resolved: 'Deferred', Deferred: 'Open'
    };
    const req: CreateDiscussionPointRequest = {
      title: dp.title, notes: dp.notes, priority: dp.priority,
      startDate: dp.startDate, targetDate: dp.targetDate,
      status: cycle[dp.status] ?? 'Open'
    };
    this.svc.update(dp.id, req).subscribe(updated =>
      this.items.update(list => list.map(x => x.id === updated.id ? updated : x))
    );
  }

  isOverdue(dp: DiscussionPoint): boolean {
    if (!dp.targetDate || dp.status === 'Resolved' || dp.status === 'Deferred') return false;
    return dp.targetDate < new Date().toISOString().slice(0, 10);
  }

  fmtDate(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  relativeDate(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  statusLabel(s: string): string {
    return { Open: 'Open', InProgress: 'In Progress', Resolved: 'Resolved', Deferred: 'Deferred' }[s] ?? s;
  }

  statusColor(s: string): string {
    return { Open: '#64b5f6', InProgress: '#ffb74d', Resolved: '#81c784', Deferred: '#b0bec5' }[s] ?? '#aaa';
  }

  statusBg(s: string): string {
    return { Open: 'rgba(100,181,246,0.1)', InProgress: 'rgba(255,183,77,0.1)', Resolved: 'rgba(129,199,132,0.1)', Deferred: 'rgba(176,190,197,0.08)' }[s] ?? 'transparent';
  }

  priorityColor(p: string): string {
    return { High: '#ef5350', Medium: '#ffca28', Low: '#66bb6a' }[p] ?? '#aaa';
  }

  priorityBg(p: string): string {
    return { High: 'rgba(239,83,80,0.12)', Medium: 'rgba(255,202,40,0.1)', Low: 'rgba(102,187,106,0.1)' }[p] ?? 'transparent';
  }

  nextStatusLabel(s: string): string {
    return { Open: 'Mark In Progress', InProgress: 'Mark Resolved', Resolved: 'Defer', Deferred: 'Reopen' }[s] ?? '';
  }

  nextStatusIcon(s: string): string {
    return { Open: 'play_arrow', InProgress: 'check_circle', Resolved: 'pause_circle', Deferred: 'refresh' }[s] ?? 'arrow_forward';
  }
}
