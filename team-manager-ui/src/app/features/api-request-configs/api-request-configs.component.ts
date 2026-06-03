import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import {
  ApiRequestConfigsService,
  ApiRequestConfig,
  MappingConfig,
  REQUEST_ACTIONS
} from './api-request-configs.service';

@Component({
  selector: 'app-api-request-configs',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatInputModule, MatFormFieldModule, MatSelectModule,
    MatSlideToggleModule, MatSnackBarModule, MatDialogModule,
    MatTableModule, MatTooltipModule
  ],
  template: `
    <div class="configs-page">
      <div class="page-header">
        <div class="header-left">
          <mat-icon class="header-icon">api</mat-icon>
          <h1>API Request Configs</h1>
        </div>
        <div class="header-actions">
          <button mat-stroked-button (click)="exportConfigs()" matTooltip="Download all configs">
            <mat-icon>download</mat-icon> Export
          </button>
          <button mat-stroked-button (click)="triggerImport()" matTooltip="Import configs from JSON">
            <mat-icon>upload</mat-icon> Import
          </button>
          <button mat-raised-button color="primary" (click)="openDialog()">
            <mat-icon>add</mat-icon> New Config
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading">Loading...</div>
      } @else {
        @if (configs().length === 0) {
          <div class="empty-state">
            <mat-icon>inbox</mat-icon>
            <p>No API request configs yet. Create one to get started.</p>
          </div>
        } @else {
          <table mat-table [dataSource]="configs()" class="configs-table">
            <ng-container matColumnDef="action">
              <th mat-header-cell *matHeaderCellDef>Action</th>
              <td mat-cell *matCellDef="let config">
                <span class="action-badge">
                  <mat-icon class="action-icon">{{ getActionIcon(config.action) }}</mat-icon>
                  {{ getActionLabel(config.action) }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let config">
                <span class="config-name">{{ config.name }}</span>
                @if (config.description) {
                  <span class="config-desc">{{ config.description }}</span>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="enabled">
              <th mat-header-cell *matHeaderCellDef>Enabled</th>
              <td mat-cell *matCellDef="let config">
                <span class="status-badge" [class.enabled]="config.enabled" [class.disabled]="!config.enabled">
                  {{ config.enabled ? 'On' : 'Off' }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="method">
              <th mat-header-cell *matHeaderCellDef>Method</th>
              <td mat-cell *matCellDef="let config">
                <span class="method-badge" [class.post]="config.method === 'POST'" [class.get]="config.method === 'GET'">
                  {{ config.method }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="url">
              <th mat-header-cell *matHeaderCellDef>URL</th>
              <td mat-cell *matCellDef="let config" class="url-cell">{{ config.url }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let config" class="actions-cell">
                <button mat-icon-button color="primary" (click)="openDialog(config)" matTooltip="Edit">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="deleteConfig(config)" matTooltip="Delete">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="['action', 'name', 'enabled', 'method', 'url', 'actions']"></tr>
            <tr mat-row *matRowDef="let row; columns: ['action', 'name', 'enabled', 'method', 'url', 'actions']"></tr>
          </table>
        }
      }

      <input type="file" #fileInput accept=".json" style="display:none" (change)="handleImport($event)" />
    </div>
  `,
  styles: [`
    .configs-page { max-width: 1200px; margin: 0 auto; padding: 8px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .header-icon { font-size: 28px; width: 28px; height: 28px; color: #64b5f6; }
    .page-header h1 { font-size: 1.3rem; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0; }
    .header-actions { display: flex; gap: 8px; }
    .loading { text-align: center; padding: 64px; opacity: 0.35; }
    .empty-state { text-align: center; padding: 64px 24px; color: rgba(255,255,255,0.4); }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 16px; }

    .configs-table { width: 100%; background: rgba(255,255,255,0.02); border-radius: 8px; overflow: hidden; }
    .mat-mdc-header-row { background: rgba(255,255,255,0.05); }
    .mat-mdc-header-cell { color: rgba(255,255,255,0.6); font-weight: 600; font-size: 0.8rem; }
    .mat-mdc-cell { color: rgba(255,255,255,0.8); }

    .config-name { font-weight: 600; display: block; }
    .config-desc { font-size: 0.75rem; color: rgba(255,255,255,0.4); display: block; }
    .url-cell { font-size: 0.8rem; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .actions-cell { display: flex; gap: 4px; }

    .status-badge { padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
    .status-badge.enabled { background: rgba(76,175,80,0.2); color: #4caf50; }
    .status-badge.disabled { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.4); }
    .method-badge { padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; }
    .method-badge.post { background: rgba(33,150,243,0.2); color: #2196f3; }
    .method-badge.get { background: rgba(76,175,80,0.2); color: #4caf50; }
    .action-badge { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 600; color: rgba(255,255,255,0.7); }
    .action-icon { font-size: 18px; width: 18px; height: 18px; color: #64b5f6; }
  `]
})
export class ApiRequestConfigsComponent implements OnInit {
  private svc = inject(ApiRequestConfigsService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  loading = signal(true);
  configs = signal<ApiRequestConfig[]>([]);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: (data) => {
        this.configs.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load configs', 'Close', { duration: 3000 });
      }
    });
  }

  getActionIcon(action: string): string {
    return REQUEST_ACTIONS.find(a => a.value === action)?.icon ?? 'api';
  }

  getActionLabel(action: string): string {
    return REQUEST_ACTIONS.find(a => a.value === action)?.label ?? action;
  }

  openDialog(config?: ApiRequestConfig) {
    const dialogRef = this.dialog.open(ApiRequestConfigDialogComponent, {
      width: '700px',
      maxWidth: '95vw',
      data: config ? { ...config } : this.newConfig()
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.load();
      }
    });
  }

  deleteConfig(config: ApiRequestConfig) {
    if (!config.id) return;
    if (!confirm(`Delete "${config.name}"?`)) return;

    this.svc.delete(config.id).subscribe({
      next: () => {
        this.snackBar.open('Config deleted', 'Close', { duration: 3000 });
        this.load();
      },
      error: () => this.snackBar.open('Failed to delete config', 'Close', { duration: 3000 })
    });
  }

  exportConfigs() {
    this.svc.export().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'request-configs.json';
        a.click();
        window.URL.revokeObjectURL(url);
        this.snackBar.open('Configs exported', 'Close', { duration: 3000 });
      },
      error: () => this.snackBar.open('Failed to export configs', 'Close', { duration: 3000 })
    });
  }

  triggerImport() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  }

  handleImport(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const configs = JSON.parse(e.target?.result as string) as ApiRequestConfig[];
        this.svc.import(configs).subscribe({
          next: (result) => {
            this.snackBar.open(`Imported: ${result.created} created, ${result.updated} updated`, 'Close', { duration: 5000 });
            this.load();
          },
          error: () => this.snackBar.open('Failed to import configs', 'Close', { duration: 3000 })
        });
      } catch {
        this.snackBar.open('Invalid JSON file', 'Close', { duration: 3000 });
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  private newConfig(): ApiRequestConfig {
    return {
      action: 'FetchLeave',
      name: '',
      description: '',
      enabled: false,
      url: '',
      method: 'POST',
      isFormUrlEncoded: true,
      headers: {},
      bodyTemplate: '',
      mapping: {
        arrayPath: '',
        namePath: 'title',
        startPath: 'start',
        endPath: 'end',
        typePath: 'type',
        daysPath: 'totalDays',
        statusPath: 'status',
        nameTransform: 'ExtractBeforeDash'
      }
    };
  }
}

