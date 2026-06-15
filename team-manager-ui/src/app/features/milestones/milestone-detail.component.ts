import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MilestoneService } from '../../core/services/milestone.service';
import { WorkItemService } from '../../core/services/work-item.service';
import {
  MilestoneDetail,
  MilestoneCriterion,
  MilestoneWorkItem,
  MilestoneStatus
} from '../../core/models/milestone.model';
import { StatusLabelPipe } from '../../core/pipes/status-label.pipe';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { MilestoneScopeBadgeComponent } from '../../shared/components/milestone-scope-badge.component';

@Component({
  selector: 'app-milestone-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatButtonModule, MatIconModule, MatDialogModule, MatSelectModule, MatFormFieldModule,
    MatInputModule, MatCheckboxModule, MatTooltipModule, MatMenuModule,
    MatCardModule, MatProgressBarModule, MatChipsModule, MatBadgeModule, MatDividerModule,
    StatusLabelPipe, MilestoneScopeBadgeComponent
  ],
  template: `
    @if (loading()) {
      <div style="text-align:center;padding:64px;opacity:0.35">Loading milestone…</div>
    }

    @if (milestone(); as m) {
      <!-- Header row -->
      <div style="margin-bottom:24px">
        <a mat-button [routerLink]="['/']" style="padding:0 8px 0 4px;gap:4px;color:rgba(255,255,255,0.55)">
          <mat-icon style="font-size:18px;width:18px;height:18px;line-height:18px">arrow_back</mat-icon>
          Home
        </a>
      </div>

      <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:24px">
        <div style="flex:1;min-width:280px">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <h2 style="margin:0;font-size:1.4rem">{{ m.title }}</h2>
            <span [class]="statusClass(m.status)" style="padding:2px 10px;border-radius:10px;font-size:0.72rem;font-weight:600">
              {{ m.status }}
            </span>
            <app-milestone-scope-badge [scope]="m.scope" [squadName]="m.squadName" [squadColor]="m.squadColor" />
          </div>
          @if (m.description) {
            <p style="opacity:0.55;margin:8px 0 0;font-size:0.9rem">{{ m.description }}</p>
          }
          @if (m.targetDate) {
            <div style="font-size:0.8rem;opacity:0.4;margin-top:4px">
              Target: {{ m.targetDate | date:'d MMM yyyy' }}
            </div>
          }
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <mat-form-field appearance="outline" style="width:140px;margin-bottom:-1.25em">
            <mat-label>Status</mat-label>
            <mat-select [ngModel]="m.status" (ngModelChange)="setStatus($event)">
              <mat-option value="Upcoming">Upcoming</mat-option>
              <mat-option value="InProgress">In Progress</mat-option>
              <mat-option value="Done">Done</mat-option>
            </mat-select>
          </mat-form-field>
          <button mat-icon-button [matMenuTriggerFor]="actionsMenu" style="color:rgba(255,255,255,0.4)">
            <mat-icon>more_vert</mat-icon>
          </button>
          <mat-menu #actionsMenu="matMenu">
            <button mat-menu-item (click)="openEditDialog()">
              <mat-icon>edit</mat-icon><span>Edit milestone</span>
            </button>
            <button mat-menu-item (click)="deleteMilestone()">
              <mat-icon>delete</mat-icon><span>Delete milestone</span>
            </button>
          </mat-menu>
        </div>
      </div>

      <!-- Progress -->
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:0.85rem;font-weight:600">Progress</span>
          <span style="font-size:0.75rem;opacity:0.5">
            {{ m.completedTaskCount }} / {{ m.taskCount }} tasks done — {{ m.progressPercent }}%
          </span>
        </div>
        <mat-progress-bar mode="determinate" [value]="m.progressPercent"
          style="height:8px;border-radius:4px"
          [color]="m.progressPercent >= 100 ? 'primary' : 'accent'">
        </mat-progress-bar>
        @if (m.progressPercent >= 75 && m.progressPercent < 100) {
          <div style="margin-top:6px;font-size:0.78rem;color:#4caf50">Almost there!</div>
        }
        @if (m.progressPercent === 100) {
          <div style="margin-top:6px;font-size:0.78rem;color:#4caf50;font-weight:600">Milestone complete!</div>
        }
      </div>

      <!-- What's next (for non-Done milestones) -->
      @if (m.status !== 'Done' && remainingTasks().length > 0) {
        <div style="margin-bottom:24px;padding:16px;border-radius:10px;background:rgba(33,150,243,0.06);border:1px solid rgba(33,150,243,0.12)">
          <h3 style="margin:0 0 8px;font-size:0.9rem;font-weight:600;color:#64b5f6">What's next</h3>
          <div style="font-size:0.78rem;opacity:0.6;margin-bottom:8px">
            {{ remainingTasks().length }} task{{ remainingTasks().length === 1 ? '' : 's' }} remaining to complete this milestone:
          </div>
          @for (t of remainingTasks(); track t.id) {
            <div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:0.82rem">
              <span [class]="statusClass(t.status)" style="padding:1px 6px;border-radius:4px;font-size:0.65rem;font-weight:600">{{ t.status | statusLabel }}</span>
              <span style="flex:1">{{ t.title }}</span>
              <span style="opacity:0.5;font-size:0.75rem">{{ t.assignee }}</span>
            </div>
          }
          @if (remainingCriteria().length > 0) {
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.06)">
              <div style="font-size:0.78rem;opacity:0.6;margin-bottom:4px">
                {{ remainingCriteria().length }} criterion remaining:
              </div>
              @for (c of remainingCriteria(); track c.id) {
                <div style="display:flex;align-items:center;gap:6px;padding:2px 0;font-size:0.82rem;opacity:0.7">
                  <span style="width:12px;height:12px;border:1px solid rgba(255,255,255,0.3);border-radius:2px;flex-shrink:0"></span>
                  {{ c.label }}
                </div>
              }
            </div>
          }
        </div>
      }

      <div style="display:flex;gap:24px;flex-wrap:wrap">
        <!-- Left column: Completion criteria -->
        <div style="flex:1;min-width:320px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <h3 style="margin:0;font-size:0.95rem;font-weight:600">Completion criteria</h3>
            <span style="font-size:0.75rem;opacity:0.4">
              {{ m.completedCriteriaCount }} / {{ m.criteriaCount }}
            </span>
            <span style="flex:1"></span>
            <button mat-icon-button (click)="addCriterion()" style="color:rgba(255,255,255,0.4);width:28px;height:28px" matTooltip="Add criterion">
              <mat-icon style="font-size:18px">add</mat-icon>
            </button>
          </div>

          @if (m.criteria.length === 0) {
            <div style="padding:24px;text-align:center;opacity:0.3;font-size:0.85rem;font-style:italic">
              No criteria defined yet
            </div>
          }

          <div style="display:flex;flex-direction:column;gap:4px">
            @for (c of m.criteria; track c.id) {
              <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;
                          border-radius:8px;background:rgba(255,255,255,0.03)">
                <mat-checkbox [checked]="c.completed" (change)="toggleCriterion(c)" style="margin-left:2px" />
                <span style="flex:1;font-size:0.85rem" [style.textDecoration]="c.completed ? 'line-through' : 'none'"
                      [style.opacity]="c.completed ? 0.4 : 1">
                  {{ c.label }}
                </span>
                <button mat-icon-button (click)="deleteCriterion(c)" style="color:rgba(255,255,255,0.2);width:24px;height:24px">
                  <mat-icon style="font-size:16px">close</mat-icon>
                </button>
              </div>
            }
          </div>
        </div>

        <!-- Right column: Linked sprints -->
        <div style="flex:0 0 260px">
          <h3 style="margin:0 0 12px;font-size:0.95rem;font-weight:600">
            Linked sprints
            <span style="font-size:0.75rem;opacity:0.4;font-weight:400"> · {{ m.sprints.length }}</span>
          </h3>
          @if (m.sprints.length === 0) {
            <div style="padding:24px;text-align:center;opacity:0.3;font-size:0.85rem;font-style:italic">
              No linked sprints
            </div>
          } @else {
            <div style="display:flex;flex-direction:column;gap:6px">
              @for (s of m.sprints; track s.id) {
                <div style="padding:8px 12px;border-radius:8px;background:rgba(255,255,255,0.03);
                            font-size:0.82rem;font-weight:500">
                  {{ s.name }}
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Linked tasks -->
      <div style="margin-top:24px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <h3 style="margin:0;font-size:0.95rem;font-weight:600">
            Linked tasks
            <span style="font-size:0.75rem;opacity:0.4;font-weight:400"> · {{ m.tasks.length }}</span>
          </h3>
        </div>

        @if (m.tasks.length === 0) {
          <div style="padding:24px;text-align:center;opacity:0.3;font-size:0.85rem;font-style:italic">
            No tasks linked — link tasks via the task edit form
          </div>
        } @else {
          <div style="border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);overflow:hidden">
            <div style="overflow-x:auto">
              <table style="width:100%;border-collapse:collapse;font-size:0.82rem">
                <thead>
                  <tr style="background:rgba(0,0,0,0.2)">
                    <th style="padding:7px 16px;text-align:left;opacity:0.5;font-weight:600;white-space:nowrap">Task</th>
                    <th style="padding:7px 12px;text-align:left;opacity:0.5;font-weight:600;white-space:nowrap">Type</th>
                    <th style="padding:7px 12px;text-align:left;opacity:0.5;font-weight:600;white-space:nowrap">Status</th>
                    <th style="padding:7px 12px;text-align:left;opacity:0.5;font-weight:600;white-space:nowrap">Assignee</th>
                    <th style="padding:7px 12px;text-align:left;opacity:0.5;font-weight:600;white-space:nowrap">Sprint</th>
                    <th style="padding:7px 12px;width:40px"></th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of m.tasks; track t.id) {
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.04)">
                      <td style="padding:8px 16px;min-width:180px">{{ t.title }}</td>
                      <td style="padding:8px 12px"><span [class]="typeClass(t.type)">{{ t.type }}</span></td>
                      <td style="padding:8px 12px"><span [class]="statusClass(t.status)">{{ t.status | statusLabel }}</span></td>
                      <td style="padding:8px 12px;opacity:0.6;min-width:100px">{{ t.assignee }}</td>
                      <td style="padding:8px 12px;opacity:0.5;min-width:100px">{{ t.sprintName }}</td>
                      <td style="padding:8px 4px">
                        <button mat-icon-button (click)="unlinkTask(t)" matTooltip="Unlink from milestone"
                                style="color:rgba(255,255,255,0.25);width:24px;height:24px">
                          <mat-icon style="font-size:16px">link_off</mat-icon>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .ms-upcoming   { background:rgba(158,158,158,0.15);color:#9e9e9e; }
    .ms-inprogress { background:rgba(33,150,243,0.15);color:#64b5f6; }
    .ms-done       { background:rgba(76,175,80,0.15);color:#4caf50; }

    .wi-type { padding:2px 6px;border-radius:6px;font-size:0.68rem;font-weight:700;text-transform:uppercase; }
    .type-analysis  { background:rgba(156,39,176,0.15);color:#ce93d8; }
    .type-design    { background:rgba(0,188,212,0.15);color:#4dd0e1; }
    .type-dev       { background:rgba(33,150,243,0.15);color:#64b5f6; }
    .type-qa        { background:rgba(255,152,0,0.15);color:#ff9800; }
    .type-bug       { background:rgba(244,67,54,0.15);color:#f44336; }
    .type-task      { background:rgba(158,158,158,0.15);color:#9e9e9e; }
    .type-release   { background:rgba(76,175,80,0.15);color:#4caf50; }

    .wi-planned          { padding:2px 6px;border-radius:6px;font-size:0.68rem;font-weight:600;background:rgba(158,158,158,0.12);color:#9e9e9e; }
    .wi-inprogress       { padding:2px 6px;border-radius:6px;font-size:0.68rem;font-weight:600;background:rgba(33,150,243,0.12);color:#64b5f6; }
    .wi-completed        { padding:2px 6px;border-radius:6px;font-size:0.68rem;font-weight:600;background:rgba(76,175,80,0.12);color:#4caf50; }
    .wi-readyforrelease  { padding:2px 6px;border-radius:6px;font-size:0.68rem;font-weight:600;background:rgba(255,193,7,0.15);color:#ffd54f; }
    .wi-released         { padding:2px 6px;border-radius:6px;font-size:0.68rem;font-weight:600;background:rgba(255,255,255,0.1);color:#e0e0e0;border:1px solid rgba(255,255,255,0.2); }
    .wi-blocked          { padding:2px 6px;border-radius:6px;font-size:0.68rem;font-weight:600;background:rgba(244,67,54,0.15);color:#f44336; }
  `]
})
export class MilestoneDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(MilestoneService);
  private workItemSvc = inject(WorkItemService);
  private dialog = inject(MatDialog);

  milestoneId = '';
  loading = signal(true);
  milestone = signal<MilestoneDetail | null>(null);
  newCriterionLabel = signal('');

  remainingTasks = computed(() => {
    const m = this.milestone();
    if (!m) return [];
    return m.tasks.filter(t => t.status !== 'Completed');
  });

  remainingCriteria = computed(() => {
    const m = this.milestone();
    if (!m) return [];
    return m.criteria.filter(c => !c.completed);
  });

  ngOnInit() {
    this.milestoneId = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.getById(this.milestoneId).subscribe({
      next: m => { this.milestone.set(m); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  statusClass(status: string): string {
    return `ms-${status.toLowerCase()}`;
  }

  typeClass(type: string): string {
    return `wi-type type-${type.toLowerCase()}`;
  }

  setStatus(status: string) {
    this.svc.update(this.milestoneId, { status: status as MilestoneStatus }).subscribe(() => this.load());
  }

  toggleCriterion(c: MilestoneCriterion) {
    this.svc.updateCriterion(c.id, { completed: !c.completed }).subscribe(() => this.load());
  }

  addCriterion() {
    const label = prompt('Criterion label:');
    if (label?.trim()) {
      this.svc.addCriterion(this.milestoneId, { label: label.trim() }).subscribe(() => this.load());
    }
  }

  deleteCriterion(c: MilestoneCriterion) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete criterion', message: `Delete "${c.label}"?` }
    });
    ref.afterClosed().subscribe(r => { if (r) this.svc.deleteCriterion(c.id).subscribe(() => this.load()); });
  }

  unlinkTask(t: MilestoneWorkItem) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: { title: 'Unlink task', message: `Remove "${t.title}" from this milestone?` }
    });
    ref.afterClosed().subscribe(r => {
      if (r) {
        this.workItemSvc.update(t.id, {
          title: t.title,
          description: null,
          type: t.type,
          status: t.status,
          featureId: null,
          milestoneId: null,
          externalTicketRef: null,
          estimatedPoints: null,
          actualPoints: null,
          completedDate: null,
          blockedReason: null
        }).subscribe(() => this.load());
      }
    });
  }

  openEditDialog() {
    const m = this.milestone();
    if (!m) return;
    const title = prompt('Milestone title:', m.title);
    if (title?.trim() && title !== m.title) {
      this.svc.update(this.milestoneId, { title: title.trim() }).subscribe(() => this.load());
    }
  }

  deleteMilestone() {
    const m = this.milestone();
    if (!m) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: { title: 'Delete milestone', message: `Delete "${m.title}"? Tasks will be unlinked but not deleted.` }
    });
    ref.afterClosed().subscribe(r => {
      if (r) {
        this.svc.delete(this.milestoneId).subscribe(() => {
          window.history.back();
        });
      }
    });
  }
}
