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
  REQUEST_ACTIONS,
  TestRequestResult
} from './api-request-configs.service';

@Component({
  selector: 'app-api-request-configs',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatInputModule, MatFormFieldModule, MatSelectModule,
    MatSlideToggleModule, MatSnackBarModule, MatDialogModule,
    MatTooltipModule
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
          <div class="configs-list">
            @for (config of configs(); track config.id) {
              <div class="config-card">
                <div class="card-main">
                  <div class="card-top">
                    <span class="action-badge">
                      <mat-icon class="action-icon">{{ getActionIcon(config.action) }}</mat-icon>
                      {{ getActionLabel(config.action) }}
                    </span>
                    <div class="card-badges">
                      <span class="method-badge" [class.post]="config.method === 'POST'" [class.get]="config.method === 'GET'">{{ config.method }}</span>
                      <span class="status-badge" [class.enabled]="config.enabled" [class.disabled]="!config.enabled">{{ config.enabled ? 'On' : 'Off' }}</span>
                    </div>
                  </div>
                  <div class="card-name">{{ config.name }}</div>
                  @if (config.description) { <div class="card-desc">{{ config.description }}</div> }
                  <div class="card-url">{{ config.url }}</div>
                </div>
                <div class="card-actions">
                  <button mat-icon-button color="primary" (click)="openDialog(config)" matTooltip="Edit"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button color="warn" (click)="deleteConfig(config)" matTooltip="Delete"><mat-icon>delete</mat-icon></button>
                </div>
              </div>
            }
          </div>
        }
      }

      <input type="file" #fileInput accept=".json" style="display:none" (change)="handleImport($event)" />
    </div>
  `,
  styles: [`
    .configs-page { max-width: 900px; margin: 0 auto; padding: 8px; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
    .header-left { display: flex; align-items: center; gap: 10px; }
    .header-icon { font-size: 26px; width: 26px; height: 26px; color: #64b5f6; }
    .page-header h1 { font-size: 1.2rem; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0; }
    .header-actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .loading { text-align: center; padding: 64px; opacity: 0.35; }
    .empty-state { text-align: center; padding: 64px 24px; color: rgba(255,255,255,0.4); }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 16px; display: block; }

    .configs-list { display: flex; flex-direction: column; gap: 8px; }
    .config-card { display: flex; align-items: flex-start; gap: 8px; padding: 12px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; transition: border-color 0.15s; }
    .config-card:hover { border-color: rgba(255,255,255,0.14); }
    .card-main { flex: 1; min-width: 0; }
    .card-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 5px; }
    .card-badges { display: flex; align-items: center; gap: 5px; margin-left: auto; }
    .card-name { font-size: 0.9rem; font-weight: 600; color: rgba(255,255,255,0.88); }
    .card-desc { font-size: 0.75rem; color: rgba(255,255,255,0.38); margin-top: 1px; }
    .card-url { font-size: 0.72rem; font-family: monospace; color: rgba(255,255,255,0.35); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .card-actions { display: flex; flex-direction: column; flex-shrink: 0; }

    .status-badge { padding: 2px 8px; border-radius: 12px; font-size: 0.72rem; font-weight: 600; }
    .status-badge.enabled { background: rgba(76,175,80,0.2); color: #4caf50; }
    .status-badge.disabled { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.35); }
    .method-badge { padding: 2px 7px; border-radius: 4px; font-size: 0.7rem; font-weight: 700; }
    .method-badge.post { background: rgba(33,150,243,0.18); color: #2196f3; }
    .method-badge.get { background: rgba(76,175,80,0.18); color: #4caf50; }
    .action-badge { display: flex; align-items: center; gap: 5px; font-size: 0.78rem; font-weight: 600; color: rgba(255,255,255,0.65); }
    .action-icon { font-size: 16px; width: 16px; height: 16px; color: #64b5f6; }

    @media (max-width: 480px) {
      .header-actions button span { display: none; }
      .card-actions { flex-direction: row; }
    }
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
      width: '620px',
      maxWidth: '100vw',
      panelClass: 'dark-dialog',
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
      bodyFormat: 'urlencoded',
      headers: {},
      parameters: {},
      bodyTemplate: '',
      retryCount: 0,
      successCriteria: null,
      mapping: {
        arrayPath: '',
        namePath: 'title',
        startPath: 'start',
        endPath: 'end',
        typePath: 'type',
        daysPath: 'totalDays',
        statusPath: 'status',
        nameTransform: 'ExtractBeforeDash',
        externalIdPath: '',
        projectsPath: '',
        projectNamePath: 'name',
        projectIdPath: 'id',
        projectCategoriesPath: 'categories',
        categoryNamePath: 'name',
        categoryIdPath: 'id'
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

          <div class="inline-fields">
            <mat-form-field appearance="outline">
              <mat-label>HTTP Method</mat-label>
              <mat-select [(ngModel)]="data.method">
                <mat-option value="GET">GET</mat-option>
                <mat-option value="POST">POST</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Body Format</mat-label>
              <mat-select [(ngModel)]="data.bodyFormat">
                <mat-option value="raw">Raw</mat-option>
                <mat-option value="urlencoded">URL Encoded</mat-option>
                <mat-option value="json">JSON</mat-option>
              </mat-select>
            </mat-form-field>
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

          <div class="section-header">
            <h3>Parameters</h3>
            <button mat-icon-button color="primary" (click)="addParameter()" matTooltip="Add parameter">
              <mat-icon>add</mat-icon>
            </button>
          </div>
          @for (entry of parameterEntries(); track entry.key) {
            <div class="header-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Name</mat-label>
                <input matInput [(ngModel)]="entry.key" placeholder="employeeId">
              </mat-form-field>
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Value</mat-label>
                <input matInput [(ngModel)]="entry.value" placeholder="2588">
              </mat-form-field>
              <button mat-icon-button color="warn" (click)="removeParameter(entry.key)" class="remove-btn">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          }

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Body Template</mat-label>
            <textarea matInput [(ngModel)]="data.bodyTemplate" rows="3"
                      placeholder="teamId=&#123;teamIds&#125;&amp;start=&#123;start&#125;"></textarea>
            @if (data.action === 'AddTimesheetEntry') {
              <mat-hint>Variables: &#123;cookie&#125;, &#123;id&#125;, &#123;date&#125;, &#123;project&#125;, &#123;category&#125;, &#123;hours&#125;, &#123;minutes&#125;, &#123;billable&#125;, &#123;workedFrom&#125;, &#123;sentiment&#125;, &#123;description&#125;, &#123;ticketNumber&#125; + any parameter names</mat-hint>
            } @else {
              <mat-hint>Variables: &#123;cookie&#125;, &#123;start&#125;, &#123;end&#125;, &#123;teamIds&#125; + any parameter names</mat-hint>
            }
          </mat-form-field>

          <div class="section-header"><h3>Success &amp; Retry</h3></div>
          <div class="success-retry-row">
            <mat-form-field appearance="outline" class="f-status">
              <mat-label>Required Status</mat-label>
              <input matInput type="number" placeholder="200"
                [ngModel]="data.successCriteria?.requiredStatus ?? null"
                (ngModelChange)="setCriteriaStatus($event)">
              <mat-hint>e.g. 200</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Success JSON Path</mat-label>
              <input matInput placeholder="success"
                [ngModel]="data.successCriteria?.jsonPath ?? ''"
                (ngModelChange)="setCriteriaPath($event)">
              <mat-hint>e.g. data.result</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Expected Value</mat-label>
              <input matInput placeholder="true"
                [ngModel]="data.successCriteria?.jsonValue ?? ''"
                (ngModelChange)="setCriteriaValue($event)">
              <mat-hint>Blank = path just exists</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline" class="f-retries">
              <mat-label>Retries</mat-label>
              <input matInput type="number" min="0" max="5" placeholder="0"
                [ngModel]="data.retryCount ?? 0"
                (ngModelChange)="data.retryCount = +$event">
              <mat-hint>On failure</mat-hint>
            </mat-form-field>
          </div>

          @if (data.action === 'AddTimesheetEntry') {
            <div class="section-header">
              <h3>Response Mapping</h3>
            </div>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Response ID Path</mat-label>
              <input matInput [(ngModel)]="data.mapping.externalIdPath" placeholder="entryId">
              <mat-hint>Path to the external ID in the response — saved back to the timesheet entry</mat-hint>
            </mat-form-field>
          }

          @if (data.action === 'GetTimesheetProjects') {
            <div class="section-header">
              <h3>Response Mapping</h3>
            </div>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Projects Path</mat-label>
              <input matInput [(ngModel)]="data.mapping.projectsPath" placeholder="data.projects">
              <mat-hint>Path to the projects array — leave empty if the root is the array</mat-hint>
            </mat-form-field>
            <div class="mapping-grid">
              <mat-form-field appearance="outline">
                <mat-label>Project Name Path</mat-label>
                <input matInput [(ngModel)]="data.mapping.projectNamePath" placeholder="name">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Project ID Path</mat-label>
                <input matInput [(ngModel)]="data.mapping.projectIdPath" placeholder="id">
                <mat-hint>Saved as correlation ID</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Categories Path</mat-label>
                <input matInput [(ngModel)]="data.mapping.projectCategoriesPath" placeholder="categories">
                <mat-hint>Within each project object</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Category Name Path</mat-label>
                <input matInput [(ngModel)]="data.mapping.categoryNamePath" placeholder="name">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Category ID Path</mat-label>
                <input matInput [(ngModel)]="data.mapping.categoryIdPath" placeholder="id">
                <mat-hint>Saved as correlation ID</mat-hint>
              </mat-form-field>
            </div>
          }

          @if (data.action === 'FetchLeave') {
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
          }
        </div>
      </mat-dialog-content>
      @if (curlPreview()) {
        <div class="curl-preview">
          <div class="curl-preview-header">
            <span class="curl-preview-label">cURL Preview</span>
            <div class="curl-preview-actions">
              <button mat-icon-button (click)="copyCurl()" matTooltip="Copy">
                <mat-icon>content_copy</mat-icon>
              </button>
              <button mat-icon-button (click)="curlPreview.set('')" class="close-test-btn">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>
          <pre class="curl-preview-body">{{ curlPreview() }}</pre>
        </div>
      }
      @if (testResult()) {
        <div class="test-response" [class.test-success]="testResult()!.success" [class.test-failure]="!testResult()!.success">
          <div class="test-response-header">
            <span class="test-status-code" [class.success]="testResult()!.success" [class.failure]="!testResult()!.success">
              {{ testResult()!.statusCode || 'ERR' }} {{ testResult()!.success ? 'OK' : 'Failed' }}
            </span>
            <button mat-icon-button (click)="testResult.set(null)" class="close-test-btn">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <pre class="test-response-body">{{ formatTestBody(testResult()!.body) }}</pre>
        </div>
      }
      @if (showTestVars() && unresolvedVars().length > 0) {
        <div class="test-vars-panel">
          <div class="test-vars-header">Test values <span class="test-vars-hint">— filled in for this test only</span></div>
          <div class="test-vars-grid">
            @for (v of unresolvedVars(); track v) {
              <mat-form-field appearance="outline" class="test-var-field">
                <mat-label>{{ '{' + v + '}' }}</mat-label>
                <input matInput [(ngModel)]="testVars[v]" [placeholder]="testVarPlaceholder(v)">
              </mat-form-field>
            }
          </div>
        </div>
      }
      <mat-dialog-actions align="end">
        <button mat-button (click)="dialogRef.close()">Cancel</button>
        <button mat-stroked-button (click)="buildCurlPreview()" [disabled]="!data.url.trim()">
          <mat-icon>terminal</mat-icon> cURL
        </button>
        <button mat-stroked-button (click)="toggleTest()" [disabled]="!data.url.trim() || testing()">
          <mat-icon>play_arrow</mat-icon> {{ testing() ? 'Testing...' : 'Test' }}
        </button>
        <button mat-raised-button color="primary" (click)="save()" [disabled]="!data.name.trim()">
          {{ saving() ? 'Saving...' : 'Save' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-content { width: min(580px, 96vw); box-sizing: border-box; }
    .form-grid { display: flex; flex-direction: column; gap: 8px; }
    .full-width { width: 100%; }
    .half-width { flex: 1; min-width: 120px; }
    .field-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; flex-wrap: wrap; }
    .field-label { font-size: 0.85rem; color: rgba(255,255,255,0.6); min-width: 80px; }
    .section-header { display: flex; align-items: center; gap: 8px; margin-top: 16px; margin-bottom: 4px; }
    .section-header h3 { font-size: 0.95rem; font-weight: 600; color: rgba(255,255,255,0.7); margin: 0; }
    .header-row { display: flex; align-items: flex-start; gap: 8px; flex-wrap: wrap; }
    .remove-btn { margin-top: 4px; }
    .inline-fields { display: flex; gap: 8px; flex-wrap: wrap; }
    .inline-fields mat-form-field { flex: 1; min-width: 100px; }
    .success-retry-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .success-retry-row mat-form-field { flex: 1; min-width: 100px; }
    .success-retry-row .f-status { flex: 0 0 100px; }
    .success-retry-row .f-retries { flex: 0 0 80px; }
    .mapping-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    @media (max-width: 500px) {
      .mapping-grid { grid-template-columns: 1fr 1fr; }
      .success-retry-row .f-status, .success-retry-row .f-retries { flex: 1 1 80px; }
    }

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

    .curl-preview { margin: 8px 0 0; border-radius: 8px; overflow: hidden; border: 1px solid rgba(100,181,246,0.4); background: rgba(100,181,246,0.05); }
    .curl-preview-header { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; }
    .curl-preview-label { font-size: 0.8rem; font-weight: 600; color: #64b5f6; }
    .curl-preview-actions { display: flex; gap: 2px; }
    .curl-preview-body { margin: 0; padding: 8px 12px 12px; font-size: 0.72rem; font-family: monospace; color: rgba(255,255,255,0.8); white-space: pre-wrap; word-break: break-all; max-height: 220px; overflow-y: auto; }

    .test-vars-panel { margin: 8px 0 0; padding: 10px 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; }
    .test-vars-header { font-size: 0.8rem; font-weight: 600; color: rgba(255,255,255,0.6); margin-bottom: 8px; }
    .test-vars-hint { font-weight: 400; font-size: 0.75rem; color: rgba(255,255,255,0.35); }
    .test-vars-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .test-var-field { min-width: 140px; flex: 1; }

    .test-response { margin: 8px 0 0; border-radius: 8px; overflow: hidden; border: 1px solid; }
    .test-response.test-success { border-color: rgba(76,175,80,0.4); background: rgba(76,175,80,0.05); }
    .test-response.test-failure { border-color: rgba(239,83,80,0.4); background: rgba(239,83,80,0.05); }
    .test-response-header { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; }
    .test-status-code { font-size: 0.8rem; font-weight: 700; font-family: monospace; }
    .test-status-code.success { color: #4caf50; }
    .test-status-code.failure { color: #ef5350; }
    .close-test-btn { width: 28px; height: 28px; line-height: 28px; }
    .close-test-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .test-response-body { margin: 0; padding: 8px 12px 12px; font-size: 0.72rem; font-family: monospace; color: rgba(255,255,255,0.7); white-space: pre-wrap; word-break: break-all; max-height: 200px; overflow-y: auto; }
  `]
})
export class ApiRequestConfigDialogComponent implements OnInit {
  private svc = inject(ApiRequestConfigsService);
  private snackBar = inject(MatSnackBar);
  dialogRef = inject(MatDialogRef<ApiRequestConfigDialogComponent>);
  data = inject<any>(MAT_DIALOG_DATA);
  saving = signal(false);
  headerEntries = signal<{key: string, value: string}[]>([]);
  parameterEntries = signal<{key: string, value: string}[]>([]);
  actions = REQUEST_ACTIONS;

  showCurlImport = signal(false);
  curlInput = '';
  curlParseError = signal('');
  testing = signal(false);
  testResult = signal<TestRequestResult | null>(null);
  curlPreview = signal('');
  showTestVars = signal(false);
  testVars: Record<string, string> = {};

  showPathPicker = signal(false);
  sampleJson = signal('');
  availablePaths = signal<string[]>([]);
  testResults = signal<Record<string, string | null>>({});
  discoveringPaths = signal(false);
  arrayLength = signal(0);

  get hasTestResults(): boolean {
    return Object.values(this.testResults()).some(v => v !== null);
  }

  unresolvedVars() {
    const knownParams = new Set([
      ...this.parameterEntries().map(e => e.key.trim()).filter(Boolean),
      'cookie', 'start', 'end', 'teamIds'
    ]);
    const template = (this.data.bodyTemplate ?? '') + Object.values(this.data.headers ?? {}).join(' ');
    const matches = [...template.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
    return [...new Set(matches)].filter(v => !knownParams.has(v));
  }

  testVarPlaceholder(v: string): string {
    const today = new Date().toISOString().split('T')[0];
    const defaults: Record<string, string> = {
      date: today, hours: '1', minutes: '0', billable: 'true',
      workedFrom: '', sentiment: '', description: 'Test', ticketNumber: '', category: '', project: '', id: ''
    };
    return defaults[v] ?? '';
  }

  toggleTest() {
    const vars = this.unresolvedVars();
    if (vars.length > 0 && !this.showTestVars()) {
      // Pre-fill defaults
      for (const v of vars) {
        if (!this.testVars[v]) this.testVars[v] = this.testVarPlaceholder(v);
      }
      this.showTestVars.set(true);
    } else {
      this.runTest();
    }
  }

  ngOnInit() {
    this.headerEntries.set(Object.entries(this.data.headers || {}).map(([k, v]) => ({ key: k, value: v as string })));
    this.parameterEntries.set(Object.entries(this.data.parameters || {}).map(([k, v]) => ({ key: k, value: v as string })));
  }

  setCriteriaStatus(v: any) {
    const n = v === '' || v === null ? null : +v;
    this.data = { ...this.data, successCriteria: { ...(this.data.successCriteria ?? {}), requiredStatus: n } };
  }
  setCriteriaPath(v: string) {
    this.data = { ...this.data, successCriteria: { ...(this.data.successCriteria ?? {}), jsonPath: v || null } };
  }
  setCriteriaValue(v: string) {
    this.data = { ...this.data, successCriteria: { ...(this.data.successCriteria ?? {}), jsonValue: v || null } };
  }

  addHeader() {
    this.headerEntries.set([...this.headerEntries(), { key: '', value: '' }]);
  }

  removeHeader(key: string) {
    this.headerEntries.set(this.headerEntries().filter(e => e.key !== key));
  }

  addParameter() {
    this.parameterEntries.set([...this.parameterEntries(), { key: '', value: '' }]);
  }

  removeParameter(key: string) {
    this.parameterEntries.set(this.parameterEntries().filter(e => e.key !== key));
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

  buildCurlPreview() {
    const params: Record<string, string> = {};
    for (const e of this.parameterEntries()) {
      if (e.key.trim()) params[e.key.trim()] = e.value;
    }
    const cookie = this.getCookie();

    const resolve = (t: string) => {
      let s = t.replace('{cookie}', cookie || '{cookie}');
      for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, v);
      return s;
    };

    const lines: string[] = [`curl -X ${this.data.method} '${resolve(this.data.url)}'`];

    const fmt = this.data.bodyFormat ?? (this.data.isFormUrlEncoded ? 'urlencoded' : 'json');
    const hasExplicitContentType = this.headerEntries().some(e => e.key.trim().toLowerCase() === 'content-type');
    if (!hasExplicitContentType && fmt !== 'raw') {
      const contentType = fmt === 'urlencoded' ? 'application/x-www-form-urlencoded' : 'application/json';
      lines.push(`  -H 'Content-Type: ${contentType}'`);
    }

    for (const e of this.headerEntries()) {
      if (e.key.trim()) lines.push(`  -H '${e.key.trim()}: ${resolve(e.value)}'`);
    }

    if (this.data.method === 'POST' && this.data.bodyTemplate?.trim()) {
      const dataFlag = fmt === 'urlencoded' ? '--data-urlencode' : fmt === 'raw' ? '--data-raw' : '--data';
      lines.push(`  ${dataFlag} '${resolve(this.data.bodyTemplate)}'`);
    }

    this.curlPreview.set(lines.join(' \\\n'));
  }

  copyCurl() {
    navigator.clipboard.writeText(this.curlPreview());
    this.snackBar.open('Copied', 'Close', { duration: 2000 });
  }

  runTest() {
    this.testing.set(true);
    this.testResult.set(null);
    this.showTestVars.set(false);

    const cookie = this.getCookie();
    const headers: Record<string, string> = {};
    for (const entry of this.headerEntries()) {
      if (entry.key.trim()) headers[entry.key.trim()] = entry.value;
    }
    const config: ApiRequestConfig = { ...this.data, headers };
    const variables: Record<string, string> = { cookie, ...this.testVars };

    this.svc.testRequest(config, variables).subscribe({
      next: (result) => { this.testResult.set(result); this.testing.set(false); },
      error: () => { this.testing.set(false); this.snackBar.open('Test request failed', 'Close', { duration: 3000 }); }
    });
  }

  private getCookie(): string {
    const cookie = localStorage.getItem('entelectCookie') ?? '';
    console.log('[api-config] cookie from localStorage:', !!cookie);
    return cookie;
  }

  formatTestBody(body: string): string {
    try { return JSON.stringify(JSON.parse(body), null, 2); } catch { return body; }
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
      let bodyFormat = '';

      for (let i = 1; i < tokens.length; i++) {
        const t = tokens[i];
        if (t === '-X' || t === '--request') {
          method = tokens[++i] ?? '';
        } else if (t === '-H' || t === '--header') {
          const h = tokens[++i] ?? '';
          const idx = h.indexOf(':');
          if (idx > 0) headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
        } else if (t === '-b' || t === '--cookie') {
          headers['Cookie'] = tokens[++i] ?? '';
        } else if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary') {
          body = tokens[++i] ?? '';
          if (!method) method = 'POST';
          if (!bodyFormat) bodyFormat = 'raw';
        } else if (t === '--data-urlencode') {
          body = tokens[++i] ?? '';
          if (!method) method = 'POST';
          bodyFormat = 'urlencoded';
        } else if (!t.startsWith('-') && !url) {
          url = t.replace(/^['"]|['"]$/g, '');
        }
      }

      const ct = headers['Content-Type'] ?? headers['content-type'] ?? '';
      if (ct.toLowerCase().includes('application/x-www-form-urlencoded')) {
        bodyFormat = 'urlencoded';
        delete headers['Content-Type'];
        delete headers['content-type'];
      } else if (ct.toLowerCase().includes('application/json')) {
        bodyFormat = 'json';
        delete headers['Content-Type'];
        delete headers['content-type'];
      }

      if (!url) { this.curlParseError.set('Could not find URL in curl command'); return; }

      this.data.url = url;
      if (method) this.data.method = method.toUpperCase();
      if (bodyFormat) {
        this.data.bodyFormat = bodyFormat;
        this.data.isFormUrlEncoded = bodyFormat === 'urlencoded';
      }
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
      if (entry.key.trim()) headers[entry.key.trim()] = entry.value;
    }
    this.data.headers = headers;

    const parameters: Record<string, string> = {};
    for (const entry of this.parameterEntries()) {
      if (entry.key.trim()) parameters[entry.key.trim()] = entry.value;
    }
    this.data.parameters = parameters;

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
