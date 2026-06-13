import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { WorkItem } from '../../../core/models/work-item.model';
import { Sprint } from '../../../core/models/sprint.model';
import { SprintService } from '../../../core/services/sprint.service';
import { WorkItemService } from '../../../core/services/work-item.service';

@Component({
  selector: 'app-carry-over-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h2 mat-dialog-title>Carry Over Task</h2>
    <mat-dialog-content style="min-width:320px">
      <p style="margin:0 0 16px;font-size:0.85rem;opacity:0.6">
        Move <strong style="opacity:1">{{ data.workItem.title }}</strong> to another sprint as a new Planned task.
      </p>
      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Target sprint</mat-label>
        <mat-select [(ngModel)]="selectedSprintId">
          @for (s of sprints(); track s.id) {
            <mat-option [value]="s.id">{{ s.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      @if (error()) {
        <div style="margin-top:4px;padding:8px 12px;border-radius:6px;
                    background:rgba(239,83,80,0.12);border:1px solid rgba(239,83,80,0.3);
                    font-size:0.78rem;color:#ef9a9a">
          Failed to carry over. Please try again.
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary"
              [disabled]="!selectedSprintId || saving()"
              (click)="save()">
        {{ saving() ? 'Carrying over…' : 'Carry Over' }}
      </button>
    </mat-dialog-actions>
  `
})
export class CarryOverDialogComponent implements OnInit {
  private sprintSvc = inject(SprintService);
  private workItemSvc = inject(WorkItemService);
  private dialogRef = inject(MatDialogRef<CarryOverDialogComponent>);
  data: { workItem: WorkItem; currentSprintId: string } = inject(MAT_DIALOG_DATA);

  sprints = signal<Sprint[]>([]);
  selectedSprintId: string | null = null;
  saving = signal(false);
  error = signal(false);

  ngOnInit() {
    this.sprintSvc.getSprints().subscribe(all => {
      this.sprints.set(all.filter(s => s.id !== this.data.currentSprintId));
    });
  }

  save() {
    if (!this.selectedSprintId) return;
    this.saving.set(true);
    this.error.set(false);
    this.workItemSvc.carryOver(this.data.workItem.id, this.selectedSprintId).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => { this.saving.set(false); this.error.set(true); }
    });
  }
}