@Component({
  selector: 'app-api-request-config-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatInputModule, MatFormFieldModule, MatSelectModule,
    MatSlideToggleModule, MatDialogModule, MatTooltipModule
  ],
  template: `
    <div class="dialog-content">
      <h2 mat-dialog-title>{{ data.id ? 'Edit' : 'New' }} Config</h2>
      <mat-dialog-content>
        <div class="form-grid">
          <div class="curl-section">
            <button mat-button class="curl-toggle" (click)="showCurlImport.set(!showCurlImport())">
              <mat-icon>terminal</mat-icon>
              {{ showCurlImport() ? 'Hide' : 'Import from curl' }}
            </button>
            @if (showCurlImport()) {
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Paste curl command</mat-label>
                <textarea matInput [(ngModel)]="curlInput" rows="4"
                          placeholder="curl -X POST 'https://...' -H 'Authorization: Bearer ...' -d 'key=value'"></textarea>
              </mat-form-field>
              <button mat-flat-button color="accent" (click)="parseCurl()" [disabled]="!curlInput.trim()">
                <mat-icon>auto_fix_high</mat-icon> Parse
              </button>
              @if (curlParseError()) {
                <span class="curl-error">{{ curlParseError() }}</span>
              }
            }
          </div>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Action</mat-label>
            <mat-select [(ngModel)]="data.action">
              @for (action of actions; track action.value) {
                <mat-option [value]="action.value">
                  <mat-icon class="action-option-icon">{{ action.icon }}</mat-icon>
                  {{ action.label }}
                </mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Name</mat-label>
            <input matInput [(ngModel)]="data.name" placeholder="e.g. Primary, Backup">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Description</mat-label>
            <input matInput [(ngModel)]="data.description" placeholder="Optional description">
          </mat-form-field>

          <div class="field-row">
            <label class="field-label">Enabled</label>
            <mat-slide-toggle [checked]="data.enabled" (change)="data.enabled = $event.checked">
              {{ data.enabled ? 'On' : 'Off' }}
            </mat-slide-toggle>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>API URL</mat-label>
            <input matInput [(ngModel)]="data.url" placeholder="https://example.com/api">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>HTTP Method</mat-label>
            <mat-select [(ngModel)]="data.method">
              <mat-option value="GET">GET</mat-option>
              <mat-option value="POST">POST</mat-option>
            </mat-select>
          </mat-form-field>

          <div class="field-row">
            <label class="field-label">Form URL Encoded</label>
            <mat-slide-toggle [checked]="data.isFormUrlEncoded" (change)="data.isFormUrlEncoded = $event.checked">
              {{ data.isFormUrlEncoded ? 'Yes' : 'No' }}
            </mat-slide-toggle>
          </div>

          <div class="section-header">
            <h3>Headers</h3>
            <button mat-icon-button color="primary" (click)="addHeader()" matTooltip="Add header">
              <mat-icon>add</mat-icon>
            </button>
          </div>
          @for (entry of headerEntries(); track entry.key) {
            <div class="header-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Key</mat-label>
                <input matInput [(ngModel)]="entry.key" placeholder="Cookie">
              </mat-form-field>
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Value</mat-label>
                <input matInput [(ngModel)]="entry.value" placeholder="&#123;cookie&#125;">
              </mat-form-field>
              <button mat-icon-button color="warn" (click)="removeHeader(entry.key)" class="remove-btn">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          }

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Body Template</mat-label>
            <textarea matInput [(ngModel)]="data.bodyTemplate" rows="3"
                      placeholder="teamId=&#123;teamIds&#125;&amp;start=&#123;start&#125;"></textarea>
            <mat-hint>Variables: &#123;cookie&#125;, &#123;start&#125;, &#123;end&#125;, &#123;teamIds&#125;</mat-hint>
          </mat-form-field>

          <div class="section-header">
            <h3>Response Mapping</h3>
            <button mat-button color="primary" (click)="showPathPicker.set(!showPathPicker())">
              <mat-icon>search</mat-icon> Path Picker
            </button>
          </div>

          @if (showPathPicker()) {
            <div class="path-picker">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Paste sample JSON response</mat-label>
                <textarea matInput [(ngModel)]="sampleJson" rows="6"
                          placeholder='[{"title":"Leave","start":"2026-01-01"}]'></textarea>
              </mat-form-field>
              <div class="path-picker-actions">
                <button mat-button (click)="discoverPaths()" [disabled]="!sampleJson().trim() || discoveringPaths()">
                  {{ discoveringPaths() ? 'Discovering...' : 'Discover Paths' }}
                </button>
              </div>
              @if (availablePaths().length > 0) {
                <div class="path-picker-results">
                  <div class="path-picker-info">
                    <span class="path-count">{{ availablePaths().length }} paths found</span>
                    @if (arrayLength() > 0) {
                      <span class="array-info">{{ arrayLength() }} items in array</span>
                    }
                  </div>
                  <div class="path-list">
                    @for (path of availablePaths(); track path) {
                      <button class="path-chip" (click)="copyPath(path)" matTooltip="Click to copy">
                        {{ path }}
                      </button>
                    }
                  </div>
                </div>
              }
              @if (hasTestResults) {
                <div class="test-results">
                  <h4>Test Results</h4>
                  @for (entry of testResults() | keyvalue; track entry.key) {
                    @if (entry.value !== null) {
                      <div class="test-result-row">
                        <span class="test-label">{{ entry.key }}</span>
                        <span class="test-value">{{ entry.value }}</span>
                      </div>
                    }
                  }
                </div>
              }
            </div>
          }

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Array Path (optional)</mat-label>
            <input matInput [(ngModel)]="data.mapping.arrayPath" placeholder="e.g. data.items or results[0].leaves">
            <mat-hint>Leave empty if response is a top-level array</mat-hint>
          </mat-form-field>

          <div class="mapping-grid">
            <mat-form-field appearance="outline">
              <mat-label>Name Path</mat-label>
              <input matInput [(ngModel)]="data.mapping.namePath" placeholder="title">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Start Path</mat-label>
              <input matInput [(ngModel)]="data.mapping.startPath" placeholder="start">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>End Path</mat-label>
              <input matInput [(ngModel)]="data.mapping.endPath" placeholder="end">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Type Path</mat-label>
              <input matInput [(ngModel)]="data.mapping.typePath" placeholder="type">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Days Path</mat-label>
              <input matInput [(ngModel)]="data.mapping.daysPath" placeholder="totalDays">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Status Path</mat-label>
              <input matInput [(ngModel)]="data.mapping.statusPath" placeholder="status">
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline">
            <mat-label>Name Transform</mat-label>
            <mat-select [(ngModel)]="data.mapping.nameTransform">
              <mat-option value="ExtractBeforeDash">Extract Before Dash</mat-option>
              <mat-option value="None">None</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button (click)="dialogRef.close()">Cancel</button>
        <button mat-raised-button color="primary" (click)="save()" [disabled]="!data.name.trim()">
          {{ saving() ? 'Saving...' : 'Save' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-content { min-width: 500px; }
    .form-grid { display: flex; flex-direction: column; gap: 8px; }
    .full-width { width: 100%; }
    .half-width { flex: 1; }
    .field-row { display: flex; align-items: center; gap: 16px; padding: 8px 0; }
    .field-label { font-size: 0.85rem; color: rgba(255,255,255,0.6); min-width: 140px; }
    .section-header { display: flex; align-items: center; gap: 8px; margin-top: 16px; margin-bottom: 4px; }
    .section-header h3 { font-size: 0.95rem; font-weight: 600; color: rgba(255,255,255,0.7); margin: 0; }
    .header-row { display: flex; align-items: flex-start; gap: 8px; }
    .remove-btn { margin-top: 4px; }
    .mapping-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    @media (max-width: 600px) { .mapping-grid { grid-template-columns: repeat(2, 1fr); } }

    .path-picker { padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; margin-bottom: 8px; }
    .path-picker-actions { display: flex; justify-content: flex-end; margin-bottom: 8px; }
    .path-picker-results { margin-top: 8px; }
    .path-picker-info { display: flex; gap: 12px; margin-bottom: 8px; }
    .path-count { font-size: 0.8rem; color: #4caf50; font-weight: 600; }
    .array-info { font-size: 0.8rem; color: rgba(255,255,255,0.4); }
    .path-list { display: flex; flex-wrap: wrap; gap: 4px; max-height: 150px; overflow-y: auto; }
    .path-chip { background: rgba(33,150,243,0.15); color: #64b5f6; border: 1px solid rgba(33,150,243,0.3); padding: 2px 8px; border-radius: 12px; font-size: 0.72rem; cursor: pointer; font-family: monospace; }
    .action-option-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 8px; vertical-align: middle; }
    .path-chip:hover { background: rgba(33,150,243,0.25); }
    .test-results { margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); }
    .test-results h4 { font-size: 0.8rem; color: rgba(255,255,255,0.5); margin: 0 0 8px 0; }
    .test-result-row { display: flex; gap: 8px; font-size: 0.75rem; margin-bottom: 4px; }
    .test-label { color: rgba(255,255,255,0.4); min-width: 60px; }
    .test-value { color: #4caf50; font-family: monospace; }

    .curl-section { padding: 10px 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; display: flex; flex-direction: column; gap: 8px; }
    .curl-toggle { justify-content: flex-start; color: rgba(255,255,255,0.6); font-size: 0.85rem; }
    .curl-error { font-size: 0.75rem; color: #ef5350; }
  `]
})
export class ApiRequestConfigDialogComponent implements OnInit {
  private svc = inject(ApiRequestConfigsService);
  private snackBar = inject(MatSnackBar);
  dialogRef = inject(MatDialogRef<ApiRequestConfigDialogComponent>);
  data = inject<any>(MAT_DIALOG_DATA);
  saving = signal(false);
  headerEntries = signal<{key: string, value: string}[]>([]);
  actions = REQUEST_ACTIONS;

