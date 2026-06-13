import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Sprint } from '../../../core/models/sprint.model';
import { SprintService } from '../../../core/services/sprint.service';

@Component({
  selector: 'app-sprint-clone-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCheckboxModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h2 mat-dialog-title>Clone Sprint</h2>
    <mat-dialog-content>
      <p style="margin:0 0 16px;opacity:0.55;font-size:0.85rem">
        Cloning <strong style="opacity:1">{{ source.name }}</strong>
      </p>
      <form [formGroup]="form" style="display:flex;flex-direction:column;gap:12px;min-width:320px">
        <mat-form-field appearance="outline">
          <mat-label>Sprint name</mat-label>
          <input matInput formControlName="name">
        </mat-form-field>
        <div style="display:flex;gap:12px">
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Start date</mat-label>
            <input matInput type="date" formControlName="startDate">
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>End date</mat-label>
            <input matInput type="date" formControlName="endDate">
          </mat-form-field>
        </div>
        <mat-checkbox formControlName="copyMembers" style="font-size:0.85rem">
          Copy members (with capacity settings)
        </mat-checkbox>
      </form>
    </mat-dialog-content>
    @if (saveError()) {
      <div style="margin:0 24px 4px;padding:8px 12px;border-radius:6px;
                  background:rgba(239,83,80,0.12);border:1px solid rgba(239,83,80,0.3);
                  font-size:0.78rem;color:#ef9a9a">
        Failed to clone. Please try again.
      </div>
    }
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary"
              [disabled]="form.invalid || saving()"
              (click)="save()">
        {{ saving() ? 'Cloning…' : 'Clone' }}
      </button>
    </mat-dialog-actions>
  `
})
export class SprintCloneDialogComponent {
  private fb = inject(FormBuilder);
  private svc = inject(SprintService);
  private dialogRef = inject(MatDialogRef<SprintCloneDialogComponent>);
  source: Sprint = inject(MAT_DIALOG_DATA);

  saving = signal(false);
  saveError = signal(false);

  form = this.fb.group({
    name:        [`Copy of ${this.source.name}`, Validators.required],
    startDate:   [this.source.startDate, Validators.required],
    endDate:     [this.source.endDate,   Validators.required],
    copyMembers: [true]
  });

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.saveError.set(false);
    const v = this.form.value;
    this.svc.cloneSprint(this.source.id, {
      name:        v.name!,
      startDate:   v.startDate!,
      endDate:     v.endDate!,
      copyMembers: v.copyMembers ?? true
    }).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => { this.saving.set(false); this.saveError.set(true); }
    });
  }
}
