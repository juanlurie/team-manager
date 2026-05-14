import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SessionTypeService } from '../../core/services/session-type.service';
import { SessionType } from '../../core/models/session-type.model';

@Component({
  selector: 'app-session-types',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule],
  template: `
    <div style="max-width:800px;margin:0 auto;padding:0 8px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <h2 style="margin:0;font-size:1.3rem;font-weight:700">Meeting Types</h2>
        <button mat-raised-button color="primary" (click)="startAdd()">
          <mat-icon style="font-size:1rem;width:1rem;height:1rem">add</mat-icon>
          Add Type
        </button>
      </div>

      @if (editingNew()) {
        <div class="form-row">
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>Name</mat-label>
            <input matInput [(ngModel)]="editForm.name" placeholder="e.g. Retro">
          </mat-form-field>
          <mat-form-field appearance="outline" style="width:100px">
            <mat-label>Color</mat-label>
            <input matInput [(ngModel)]="editForm.color" type="color" style="padding:2px;height:36px">
          </mat-form-field>
          <button mat-raised-button color="primary" [disabled]="!editForm.name.trim()" (click)="saveNew()">Save</button>
          <button mat-stroked-button (click)="cancelEdit()">Cancel</button>
        </div>
      }

      <div style="display:flex;flex-direction:column;gap:6px">
        @for (t of types(); track t.id) {
          <div class="type-row" [class.editing]="editingId() === t.id">
            @if (editingId() === t.id) {
              <mat-form-field appearance="outline" style="flex:1">
                <mat-label>Name</mat-label>
                <input matInput [(ngModel)]="editForm.name">
              </mat-form-field>
              <mat-form-field appearance="outline" style="width:100px">
                <mat-label>Color</mat-label>
                <input matInput [(ngModel)]="editForm.color" type="color" style="padding:2px;height:36px">
              </mat-form-field>
              <button mat-raised-button color="primary" [disabled]="!editForm.name.trim()" (click)="saveEdit(t.id)">Save</button>
              <button mat-stroked-button (click)="cancelEdit()">Cancel</button>
            } @else {
              <span class="color-dot" [style.background]="t.color"></span>
              <span style="flex:1;font-weight:500">{{ t.name }}</span>
              <span style="opacity:0.4;font-size:0.8rem;margin-right:8px">#{{ t.color }}</span>
              <span class="badge" [class.inactive]="!t.isActive">{{ t.isActive ? 'Active' : 'Inactive' }}</span>
              <button mat-icon-button (click)="startEdit(t)">
                <mat-icon style="font-size:1.1rem">edit</mat-icon>
              </button>
              <button mat-icon-button (click)="deleteType(t.id)" style="color:#ef5350">
                <mat-icon style="font-size:1.1rem">delete</mat-icon>
              </button>
            }
          </div>
        }
        @if (types().length === 0) {
          <div style="text-align:center;padding:48px;opacity:0.35">No types configured. Add one above.</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .form-row { display:flex;gap:8px;align-items:center;margin-bottom:12px; }
    .type-row {
      display:flex;align-items:center;gap:10px;padding:10px 14px;
      border-radius:10px;border:1px solid rgba(255,255,255,0.06);
      background:rgba(255,255,255,0.02);
    }
    .type-row.editing { background:rgba(100,181,246,0.06);border-color:rgba(100,181,246,0.2); }
    .color-dot { width:16px;height:16px;border-radius:50%;flex-shrink:0;border:1px solid rgba(255,255,255,0.15); }
    .badge {
      font-size:0.7rem;padding:2px 8px;border-radius:10px;
      background:rgba(76,175,80,0.15);color:#4caf50;
    }
    .badge.inactive { background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.35); }
  `]
})
export class SessionTypesComponent implements OnInit {
  private svc = inject(SessionTypeService);
  private snack = inject(MatSnackBar);

  types = signal<SessionType[]>([]);
  editingId = signal<string | null>(null);
  editingNew = signal(false);

  editForm = { name: '', color: '#64b5f6' };

  ngOnInit() { this.load(); }

  private load() { this.svc.getAll().subscribe(t => this.types.set(t)); }

  startAdd() { this.editingNew.set(true); this.editingId.set(null); this.editForm = { name: '', color: '#64b5f6' }; }

  startEdit(t: SessionType) { this.editingNew.set(false); this.editingId.set(t.id); this.editForm = { name: t.name, color: t.color }; }

  cancelEdit() { this.editingId.set(null); this.editingNew.set(false); }

  saveNew() {
    if (!this.editForm.name.trim()) return;
    this.svc.create({ name: this.editForm.name.trim(), color: this.editForm.color, isActive: true, sortOrder: this.types().length })
      .subscribe({ next: () => { this.snack.open('Type added', 'OK', { duration: 2000 }); this.editingNew.set(false); this.load(); }, error: () => this.snack.open('Failed', 'OK', { duration: 3000 }) });
  }

  saveEdit(id: string) {
    if (!this.editForm.name.trim()) return;
    this.svc.update(id, { name: this.editForm.name.trim(), color: this.editForm.color, isActive: true, sortOrder: 0 })
      .subscribe({ next: () => { this.snack.open('Type updated', 'OK', { duration: 2000 }); this.editingId.set(null); this.load(); }, error: () => this.snack.open('Failed', 'OK', { duration: 3000 }) });
  }

  deleteType(id: string) {
    if (!confirm('Delete this type?')) return;
    this.svc.delete(id).subscribe({ next: () => { this.snack.open('Type deleted', 'OK', { duration: 2000 }); this.load(); }, error: () => this.snack.open('Failed. It may be in use.', 'OK', { duration: 3000 }) });
  }
}
