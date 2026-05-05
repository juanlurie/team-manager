import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, Subject } from 'rxjs';
import { Sprint } from '../../../core/models/sprint.model';
import { SprintService } from '../../../core/services/sprint.service';
import { RetroAction, CreateRetroActionRequest } from '../../../core/models/retro-action.model';
import { RetroActionService } from '../../../core/services/retro-action.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { IconButtonComponent } from '../../../shared/components/icon-btn/icon-btn.component';

const TEXT_COLS = [
  { key: 'wentWell',    label: '✅ Went Well',      color: '#4caf50', placeholder: 'What went well this sprint?' },
  { key: 'didntGoWell', label: "⚠️ Didn't Go Well", color: '#ff9800', placeholder: "What could've gone better?" },
];

@Component({
  selector: 'app-sprint-retro',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule, MatTooltipModule, ConfirmDialogComponent, IconButtonComponent],
  template: `
    <div style="border-radius:10px;background:rgba(255,255,255,0.03);
                border:1px solid rgba(255,255,255,0.07);overflow:hidden">
      <div style="padding:8px 14px 6px;border-bottom:1px solid rgba(255,255,255,0.06);
                  display:flex;align-items:center;gap:8px">
        @if (saving) {
          <span style="font-size:0.68rem;opacity:0.35;margin-left:auto">Saving…</span>
        }
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))">
        <!-- Went Well + Didn't Go Well (free text) -->
        @for (col of textCols; track col.key) {
          <div style="border-right:1px solid rgba(255,255,255,0.05);padding:10px 14px">
            <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px"
                 [style.color]="col.color">{{ col.label }}</div>
            <textarea
              style="width:100%;background:transparent;border:none;outline:none;resize:none;
                     font-family:inherit;font-size:0.8rem;color:inherit;box-sizing:border-box;
                     line-height:1.5;min-height:160px"
              rows="8"
              [placeholder]="col.placeholder"
              [value]="getValue(col.key)"
              (input)="onInput(col.key, $any($event.target).value)"
              (blur)="saveNow()">
            </textarea>
          </div>
        }

        <!-- Action Items — structured task list -->
        <div style="padding:10px 14px">
          <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;
                      margin-bottom:10px;color:#64b5f6">🎯 Action Items</div>

          <!-- Task list -->
          @for (action of actions(); track action.id) {
            <div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;
                        border-bottom:1px solid rgba(255,255,255,0.05)">
              <!-- Status dot button -->
              <button style="background:none;border:none;cursor:pointer;padding:0;margin-top:2px;flex-shrink:0"
                      [matTooltip]="nextStatusLabel(action.status)"
                      (click)="cycleStatus(action)">
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-top:2px"
                      [style.background]="statusColor(action.status)"></span>
              </button>

              <div style="flex:1;min-width:0">
                <!-- Edit mode -->
                @if (editingId() === action.id) {
                  <div style="display:flex;flex-direction:column;gap:6px">
                    <input style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);
                                  border-radius:5px;padding:4px 8px;font-family:inherit;font-size:0.82rem;
                                  color:inherit;width:100%;box-sizing:border-box"
                           [(ngModel)]="editForm.title" placeholder="Action item…">
                    <input style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);
                                  border-radius:5px;padding:4px 8px;font-family:inherit;font-size:0.78rem;
                                  color:inherit;width:100%;box-sizing:border-box"
                           [(ngModel)]="editForm.assignedTo" placeholder="Assigned to…">
                    <input type="date"
                           style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);
                                  border-radius:5px;padding:4px 8px;font-family:inherit;font-size:0.78rem;
                                  color:inherit;width:100%;box-sizing:border-box;color-scheme:dark"
                           [(ngModel)]="editForm.dueDate">
                    <div style="display:flex;gap:6px;justify-content:flex-end">
                      <button mat-button style="font-size:0.75rem;min-width:0;padding:0 8px"
                              (click)="cancelEdit()">Cancel</button>
                      <button mat-raised-button color="primary"
                              style="font-size:0.75rem;min-width:0;padding:0 10px"
                              (click)="saveEdit(action)">Save</button>
                    </div>
                  </div>
                } @else {
                  <!-- View mode -->
                  <div style="font-size:0.82rem;line-height:1.4"
                       [style.text-decoration]="action.status === 'Done' ? 'line-through' : 'none'"
                       [style.opacity]="action.status === 'Done' ? '0.5' : '1'">
                    {{ action.title }}
                  </div>
                  @if (action.assignedTo || action.dueDate) {
                    <div style="font-size:0.72rem;opacity:0.45;margin-top:2px;display:flex;gap:8px;flex-wrap:wrap">
                      @if (action.assignedTo) { <span>{{ action.assignedTo }}</span> }
                      @if (action.dueDate) {
                        <span [style.color]="isOverdue(action) ? '#ef9a9a' : 'inherit'"
                              [style.opacity]="isOverdue(action) ? '0.85' : 'inherit'">
                          {{ fmtDate(action.dueDate) }}{{ isOverdue(action) ? ' ⚠' : '' }}
                        </span>
                      }
                    </div>
                  }
                }
              </div>

              @if (editingId() !== action.id) {
                <div style="display:flex;gap:0;flex-shrink:0">
                  <app-icon-btn icon="edit" size="sm" tooltip="Edit" (btnClick)="startEdit(action)" />
                  <app-icon-btn icon="delete_outline" size="sm" tooltip="Delete" [danger]="true" (btnClick)="deleteAction(action)" />
                </div>
              }
            </div>
          }

          <!-- Add form -->
          @if (adding()) {
            <div style="display:flex;flex-direction:column;gap:6px;padding-top:10px">
              <input style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);
                            border-radius:5px;padding:5px 10px;font-family:inherit;font-size:0.82rem;
                            color:inherit;width:100%;box-sizing:border-box"
                     [(ngModel)]="newForm.title" placeholder="Action item…" autofocus>
              <input style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);
                            border-radius:5px;padding:5px 10px;font-family:inherit;font-size:0.78rem;
                            color:inherit;width:100%;box-sizing:border-box"
                     [(ngModel)]="newForm.assignedTo" placeholder="Assigned to…">
              <input type="date"
                     style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);
                            border-radius:5px;padding:5px 10px;font-family:inherit;font-size:0.78rem;
                            color:inherit;width:100%;box-sizing:border-box;color-scheme:dark"
                     [(ngModel)]="newForm.dueDate">
              <div style="display:flex;gap:6px;justify-content:flex-end;padding-top:2px">
                <button mat-button style="font-size:0.75rem;min-width:0;padding:0 8px"
                        (click)="cancelAdd()">Cancel</button>
                <button mat-raised-button color="primary"
                        style="font-size:0.75rem;min-width:0;padding:0 10px"
                        [disabled]="!newForm.title.trim()"
                        (click)="addAction()">Add</button>
              </div>
            </div>
          } @else {
            <button mat-button style="margin-top:8px;font-size:0.78rem;opacity:0.6;padding:0 6px"
                    (click)="startAdd()">
              <mat-icon style="font-size:15px;width:15px;height:15px;line-height:15px;vertical-align:middle">add</mat-icon>
              Add action
            </button>
          }
        </div>
      </div>
    </div>
  `
})
export class SprintRetroComponent implements OnInit {
  @Input({ required: true }) sprintId!: string;
  @Input() sprint: Sprint | null = null;

