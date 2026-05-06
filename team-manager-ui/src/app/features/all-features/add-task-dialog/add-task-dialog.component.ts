import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { WorkItemType } from '../../../core/models/work-item.model';
import { HttpClient } from '@angular/common/http';
import { API_BASE } from '../../../core/services/api.config';

export interface AddTaskDialogData {
  featureId: string;
  sprintId: string;
}

export interface AddTaskDialogResult {
  title: string;
  type: WorkItemType;
  sprintMemberId: string;
}

interface SprintMember {
  id: string;
  memberName: string;
}

@Component({
  selector: 'app-add-task-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatSelectModule],
  template: `
    <div style="min-width:320px">
      <h2 mat-dialog-title>Add Task</h2>
      <div mat-dialog-content style="display:flex;flex-direction:column;gap:16px;padding-top:8px">
        <div>
          <label style="font-size:0.78rem;font-weight:600;opacity:0.55;text-transform:uppercase;letter-spacing:0.04em;display:block;margin-bottom:6px">Title</label>
          <input type="text" [(ngModel)]="title" placeholder="Task title"
                 style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.04);
                        border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:inherit;
                        font-size:0.9rem;outline:none;font-family:inherit"
                 (keydown.enter)="save()" />
        </div>
        <div>
          <label style="font-size:0.78rem;font-weight:600;opacity:0.55;text-transform:uppercase;letter-spacing:0.04em;display:block;margin-bottom:6px">Type</label>
          <select [(ngModel)]="type" style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.04);
                        border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:inherit;
                        font-size:0.9rem;outline:none;font-family:inherit;appearance:auto">
            @for (t of types; track t) {
              <option [value]="t">{{ t }}</option>
            }
          </select>
        </div>
        <div>
          <label style="font-size:0.78rem;font-weight:600;opacity:0.55;text-transform:uppercase;letter-spacing:0.04em;display:block;margin-bottom:6px">Assignee</label>
          <select [(ngModel)]="selectedMemberId" style="width:100%;padding:10px 12px;background:rgba(255,255,255,0.04);
                        border:1px solid rgba(255,255,255,0.12);border-radius:8px;color:inherit;
                        font-size:0.9rem;outline:none;font-family:inherit;appearance:auto">
            @for (m of members(); track m.id) {
              <option [value]="m.id">{{ m.memberName }}</option>
            }
          </select>
        </div>
      </div>
      <div mat-dialog-actions align="end">
        <button mat-button (click)="dialogRef.close()">Cancel</button>
        <button mat-flat-button color="primary" (click)="save()" [disabled]="!title.trim() || !selectedMemberId">Add</button>
      </div>
    </div>
  `
})
export class AddTaskDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<AddTaskDialogComponent>);
  data: AddTaskDialogData = inject(MAT_DIALOG_DATA);
  private http = inject(HttpClient);

  title = '';
  type: WorkItemType = 'Task';
  types: WorkItemType[] = ['Task', 'Analysis', 'Design', 'Dev', 'QA', 'Bug', 'Release'];
  members = signal<SprintMember[]>([]);
  selectedMemberId = '';

  ngOnInit() {
    this.http.get<SprintMember[]>(`${API_BASE}/sprint-members/sprint/${this.data.sprintId}`)
      .subscribe(members => {
        this.members.set(members);
        if (members.length > 0) this.selectedMemberId = members[0].id;
      });
  }

  save() {
    const title = this.title.trim();
    if (!title || !this.selectedMemberId) return;
    this.dialogRef.close({ title, type: this.type, sprintMemberId: this.selectedMemberId } as AddTaskDialogResult);
  }
}
