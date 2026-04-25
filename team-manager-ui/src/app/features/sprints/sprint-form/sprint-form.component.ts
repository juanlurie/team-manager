import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { Observable } from 'rxjs';
import { Sprint, PI } from '../../../core/models/sprint.model';
import { SprintService } from '../../../core/services/sprint.service';

function toDateString(d: Date | null): string {
  if (!d) return '';
  return d.toISOString().split('T')[0];
}

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

@Component({
  selector: 'app-sprint-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatCheckboxModule,
    MatDatepickerModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>{{ title }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" style="display:flex;flex-direction:column;gap:12px;padding-top:8px">
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name">
        </mat-form-field>
        <div style="display:flex;gap:12px">
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Start Date</mat-label>
            <input matInput [matDatepicker]="startPicker" formControlName="startDate">
            <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>End Date</mat-label>
            <input matInput [matDatepicker]="endPicker" formControlName="endDate" [min]="form.value.startDate ?? null">
            <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
          </mat-form-field>
        </div>
        @if (!data.piMode) {
          <mat-form-field appearance="outline">
            <mat-label>PI (optional)</mat-label>
            <mat-select formControlName="piId">
              <mat-option [value]="null">None</mat-option>
              @for (pi of data.pis; track pi.id) {
                <mat-option [value]="pi.id">{{ pi.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Sprint Number (optional)</mat-label>
            <input matInput formControlName="sprintNumber" type="number">
          </mat-form-field>
          <mat-checkbox formControlName="isInnovationSprint">Innovation / IP Sprint</mat-checkbox>
          <mat-form-field appearance="outline">
            <mat-label>Sprint Goal (optional)</mat-label>
            <textarea matInput formControlName="goal" rows="2" placeholder="What does this sprint aim to achieve?"></textarea>
          </mat-form-field>
        }
        @if (data.piMode) {
          <mat-form-field appearance="outline">
            <mat-label>Description (optional)</mat-label>
            <textarea matInput formControlName="description" rows="3"></textarea>
          </mat-form-field>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid">Save</button>
    </mat-dialog-actions>
  `
})
export class SprintFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(SprintService);
  private dialogRef = inject(MatDialogRef<SprintFormComponent>);
  data: { sprint?: Sprint; pis?: PI[]; piMode?: boolean } = inject(MAT_DIALOG_DATA);

  get title() {
    return this.data.piMode
      ? (this.data.sprint ? 'Edit PI' : 'New PI')
      : (this.data.sprint ? 'Edit Sprint' : 'New Sprint');
  }

  form = this.fb.group({
    name: ['', Validators.required],
    startDate: [null as Date | null, Validators.required],
    endDate: [null as Date | null, Validators.required],
    piId: [null as string | null],
    sprintNumber: [null as number | null],
    isInnovationSprint: [false],
    goal: [null as string | null],
    description: [null as string | null]
  });

  ngOnInit() {
    if (this.data.sprint) {
      this.form.patchValue({
        ...this.data.sprint,
        startDate: parseDate(this.data.sprint.startDate),
        endDate: parseDate(this.data.sprint.endDate),
      } as any);
    }
  }

  save() {
    if (this.form.invalid) return;
    const val = this.form.value;
    const startDate = toDateString(val.startDate as Date | null);
    const endDate = toDateString(val.endDate as Date | null);
    let obs: Observable<unknown>;
    if (this.data.piMode) {
      const req = { name: val.name!, startDate, endDate, description: val.description ?? null };
      obs = this.data.sprint ? this.svc.updatePI(this.data.sprint.id, req) : this.svc.createPI(req);
    } else {
      const req = { name: val.name!, startDate, endDate,
        piId: val.piId ?? null, sprintNumber: val.sprintNumber ?? null,
        isInnovationSprint: val.isInnovationSprint ?? false,
        goal: val.goal ?? null };
      obs = this.data.sprint ? this.svc.updateSprint(this.data.sprint.id, req) : this.svc.createSprint(req);
    }
    obs.subscribe(() => this.dialogRef.close(true));
  }
}