  showCurlImport = signal(false);
  curlInput = '';
  curlParseError = signal('');

  showPathPicker = signal(false);
  sampleJson = signal('');
  availablePaths = signal<string[]>([]);
  testResults = signal<Record<string, string | null>>({});
  discoveringPaths = signal(false);
  arrayLength = signal(0);

  get hasTestResults(): boolean {
    return Object.values(this.testResults()).some(v => v !== null);
  }

  ngOnInit() {
    this.headerEntries.set(Object.entries(this.data.headers || {}).map(([k, v]) => ({ key: k, value: v as string })));
  }

  addHeader() {
    const entries = this.headerEntries();
    this.headerEntries.set([...entries, { key: '', value: '' }]);
  }

  removeHeader(key: string) {
    this.headerEntries.set(this.headerEntries().filter(e => e.key !== key));
  }

  discoverPaths() {
    const raw = this.sampleJson().trim();
    if (!raw) return;

    this.discoveringPaths.set(true);
    const fields: Record<string, string> = {
      Name: this.data.mapping.namePath,
      Start: this.data.mapping.startPath,
      End: this.data.mapping.endPath,
      Type: this.data.mapping.typePath,
      Days: this.data.mapping.daysPath,
      Status: this.data.mapping.statusPath
    };

    this.svc.testMapping(raw, this.data.mapping.arrayPath || '', fields).subscribe({
      next: (result) => {
        this.availablePaths.set(result.availablePaths);
        this.testResults.set(result.testResults);
        this.arrayLength.set(result.arrayLength);
        this.discoveringPaths.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to parse JSON', 'Close', { duration: 3000 });
        this.discoveringPaths.set(false);
      }
    });
  }

