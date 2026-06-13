import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DiscussionTask, CreateDiscussionTaskRequest } from '../../../core/models/discussion-point.model';
import { TeamMember } from '../../../core/models/team-member.model';
import { DiscussionPointService } from '../../../core/services/discussion-point.service';
import { TeamMemberService } from '../../../core/services/team-member.service';

export interface TaskDialogData {
  discussionPointId: string;
  task?: DiscussionTask;
  teamMembers: TeamMember[];
}

@Component({
  selector: 'app-discussion-points-task-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatInputModule, MatFormFieldModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule, MatCheckboxModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div style="padding:4px 4px 0">
      <h2 mat-dialog-title style="margin:0 0 16px;font-size:1.2rem;font-weight:600">
        {{ data.task ? 'Edit Task' : 'Add Task' }}
      </h2>
      <div mat-dialog-content style="display:flex;flex-direction:column;gap:12px;min-width:360px">
        <mat-form-field appearance="outline">
          <mat-label>Title</mat-label>
          <input matInput [(ngModel)]="form.title">
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput [(ngModel)]="form.description" rows="2"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Assignee</mat-label>
          <mat-select [(ngModel)]="form.teamMemberId">
            <mat-option [value]="null">None</mat-option>
            @for (m of teamMembers; track m.id) {
              <mat-option [value]="m.id">{{ m.firstName }} {{ m.lastName }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Due Date</mat-label>
          <input matInput [matDatepicker]="picker" [(ngModel)]="dueDateValue">
          <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>

        @if (data.task) {
          <mat-checkbox [(ngModel)]="form.isCompleted">Completed</mat-checkbox>
        }
      </div>

      <div mat-dialog-actions style="padding:16px 0 4px;justify-content:flex-end;gap:8px">
        <button mat-button (click)="dialogRef.close()">Cancel</button>
        <button mat-flat-button color="primary" (click)="save()" [disabled]="!form.title?.trim()">
          {{ data.task ? 'Update' : 'Add' }}
        </button>
      </div>
    </div>
  `
})
export class DiscussionPointsTaskDialogComponent {
  private dpSvc = inject(DiscussionPointService);
  private tmSvc = inject(TeamMemberService);
  dialogRef = inject(MatDialogRef<DiscussionPointsTaskDialogComponent>);
  data = inject<TaskDialogData>(MAT_DIALOG_DATA);

  teamMembers: TeamMember[] = [];
  dueDateValue: string | null = null;

  form: CreateDiscussionTaskRequest & { isCompleted?: boolean } = {
    title: '',
    description: null,
    teamMemberId: null,
    dueDate: null
  };

  ngOnInit() {
    if (this.data.task) {
      this.form.title = this.data.task.title;
      this.form.description = this.data.task.description;
      this.form.teamMemberId = this.data.task.teamMemberId;
      this.form.dueDate = this.data.task.dueDate;
      this.form.isCompleted = this.data.task.isCompleted;
      this.dueDateValue = this.data.task.dueDate;
    }

    this.tmSvc.getAll({ isActive: true }).subscribe(members => {
      this.teamMembers = members;
    });
  }

  save() {
    this.form.dueDate = this.dueDateValue;

    if (this.data.task) {
      this.dpSvc.updateTask(this.data.discussionPointId, this.data.task.id, this.form).subscribe(result => {
        if (this.form.isCompleted !== undefined && this.form.isCompleted !== this.data.task!.isCompleted) {
          this.dpSvc.toggleTask(this.data.discussionPointId, this.data.task!.id).subscribe(final => {
            this.dialogRef.close(final);
          });
        } else {
          this.dialogRef.close(result);
        }
      });
    } else {
      this.dpSvc.createTask(this.data.discussionPointId, this.form).subscribe(result => {
        this.dialogRef.close(result);
      });
    }
  }
}