import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { TeamMemberService } from '../../core/services/team-member.service';
import { SquadService } from '../../core/services/squad.service';
import { TeamMember } from '../../core/models/team-member.model';
import { Squad } from '../../core/models/squad.model';

export interface ApproveAccessRequestDialogData {
  name: string;
  email: string;
}

export interface ApproveAccessRequestDialogResult {
  teamMemberId: string | null;
  squadId: string | null;
}

@Component({
  selector: 'app-approve-access-request-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatRadioModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatAutocompleteModule
  ],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <h2 mat-dialog-title>Approve access?</h2>
    <mat-dialog-content style="padding-top:8px">
      <p style="margin:0 0 14px">Grant access to <strong>{{ data.name }}</strong> ({{ data.email }})?</p>

      <mat-radio-group [(ngModel)]="mode" style="display:flex;flex-direction:column;gap:10px">
        <mat-radio-button value="new">Create a new team member</mat-radio-button>
        <mat-radio-button value="link">Link to an existing team member</mat-radio-button>
      </mat-radio-group>

      @if (mode === 'link') {
        <mat-form-field appearance="outline" style="width:100%;margin-top:12px">
          <mat-label>Team member</mat-label>
          <input matInput [ngModel]="memberQuery()" (ngModelChange)="onQueryChange($event)"
                 [matAutocomplete]="auto" placeholder="Search by name">
          <mat-autocomplete #auto="matAutocomplete" (optionSelected)="selectMember($event.option.value)">
            @for (m of filteredMembers(); track m.id) {
              <mat-option [value]="m">{{ m.firstName }} {{ m.lastName }} — {{ m.email }}</mat-option>
            }
          </mat-autocomplete>
        </mat-form-field>
      }

      <!-- Shown in both modes: a reactivated member needs placing as much as a new one. -->
      <mat-form-field appearance="outline" style="width:100%;margin-top:4px">
        <mat-label>Squad <span style="opacity:0.5;font-size:0.85em">(optional)</span></mat-label>
        <mat-select [ngModel]="selectedSquadId()" (ngModelChange)="selectedSquadId.set($event)">
          <mat-option [value]="null"><em>No squad</em></mat-option>
          @for (s of squads(); track s.id) {
            <mat-option [value]="s.id">{{ s.name }}</mat-option>
          }
        </mat-select>
        <mat-hint>{{ squadHint() }}</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <!-- Never blocked on the squad: approving without one is a normal outcome. -->
      <button mat-raised-button color="primary" [disabled]="mode === 'link' && !selectedMember()" (click)="confirm()">
        Approve
      </button>
    </mat-dialog-actions>
  `
})
export class ApproveAccessRequestDialogComponent {
  dialogRef = inject(MatDialogRef<ApproveAccessRequestDialogComponent>);
  data: ApproveAccessRequestDialogData = inject(MAT_DIALOG_DATA);
  private teamMemberService = inject(TeamMemberService);
  private squadService = inject(SquadService);

  mode: 'new' | 'link' = 'new';
  memberQuery = signal('');
  selectedMember = signal<TeamMember | null>(null);
  allMembers = signal<TeamMember[]>([]);
  squads = signal<Squad[]>([]);
  selectedSquadId = signal<string | null>(null);

  filteredMembers = computed(() => {
    const q = this.memberQuery().trim().toLowerCase();
    const members = this.allMembers();
    if (!q) return members.slice(0, 20);
    return members
      .filter(m => `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(q))
      .slice(0, 20);
  });

  /**
   * The team is a consequence of the squad, never a separate choice — the API reads it from the
   * squad and refuses a client-supplied one. Showing it read-only is what makes the consequence
   * visible at the moment the reviewer picks.
   */
  squadHint = computed(() => {
    const id = this.selectedSquadId();
    if (!id) return 'No squad assigned';
    const squad = this.squads().find(s => s.id === id);
    return squad?.teamName ? `Team: ${squad.teamName}` : 'This squad has no team';
  });

  constructor() {
    this.teamMemberService.getAll({ isActive: true }).subscribe({
      next: (members) => this.allMembers.set(members),
      error: () => {}
    });
    this.squadService.getAll().subscribe({
      next: (squads) => this.squads.set(squads),
      error: () => {}
    });
  }

  onQueryChange(value: string) {
    this.memberQuery.set(value);
    const selected = this.selectedMember();
    if (selected && `${selected.firstName} ${selected.lastName} — ${selected.email}` !== value) {
      this.selectedMember.set(null);
    }
  }

  selectMember(member: TeamMember) {
    this.selectedMember.set(member);
    this.memberQuery.set(`${member.firstName} ${member.lastName} — ${member.email}`);
  }

  confirm() {
    this.dialogRef.close({
      teamMemberId: this.mode === 'link' ? this.selectedMember()!.id : null,
      squadId: this.selectedSquadId()
    } as ApproveAccessRequestDialogResult);
  }
}
