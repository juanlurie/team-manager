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
import { DiscussionPoint, CreateDiscussionPointRequest } from '../../core/models/discussion-point.model';
import { DiscussionPointService } from '../../core/services/discussion-point.service';
import { CommentsComponent } from '../../shared/comments/comments.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

const STATUS_ORDER = ['Open', 'InProgress', 'Resolved', 'Deferred'] as const;
const PRIORITY_ORDER = ['High', 'Medium', 'Low'] as const;

@Component({
  selector: 'app-discussion-points',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatInputModule, MatTooltipModule,
    MatDialogModule, CommentsComponent, MatProgressSpinnerModule],
  template: `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
      <h2 style="margin:0;font-size:1.2rem;flex:1">Discussion Points</h2>

      <!-- Status filter -->
      <mat-form-field appearance="outline" style="width:160px;margin:0">
        <mat-label>Status</mat-label>
        <mat-select [(ngModel)]="filterStatus">
          <mat-option value="">All</mat-option>
          <mat-option value="Open">Open</mat-option>
          <mat-option value="InProgress">In Progress</mat-option>
          <mat-option value="Resolved">Resolved</mat-option>
          <mat-option value="Deferred">Deferred</mat-option>
        </mat-select>
      </mat-form-field>

      <!-- Priority filter -->
      <mat-form-field appearance="outline" style="width:140px;margin:0">
        <mat-label>Priority</mat-label>
        <mat-select [(ngModel)]="filterPriority">
          <mat-option value="">All</mat-option>
          <mat-option value="High">High</mat-option>
          <mat-option value="Medium">Medium</mat-option>
          <mat-option value="Low">Low</mat-option>
        </mat-select>
      </mat-form-field>

      <button mat-raised-button color="primary" (click)="openNew()">
        <mat-icon>add</mat-icon> Add Point
      </button>
    </div>

    <!-- Overdue banner -->
    @if (overdueCount() > 0 && !filterStatus) {
      <div style="display:flex;align-items:center;gap:8px;padding:8px 14px;margin-bottom:14px;
                  border-radius:8px;background:rgba(239,83,80,0.1);border:1px solid rgba(239,83,80,0.25)">
        <mat-icon style="color:#ef5350;font-size:18px;width:18px;height:18px;line-height:18px">warning</mat-icon>
        <span style="font-size:0.85rem;color:#ef9a9a">
          {{ overdueCount() }} discussion {{ overdueCount() === 1 ? 'point is' : 'points are' }} past their target date
        </span>
      </div>
    }

    <!-- Inline add/edit form -->
    @if (editing()) {
      <div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
                  border-radius:12px;padding:20px;margin-bottom:20px">
        <div style="font-size:0.85rem;font-weight:600;opacity:0.5;margin-bottom:14px;text-transform:uppercase;letter-spacing:0.08em">
          {{ editId() ? 'Edit Point' : 'New Discussion Point' }}
        </div>

        <div style="display:flex;flex-direction:column;gap:12px">
          <mat-form-field appearance="outline">
            <mat-label>Topic / concern</mat-label>
            <input matInput [(ngModel)]="form.title" placeholder="What needs to be discussed?">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Notes</mat-label>
            <textarea matInput [(ngModel)]="form.notes" rows="4"
                      placeholder="Context, background, what input is needed from leadership…"></textarea>
          </mat-form-field>

          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <mat-form-field appearance="outline" style="flex:1;min-width:140px">
              <mat-label>Status</mat-label>
              <mat-select [(ngModel)]="form.status">
                <mat-option value="Open">Open</mat-option>
                <mat-option value="InProgress">In Progress</mat-option>
                <mat-option value="Resolved">Resolved</mat-option>
                <mat-option value="Deferred">Deferred</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" style="flex:1;min-width:140px">
              <mat-label>Priority</mat-label>
              <mat-select [(ngModel)]="form.priority">
                <mat-option value="High">High</mat-option>
                <mat-option value="Medium">Medium</mat-option>
                <mat-option value="Low">Low</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <mat-form-field appearance="outline" style="flex:1;min-width:160px">
              <mat-label>Date started</mat-label>
              <input matInput type="date" [(ngModel)]="form.startDate">
            </mat-form-field>

            <mat-form-field appearance="outline" style="flex:1;min-width:160px">
              <mat-label>Target date</mat-label>
              <input matInput type="date" [(ngModel)]="form.targetDate">
            </mat-form-field>
          </div>

          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button mat-button (click)="cancel()">Cancel</button>
            <button mat-raised-button color="primary" [disabled]="!form.title.trim() || saving()"
                    (click)="save()">
              {{ saving() ? 'Saving…' : (editId() ? 'Save Changes' : 'Add Point') }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    } @else {

    @if (filtered().length === 0 && !editing()) {
      <div style="text-align:center;opacity:0.3;padding:60px 0;font-size:0.95rem">
        No discussion points yet. Add one to start tracking leadership items.
      </div>
    }

    <div style="display:flex;flex-direction:column;gap:12px">
      @for (dp of filtered(); track dp.id) {
        <div style="background:rgba(255,255,255,0.04);border-radius:10px;
                    border-left:3px solid {{ priorityColor(dp.priority) }};
                    opacity:{{ dp.status === 'Resolved' || dp.status === 'Deferred' ? '0.55' : '1' }}">

          <div (click)="openEdit(dp)"
               style="display:flex;align-items:flex-start;gap:12px;padding:16px 18px;cursor:pointer">
            <!-- Priority + status badges -->
            <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;padding-top:2px">
              <div style="font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:10px;text-align:center;
                          background:{{ priorityBg(dp.priority) }};color:{{ priorityColor(dp.priority) }}">
                {{ dp.priority.toUpperCase() }}
              </div>
              <div style="font-size:0.68rem;font-weight:600;padding:2px 8px;border-radius:10px;text-align:center;
                          background:{{ statusBg(dp.status) }};color:{{ statusColor(dp.status) }}">
                {{ statusLabel(dp.status) }}
              </div>
              @if (isOverdue(dp)) {
                <div style="font-size:0.65rem;font-weight:700;padding:2px 8px;border-radius:10px;text-align:center;
                            background:rgba(239,83,80,0.15);color:#ef5350">
                  OVERDUE
                </div>
              }
            </div>

            <!-- Main content -->
            <div style="flex:1;min-width:0">
              <div style="font-size:1rem;font-weight:600;margin-bottom:4px">{{ dp.title }}</div>
              @if (dp.notes) {
                <div style="font-size:0.85rem;opacity:0.6;white-space:pre-wrap;line-height:1.5">{{ dp.notes }}</div>
              }
              <div style="display:flex;gap:12px;margin-top:8px;font-size:0.75rem;opacity:0.4;flex-wrap:wrap">
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
            </div>

            <!-- Actions -->
            <div style="display:flex;gap:2px;flex-shrink:0;align-items:center" (click)="$event.stopPropagation()">
              <button mat-icon-button [matTooltip]="expandedIds().has(dp.id) ? 'Hide comments' : 'Comments'"
                      (click)="toggleExpand(dp.id)">
                <mat-icon style="font-size:20px;width:20px;height:20px;line-height:20px">
                  {{ expandedIds().has(dp.id) ? 'chat_bubble' : 'chat_bubble_outline' }}
                </mat-icon>
              </button>
              <button mat-icon-button [matTooltip]="nextStatusLabel(dp.status)" (click)="cycleStatus(dp)">
                <mat-icon style="font-size:20px;width:20px;height:20px;line-height:20px">{{ nextStatusIcon(dp.status) }}</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Edit" (click)="openEdit(dp)">
                <mat-icon style="font-size:20px;width:20px;height:20px;line-height:20px">edit</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Delete" (click)="remove(dp)">
                <mat-icon style="font-size:20px;width:20px;height:20px;line-height:20px">delete_outline</mat-icon>
              </button>
            </div>
          </div>

          @if (expandedIds().has(dp.id)) {
            <div style="border-top:1px solid rgba(255,255,255,0.07);padding:4px 18px 14px">
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
  editing     = signal(false);
  editId      = signal<string | null>(null);
  saving      = signal(false);
  expandedIds = signal<Set<string>>(new Set());

  filterStatus   = '';
  filterPriority = '';

  form: CreateDiscussionPointRequest = {
    title: '', notes: null, status: 'Open', priority: 'Medium',
    startDate: null, targetDate: null
  };

  filtered = computed(() => {
    let list = this.items().slice().sort((a, b) => {
      const pA = PRIORITY_ORDER.indexOf(a.priority as any);
      const pB = PRIORITY_ORDER.indexOf(b.priority as any);
      if (pA !== pB) return pA - pB;
      const sA = STATUS_ORDER.indexOf(a.status as any);
      const sB = STATUS_ORDER.indexOf(b.status as any);
      return sA - sB;
    });
    if (this.filterStatus)   list = list.filter(d => d.status === this.filterStatus);
    if (this.filterPriority) list = list.filter(d => d.priority === this.filterPriority);
    return list;
  });

  overdueCount = computed(() =>
    this.items().filter(d => this.isOverdue(d)).length
  );

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe(items => { this.items.set(items); this.loading.set(false); });
  }

  toggleExpand(id: string) {
    this.expandedIds.update(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  openNew() {
    this.editId.set(null);
    this.form = { title: '', notes: null, status: 'Open', priority: 'Medium', startDate: null, targetDate: null };
    this.editing.set(true);
  }

  openEdit(dp: DiscussionPoint) {
    this.editId.set(dp.id);
    this.form = {
      title: dp.title, notes: dp.notes, status: dp.status, priority: dp.priority,
      startDate: dp.startDate, targetDate: dp.targetDate
    };
    this.editing.set(true);
  }

  cancel() { this.editing.set(false); this.editId.set(null); }

  save() {
    if (!this.form.title.trim() || this.saving()) return;
    this.saving.set(true);
    const req: CreateDiscussionPointRequest = {
      ...this.form,
      startDate:  (this.form.startDate  as any) || null,
      targetDate: (this.form.targetDate as any) || null,
    };
    const id = this.editId();
    const obs = id ? this.svc.update(id, req) : this.svc.create(req);
    obs.subscribe({
      next: (dp) => {
        this.items.update(list => id ? list.map(x => x.id === id ? dp : x) : [...list, dp]);
        this.saving.set(false);
        this.editing.set(false);
        this.editId.set(null);
      },
      error: () => this.saving.set(false)
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
