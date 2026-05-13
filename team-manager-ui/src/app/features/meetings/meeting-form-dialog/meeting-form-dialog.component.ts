import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MeetingSessionService } from '../../../core/services/meeting-session.service';
import { MeetingSession } from '../../../core/models/meeting-session.model';

export interface MeetingFormData {
  session?: MeetingSession;
}

@Component({
  selector: 'app-meeting-form-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Edit Session' : 'Create Meeting Session' }}</h2>

    <mat-dialog-content>
      <div style="display:flex;flex-direction:column;gap:16px;padding-top:8px">
        <!-- Title -->
        <mat-form-field appearance="fill">
          <mat-label>Title</mat-label>
          <input matInput [(ngModel)]="title" required maxlength="200" placeholder="Sprint Planning">
        </mat-form-field>

        <!-- Description -->
        <mat-form-field appearance="fill">
          <mat-label>Description (optional)</mat-label>
          <textarea matInput [(ngModel)]="description" maxlength="2000" rows="3"
                    placeholder="Agenda, goals, etc."></textarea>
        </mat-form-field>

        <!-- Date -->
        <mat-form-field appearance="fill">
          <mat-label>Date</mat-label>
          <input matInput [matDatepicker]="picker" [(ngModel)]="date" required>
          <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>

        <!-- Start / End Time -->
        <div style="display:flex;gap:12px">
          <mat-form-field appearance="fill" style="flex:1">
            <mat-label>Start Time</mat-label>
            <input matInput type="time" [(ngModel)]="startTime" required>
          </mat-form-field>
          <mat-form-field appearance="fill" style="flex:1">
            <mat-label>End Time</mat-label>
            <input matInput type="time" [(ngModel)]="endTime" required>
          </mat-form-field>
        </div>

        <!-- Location -->
        <mat-form-field appearance="fill">
          <mat-label>Location</mat-label>
          <mat-select [(ngModel)]="location" required>
            <mat-option value="Remote">Remote</mat-option>
            <mat-option value="OnSite">On Site</mat-option>
            <mat-option value="Hybrid">Hybrid</mat-option>
          </mat-select>
        </mat-form-field>

        <!-- Slot counts (only for create) -->
        @if (!isEdit) {
          <div style="display:flex;gap:12px">
            <mat-form-field appearance="fill" style="flex:1">
              <mat-label>Team Member Slots</mat-label>
              <input matInput type="number" [(ngModel)]="teamMemberSlotCount" min="0" max="20" required>
            </mat-form-field>
            <mat-form-field appearance="fill" style="flex:1">
              <mat-label>Facilitator Slots</mat-label>
              <input matInput type="number" [(ngModel)]="facilitatorSlotCount" min="0" max="10" required>
            </mat-form-field>
          </div>
        }

        @if (error()) {
          <div style="color:#ef5350;font-size:0.82rem;padding:4px 0">{{ error() }}</div>
        }
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="saving()">
        {{ saving() ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Session' }}
      </button>
    </mat-dialog-actions>
  `
})
export class MeetingFormDialogComponent {
  private svc = inject(MeetingSessionService);
  private dialogRef = inject(MatDialogRef<MeetingFormDialogComponent>);
  private snack = inject(MatSnackBar);
  data: MeetingFormData = inject(MAT_DIALOG_DATA);

  isEdit = !!this.data?.session;

  title = this.data?.session?.title ?? '';
  description = this.data?.session?.description ?? '';
  date = this.data?.session ? new Date(this.data.session.date) : null;
  startTime = this.data?.session?.startTime ?? '09:00';
  endTime = this.data?.session?.endTime ?? '10:00';
  location = this.data?.session?.location ?? 'Remote';
  teamMemberSlotCount = 3;
  facilitatorSlotCount = 1;

  saving = signal(false);
  error = signal<string | null>(null);

  save() {
    this.error.set(null);

    if (!this.title.trim()) { this.error.set('Title is required'); return; }
    if (!this.date) { this.error.set('Date is required'); return; }
    if (!this.startTime || !this.endTime) { this.error.set('Start and end time are required'); return; }
    if (this.startTime >= this.endTime) { this.error.set('End time must be after start time'); return; }

    this.saving.set(true);
    const dateStr = this.date instanceof Date
      ? this.date.toISOString().split('T')[0]
      : String(this.date);

    if (this.isEdit && this.data.session) {
      this.svc.update(this.data.session.id, {
        title: this.title.trim(),
        description: this.description.trim() || null,
        date: dateStr,
        startTime: this.startTime,
        endTime: this.endTime,
        location: this.location
      }).subscribe({
        next: () => {
          this.snack.open('Session updated', 'OK', { duration: 2000 });
          this.dialogRef.close(true);
        },
        error: (err) => { this.error.set('Failed to update session'); this.saving.set(false); }
      });
    } else {
      this.svc.create({
        title: this.title.trim(),
        description: this.description.trim() || null,
        date: dateStr,
        startTime: this.startTime,
        endTime: this.endTime,
        location: this.location,
        teamMemberSlotCount: this.teamMemberSlotCount,
        facilitatorSlotCount: this.facilitatorSlotCount
      }).subscribe({
        next: () => {
          this.snack.open('Session created', 'OK', { duration: 2000 });
          this.dialogRef.close(true);
        },
        error: (err) => { this.error.set('Failed to create session'); this.saving.set(false); }
      });
    }
  }
}
