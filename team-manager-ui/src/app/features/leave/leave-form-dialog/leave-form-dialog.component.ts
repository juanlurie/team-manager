import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { LeaveService } from '../../../core/services/leave.service';
import { LeaveRecord } from '../../../core/models/leave-record.model';
import { TeamMember } from '../../../core/models/team-member.model';
import { countWorkingDays, isWeekend, toDateString, parseDateString, getSAPublicHolidays } from '../../../core/utils/date-utils';

@Component({
  selector: 'app-leave-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatDatepickerModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <h2 mat-dialog-title>{{ data.record ? 'Edit' : 'Add' }} Leave</h2>
    <mat-dialog-content>
      <form [formGroup]="form" style="display:flex;flex-direction:column;gap:12px;padding-top:8px">
        <mat-form-field appearance="outline">
          <mat-label>Team Member</mat-label>
          <mat-select formControlName="teamMemberId">
            @for (m of data.members; track m.id) {
              <mat-option [value]="m.id">{{ m.firstName }} {{ m.lastName }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <div style="display:flex;gap:12px">
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Start Date</mat-label>
            <input matInput [matDatepicker]="startPicker" formControlName="startDate"
                   (dateChange)="onDateChange()" [matDatepickerFilter]="noWeekends">
            <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>End Date</mat-label>
            <input matInput [matDatepicker]="endPicker" formControlName="endDate"
                   (dateChange)="onDateChange()" [matDatepickerFilter]="noWeekends"
                   [min]="form.value.startDate ?? null">
            <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
          </mat-form-field>
        </div>

        @if (dayCalc()) {
          <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;background:rgba(255,255,255,0.05);font-size:0.875rem">
            <mat-icon style="font-size:18px;width:18px;height:18px;opacity:0.7">info</mat-icon>
            <span>
              <strong>{{ dayCalc()!.days }} working day{{ dayCalc()!.days !== 1 ? 's' : '' }}</strong>
              @if (dayCalc()!.holidaysSkipped > 0) {
                <span style="opacity:0.6"> · {{ dayCalc()!.holidaysSkipped }} public holiday{{ dayCalc()!.holidaysSkipped !== 1 ? 's' : '' }} excluded</span>
              }
            </span>
          </div>
        }

        <div style="display:flex;gap:12px">
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Type</mat-label>
            <mat-select formControlName="type">
              <mat-option value="Annual">Annual</mat-option>
              <mat-option value="Sick">Sick</mat-option>
              <mat-option value="Birthday">Birthday</mat-option>
              <mat-option value="Loyalty">Loyalty</mat-option>
              <mat-option value="Discretionary">Discretionary</mat-option>
              <mat-option value="FamilyResponsibility">Family Responsibility</mat-option>
              <mat-option value="Other">Other</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Days</mat-label>
            <input matInput formControlName="daysCount" type="number" step="0.5">
            <mat-hint>Auto-calculated; adjust if needed</mat-hint>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Notes (optional)</mat-label>
          <textarea matInput formControlName="notes" rows="2"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid">Save</button>
    </mat-dialog-actions>
  `
})
export class LeaveFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(LeaveService);
  private dialogRef = inject(MatDialogRef<LeaveFormDialogComponent>);
  data: { members: TeamMember[]; record?: LeaveRecord; preselectedMemberId?: string } = inject(MAT_DIALOG_DATA);

  dayCalc = signal<{ days: number; holidaysSkipped: number } | null>(null);

  form = this.fb.group({
    teamMemberId: ['', Validators.required],
    startDate: [null as Date | null, Validators.required],
    endDate: [null as Date | null, Validators.required],
    type: ['Annual', Validators.required],
    daysCount: [null as number | null, [Validators.required, Validators.min(0.5)]],
    notes: [null as string | null]
  });

  noWeekends = (d: Date | null) => !d || !isWeekend(d);

  ngOnInit() {
    if (this.data.preselectedMemberId) {
      this.form.patchValue({ teamMemberId: this.data.preselectedMemberId });
    }
    if (this.data.record) {
      const r = this.data.record;
      this.form.patchValue({
        teamMemberId: r.teamMemberId,
        startDate: parseDateString(r.startDate),
        endDate: parseDateString(r.endDate),
        type: r.type,
        daysCount: r.daysCount,
        notes: r.notes
      });
      this.onDateChange();
    }
  }

  onDateChange() {
    const { startDate, endDate } = this.form.value;
    if (!startDate || !endDate || startDate > endDate) { this.dayCalc.set(null); return; }
    const calc = countWorkingDays(startDate, endDate);
    this.dayCalc.set(calc);
    this.form.patchValue({ daysCount: calc.days }, { emitEvent: false });
  }

  save() {
    if (this.form.invalid) return;
    const val = this.form.value;
    const request = {
      teamMemberId: val.teamMemberId!,
      startDate: toDateString(val.startDate!),
      endDate: toDateString(val.endDate!),
      type: val.type!,
      daysCount: val.daysCount!,
      notes: val.notes ?? null
    };
    const obs = this.data.record
      ? this.svc.update(this.data.record.id, request)
      : this.svc.create(request);
    obs.subscribe(() => this.dialogRef.close(true));
  }
}