  private svc        = inject(SprintService);
  private actionsSvc = inject(RetroActionService);

  saving    = false;
  readonly textCols = TEXT_COLS;

  actions   = signal<RetroAction[]>([]);
  adding    = signal(false);
  editingId = signal<string | null>(null);

  newForm  = { title: '', assignedTo: '', dueDate: '' };
  editForm = { title: '', assignedTo: '', dueDate: '' };

  private retro = { wentWell: null as string | null, didntGoWell: null as string | null };
  private change$ = new Subject<void>();

  ngOnInit() {
    if (this.sprint) {
      this.retro = {
        wentWell:    this.sprint.retroWentWell    ?? null,
        didntGoWell: this.sprint.retroDidntGoWell ?? null,
      };
    }
    this.change$.pipe(debounceTime(1200)).subscribe(() => this.saveNow());
    this.actionsSvc.getBySprintId(this.sprintId).subscribe(a => this.actions.set(a));
  }

  getValue(key: string): string { return (this.retro as any)[key] ?? ''; }

  onInput(key: string, value: string) {
    (this.retro as any)[key] = value || null;
    this.change$.next();
  }

  saveNow() {
    this.saving = true;
    this.svc.updateRetro(this.sprintId, {
      wentWell:    this.retro.wentWell,
      didntGoWell: this.retro.didntGoWell,
      actionItems: null,
    }).subscribe(() => { this.saving = false; });
  }

