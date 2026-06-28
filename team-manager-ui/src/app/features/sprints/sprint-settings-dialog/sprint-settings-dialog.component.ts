import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Sprint, PI } from '../../../core/models/sprint.model';
import { SprintService } from '../../../core/services/sprint.service';
import { SprintFormComponent } from '../sprint-form/sprint-form.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sprint-settings-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatListModule],
  template: `
    <h2 mat-dialog-title style="display:flex;align-items:center;gap:8px">
      <mat-icon>settings</mat-icon> Sprint Settings
    </h2>
    <mat-dialog-content>
      <div class="settings-list">
        <button class="settings-item" matRipple (click)="editSprint()">
          <mat-icon>edit</mat-icon>
          <div class="item-text">
            <div class="item-title">Edit Sprint</div>
            <div class="item-desc">Change name, dates, goal</div>
          </div>
          <mat-icon class="item-arrow">chevron_right</mat-icon>
        </button>
        @if (data.sprint.isActive) {
          <button class="settings-item warn" matRipple (click)="closeSprint()">
            <mat-icon>lock_clock</mat-icon>
            <div class="item-text">
              <div class="item-title">Close Sprint</div>
              <div class="item-desc">Mark sprint as inactive</div>
            </div>
            <mat-icon class="item-arrow">chevron_right</mat-icon>
          </button>
        } @else {
          <div class="settings-item closed">
            <mat-icon>lock</mat-icon>
            <div class="item-text">
              <div class="item-title">Sprint Closed</div>
              <div class="item-desc">This sprint is no longer active</div>
            </div>
          </div>
        }
        <button class="settings-item danger" matRipple (click)="deleteSprint()">
          <mat-icon>delete</mat-icon>
          <div class="item-text">
            <div class="item-title">Delete Sprint</div>
            <div class="item-desc">Permanently remove this sprint</div>
          </div>
          <mat-icon class="item-arrow">chevron_right</mat-icon>
        </button>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .settings-list { display:flex;flex-direction:column;gap:4px;padding:8px 0; }
    .settings-item {
      display:flex;align-items:center;gap:12px;width:100%;padding:12px 16px;
      border:none;border-radius:8px;background:transparent;color:inherit;
      cursor:pointer;text-align:left;transition:background 0.15s;
    }
    .settings-item:hover { background:rgba(255,255,255,0.06); }
    .settings-item mat-icon:first-child { opacity:0.7; }
    .item-text { flex:1;min-width:0; }
    .item-title { font-size:0.95rem;font-weight:500; }
    .item-desc { font-size:0.75rem;opacity:0.5;margin-top:2px; }
    .item-arrow { opacity:0.3; }
    .warn mat-icon:first-child { color:#ff9800; }
    .danger mat-icon:first-child { color:#ef5350; }
    .closed { opacity:0.5;cursor:default; }
    .closed:hover { background:transparent; }
    .closed mat-icon:first-child { color:#9e9e9e; }
  `]
})
export class SprintSettingsDialogComponent {
  private dialogRef = inject(MatDialogRef<SprintSettingsDialogComponent>);
  private sprintSvc = inject(SprintService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);
  data: { sprint: Sprint; pis: PI[] } = inject(MAT_DIALOG_DATA);

  editSprint() {
    const ref = this.dialog.open(SprintFormComponent, {
      width: '480px',
      data: { sprint: this.data.sprint, pis: this.data.pis }
    });
    ref.afterClosed().subscribe(result => {
      if (result) {
        this.snack.open('Sprint updated', 'OK', { duration: 2000 });
        this.dialogRef.close('reload');
      }
    });
  }

  closeSprint() {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        title: 'Close Sprint?',
        message: `This will mark "${this.data.sprint.name}" as inactive. You can still view it but no new members will be auto-added.`,
        danger: true
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.sprintSvc.closeSprint(this.data.sprint.id).subscribe(() => {
        this.snack.open('Sprint closed', 'OK', { duration: 2000 });
        this.dialogRef.close('reload');
      });
    });
  }

  deleteSprint() {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        title: 'Delete Sprint?',
        message: `This will permanently delete "${this.data.sprint.name}" and all associated data. This cannot be undone.`,
        danger: true
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.sprintSvc.deleteSprint(this.data.sprint.id).subscribe(() => {
        this.snack.open('Sprint deleted', 'OK', { duration: 2000 });
        this.dialogRef.close('delete');
      });
    });
  }
}
