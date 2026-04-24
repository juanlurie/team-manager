import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { WorkItem } from '../../../core/models/work-item.model';
import { Feature } from '../../../core/models/feature.model';
import { WorkItemService } from '../../../core/services/work-item.service';
import { FeatureService } from '../../../core/services/feature.service';
import { CommentsComponent } from '../../../shared/comments/comments.component';

const NEW_FEATURE_KEY = '__new__';

@Component({
  selector: 'app-work-item-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule, MatDividerModule, CommentsComponent],
  template: `
    <h2 mat-dialog-title>{{ data.workItem ? 'Edit task' : 'Add task' }}</h2>
    <mat-dialog-content>
      <div style="display:flex;flex-direction:column;gap:12px;padding-top:8px;min-width:340px">

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

        <!-- Inline new feature fields -->
        @if (creatingFeature()) {
          <div style="padding:12px;border-radius:8px;background:rgba(100,181,246,0.06);border:1px solid rgba(100,181,246,0.15);display:flex;flex-direction:column;gap:10px">
            <div style="font-size:0.75rem;font-weight:600;opacity:0.5;text-transform:uppercase;letter-spacing:0.06em">New feature</div>
            <mat-form-field appearance="outline" style="margin-bottom:-8px">
              <mat-label>Feature title</mat-label>
              <input matInput [(ngModel)]="newFeatureTitle" placeholder="e.g. User authentication flow">
            </mat-form-field>
            <mat-form-field appearance="outline" style="margin-bottom:-8px">
              <mat-label>Ticket reference <span style="opacity:0.5;font-size:0.85em">(optional)</span></mat-label>
              <input matInput [(ngModel)]="newFeatureRef" placeholder="PROJ-123">
            </mat-form-field>
          </div>
        }

        <mat-divider></mat-divider>

        <!-- Task fields -->
        <form [formGroup]="form" style="display:flex;flex-direction:column;gap:12px">

          <mat-form-field appearance="outline">
            <mat-label>Task title</mat-label>
            <input matInput formControlName="title">
          </mat-form-field>

          <div style="display:flex;gap:12px">
            <mat-form-field appearance="outline" style="flex:1">
              <mat-label>Type</mat-label>
              <mat-select formControlName="type">
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
              <mat-select formControlName="status">
                <mat-option value="Planned">Planned</mat-option>
                <mat-option value="InProgress">In Progress</mat-option>
                <mat-option value="Blocked">Blocked</mat-option>
                <mat-option value="Completed">Completed</mat-option>
                <mat-option value="ReadyForRelease">Ready for Release</mat-option>
                <mat-option value="Released">Released</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline">
            <mat-label>Ticket reference <span style="opacity:0.5;font-size:0.85em">(optional)</span></mat-label>
            <input matInput formControlName="externalTicketRef" placeholder="PROJ-123">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Description <span style="opacity:0.5;font-size:0.85em">(optional)</span></mat-label>
            <textarea matInput formControlName="description" rows="2"></textarea>
          </mat-form-field>

        </form>
      </div>

      @if (data.workItem) {
        <mat-divider style="margin-top:8px"></mat-divider>
        <app-comments entityType="WorkItem" [entityId]="data.workItem.id"></app-comments>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()"
              [disabled]="form.invalid || (creatingFeature() && !newFeatureTitle.trim()) || saving()">
        {{ saving() ? 'Saving…' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `
})
export class WorkItemFormComponent implements OnInit {
  readonly NEW_FEATURE_KEY = NEW_FEATURE_KEY;

  private fb = inject(FormBuilder);
  private svc = inject(WorkItemService);
  private featureSvc = inject(FeatureService);
  private dialogRef = inject(MatDialogRef<WorkItemFormComponent>);
  data: { sprintId?: string; sprintMemberId: string; workItem?: WorkItem; features?: Feature[]; memberCrafts?: string[] } = inject(MAT_DIALOG_DATA);

  selectedFeatureId: string | null = null;
  newFeatureTitle = '';
  newFeatureRef = '';
  creatingFeature = signal(false);
  saving = signal(false);
  activeFeatures = computed(() => (this.data.features ?? []).filter(f => f.isActive));

  form = this.fb.group({
    title: ['', Validators.required],
    description: [null as string | null],
    type: ['Dev', Validators.required],
    status: ['Planned', Validators.required],
    externalTicketRef: [null as string | null],
  });

  ngOnInit() {
    if (this.data.workItem) {
      this.form.patchValue(this.data.workItem as any);
      this.selectedFeatureId = this.data.workItem.featureId;
    } else if (this.data.memberCrafts?.length) {
      const craft = this.data.memberCrafts[0];
      const type = craft.startsWith('Dev') ? 'Dev' : craft;
      this.form.patchValue({ type });
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

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);

    const doSave = (featureId: string | null) => {
      const val = this.form.value;
      const req = {
        title: val.title!, description: val.description ?? null,
        type: val.type!, status: val.status!,
        featureId,
        externalTicketRef: val.externalTicketRef ?? null,
        estimatedPoints: null, actualPoints: null, completedDate: null
      };
      const obs = this.data.workItem
        ? this.svc.update(this.data.workItem.id, req)
        : this.svc.create(this.data.sprintMemberId, req);
      obs.subscribe({ next: () => this.dialogRef.close(true), error: () => this.saving.set(false) });
    };

    if (this.creatingFeature() && this.data.sprintId && this.newFeatureTitle.trim()) {
      this.featureSvc.create(this.data.sprintId, {
        title: this.newFeatureTitle.trim(),
        description: null,
        externalTicketRef: this.newFeatureRef.trim() || null,
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