  // --- Add ---
  startAdd()  { this.newForm = { title: '', assignedTo: '', dueDate: '' }; this.adding.set(true); }
  cancelAdd() { this.adding.set(false); }

  addAction() {
    if (!this.newForm.title.trim()) return;
    const req: CreateRetroActionRequest = {
      sprintId:   this.sprintId,
      title:      this.newForm.title.trim(),
      notes:      null,
      assignedTo: this.newForm.assignedTo.trim() || null,
      status:     'Open',
      dueDate:    (this.newForm.dueDate as any) || null,
    };
    this.actionsSvc.create(req).subscribe(a => {
      this.actions.update(list => [...list, a]);
      this.adding.set(false);
    });
  }

  // --- Edit ---
  startEdit(action: RetroAction) {
    this.editForm = {
      title:      action.title,
      assignedTo: action.assignedTo ?? '',
      dueDate:    action.dueDate ?? '',
    };
    this.editingId.set(action.id);
  }

  cancelEdit() { this.editingId.set(null); }

  saveEdit(action: RetroAction) {
    const req: CreateRetroActionRequest = {
      sprintId:   this.sprintId,
      title:      this.editForm.title.trim(),
      notes:      action.notes,
      assignedTo: this.editForm.assignedTo.trim() || null,
      status:     action.status,
      dueDate:    (this.editForm.dueDate as any) || null,
    };
    this.actionsSvc.update(action.id, req).subscribe(updated => {
      this.actions.update(list => list.map(a => a.id === updated.id ? updated : a));
      this.editingId.set(null);
    });
  }

  // --- Delete ---
  deleteAction(action: RetroAction) {
    this.actionsSvc.delete(action.id).subscribe(() =>
      this.actions.update(list => list.filter(a => a.id !== action.id))
    );
  }

  // --- Status cycle ---
  cycleStatus(action: RetroAction) {
    const cycle: Record<string, string> = { Open: 'InProgress', InProgress: 'Done', Done: 'Open' };
    const req: CreateRetroActionRequest = {
      sprintId:   this.sprintId,
      title:      action.title,
      notes:      action.notes,
      assignedTo: action.assignedTo,
      status:     cycle[action.status] ?? 'Open',
      dueDate:    action.dueDate,
    };
    this.actionsSvc.update(action.id, req).subscribe(updated =>
      this.actions.update(list => list.map(a => a.id === updated.id ? updated : a))
    );
  }

  isOverdue(a: RetroAction): boolean {
    if (!a.dueDate || a.status === 'Done') return false;
    return a.dueDate < new Date().toISOString().slice(0, 10);
  }

  fmtDate(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  statusColor(s: string): string {
    return { Open: '#64b5f6', InProgress: '#ffb74d', Done: '#81c784' }[s] ?? '#aaa';
  }

  nextStatusLabel(s: string): string {
    return { Open: 'Mark In Progress', InProgress: 'Mark Done', Done: 'Reopen' }[s] ?? '';
  }
}
