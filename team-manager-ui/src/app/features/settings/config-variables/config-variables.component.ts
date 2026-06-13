import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfigVariablesService, ConfigVariable } from './config-variables.service';

@Component({
  selector: 'app-config-variables',
  standalone: true,
  imports: [
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatTooltipModule
],
  template: `
    <div class="page">
      <div class="page-header">
        <div class="header-left">
          <mat-icon class="header-icon">tune</mat-icon>
          <div>
            <h1>Config Variables</h1>
            <p class="header-sub">Reusable values for request config templates — reference as <code class="var-hint">&#123;key&#125;</code></p>
          </div>
        </div>
        <button mat-raised-button color="primary" (click)="startAdd()">
          <mat-icon>add</mat-icon> Add Variable
        </button>
      </div>

      @if (loading()) {
        <div class="loading">Loading...</div>
      } @else {
        @if (adding()) {
          <div class="edit-card new-card">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Key</mat-label>
              <input matInput [(ngModel)]="draft.key" placeholder="baseUrl" (keydown.enter)="saveNew()">
              <mat-hint>Used as &#123;key&#125; in templates</mat-hint>
            </mat-form-field>
            <div class="value-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Value</mat-label>
                <input matInput [(ngModel)]="draft.value" [type]="draft.isSecret ? 'password' : 'text'"
                       placeholder="https://api.example.com" (keydown.enter)="saveNew()">
              </mat-form-field>
              <button mat-icon-button [color]="draft.isSecret ? 'accent' : ''"
                      (click)="draft.isSecret = !draft.isSecret"
                      [matTooltip]="draft.isSecret ? 'Secret — stored securely, click to make plain' : 'Click to store value securely'"
                      class="lock-btn">
                <mat-icon>{{ draft.isSecret ? 'lock' : 'lock_open' }}</mat-icon>
              </button>
            </div>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description</mat-label>
              <input matInput [(ngModel)]="draft.description" placeholder="Optional" (keydown.enter)="saveNew()">
            </mat-form-field>
            <div class="edit-actions">
              <button mat-button (click)="cancelAdd()">Cancel</button>
              <button mat-raised-button color="primary" (click)="saveNew()" [disabled]="!draft.key.trim() || saving()">
                {{ saving() ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </div>
        }

        @if (variables().length === 0 && !adding()) {
          <div class="empty-state">
            <mat-icon>tune</mat-icon>
            <p>No config variables yet.</p>
            <p class="empty-sub">Add values like API base URLs, team IDs, or API keys. Reference them in request config URLs, headers, and body templates as <code class="var-hint">&#123;key&#125;</code>.</p>
          </div>
        } @else {
          <div class="vars-list">
            @for (v of variables(); track v.id) {
              @if (editingId() === v.id) {
                <div class="edit-card">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Key</mat-label>
                    <input matInput [(ngModel)]="draft.key" placeholder="baseUrl">
                  </mat-form-field>
                  <div class="value-row">
                    @if (draft.isSecret && !editingSecret()) {
                      <div class="secret-value-display full-width">
                        <span class="secret-dots">••••••••</span>
                        <button mat-button class="change-btn" (click)="editingSecret.set(true)">Change</button>
                      </div>
                    } @else {
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Value</mat-label>
                        <input matInput [(ngModel)]="draft.value"
                               [placeholder]="draft.isSecret ? 'Enter new value' : 'https://api.example.com'">
                        @if (draft.isSecret && editingSecret()) {
                          <button matSuffix mat-icon-button (click)="cancelEditSecret()" matTooltip="Keep existing">
                            <mat-icon>close</mat-icon>
                          </button>
                        }
                      </mat-form-field>
                    }
                    <button mat-icon-button [color]="draft.isSecret ? 'accent' : ''"
                            (click)="onSecretToggle(!draft.isSecret)"
                            [matTooltip]="draft.isSecret ? 'Secret — stored securely, click to make plain' : 'Click to store value securely'"
                            class="lock-btn">
                      <mat-icon>{{ draft.isSecret ? 'lock' : 'lock_open' }}</mat-icon>
                    </button>
                  </div>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Description</mat-label>
                    <input matInput [(ngModel)]="draft.description" placeholder="Optional">
                  </mat-form-field>
                  <div class="edit-actions">
                    <button mat-button (click)="cancelEdit()">Cancel</button>
                    <button mat-raised-button color="primary" (click)="saveEdit(v.id!)" [disabled]="!draft.key.trim() || saving()">
                      {{ saving() ? 'Saving...' : 'Save' }}
                    </button>
                  </div>
                </div>
              } @else {
                <div class="var-row">
                  <div class="var-key"><code>{{ '{' + v.key + '}' }}</code></div>
                  <div class="var-value">
                    @if (v.isSecret) {
                      <span class="secret-dots">••••••••</span>
                    } @else {
                      <span class="value-text">{{ v.value }}</span>
                    }
                  </div>
                  <div class="var-desc">{{ v.description || '' }}</div>
                  <div class="var-actions">
                    @if (v.isSecret) {
                      <mat-icon class="secret-icon" matTooltip="Secret — value never sent to browser">lock</mat-icon>
                    }
                    <button mat-icon-button (click)="startEdit(v)" matTooltip="Edit">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="deleteVar(v)" matTooltip="Delete">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>
              }
            }
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    .page { max-width: 900px; margin: 0 auto; padding: 8px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
    .header-left { display: flex; align-items: flex-start; gap: 12px; }
    .header-icon { font-size: 26px; width: 26px; height: 26px; color: #64b5f6; margin-top: 2px; }
    h1 { font-size: 1.2rem; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 2px; }
    .header-sub { font-size: 0.78rem; color: rgba(255,255,255,0.4); margin: 0; }
    .var-hint { background: rgba(100,181,246,0.12); color: #64b5f6; padding: 1px 5px; border-radius: 4px; font-size: 0.85em; }
    .loading { text-align: center; padding: 64px; opacity: 0.35; }
    .empty-state { text-align: center; padding: 48px 24px; color: rgba(255,255,255,0.4); }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; display: block; }
    .empty-state p { margin: 4px 0; }
    .empty-sub { font-size: 0.8rem; max-width: 480px; margin: 8px auto 0; }

    .vars-list { display: flex; flex-direction: column; gap: 4px; }
    .var-row { display: grid; grid-template-columns: 180px 1fr 1fr auto; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; transition: border-color 0.15s; }
    .var-row:hover { border-color: rgba(255,255,255,0.12); }
    .var-key code { font-size: 0.85rem; color: #64b5f6; background: rgba(100,181,246,0.1); padding: 2px 6px; border-radius: 4px; }
    .value-text { font-size: 0.82rem; color: rgba(255,255,255,0.6); font-family: monospace; word-break: break-all; }
    .secret-dots { font-size: 1rem; color: rgba(255,255,255,0.3); letter-spacing: 3px; }
    .var-desc { font-size: 0.78rem; color: rgba(255,255,255,0.35); }
    .var-actions { display: flex; align-items: center; gap: 2px; justify-content: flex-end; }
    .secret-icon { font-size: 16px; width: 16px; height: 16px; color: #ce93d8; opacity: 0.7; }

    .edit-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(100,181,246,0.25); border-radius: 10px; padding: 14px 14px 10px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 0; }
    .new-card { border-color: rgba(76,175,80,0.3); }
    .full-width { width: 100%; }
    .value-row { display: flex; align-items: flex-start; gap: 4px; }
    .value-row .full-width { flex: 1; }
    .lock-btn { margin-top: 4px; flex-shrink: 0; }
    .secret-value-display { display: flex; align-items: center; gap: 8px; min-height: 56px; flex: 1; }
    .change-btn { font-size: 0.78rem; color: #64b5f6; }
    .edit-actions { display: flex; gap: 8px; justify-content: flex-end; padding-top: 4px; }

    @media (max-width: 600px) {
      .var-row { grid-template-columns: 1fr auto; }
      .var-value, .var-desc { display: none; }
    }
  `]
})
export class ConfigVariablesComponent implements OnInit {
  private svc = inject(ConfigVariablesService);
  private snackBar = inject(MatSnackBar);

