import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { AuthService } from '../../core/auth/auth.service';
import { ApiKeyService } from '../../core/services/api-key.service';
import { ApiKey, CreatedApiKeyResult } from '../../core/models/api-key.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatButtonModule,
    MatInputModule, MatFormFieldModule,
    MatProgressSpinnerModule, MatTooltipModule,
    MatDialogModule, MatSnackBarModule, ClipboardModule,
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent {
  private apiKeySvc = inject(ApiKeyService);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private clipboard = inject(Clipboard);

  keys = signal<ApiKey[]>([]);
  loading = signal(true);
  creating = signal(false);
  newName = signal('');

  newlyCreatedKey: CreatedApiKeyResult | null = null;

  get userName(): string {
    const claims = this.auth.identityClaims as any;
    return claims?.name || claims?.preferred_username || 'User';
  }

  get userEmail(): string {
    const claims = this.auth.identityClaims as any;
    return claims?.email || '';
  }

  get userRole(): string {
    const claims = this.auth.identityClaims as any;
    return claims?.role || '';
  }

  get isTeamLead(): boolean {
    return this.auth.hasRole('TeamLead');
  }

  ngOnInit() {
    this.loadKeys();
  }

  loadKeys() {
    this.loading.set(true);
    this.apiKeySvc.getAll().subscribe({
      next: (data) => {
        this.keys.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.keys.set([]);
        this.loading.set(false);
      },
    });
  }

  createKey() {
    const name = this.newName().trim();
    if (!name) return;

    this.creating.set(true);

    this.apiKeySvc.create({ name }).subscribe({
      next: (result) => {
        this.newlyCreatedKey = result;
        this.newName.set('');
        this.creating.set(false);
        this.loadKeys();
      },
      error: (err) => {
        this.snackBar.open(err?.error?.detail || 'Failed to create API key', 'Close', { duration: 5000 });
        this.creating.set(false);
      },
    });
  }

  copyKey(key: string) {
    this.clipboard.copy(key);
    this.snackBar.open('API key copied to clipboard', 'Close', { duration: 3000 });
  }

  dismissNewKey() {
    this.newlyCreatedKey = null;
  }

  revokeKey(id: string, name: string) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Revoke API Key',
        message: `Are you sure you want to revoke "${name}"? This action cannot be undone.`,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (!confirmed) return;

      this.apiKeySvc.revoke(id).subscribe({
        next: () => {
          this.snackBar.open('API key revoked', 'Close', { duration: 3000 });
          this.loadKeys();
        },
        error: (err) => {
          this.snackBar.open(err?.error?.detail || 'Failed to revoke API key', 'Close', { duration: 5000 });
        },
      });
    });
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
