import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Feature } from '../../../core/models/feature.model';
import { FeatureService } from '../../../core/services/feature.service';

@Component({
  selector: 'app-feature-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatCheckboxModule],
  template: `
    <h2 mat-dialog-title>{{ data.feature ? 'Edit' : 'Add' }} Feature</h2>
    <mat-dialog-content>
      <form [formGroup]="form" style="display:flex;flex-direction:column;gap:12px;padding-top:8px;min-width:340px">
        <mat-form-field appearance="outline">
          <mat-label>Title</mat-label>
          <input matInput formControlName="title" placeholder="e.g. User authentication flow">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Ticket reference <span style="opacity:0.5;font-size:0.85em">(optional)</span></mat-label>
          <input matInput formControlName="externalTicketRef" placeholder="PROJ-123">
        </mat-form-field>
        <div style="display:flex;gap:12px">
          <mat-form-field appearance="outline" style="flex:2">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status">
              <mat-option value="Planned">Planned</mat-option>
              <mat-option value="InProgress">In Progress</mat-option>
              <mat-option value="Completed">Completed</mat-option>
              <mat-option value="ReadyForRelease">Ready for Release</mat-option>
              <mat-option value="Released">Released</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Est. days <span style="opacity:0.5;font-size:0.85em">(optional)</span></mat-label>
            <input matInput type="number" formControlName="estimatedDays" placeholder="0" min="0" step="0.5">
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Start date <span style="opacity:0.5;font-size:0.85em">(optional)</span></mat-label>
          <input matInput type="date" formControlName="startDate">
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Description <span style="opacity:0.5;font-size:0.85em">(optional)</span></mat-label>
          <textarea matInput formControlName="description" rows="2"></textarea>
        </mat-form-field>
        <mat-checkbox formControlName="isUnplanned" style="font-size:0.85rem">
          Unplanned work (not in original PI scope)
        </mat-checkbox>
      </form>
    </mat-dialog-content>
    @if (saveError()) {
      <div style="margin:0 24px 4px;padding:8px 12px;border-radius:6px;background:rgba(239,83,80,0.12);
                  border:1px solid rgba(239,83,80,0.3);font-size:0.78rem;color:#ef9a9a">
        Failed to save. Please try again.
      </div>
    }
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid || saving()">
        {{ saving() ? 'Saving…' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `
})
export class FeatureFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(FeatureService);
  private dialogRef = inject(MatDialogRef<FeatureFormDialogComponent>);
  data: { sprintId: string; feature?: Feature } = inject(MAT_DIALOG_DATA);

  saving = signal(false);
  saveError = signal(false);

  form = this.fb.group({
    title: ['', Validators.required],
    externalTicketRef: [null as string | null],
    status: ['Planned', Validators.required],
    description: [null as string | null],
    estimatedDays: [null as number | null],
    isUnplanned: [false],
    startDate: [null as string | null]
  });

  ngOnInit() {
    if (this.data.feature) this.form.patchValue(this.data.feature as any);
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.saveError.set(false);
    const val = this.form.value;
    const rawDays = val.estimatedDays;
    const req = {
      title: val.title!,
      description: val.description || null,
      externalTicketRef: val.externalTicketRef || null,
      status: val.status!,
      estimatedDays: rawDays !== null && rawDays !== undefined && rawDays !== ('' as any) ? Number(rawDays) : null,
      isUnplanned: val.isUnplanned ?? false,
      startDate: val.startDate || null
    };
    const obs = this.data.feature
      ? this.svc.update(this.data.sprintId, this.data.feature.id, req)
      : this.svc.create(this.data.sprintId, req);
    obs.subscribe({
      next: () => this.dialogRef.close(true),
      error: () => { this.saving.set(false); this.saveError.set(true); }
    });
  }
}
