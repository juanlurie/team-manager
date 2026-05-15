import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LeaveFetchConfigService, LeaveFetchConfig, MappingConfig } from './leave-fetch-config.service';

@Component({
  selector: 'app-leave-fetch-config',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatInputModule, MatFormFieldModule, MatSelectModule,
    MatSlideToggleModule, MatSnackBarModule
  ],
  template: `
    <div class="config-page">
      <div class="page-header">
        <mat-icon class="header-icon">settings</mat-icon>
        <h1>Leave Fetch Configuration</h1>
      </div>

      @if (loading()) {
        <div class="loading">Loading...</div>
      } @else {
        <div class="config-form">
          <!-- Enabled toggle -->
          <div class="field-row">
            <label class="field-label">Enabled</label>
            <mat-slide-toggle [checked]="config().enabled" (change)="config().enabled = $event.checked">
              {{ config().enabled ? 'On' : 'Off' }}
            </mat-slide-toggle>
          </div>

          <!-- URL -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>API URL</mat-label>
            <input matInput [(ngModel)]="config().url" placeholder="https://example.com/api/leave">
          </mat-form-field>

          <!-- Method -->
          <mat-form-field appearance="outline">
            <mat-label>HTTP Method</mat-label>
            <mat-select [(ngModel)]="config().method">
              <mat-option value="GET">GET</mat-option>
              <mat-option value="POST">POST</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Form URL Encoded -->
          <div class="field-row">
            <label class="field-label">Form URL Encoded</label>
            <mat-slide-toggle [checked]="config().isFormUrlEncoded" (change)="config().isFormUrlEncoded = $event.checked">
              {{ config().isFormUrlEncoded ? 'Yes' : 'No' }}
            </mat-slide-toggle>
          </div>

          <!-- Headers -->
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
                <input matInput [(ngModel)]="entry.value" placeholder="{cookie}">
              </mat-form-field>
              <button mat-icon-button color="warn" (click)="removeHeader(entry.key)" class="remove-btn">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          }

          <!-- Body Template -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Body Template</mat-label>
            <textarea matInput [(ngModel)]="config().bodyTemplate" rows="3"
                      placeholder="teamId={teamIds}&start={start}&end={end}"></textarea>
            <mat-hint>Variables: {cookie}, {start}, {end}, {teamIds}</mat-hint>
          </mat-form-field>

          <!-- Mapping -->
          <div class="section-header">
            <h3>Response Mapping</h3>
          </div>

          <div class="mapping-grid">
            <mat-form-field appearance="outline">
              <mat-label>Name Path</mat-label>
              <input matInput [(ngModel)]="config().mapping.namePath" placeholder="title">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Start Path</mat-label>
              <input matInput [(ngModel)]="config().mapping.startPath" placeholder="start">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>End Path</mat-label>
              <input matInput [(ngModel)]="config().mapping.endPath" placeholder="end">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Type Path</mat-label>
              <input matInput [(ngModel)]="config().mapping.typePath" placeholder="type">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Days Path</mat-label>
              <input matInput [(ngModel)]="config().mapping.daysPath" placeholder="totalDays">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Status Path</mat-label>
              <input matInput [(ngModel)]="config().mapping.statusPath" placeholder="status">
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline">
            <mat-label>Name Transform</mat-label>
            <mat-select [(ngModel)]="config().mapping.nameTransform">
              <mat-option value="ExtractBeforeDash">Extract Before Dash (e.g. "John Doe - Annual" → "John Doe")</mat-option>
              <mat-option value="None">None</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Save -->
          <div class="actions">
            <button mat-raised-button color="primary" (click)="save()" [disabled]="saving()">
              {{ saving() ? 'Saving...' : 'Save Configuration' }}
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .config-page { max-width: 800px; margin: 0 auto; padding: 8px; }
    .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .header-icon { font-size: 28px; width: 28px; height: 28px; color: #64b5f6; }
    .page-header h1 { font-size: 1.3rem; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0; }
    .loading { text-align: center; padding: 64px; opacity: 0.35; }

    .config-form { display: flex; flex-direction: column; gap: 8px; }
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

    .actions { margin-top: 16px; }
  `]
})
export class LeaveFetchConfigComponent implements OnInit {
  private svc = inject(LeaveFetchConfigService);
  private snackBar = inject(MatSnackBar);

  loading = signal(true);
  saving = signal(false);
  config = signal<LeaveFetchConfig>({
    enabled: false,
    url: '',
    method: 'POST',
    isFormUrlEncoded: true,
    headers: {},
    bodyTemplate: '',
    mapping: {
      namePath: 'title',
      startPath: 'start',
      endPath: 'end',
      typePath: 'type',
      daysPath: 'totalDays',
      statusPath: 'status',
      nameTransform: 'ExtractBeforeDash'
    }
  });

  headerEntries = signal<{key: string, value: string}[]>([]);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.get().subscribe({
      next: (cfg) => {
        this.config.set(cfg);
        this.headerEntries.set(Object.entries(cfg.headers).map(([k, v]) => ({ key: k, value: v })));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load configuration', 'Close', { duration: 3000 });
      }
    });
  }

  addHeader() {
    const entries = this.headerEntries();
    this.headerEntries.set([...entries, { key: '', value: '' }]);
  }

  removeHeader(key: string) {
    this.headerEntries.set(this.headerEntries().filter(e => e.key !== key));
  }

  save() {
    const cfg = this.config();
    const headers: Record<string, string> = {};
    for (const entry of this.headerEntries()) {
      if (entry.key.trim()) {
        headers[entry.key.trim()] = entry.value;
      }
    }
    cfg.headers = headers;

    this.saving.set(true);
    this.svc.save(cfg).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open('Configuration saved', 'Close', { duration: 3000 });
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Failed to save configuration', 'Close', { duration: 3000 });
      }
    });
  }
}