  loading = signal(true);
  variables = signal<ConfigVariable[]>([]);
  adding = signal(false);
  editingId = signal<string | null>(null);
  editingSecret = signal(false);
  saving = signal(false);

  draft: ConfigVariable = this.emptyDraft();

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: (data) => { this.variables.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Failed to load variables', 'Close', { duration: 3000 }); }
    });
  }

  startAdd() {
    this.draft = this.emptyDraft();
    this.adding.set(true);
    this.editingId.set(null);
  }

  cancelAdd() { this.adding.set(false); }

  saveNew() {
    if (!this.draft.key.trim()) return;
    this.saving.set(true);
    this.svc.create(this.draft).subscribe({
      next: () => { this.saving.set(false); this.adding.set(false); this.load(); this.snackBar.open('Variable saved', 'Close', { duration: 2000 }); },
      error: (e) => { this.saving.set(false); this.snackBar.open(e.error?.detail ?? 'Failed to save', 'Close', { duration: 3000 }); }
    });
  }

  startEdit(v: ConfigVariable) {
    this.draft = { ...v, value: v.isSecret ? '**SECRET**' : v.value };
    this.editingId.set(v.id!);
    this.editingSecret.set(false);
    this.adding.set(false);
  }

  cancelEdit() { this.editingId.set(null); }

  cancelEditSecret() {
    this.draft.value = '**SECRET**';
    this.editingSecret.set(false);
  }

  onSecretToggle(isSecret: boolean) {
    this.draft.isSecret = isSecret;
    if (!isSecret) {
      this.draft.value = '';
      this.editingSecret.set(true);
    }
  }

  saveEdit(id: string) {
    if (!this.draft.key.trim()) return;
    const payload = { ...this.draft };
    if (payload.isSecret && !this.editingSecret() && payload.value === '**SECRET**') {
      payload.value = '**SECRET**';
    }
    this.saving.set(true);
    this.svc.update(id, payload).subscribe({
      next: () => { this.saving.set(false); this.editingId.set(null); this.load(); this.snackBar.open('Variable saved', 'Close', { duration: 2000 }); },
      error: (e) => { this.saving.set(false); this.snackBar.open(e.error?.detail ?? 'Failed to save', 'Close', { duration: 3000 }); }
    });
  }

  deleteVar(v: ConfigVariable) {
    if (!confirm(`Delete variable {${v.key}}?`)) return;
    this.svc.delete(v.id!).subscribe({
      next: () => { this.load(); this.snackBar.open('Variable deleted', 'Close', { duration: 2000 }); },
      error: () => this.snackBar.open('Failed to delete', 'Close', { duration: 3000 })
    });
  }

  private emptyDraft(): ConfigVariable {
    return { key: '', value: '', description: '', isSecret: false };
  }
}
