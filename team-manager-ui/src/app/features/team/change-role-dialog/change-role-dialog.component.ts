import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TeamMember, MemberRole, MEMBER_ROLES, roleLabel } from '../../../core/models/team-member.model';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { AuthService } from '../../../core/auth/auth.service';

export interface ChangeRoleDialogData {
  member: TeamMember;
}

/**
 * Role assignment on its own, deliberately separate from the member form: on the API it is a
 * separate endpoint with its own gate, and mixing it back into the general save is what allowed
 * self-promotion. The Admin rules mirrored here are UX -- they save the user a 403, they are not
 * the boundary.
 */
@Component({
  selector: 'app-change-role-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div style="display:flex;align-items:center;gap:10px;padding:20px 24px 0">
      <mat-icon style="color:#5c6bc0">badge</mat-icon>
      <span style="font-size:1rem;font-weight:600">Change role</span>
    </div>

    <mat-dialog-content style="padding:16px 24px 0">
      <div style="font-size:0.85rem;opacity:0.6;margin-bottom:14px">
        {{ data.member.firstName }} {{ data.member.lastName }} — currently
        <strong>{{ currentLabel }}</strong>
      </div>

      <mat-form-field appearance="outline" style="width:100%">
        <mat-label>Role</mat-label>
        <mat-select [(ngModel)]="selectedRole" [disabled]="saving()">
          @for (r of options; track r.id) {
            <mat-option [value]="r.id">{{ r.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      @if (selectedRole === 'Admin' && data.member.role !== 'Admin') {
        <div style="display:flex;gap:8px;font-size:0.78rem;opacity:0.6;margin-top:-8px">
          <mat-icon style="font-size:16px;width:16px;height:16px">info</mat-icon>
          <span>An Admin has every permission, including granting and revoking Admin.</span>
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="saving()">Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="saving() || !changed">
        @if (saving()) {
          <mat-spinner diameter="18" style="display:inline-block;vertical-align:middle"></mat-spinner>
        } @else { Save }
      </button>
    </mat-dialog-actions>
  `
})
export class ChangeRoleDialogComponent {
  private svc = inject(TeamMemberService);
  private auth = inject(AuthService);
  private dialogRef = inject(MatDialogRef<ChangeRoleDialogComponent>);
  data: ChangeRoleDialogData = inject(MAT_DIALOG_DATA);

  saving = signal(false);
  selectedRole: MemberRole = this.data.member.role;
  currentLabel = roleLabel(this.data.member.role);

  /**
   * Admin is only offerable by an Admin -- the server refuses it from anyone else. The
   * already-Admin case keeps the member's current role visible in the select rather than
   * rendering it blank.
   */
  readonly options = MEMBER_ROLES.filter(
    r => r.id !== 'Admin' || this.auth.isAdmin() || this.data.member.role === 'Admin');

  get changed() { return this.selectedRole !== this.data.member.role; }

  save() {
    if (!this.changed) { this.dialogRef.close(false); return; }
    this.saving.set(true);
    this.svc.changeRole(this.data.member.id, this.selectedRole).subscribe({
      // Refusals (403 escalation, 400 last-Admin) already surface as a snackbar via the error
      // interceptor, which reads the API's `{ error }` body -- just re-enable the form.
      next: () => this.dialogRef.close(true),
      error: () => this.saving.set(false)
    });
  }
}
