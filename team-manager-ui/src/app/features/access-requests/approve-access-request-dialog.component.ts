import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { TeamMemberService } from '../../core/services/team-member.service';
import { TeamMember } from '../../core/models/team-member.model';

export interface ApproveAccessRequestDialogData {
  name: string;
  email: string;
}

export interface ApproveAccessRequestDialogResult {
  teamMemberId: string | null;
}

@Component({
  selector: 'app-approve-access-request-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatRadioModule, MatFormFieldModule, MatInputModule, MatAutocompleteModule
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
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
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

  mode: 'new' | 'link' = 'new';
  memberQuery = signal('');
  selectedMember = signal<TeamMember | null>(null);
  allMembers = signal<TeamMember[]>([]);

  filteredMembers = computed(() => {
    const q = this.memberQuery().trim().toLowerCase();
    const members = this.allMembers();
    if (!q) return members.slice(0, 20);
    return members
      .filter(m => `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(q))
      .slice(0, 20);
  });

  constructor() {
    this.teamMemberService.getAll({ isActive: true }).subscribe({
      next: (members) => this.allMembers.set(members),
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
      teamMemberId: this.mode === 'link' ? this.selectedMember()!.id : null
    } as ApproveAccessRequestDialogResult);
  }
}
