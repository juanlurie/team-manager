import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { CreateDiscussionPointRequest } from '../../../core/models/discussion-point.model';

@Component({
  selector: 'app-discussion-points-edit-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule],
  template: `
    <h2 mat-dialog-title>{{ data.editId ? 'Edit Point' : 'New Discussion Point' }}</h2>
    <div mat-dialog-content style="display:flex;flex-direction:column;gap:12px;min-width:400px">
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
          <input matInput [matDatepicker]="startDatePicker" [(ngModel)]="form.startDate">
          <mat-datepicker-toggle matIconSuffix [for]="startDatePicker"></mat-datepicker-toggle>
          <mat-datepicker #startDatePicker></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline" style="flex:1;min-width:160px">
          <mat-label>Target date</mat-label>
          <input matInput [matDatepicker]="targetDatePicker" [(ngModel)]="form.targetDate">
          <mat-datepicker-toggle matIconSuffix [for]="targetDatePicker"></mat-datepicker-toggle>
          <mat-datepicker #targetDatePicker></mat-datepicker>
        </mat-form-field>
      </div>
    </div>

    <div mat-dialog-actions style="justify-content:flex-end;gap:8px">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-raised-button color="primary" [disabled]="!form.title?.trim()"
              (click)="dialogRef.close(form)">
        {{ data.editId ? 'Save Changes' : 'Add Point' }}
      </button>
    </div>
  `
})
export class DiscussionPointsEditDialogComponent {
  readonly dialogRef = inject(MatDialogRef<DiscussionPointsEditDialogComponent>);
  readonly data = inject<{ editId: string | null; form: CreateDiscussionPointRequest }>(MAT_DIALOG_DATA);

  form: CreateDiscussionPointRequest = { ...this.data.form };
}