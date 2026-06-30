import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { ApiKeyService } from '../../../core/services/api-key.service';
import { ApiKey, CreatedApiKeyResult } from '../../../core/models/api-key.model';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CreateApiKeyDialogComponent } from './create-api-key-dialog.component';

@Component({
  selector: 'app-api-keys',
  standalone: true,
  imports: [
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
    ClipboardModule
],
  templateUrl: './api-keys.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrls: ['./api-keys.component.scss'],
})
export class ApiKeysComponent implements OnInit {
  private apiKeySvc = inject(ApiKeyService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private clipboard = inject(Clipboard);

  keys = signal<ApiKey[]>([]);
  loading = signal(true);

  newlyCreatedKey: CreatedApiKeyResult | null = null;
  configCopied = false;

  protected get mcpServerUrl(): string {
    const { protocol, hostname, port } = window.location;
    const mcpHost = hostname.startsWith('team.')
      ? hostname.replace('team.', 'team-mcp.')
      : `team-mcp.${hostname}`;
    return `${protocol}//${mcpHost}${port ? ':' + port : ''}/sse`;
  }

  private get mcpConfig(): string {
    return `{
  "mcpServers": {
    "team-manager": {
      "type": "sse",
      "url": "${this.mcpServerUrl}",
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}`;
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

  openCreateDialog() {
    this.dialog.open(CreateApiKeyDialogComponent, { width: '400px' })
      .afterClosed()
      .subscribe((result: CreatedApiKeyResult | undefined) => {
        if (result) {
          this.newlyCreatedKey = result;
          this.loadKeys();
        }
      });
  }

  copyKey(key: string) {
    this.clipboard.copy(key);
    this.snackBar.open('API key copied to clipboard', 'Close', { duration: 3000 });
  }

  copyConfig() {
    this.clipboard.copy(this.mcpConfig);
    this.configCopied = true;
    setTimeout(() => this.configCopied = false, 2000);
  }

  dismissNewKey() {
    this.newlyCreatedKey = null;
  }

  revokeKey(id: string, name: string) {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Revoke API Key',
        message: `Are you sure you want to revoke "${name}"? This action cannot be undone.`,
        danger: true,
      },
    }).afterClosed().subscribe((confirmed: boolean) => {
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