  copyPath(path: string) {
    navigator.clipboard.writeText(path);
    this.snackBar.open(`Copied: ${path}`, 'Close', { duration: 2000 });
  }

  parseCurl() {
    this.curlParseError.set('');
    try {
      const normalized = this.curlInput.replace(/\\\n/g, ' ').replace(/\s+/g, ' ').trim();
      const tokens = this.tokenizeCurl(normalized);

      if (!tokens.length || tokens[0].toLowerCase() !== 'curl') {
        this.curlParseError.set('Does not look like a curl command');
        return;
      }

      let method = '';
      const headers: Record<string, string> = {};
      let body = '';
      let url = '';
      let isFormUrlEncoded = false;

      for (let i = 1; i < tokens.length; i++) {
        const t = tokens[i];
        if (t === '-X' || t === '--request') {
          method = tokens[++i] ?? '';
        } else if (t === '-H' || t === '--header') {
          const h = tokens[++i] ?? '';
          const idx = h.indexOf(':');
          if (idx > 0) headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
        } else if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary') {
          body = tokens[++i] ?? '';
          if (!method) method = 'POST';
        } else if (t === '--data-urlencode') {
          body = tokens[++i] ?? '';
          isFormUrlEncoded = true;
          if (!method) method = 'POST';
        } else if (!t.startsWith('-') && !url) {
          url = t.replace(/^['"]|['"]$/g, '');
        }
      }

      const ct = headers['Content-Type'] ?? headers['content-type'] ?? '';
      if (ct.toLowerCase().includes('application/x-www-form-urlencoded')) {
        isFormUrlEncoded = true;
        delete headers['Content-Type'];
        delete headers['content-type'];
      }

      if (!url) { this.curlParseError.set('Could not find URL in curl command'); return; }

      this.data.url = url;
      if (method) this.data.method = method.toUpperCase();
      this.data.isFormUrlEncoded = isFormUrlEncoded;
      if (body) this.data.bodyTemplate = body;

      const merged = { ...(this.data.headers || {}), ...headers };
      this.headerEntries.set(Object.entries(merged).map(([k, v]) => ({ key: k, value: v as string })));

      this.showCurlImport.set(false);
      this.snackBar.open('curl parsed — review the fields below', 'Close', { duration: 3000 });
    } catch {
      this.curlParseError.set('Failed to parse curl command');
    }
  }

  private tokenizeCurl(input: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    while (i < input.length) {
      while (i < input.length && input[i] === ' ') i++;
      if (i >= input.length) break;
      const ch = input[i];
      if (ch === "'" || ch === '"') {
        const end = input.indexOf(ch, i + 1);
        tokens.push(end < 0 ? input.slice(i + 1) : input.slice(i + 1, end));
        i = end < 0 ? input.length : end + 1;
      } else {
        const start = i;
        while (i < input.length && input[i] !== ' ') i++;
        tokens.push(input.slice(start, i));
      }
    }
    return tokens;
  }

  save() {
    const headers: Record<string, string> = {};
    for (const entry of this.headerEntries()) {
      if (entry.key.trim()) {
        headers[entry.key.trim()] = entry.value;
      }
    }
    this.data.headers = headers;

    this.saving.set(true);
    const save$ = this.data.id
      ? this.svc.update(this.data.id, this.data)
      : this.svc.create(this.data);

    save$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Failed to save config', 'Close', { duration: 3000 });
      }
    });
  }
}
