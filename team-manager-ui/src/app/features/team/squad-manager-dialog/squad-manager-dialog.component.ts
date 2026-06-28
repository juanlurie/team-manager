import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { IconButtonComponent } from '../../../shared/components/icon-btn/icon-btn.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SearchableMultiSelectComponent } from '../../../shared/components/searchable-multi-select/searchable-multi-select.component';
import { Squad } from '../../../core/models/squad.model';
import { TeamMember } from '../../../core/models/team-member.model';
import { SquadService } from '../../../core/services/squad.service';
import { TeamMemberService } from '../../../core/services/team-member.service';

const PALETTE = ['#42A5F5','#66BB6A','#FFA726','#AB47BC','#26C6DA','#EC407A','#8D6E63','#78909C'];

@Component({
  selector: 'app-squad-manager-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule, MatTooltipModule, MatProgressSpinnerModule, ConfirmDialogComponent, IconButtonComponent, SearchableMultiSelectComponent],
  styles: [`
    .squad-card { border-radius:10px;border:1px solid rgba(255,255,255,0.08);margin-bottom:10px; }
    .squad-header { display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer; }
    .squad-header:hover { background:rgba(255,255,255,0.04); }
    .color-dot { width:20px;height:20px;border-radius:50%;cursor:pointer;border:2px solid transparent;flex-shrink:0; }
    .color-dot.selected { border-color:rgba(255,255,255,0.8); }
  `],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div style="display:flex;align-items:center;gap:10px;padding:20px 24px 0">
      <mat-icon style="color:#5c6bc0">groups</mat-icon>
      <span style="font-size:1rem;font-weight:600">Manage Squads</span>
      <span style="flex:1"></span>
      <app-icon-btn icon="close" tooltip="Close" (btnClick)="close()" />
    </div>

    <mat-dialog-content style="padding:16px 24px;min-height:200px">
      @if (loading()) {
        <div style="display:flex;justify-content:center;padding:40px">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {

        <!-- New squad inline form -->
        @if (showNewForm()) {
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;padding:12px 14px;
                      border-radius:10px;border:1px solid rgba(92,107,192,0.3);background:rgba(92,107,192,0.05)">
            <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
              @for (c of palette; track c) {
                <div class="color-dot" [class.selected]="newColor === c"
                     [style.background]="c" (click)="newColor = c"></div>
              }
            </div>
            <input matInput [(ngModel)]="newName" placeholder="Squad name"
                   style="flex:1;background:transparent;border:none;outline:none;color:inherit;font-size:0.9rem"
                   (keydown.enter)="createSquad()" (keydown.escape)="showNewForm.set(false)">
            <app-icon-btn icon="check" color="primary" tooltip="Create squad"
                          [disabled]="!newName.trim() || saving()" (btnClick)="createSquad()" />
            <app-icon-btn icon="close" tooltip="Cancel" (btnClick)="showNewForm.set(false)" />
          </div>
        }

        @for (squad of squads(); track squad.id) {
          <div class="squad-card">
            <!-- Squad header -->
            <div class="squad-header" (click)="toggleExpand(squad.id)">
              <span style="width:12px;height:12px;border-radius:50%;flex-shrink:0"
                    [style.background]="squad.color ?? '#9e9e9e'"></span>

              @if (editingId() === squad.id) {
                <!-- Inline edit -->
                <div style="display:flex;gap:6px;align-items:center;flex:1" (click)="$event.stopPropagation()">
                  <div style="display:flex;gap:4px;align-items:center">
                    @for (c of palette; track c) {
                      <div class="color-dot" style="width:14px;height:14px" [class.selected]="editColor === c"
                           [style.background]="c" (click)="editColor = c"></div>
                    }
                  </div>
                  <input [(ngModel)]="editName" style="flex:1;background:transparent;border:none;outline:none;
                         color:inherit;font-size:0.9rem;font-weight:600"
                         (keydown.enter)="saveEdit(squad)" (keydown.escape)="editingId.set(null)">
                  <app-icon-btn icon="check" color="primary"
                                [disabled]="!editName.trim()" (btnClick)="saveEdit(squad)" />
                  <app-icon-btn icon="close" tooltip="Cancel"
                                (btnClick)="editingId.set(null)" />
                </div>
              } @else {
                <span style="font-weight:600;flex:1">{{ squad.name }}</span>
                <span style="font-size:0.72rem;opacity:0.4">{{ squad.members.length }} member{{ squad.members.length !== 1 ? 's' : '' }}</span>
                <app-icon-btn icon="edit" size="sm" tooltip="Rename"
                              (btnClick)="startEdit(squad); $event.stopPropagation()" />
                <app-icon-btn icon="delete" size="sm" [danger]="true" tooltip="Delete squad"
                              (btnClick)="deleteSquad(squad); $event.stopPropagation()" />
                <mat-icon style="opacity:0.3">
                  {{ expandedId() === squad.id ? 'expand_less' : 'expand_more' }}
                </mat-icon>
              }
            </div>

            <!-- Members selector (expanded) -->
            @if (expandedId() === squad.id) {
              <div style="border-top:1px solid rgba(255,255,255,0.06)">
                @if (squad.members.length === 0) {
                  <div style="padding:8px 20px;font-size:0.8rem;opacity:0.35;font-style:italic">No members yet</div>
                }
                <div style="display:flex;align-items:flex-start;gap:8px;padding:6px 14px 6px 20px">
                  <app-searchable-multi-select [options]="allMembers()" label="Members"
                    placeholder="Search members…" [(ngModel)]="addMemberIds[squad.id]" />
                  <button mat-stroked-button style="height:40px;flex-shrink:0;margin-top:4px"
                          [disabled]="isUnchanged(squad)"
                          (click)="saveMembers(squad)">
                    Save
                  </button>
                </div>
              </div>
            }
          </div>
        }

        @if (squads().length === 0 && !showNewForm()) {
          <div style="text-align:center;padding:32px;opacity:0.3;font-size:0.9rem">No squads yet. Create one below.</div>
        }
      }
    </mat-dialog-content>

    <mat-dialog-actions style="padding:8px 24px 20px;gap:8px">
      <button mat-stroked-button (click)="openNewForm()">
        <mat-icon>add</mat-icon> New Squad
      </button>
      <span style="flex:1"></span>
      <button mat-raised-button color="primary" mat-dialog-close>Done</button>
    </mat-dialog-actions>
  `
})
export class SquadManagerDialogComponent implements OnInit {
  private squadSvc   = inject(SquadService);
  private memberSvc  = inject(TeamMemberService);
  private dialog     = inject(MatDialog);
  private dialogRef  = inject(MatDialogRef<SquadManagerDialogComponent>);

  readonly palette = PALETTE;

  squads     = signal<Squad[]>([]);
  allMembers = signal<TeamMember[]>([]);
  loading    = signal(true);
  saving     = signal(false);

  expandedId  = signal<string | null>(null);
  editingId   = signal<string | null>(null);
  showNewForm = signal(false);

  newName  = '';
  newColor: string = PALETTE[0];
  editName  = '';
  editColor = '';

  addMemberIds: Record<string, string[]> = {};

  ngOnInit() {
    this.memberSvc.getAll({ isActive: true }).subscribe(m => this.allMembers.set(m));
    this.loadSquads();
  }

  loadSquads() {
    this.loading.set(true);
    this.squadSvc.getAll().subscribe(s => { this.squads.set(s); this.loading.set(false); });
  }

  toggleExpand(id: string) {
    if (this.editingId() === id) return;
    if (this.expandedId() !== id) {
      const squad = this.squads().find(s => s.id === id);
      if (squad) {
        this.addMemberIds[id] = squad.members.map(m => m.teamMemberId);
      }
    }
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  openNewForm() {
    this.newName = '';
    this.newColor = PALETTE[0];
    this.showNewForm.set(true);
  }

  createSquad() {
    if (!this.newName.trim() || this.saving()) return;
    this.saving.set(true);
    this.squadSvc.create({ name: this.newName.trim(), color: this.newColor }).subscribe({
      next: (squad) => {
        this.squads.update(s => [...s, squad].sort((a, b) => a.name.localeCompare(b.name)));
        this.showNewForm.set(false);
        this.newName = '';
        this.saving.set(false);
        this.expandedId.set(squad.id);
      },
      error: () => this.saving.set(false)
    });
  }

  startEdit(squad: Squad) {
    this.editingId.set(squad.id);
    this.editName  = squad.name;
    this.editColor = squad.color ?? PALETTE[0];
  }

  saveEdit(squad: Squad) {
    if (!this.editName.trim()) return;
    this.squadSvc.update(squad.id, { name: this.editName.trim(), color: this.editColor }).subscribe(updated => {
      this.squads.update(s => s.map(sq => sq.id === updated.id ? updated : sq).sort((a, b) => a.name.localeCompare(b.name)));
      this.editingId.set(null);
    });
  }

  deleteSquad(squad: Squad) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: `Delete squad "${squad.name}"?`, message: "Members won't be removed from the team.", danger: true }
    }).afterClosed().subscribe(ok => {
      if (ok) this.squadSvc.delete(squad.id).subscribe(() => {
        this.squads.update(s => s.filter(sq => sq.id !== squad.id));
        if (this.expandedId() === squad.id) this.expandedId.set(null);
      });
    });
  }

  saveMembers(squad: Squad) {
    const newIds = this.addMemberIds[squad.id] ?? [];
    this.squadSvc.setMembers(squad.id, newIds).subscribe(updated => {
      this.squads.update(s => s.map(sq => sq.id === updated.id ? updated : sq));
    });
  }

  isUnchanged(squad: Squad): boolean {
    const current = this.addMemberIds[squad.id];
    if (!current || current.length === 0) return true;
    const existing = squad.members.map(m => m.teamMemberId);
    if (current.length !== existing.length) return false;
    const s = new Set(current);
    return existing.every(v => s.has(v));
  }

  close() { this.dialogRef.close(); }
}
