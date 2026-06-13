import { Component, inject, afterNextRender, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { DatePickerComponent } from '../../../../shared/components/date-picker/date-picker.component';
import { MemberTask } from '../../../../core/models/member-personal.model';

export interface TaskFormResult {
  title: string;
  dueDate: string | null;
}

export interface TaskFormDialogData {
  task?: MemberTask;
  mode: 'add' | 'edit';
}

@Component({
  selector: 'app-member-task-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, DatePickerComponent],
  template: `
    <div class="dialog-wrapper">
      <h2 mat-dialog-title>{{ data.mode === 'add' ? 'Add Task' : 'Edit Task' }}</h2>
      <div mat-dialog-content class="dialog-content">
        <div class="field-row">
          <label class="field-label">Title</label>
          <input type="text" [(ngModel)]="title" placeholder="e.g. Review PR #42"
                 class="title-field" (keydown.enter)="save()" />
        </div>

        <div class="field-row">
          <label class="field-label">Due date</label>
          <app-date-picker [(ngModel)]="dueDate" appearance="outline" placeholder="No due date" label="Due date"></app-date-picker>
        </div>

        @if (data.mode === 'edit' && data.task) {
          <div class="meta-info">
            <span class="meta-label">Created</span>
            <span class="meta-value">{{ data.task.createdAt | date:'d MMM y, HH:mm' }}</span>
            @if (data.task.completedAt) {
              <span class="meta-label" style="margin-top:6px">Completed</span>
              <span class="meta-value">{{ data.task.completedAt | date:'d MMM y, HH:mm' }}</span>
            }
          </div>
        }
      </div>

      <div mat-dialog-actions align="end">
        <button mat-button (click)="dialogRef.close()">Cancel</button>
        <button mat-flat-button color="primary" (click)="save()" [disabled]="!title.trim()">
          {{ data.mode === 'add' ? 'Add' : 'Save' }}
        </button>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    .dialog-wrapper { min-width: 320px; max-width: 400px; }
    .dialog-content { display: flex; flex-direction: column; gap: 18px; padding-top: 8px; }
    .field-row { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 0.78rem; font-weight: 600; opacity: 0.55; text-transform: uppercase; letter-spacing: 0.04em; }
    .title-field {
      padding: 10px 12px; background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: inherit;
      font-size: 0.9rem; outline: none; font-family: inherit;
    }
    .title-field:focus { border-color: rgba(100,181,246,0.5); }
    .meta-info { display: flex; flex-direction: column; gap: 4px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.07); }
    .meta-label { font-size: 0.72rem; opacity: 0.4; text-transform: uppercase; letter-spacing: 0.03em; }
    .meta-value { font-size: 0.82rem; opacity: 0.6; }
  `]
})
export class MemberTaskFormDialogComponent {
  dialogRef = inject(MatDialogRef<MemberTaskFormDialogComponent>);
  data: TaskFormDialogData = inject(MAT_DIALOG_DATA);

  title = this.data.task?.title ?? '';
  dueDate: Date | null = this.data.task?.dueDate ? new Date(this.data.task.dueDate + 'T00:00:00') : null;

  constructor() {
    afterNextRender(() => {
      const input = document.querySelector('.title-field') as HTMLInputElement;
      input?.focus();
      if (input) input.setSelectionRange(input.value.length, input.value.length);
    });
  }

  save() {
    const title = this.title.trim();
    if (!title) return;
    const dueDate = this.dueDate
      ? this.dueDate.toISOString().substring(0, 10)
      : null;
    this.dialogRef.close({ title, dueDate } as TaskFormResult);
  }
}
