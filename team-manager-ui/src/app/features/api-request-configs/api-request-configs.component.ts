import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, ActivatedRoute } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  ApiRequestConfigsService,
  ApiRequestConfig,
  REQUEST_ACTIONS
} from './api-request-configs.service';

@Component({
  selector: 'app-api-request-configs',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    MatTooltipModule
],
  template: `
    <div class="configs-page">
      <div class="page-header">
        <div class="header-left">
          <mat-icon class="header-icon">hub</mat-icon>
          <div>
            <h1>Integrations</h1>
            <span class="subtitle">Outbound API actions</span>
          </div>
        </div>
      </div>

      <!-- API Actions -->
      <div class="section-header" style="margin-top: 32px">
        <mat-icon class="section-icon">api</mat-icon>
        <span>API Actions</span>
        <div style="flex:1"></div>
        <button class="action-btn" (click)="exportConfigs()" matTooltip="Export all">
          <mat-icon>download</mat-icon>
        </button>
        <button class="action-btn" (click)="triggerImport()" matTooltip="Import from JSON">
          <mat-icon>upload</mat-icon>
        </button>
        <button class="primary-btn" (click)="openDialog()">
          <mat-icon>add</mat-icon> New
        </button>
      </div>

      @if (loading()) {
        <div class="loading"><span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span></div>
      } @else {
        @if (configs().length === 0) {
          <div class="empty-state">
            <mat-icon>api</mat-icon>
            <p>No API actions configured yet.</p>
            <button class="primary-btn" (click)="openDialog()"><mat-icon>add</mat-icon> Create your first action</button>
          </div>
        } @else {
          <div class="configs-list">
            @for (config of configs(); track config.id) {
              <div class="config-card" [class.disabled]="!config.enabled">
                <div class="card-accent" [style.background]="getAccentColor(config.action)"></div>
                <div class="card-icon-col">
                  <mat-icon class="card-icon" [style.color]="getAccentColor(config.action)">{{ getActionIcon(config.action) }}</mat-icon>
                </div>
                <div class="card-main">
                  <div class="card-top-row">
                    <span class="card-name">{{ config.name }}</span>
                    <div class="card-badges">
                      <span class="method-badge method-{{ config.method.toLowerCase() }}">{{ config.method }}</span>
                      @if (config.autoSync) {
                        <span class="badge badge-auto" matTooltip="Fires immediately on enqueue">
                          <mat-icon class="badge-icon">bolt</mat-icon>Auto
                        </span>
                      }
                      <span class="badge" [class.badge-on]="config.enabled" [class.badge-off]="!config.enabled">
                        {{ config.enabled ? 'On' : 'Off' }}
                      </span>
                    </div>
                  </div>
                  <div class="card-action-row">
                    <span class="action-label">{{ getActionLabel(config.action) }}</span>
                    @if (config.description) {
                      <span class="card-desc">{{ config.description }}</span>
                    }
                  </div>
                  <div class="card-url-row">
                    <mat-icon class="url-icon">link</mat-icon>
                    <span class="card-url">{{ config.url }}</span>
                  </div>
                </div>
                <div class="card-actions">
                  <button mat-icon-button (click)="openDialog(config)" matTooltip="Edit"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button class="delete-btn" (click)="deleteConfig(config)" matTooltip="Delete"><mat-icon>delete</mat-icon></button>
                </div>
              </div>
            }
          </div>
        }
      }

      <input type="file" #fileInput accept=".json" style="display:none" (change)="handleImport($event)" />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    .configs-page { max-width: 900px; margin: 0 auto; padding: 8px 8px 80px; overflow-x: hidden; }

    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .header-icon { font-size: 28px; width: 28px; height: 28px; color: #64b5f6; }
    h1 { font-size: 1.3rem; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 2px; }
    .subtitle { font-size: 0.8rem; color: rgba(255,255,255,0.4); }
    .header-actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }

    .section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 0.82rem; font-weight: 700; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.6px; }
    .section-icon { font-size: 16px; width: 16px; height: 16px; }

    .action-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: rgba(255,255,255,0.7); font-size: 0.8rem; cursor: pointer; font-family: inherit; transition: all 0.12s; }
    .action-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .action-btn:hover { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.18); color: rgba(255,255,255,0.9); }
    .primary-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 14px; background: rgba(100,181,246,0.15); border: 1px solid rgba(100,181,246,0.4); border-radius: 6px; color: #64b5f6; font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.12s; }
    .primary-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .primary-btn:hover { background: rgba(100,181,246,0.25); border-color: #64b5f6; }

    .loading { display: flex; justify-content: center; gap: 6px; padding: 64px; }
    .loading-dot { width: 8px; height: 8px; background: rgba(100,181,246,0.5); border-radius: 50%; animation: pulse 1.2s ease-in-out infinite; }
    .loading-dot:nth-child(2) { animation-delay: 0.2s; }
    .loading-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes pulse { 0%,80%,100% { opacity:0.3; transform:scale(0.8); } 40% { opacity:1; transform:scale(1); } }

    .empty-state { text-align: center; padding: 64px 24px; color: rgba(255,255,255,0.35); display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.3; }
    .empty-state p { margin: 0; font-size: 0.95rem; }

    .configs-list { display: flex; flex-direction: column; gap: 6px; }
    .config-card { display: flex; align-items: stretch; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; overflow: hidden; transition: border-color 0.15s, background 0.15s; }
    .config-card:hover { border-color: rgba(255,255,255,0.13); background: rgba(255,255,255,0.045); }
    .config-card.disabled { opacity: 0.55; }

    .card-accent { width: 3px; flex-shrink: 0; }
    .card-icon-col { display: flex; align-items: center; justify-content: center; padding: 0 12px; }
    .card-icon { font-size: 22px; width: 22px; height: 22px; opacity: 0.85; }
    .card-main { flex: 1; min-width: 0; padding: 12px 8px 12px 0; display: flex; flex-direction: column; gap: 4px; }
    .card-top-row { display: flex; align-items: center; gap: 10px; }
    .card-name { font-size: 0.92rem; font-weight: 600; color: rgba(255,255,255,0.88); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .card-badges { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .card-action-row { display: flex; align-items: baseline; gap: 8px; }
    .action-label { font-size: 0.75rem; color: rgba(255,255,255,0.4); font-weight: 500; }
    .card-desc { font-size: 0.75rem; color: rgba(255,255,255,0.3); }
    .card-url-row { display: flex; align-items: center; gap: 4px; min-width: 0; overflow: hidden; }
    .url-icon { font-size: 12px; width: 12px; height: 12px; color: rgba(255,255,255,0.25); flex-shrink: 0; }
    .card-url { font-size: 0.72rem; font-family: monospace; color: rgba(255,255,255,0.3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
    .card-actions { display: flex; flex-direction: column; justify-content: center; padding: 0 4px; }
    .delete-btn { color: rgba(239,83,80,0.6); }
    .delete-btn:hover { color: #ef5350; }

    .badge { padding: 2px 7px; border-radius: 10px; font-size: 0.7rem; font-weight: 600; display: inline-flex; align-items: center; gap: 2px; }
    .badge-on { background: rgba(76,175,80,0.18); color: #4caf50; }
    .badge-off { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.35); }
    .badge-auto { background: rgba(255,193,7,0.15); color: #ffc107; }
    .badge-icon { font-size: 11px; width: 11px; height: 11px; }
    .method-badge { padding: 2px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 700; font-family: monospace; }
    .method-post { background: rgba(33,150,243,0.15); color: #64b5f6; }
    .method-get { background: rgba(76,175,80,0.15); color: #66bb6a; }
  `]
})
export class ApiRequestConfigsComponent implements OnInit {
  private svc = inject(ApiRequestConfigsService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  configs = signal<ApiRequestConfig[]>([]);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: (data) => { this.configs.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Failed to load configs', 'Close', { duration: 3000 }); }
    });
  }

  getActionIcon(action: string): string {
    return REQUEST_ACTIONS.find(a => a.value === action)?.icon ?? 'api';
  }

  getActionLabel(action: string): string {
    return REQUEST_ACTIONS.find(a => a.value === action)?.label ?? action;
  }

  getAccentColor(action: string): string {
    const map: Record<string, string> = {
      AddTimesheetEntry: '#42a5f5',
      EditTimesheetEntry: '#26c6da',
      DeleteTimesheetEntry: '#ef5350',
      FetchLeave: '#66bb6a',
      FetchCalendarEvents: '#26c6da',
      GetTimesheetProjects: '#ab47bc',
      AiChatWinStory: '#ffa726',
      GenerateJoke: '#ffca28',
    };
    return map[action] ?? '#78909c';
  }

  openDialog(config?: ApiRequestConfig) {
    if (config?.id) {
      this.router.navigate([config.id, 'edit'], { relativeTo: this.route });
    } else {
      this.router.navigate(['new'], { relativeTo: this.route });
    }
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
}
