import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Squad } from '../../../core/models/squad.model';
import { TeamMember } from '../../../core/models/team-member.model';
import { SquadService } from '../../../core/services/squad.service';
import { TeamMemberService } from '../../../core/services/team-member.service';

const PALETTE = ['#42A5F5','#66BB6A','#FFA726','#AB47BC','#26C6DA','#EC407A','#8D6E63','#78909C'];

@Component({
  selector: 'app-squad-manager-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatTooltipModule, MatProgressSpinnerModule,
    ConfirmDialogComponent],
  styles: [`
    .squad-card { border-radius:10px;border:1px solid rgba(255,255,255,0.08);margin-bottom:10px; }
    .squad-header { display:flex;align-items:center;gap:10px;padding:12px 14px;cursor:pointer; }
    .squad-header:hover { background:rgba(255,255,255,0.04); }
    .member-row { display:flex;align-items:center;gap:8px;padding:6px 14px 6px 20px;font-size:0.85rem; }
    .member-row:hover { background:rgba(255,255,255,0.03);border-radius:6px; }
    .color-dot { width:20px;height:20px;border-radius:50%;cursor:pointer;border:2px solid transparent;flex-shrink:0; }
    .color-dot.selected { border-color:rgba(255,255,255,0.8); }
    ::ng-deep .icon-btn-sm { width:32px!important;height:32px!important;line-height:32px!important; }
    ::ng-deep .icon-btn-sm .mat-mdc-button-persistent-ripple { border-radius:50%!important; }
    ::ng-deep .icon-btn-sm mat-icon { font-size:16px!important;width:16px!important;height:16px!important;line-height:16px!important; }
    ::ng-deep .remove-btn { opacity:0.4;transition:opacity 0.15s; }
    ::ng-deep .remove-btn:hover { opacity:1!important; }
  `],
  template: `
    <div style="display:flex;align-items:center;gap:10px;padding:20px 24px 0">
      <mat-icon style="color:#5c6bc0">groups</mat-icon>
      <span style="font-size:1rem;font-weight:600">Manage Squads</span>
      <span style="flex:1"></span>
      <button mat-icon-button mat-dialog-close><mat-icon>close</mat-icon></button>
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
            <button mat-icon-button color="primary" [disabled]="!newName.trim() || saving()"
                    (click)="createSquad()" matTooltip="Create squad">
              <mat-icon>check</mat-icon>
            </button>
            <button mat-icon-button (click)="showNewForm.set(false)"><mat-icon>close</mat-icon></button>
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
                  <button mat-icon-button class="icon-btn-sm" color="primary"
                          [disabled]="!editName.trim()" (click)="saveEdit(squad)">
                    <mat-icon>check</mat-icon>
                  </button>
                  <button mat-icon-button class="icon-btn-sm"
                          (click)="editingId.set(null); $event.stopPropagation()">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              } @else {
                <span style="font-weight:600;flex:1">{{ squad.name }}</span>
                <span style="font-size:0.72rem;opacity:0.4">{{ squad.members.length }} member{{ squad.members.length !== 1 ? 's' : '' }}</span>
                <button mat-icon-button class="icon-btn-sm" (click)="startEdit(squad); $event.stopPropagation()" matTooltip="Rename">
                  <mat-icon style="opacity:0.5">edit</mat-icon>
                </button>
                <button mat-icon-button class="icon-btn-sm" (click)="deleteSquad(squad); $event.stopPropagation()" matTooltip="Delete squad">
                  <mat-icon style="color:#ef5350;opacity:0.5">delete</mat-icon>
                </button>
                <mat-icon style="opacity:0.3">
                  {{ expandedId() === squad.id ? 'expand_less' : 'expand_more' }}
                </mat-icon>
              }
            </div>

            <!-- Members list (expanded) -->
            @if (expandedId() === squad.id) {
              <div style="border-top:1px solid rgba(255,255,255,0.06);padding-bottom:8px">
                @for (m of squad.members; track m.teamMemberId) {
                  <div class="member-row">
                    <span style="flex:1">{{ m.fullName }}</span>
                    <button mat-icon-button class="icon-btn-sm remove-btn"
                            (click)="removeMember(squad, m.teamMemberId)" matTooltip="Remove from squad">
                      <mat-icon style="color:#ef5350">remove_circle_outline</mat-icon>
                    </button>
                  </div>
                }
                @if (squad.members.length === 0) {
                  <div style="padding:8px 20px;font-size:0.8rem;opacity:0.35;font-style:italic">No members yet</div>
                }
                <!-- Add member row -->
                <div style="display:flex;align-items:center;gap:8px;padding:6px 14px 6px 20px">
                  <mat-form-field appearance="outline" subscriptSizing="dynamic" style="flex:1">
                    <mat-label>Add member</mat-label>
                    <mat-select [(ngModel)]="addMemberIds[squad.id]" multiple>
                      @for (m of availableMembers(squad); track m.id) {
                        <mat-option [value]="m.id">{{ m.firstName }} {{ m.lastName }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <button mat-stroked-button style="height:40px;flex-shrink:0"
                          [disabled]="!addMemberIds[squad.id]?.length"
                          (click)="addMembers(squad)">
                    Add
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

  removeMember(squad: Squad, memberId: string) {
    const newIds = squad.members.filter(m => m.teamMemberId !== memberId).map(m => m.teamMemberId);
    this.squadSvc.setMembers(squad.id, newIds).subscribe(updated => {
      this.squads.update(s => s.map(sq => sq.id === updated.id ? updated : sq));
    });
  }

  addMembers(squad: Squad) {
    const newIds = [...squad.members.map(m => m.teamMemberId), ...(this.addMemberIds[squad.id] ?? [])];
    this.squadSvc.setMembers(squad.id, newIds).subscribe(updated => {
      this.squads.update(s => s.map(sq => sq.id === updated.id ? updated : sq));
      this.addMemberIds[squad.id] = [];
    });
  }

  availableMembers(squad: Squad): TeamMember[] {
    const inSquad = new Set(squad.members.map(m => m.teamMemberId));
    return this.allMembers().filter(m => !inSquad.has(m.id));
  }
}
