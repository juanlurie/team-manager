import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
// Opened through MatDialog rather than rendered in the template, so it is not a template import.
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { IconButtonComponent } from '../../../shared/components/icon-btn/icon-btn.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Team } from '../../../core/models/team.model';
import { TeamService } from '../../../core/services/team.service';

/**
 * Its own component, sibling to squad-manager-dialog rather than folded into it: that dialog
 * already carries list + inline create + inline edit + a member picker, and per CLAUDE.md must
 * not absorb team management too.
 */
@Component({
  selector: 'app-team-manager-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule, MatTooltipModule, MatProgressSpinnerModule, IconButtonComponent],
  styles: [`
    .team-card { border-radius:10px;border:1px solid rgba(255,255,255,0.08);margin-bottom:10px; }
    .team-header { display:flex;align-items:center;gap:10px;padding:12px 14px; }
    .squad-chip { font-size:0.68rem;font-weight:600;padding:2px 7px;border-radius:6px; }
    .err { color:#ef9a9a;font-size:0.78rem;padding:4px 2px 0; }
  `],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div style="display:flex;align-items:center;gap:10px;padding:20px 24px 0">
      <mat-icon style="color:#26a69a">workspaces</mat-icon>
      <span style="font-size:1rem;font-weight:600">Manage Teams</span>
      <span style="flex:1"></span>
      <app-icon-btn icon="close" tooltip="Close" (btnClick)="close()" />
    </div>

    <mat-dialog-content style="padding:16px 24px;min-height:200px">
      @if (loading()) {
        <div style="display:flex;justify-content:center;padding:40px">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      } @else {

        @if (showNewForm()) {
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px;padding:12px 14px;
                      border-radius:10px;border:1px solid rgba(38,166,154,0.3);background:rgba(38,166,154,0.05)">
            <mat-icon style="opacity:0.5;flex-shrink:0">workspaces</mat-icon>
            <input matInput [(ngModel)]="newName" placeholder="Team name"
                   style="flex:1;background:transparent;border:none;outline:none;color:inherit;font-size:0.9rem"
                   (keydown.enter)="createTeam()" (keydown.escape)="cancelNew()">
            <app-icon-btn icon="check" color="primary" tooltip="Create team"
                          [disabled]="!newName.trim() || saving()" (btnClick)="createTeam()" />
            <app-icon-btn icon="close" tooltip="Cancel" (btnClick)="cancelNew()" />
          </div>
          @if (newError()) { <div class="err">{{ newError() }}</div> }
        }

        @for (team of teams(); track team.id) {
          <div class="team-card">
            <div class="team-header">
              <mat-icon style="opacity:0.45;flex-shrink:0">workspaces</mat-icon>

              @if (editingId() === team.id) {
                <div style="display:flex;gap:6px;align-items:center;flex:1">
                  <input [(ngModel)]="editName" style="flex:1;background:transparent;border:none;outline:none;
                         color:inherit;font-size:0.9rem;font-weight:600"
                         (keydown.enter)="saveEdit(team)" (keydown.escape)="editingId.set(null)">
                  <app-icon-btn icon="check" color="primary"
                                [disabled]="!editName.trim()" (btnClick)="saveEdit(team)" />
                  <app-icon-btn icon="close" tooltip="Cancel" (btnClick)="editingId.set(null)" />
                </div>
              } @else {
                <span style="font-weight:600;flex:1">{{ team.name }}</span>
                <span style="font-size:0.72rem;opacity:0.4">
                  {{ team.squads.length }} squad{{ team.squads.length !== 1 ? 's' : '' }}
                </span>
                <app-icon-btn icon="edit" size="sm" tooltip="Rename" (btnClick)="startEdit(team)" />
                <app-icon-btn icon="delete" size="sm" [danger]="true" tooltip="Delete team"
                              (btnClick)="deleteTeam(team)" />
              }
            </div>

            @if (editingId() === team.id && editError()) {
              <div class="err" style="padding:0 14px 10px">{{ editError() }}</div>
            }

            @if (team.squads.length > 0) {
              <div style="display:flex;flex-wrap:wrap;gap:4px;padding:0 14px 12px">
                @for (sq of team.squads; track sq.id) {
                  <span class="squad-chip"
                        [style.background]="squadBg(sq.color)"
                        [style.color]="sq.color ?? '#9e9e9e'">{{ sq.name }}</span>
                }
              </div>
            }
          </div>
        }

        @if (teams().length === 0 && !showNewForm()) {
          <div style="text-align:center;padding:32px;opacity:0.3;font-size:0.9rem">No teams yet. Create one below.</div>
        }
      }
    </mat-dialog-content>

    <mat-dialog-actions style="padding:8px 24px 20px;gap:8px">
      <button mat-stroked-button (click)="openNewForm()">
        <mat-icon>add</mat-icon> New Team
      </button>
      <span style="flex:1"></span>
      <button mat-raised-button color="primary" (click)="close()">Done</button>
    </mat-dialog-actions>
  `
})
export class TeamManagerDialogComponent implements OnInit {
  private teamSvc   = inject(TeamService);
  private dialog    = inject(MatDialog);
  private dialogRef = inject(MatDialogRef<TeamManagerDialogComponent>);

  teams   = signal<Team[]>([]);
  loading = signal(true);
  saving  = signal(false);

  editingId   = signal<string | null>(null);
  showNewForm = signal(false);
  newError    = signal<string | null>(null);
  editError   = signal<string | null>(null);

  /** Set once anything changes, so the caller only reloads members when it needs to. */
  private changed = false;

  newName  = '';
  editName = '';

  ngOnInit() { this.loadTeams(); }

  loadTeams() {
    this.loading.set(true);
    this.teamSvc.getAll().subscribe({
      next: t => { this.teams.set(t); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openNewForm() {
    this.newName = '';
    this.newError.set(null);
    this.showNewForm.set(true);
  }

  cancelNew() {
    this.showNewForm.set(false);
    this.newError.set(null);
  }

  createTeam() {
    if (!this.newName.trim() || this.saving()) return;
    this.saving.set(true);
    this.newError.set(null);
    this.teamSvc.create({ name: this.newName.trim() }).subscribe({
      next: team => {
        this.teams.update(t => [...t, team].sort((a, b) => a.name.localeCompare(b.name)));
        this.showNewForm.set(false);
        this.newName = '';
        this.saving.set(false);
        this.changed = true;
      },
      error: err => {
        this.saving.set(false);
        this.newError.set(this.conflictMessage(err, 'create'));
      }
    });
  }

  startEdit(team: Team) {
    this.editingId.set(team.id);
    this.editName = team.name;
    this.editError.set(null);
  }

  saveEdit(team: Team) {
    if (!this.editName.trim()) return;
    this.editError.set(null);
    this.teamSvc.update(team.id, { name: this.editName.trim() }).subscribe({
      next: updated => {
        this.teams.update(t => t.map(x => x.id === updated.id ? updated : x)
          .sort((a, b) => a.name.localeCompare(b.name)));
        this.editingId.set(null);
        this.changed = true;
      },
      error: err => this.editError.set(this.conflictMessage(err, 'rename'))
    });
  }

  deleteTeam(team: Team) {
    // Says what actually happens: the FK is SetNull, so the squads survive and are detached.
    const message = team.squads.length > 0
      ? `Its ${team.squads.length} squad${team.squads.length !== 1 ? 's' : ''} won't be deleted — they'll just no longer belong to a team. Squad members are unaffected.`
      : "This team has no squads. Nothing else will be affected.";

    this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: { title: `Delete team "${team.name}"?`, message, danger: true }
    }).afterClosed().subscribe(ok => {
      if (ok) this.teamSvc.delete(team.id).subscribe(() => {
        this.teams.update(t => t.filter(x => x.id !== team.id));
        this.changed = true;
      });
    });
  }

  private conflictMessage(err: { status?: number; error?: { message?: string } }, verb: string): string {
    if (err?.status === 409) return err.error?.message ?? 'A team with that name already exists.';
    return `Could not ${verb} the team. Please try again.`;
  }

  squadBg(color: string | null) { return color ? color + '28' : 'rgba(158,158,158,0.12)'; }

  close() { this.dialogRef.close(this.changed); }
}
