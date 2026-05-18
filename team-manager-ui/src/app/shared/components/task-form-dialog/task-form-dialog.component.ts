import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WorkItem } from '../../../core/models/work-item.model';
import { Feature } from '../../../core/models/feature.model';
import { Milestone } from '../../../core/models/milestone.model';
import { WorkItemService } from '../../../core/services/work-item.service';
import { FeatureService } from '../../../core/services/feature.service';
import { HttpClient } from '@angular/common/http';
import { API_BASE } from '../../../core/services/api.config';
import { CommentsComponent } from '../../comments/comments.component';

interface SprintMember { id: string; memberName: string; }

const NEW_FEATURE_KEY = '__new__';

export interface TaskFormData {
  featureId: string | null;
  sprintId: string | null;
  workItem?: WorkItem | null;
  features?: Feature[];
  milestones?: Milestone[];
  piId?: string | null;
}

@Component({
  selector: 'app-task-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatDividerModule, MatTooltipModule, CommentsComponent],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit task' : 'Add task' }}</h2>
    <mat-dialog-content>
      <div style="display:flex;flex-direction:column;gap:12px;padding-top:8px;min-width:380px">

        <!-- Feature selector -->
        <mat-form-field appearance="outline">
          <mat-label>Feature <span style="opacity:0.5;font-size:0.85em">(optional)</span></mat-label>
          <mat-select [(ngModel)]="selectedFeatureId" (ngModelChange)="onFeatureChange($event)">
            <mat-option [value]="null">— No feature —</mat-option>
            @for (f of activeFeatures(); track f.id) {
              <mat-option [value]="f.id">
                {{ f.externalTicketRef ? f.externalTicketRef + ' · ' : '' }}{{ f.title }}
              </mat-option>
            }
            @if (data.sprintId) {
              <mat-divider></mat-divider>
              <mat-option [value]="NEW_FEATURE_KEY">
                <mat-icon style="font-size:16px;vertical-align:middle;margin-right:4px">add</mat-icon>
                Create new feature…
              </mat-option>
            }
          </mat-select>
        </mat-form-field>

        <!-- Inline new feature -->
        @if (creatingFeature()) {
          <div style="padding:12px;border-radius:8px;background:rgba(100,181,246,0.06);border:1px solid rgba(100,181,246,0.15);display:flex;flex-direction:column;gap:10px">
            <div style="font-size:0.75rem;font-weight:600;opacity:0.5;text-transform:uppercase;letter-spacing:0.06em">New feature</div>
            <mat-form-field appearance="outline" style="margin-bottom:-8px">
              <mat-label>Feature title</mat-label>
              <input matInput [(ngModel)]="newFeatureTitle" placeholder="e.g. User authentication flow"
                     (keydown.enter)="saveNewFeature()">
            </mat-form-field>
            <div style="display:flex;gap:8px">
              <button mat-stroked-button color="primary" (click)="saveNewFeature()"
                      [disabled]="!newFeatureTitle.trim() || newFeatureSaving()">
                {{ newFeatureSaving() ? 'Saving…' : 'Save' }}
              </button>
              <button mat-button (click)="creatingFeature.set(false)">Cancel</button>
            </div>
          </div>
        }

        <!-- Milestone selector -->
        <mat-form-field appearance="outline">
          <mat-label>Milestone <span style="opacity:0.5;font-size:0.85em">(optional)</span></mat-label>
          <mat-select [(ngModel)]="selectedMilestoneId">
            <mat-option [value]="null">— No milestone —</mat-option>
            @for (m of data.milestones ?? []; track m.id) {
              <mat-option [value]="m.id">{{ m.title }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <!-- Title -->
        <mat-form-field appearance="outline">
          <mat-label>Task title</mat-label>
          <input matInput [(ngModel)]="taskTitle" placeholder="What needs to be done?">
        </mat-form-field>

        <!-- Type + Status -->
        <div style="display:flex;gap:12px">
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Type</mat-label>
            <mat-select [(ngModel)]="taskType">
              <mat-option value="Analysis">Analysis</mat-option>
              <mat-option value="Design">Design</mat-option>
              <mat-option value="Dev">Dev</mat-option>
              <mat-option value="QA">QA</mat-option>
              <mat-option value="Bug">Bug</mat-option>
              <mat-option value="Task">Task</mat-option>
              <mat-option value="Release">Release</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Status</mat-label>
            <mat-select [(ngModel)]="taskStatus">
              <mat-option value="Planned">Planned</mat-option>
              <mat-option value="InProgress">In Progress</mat-option>
              <mat-option value="Completed">Completed</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Assignee (add mode only) -->
        @if (!isEdit) {
          <mat-form-field appearance="outline">
            <mat-label>Assignee</mat-label>
            <mat-select [(ngModel)]="selectedMemberId">
              @for (m of members(); track m.id) {
                <mat-option [value]="m.id">{{ m.memberName }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        @if (isEdit && data.workItem) {
          <mat-divider></mat-divider>
          <app-comments entityType="WorkItem" [entityId]="data.workItem.id" [initialCount]="data.workItem.commentCount" />
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button mat-dialog-close>Cancel</button>
      <span style="flex:1"></span>
      <button mat-raised-button color="primary" (click)="save()"
              [disabled]="!taskTitle.trim() || saving() || (creatingFeature() && !newFeatureTitle.trim())">
        {{ saving() ? 'Saving…' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `
})
export class TaskFormDialogComponent implements OnInit {
  readonly NEW_FEATURE_KEY = NEW_FEATURE_KEY;

  private http = inject(HttpClient);
  private svc = inject(WorkItemService);
  private featureSvc = inject(FeatureService);
  private dialogRef = inject(MatDialogRef<TaskFormDialogComponent>);
  data: TaskFormData = inject(MAT_DIALOG_DATA);

  isEdit = !!this.data.workItem;

  selectedFeatureId: string | null = this.data.featureId;
  selectedMilestoneId: string | null = null;
  taskTitle = '';
  taskType = 'Dev';
  taskStatus = 'Planned';
  selectedMemberId = '';

  creatingFeature = signal(false);
  newFeatureTitle = '';
  newFeatureSaving = signal(false);

  members = signal<SprintMember[]>([]);
  saving = signal(false);

  activeFeatures = computed(() => (this.data.features ?? []).filter(f => f.isActive));

  ngOnInit() {
    if (this.isEdit && this.data.workItem) {
      this.taskTitle = this.data.workItem.title;
      this.taskType = this.data.workItem.type;
      this.taskStatus = this.data.workItem.status;
      this.selectedFeatureId = this.data.workItem.featureId;
      this.selectedMilestoneId = this.data.workItem.milestoneId;
    }

    if (!this.isEdit && this.data.sprintId) {
      this.http.get<SprintMember[]>(`${API_BASE}/sprint-members/sprint/${this.data.sprintId}`)
        .subscribe(members => {
          this.members.set(members);
          if (members.length > 0) this.selectedMemberId = members[0].id;
        });
    }
  }

  onFeatureChange(value: string | null) {
    if (value === NEW_FEATURE_KEY) {
      this.creatingFeature.set(true);
      this.selectedFeatureId = null;
    } else {
      this.creatingFeature.set(false);
    }
  }

  saveNewFeature() {
    if (!this.newFeatureTitle.trim() || this.newFeatureSaving() || !this.data.sprintId) return;
    this.newFeatureSaving.set(true);
    this.featureSvc.create(this.data.sprintId, {
      title: this.newFeatureTitle.trim(),
      description: null,
      externalTicketRef: null,
      status: 'Planned',
      estimatedDays: null,
      isUnplanned: false,
      startDate: null
    }).subscribe({
      next: (feature) => {
        this.data.features = [...(this.data.features ?? []), feature];
        this.selectedFeatureId = feature.id;
        this.creatingFeature.set(false);
        this.newFeatureTitle = '';
        this.newFeatureSaving.set(false);
      },
      error: () => this.newFeatureSaving.set(false)
    });
  }

  save() {
    if (!this.taskTitle.trim() || this.saving()) return;
    if (!this.isEdit && !this.selectedMemberId) return;
    this.saving.set(true);

    const doSave = (featureId: string | null) => {
      const milestoneId = this.selectedMilestoneId;
      if (this.isEdit && this.data.workItem) {
        this.svc.update(this.data.workItem.id, {
          title: this.taskTitle.trim(),
          description: this.data.workItem.description,
          type: this.taskType,
          status: this.taskStatus,
          featureId,
          milestoneId,
          externalTicketRef: this.data.workItem.externalTicketRef,
          estimatedPoints: this.data.workItem.estimatedPoints,
          actualPoints: this.data.workItem.actualPoints,
          completedDate: this.data.workItem.completedDate,
          blockedReason: this.data.workItem.blockedReason
        }).subscribe({ next: () => this.dialogRef.close(true), error: () => this.saving.set(false) });
      } else {
        this.svc.create(this.selectedMemberId, {
          title: this.taskTitle.trim(),
          description: null,
          type: this.taskType,
          status: this.taskStatus,
          featureId,
          milestoneId,
          externalTicketRef: null,
          estimatedPoints: null,
          actualPoints: null,
          completedDate: null,
          blockedReason: null
        }).subscribe({ next: () => this.dialogRef.close(true), error: () => this.saving.set(false) });
      }
    };

    if (this.creatingFeature() && this.data.sprintId && this.newFeatureTitle.trim()) {
      this.featureSvc.create(this.data.sprintId, {
        title: this.newFeatureTitle.trim(),
        description: null,
        externalTicketRef: null,
        status: 'Planned',
        estimatedDays: null,
        isUnplanned: false,
        startDate: null
      }).subscribe({ next: f => doSave(f.id), error: () => this.saving.set(false) });
    } else {
      doSave(this.selectedFeatureId);
    }
  }
}
