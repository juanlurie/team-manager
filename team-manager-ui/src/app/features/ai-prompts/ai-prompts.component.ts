import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AiPromptsService } from '../../core/services/ai-prompts.service';
import { ApiRequestConfigsService, ApiRequestConfig } from '../api-request-configs/api-request-configs.service';
import { AiPrompt, AI_PROMPT_KEYS } from '../../core/models/ai-prompt.model';

interface EditForm {
  key: string;
  label: string;
  systemPrompt: string;
  userMessageTemplate: string;
  enabled: boolean;
  connectionId: string;
  model: string;
}

const EMPTY_FORM: EditForm = { key: '', label: '', systemPrompt: '', userMessageTemplate: '', enabled: true, connectionId: '', model: '' };

@Component({
  selector: 'app-ai-prompts',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule, MatSelectModule, MatAutocompleteModule],
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .wrap { max-width:900px;margin:0 auto;padding:0 8px }
    .header { display:flex;align-items:center;justify-content:space-between;margin-bottom:16px }
    .header h2 { margin:0;font-size:1.3rem;font-weight:700;display:flex;align-items:center;gap:6px }
    .hint { font-size:0.8rem;opacity:0.55;margin:-8px 0 16px }
    .form-card {
      border:1px solid rgba(100,181,246,0.25);background:rgba(100,181,246,0.05);
      border-radius:12px;padding:16px;margin-bottom:16px;display:flex;flex-direction:column;gap:10px;
    }
    .form-row { display:flex;gap:10px }
    .form-row mat-form-field { flex:1 }
    textarea.prompt-textarea { font-family:inherit;font-size:0.85rem;min-height:90px }
    .form-actions { display:flex;gap:8px;justify-content:flex-end }
    .prompt-row {
      display:flex;flex-direction:column;gap:8px;padding:14px 16px;margin-bottom:10px;
      border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);
    }
    .prompt-row-header { display:flex;align-items:center;gap:10px }
    .prompt-key { font-weight:600;flex:1 }
    .prompt-meta { font-size:0.75rem;opacity:0.5 }
    .badge { font-size:0.7rem;padding:2px 8px;border-radius:10px;background:rgba(76,175,80,0.15);color:#4caf50 }
    .badge.inactive { background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.35) }
    .test-params { display:flex;flex-wrap:wrap;gap:8px;margin-top:4px }
    .test-params mat-form-field { flex:1 1 160px;min-width:140px }
    .test-hint { font-size:0.75rem;opacity:0.5;margin-top:2px }
    .test-result { font-size:0.82rem;padding:10px 12px;border-radius:8px;margin-top:4px;white-space:pre-wrap;word-break:break-word }
    .test-result.success { background:rgba(76,175,80,0.08);border:1px solid rgba(76,175,80,0.25) }
    .test-result.error { background:rgba(239,83,80,0.08);border:1px solid rgba(239,83,80,0.25);color:#ef5350 }
    .empty { text-align:center;padding:48px;opacity:0.35 }
  `],
  template: `
    <div class="wrap">
      <div class="header">
        <h2><mat-icon>auto_awesome</mat-icon>AI Prompts</h2>
        @if (!editingNew()) {
          <button mat-raised-button color="primary" (click)="startAdd()">
            <mat-icon style="font-size:1rem;width:1rem;height:1rem">add</mat-icon> Add Prompt
          </button>
        }
      </div>
      <div class="hint">
        Each prompt's plain-text System Prompt and User Message Template link to one shared AI Connection
        (set up under API Configs with Action = "AI Connection"). No JSON to edit here.
      </div>

      @if (editingNew() || editingId()) {
        <div class="form-card">
          <div class="form-row">
            <mat-form-field appearance="outline">
              <mat-label>Key</mat-label>
              <mat-select [(ngModel)]="editForm.key" [disabled]="!!editingId()" (selectionChange)="onKeyChange()">
                @for (k of promptKeys; track k.value) {
                  <mat-option [value]="k.value">{{ k.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Label</mat-label>
              <input matInput [(ngModel)]="editForm.label" placeholder="e.g. Wordle word">
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Connection</mat-label>
              <mat-select [(ngModel)]="editForm.connectionId">
                @for (c of connections(); track c.id) {
                  <mat-option [value]="c.id">{{ c.name }}</mat-option>
                }
              </mat-select>
              @if (connections().length === 0) {
                <mat-hint>No AI connection found — configure Claude, OpenAI, or Ollama in the Library tab first.</mat-hint>
              }
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline">
            <mat-label>System Prompt</mat-label>
            <textarea matInput class="prompt-textarea" [(ngModel)]="editForm.systemPrompt"
                      placeholder="Output ONLY a single valid JSON object..."></textarea>
            @if (currentVarHint()) { <mat-hint>Available placeholders: {{ currentVarHint() }}</mat-hint> }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>User Message Template</mat-label>
            <textarea matInput class="prompt-textarea" [(ngModel)]="editForm.userMessageTemplate"
                      placeholder="Generate one trivia question about {angle} {topic}..."></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Model override (optional)</mat-label>
            <input matInput [(ngModel)]="editForm.model" [matAutocomplete]="modelAuto"
                   placeholder="Leave blank to use the connection's default model">
            <mat-autocomplete #modelAuto="matAutocomplete">
              @for (m of modelOptions(); track m) { <mat-option [value]="m">{{ m }}</mat-option> }
            </mat-autocomplete>
            <button matSuffix mat-icon-button type="button" (click)="loadModels()"
                    [disabled]="loadingModels() || !editForm.connectionId"
                    [title]="editForm.connectionId ? 'Fetch available models' : 'Pick a connection first'">
              <mat-icon>{{ loadingModels() ? 'hourglass_empty' : 'refresh' }}</mat-icon>
            </button>
            <mat-hint>Overrides the connection's model for this prompt only. Blank = connection default.</mat-hint>
          </mat-form-field>

          <label style="display:flex;align-items:center;gap:6px;font-size:0.85rem">
            <input type="checkbox" [(ngModel)]="editForm.enabled"> Enabled
          </label>

          <div class="form-actions">
            <button mat-stroked-button (click)="cancelEdit()">Cancel</button>
            <button mat-raised-button color="primary" [disabled]="!canSave()" (click)="save()">Save</button>
          </div>
        </div>
      }

      @for (p of prompts(); track p.id) {
        <div class="prompt-row">
          <div class="prompt-row-header">
            <span class="prompt-key">{{ keyLabel(p.key) }}<span class="prompt-meta"> — {{ p.label }}</span></span>
            <span class="badge" [class.inactive]="!p.enabled">{{ p.enabled ? 'Enabled' : 'Disabled' }}</span>
            <button mat-icon-button (click)="startEdit(p)"><mat-icon style="font-size:1.1rem">edit</mat-icon></button>
            <button mat-icon-button (click)="deletePrompt(p)" style="color:#ef5350"><mat-icon style="font-size:1.1rem">delete</mat-icon></button>
          </div>
          <div class="prompt-meta">Connection: {{ p.connectionName || '(none)' }}</div>
          @if (varsFor(p).length) {
            <div class="test-params">
              @for (v of varsFor(p); track v) {
                <mat-form-field appearance="outline">
                  <mat-label>{{ '{' + v + '}' }}</mat-label>
                  <input matInput [ngModel]="testParams()[p.id!]?.[v] ?? ''"
                         (ngModelChange)="setParam(p, v, $event)" placeholder="test value">
                </mat-form-field>
              }
            </div>
            <div class="test-hint">These values replace the placeholders for this test run only.</div>
          }
          <div>
            <button mat-stroked-button [disabled]="testingId() === p.id" (click)="testPrompt(p)">
              @if (testingId() === p.id) { Testing… } @else { Test }
            </button>
          </div>
          @if (testResults()[p.id!]) {
            @let r = testResults()[p.id!];
            <div class="test-result" [class.success]="r!.success" [class.error]="!r!.success">
              {{ r!.success ? r!.extractedText : r!.error }}
            </div>
          }
        </div>
      }
      @if (prompts().length === 0 && !editingNew()) {
        <div class="empty">No AI prompts configured yet. Add one above.</div>
      }
    </div>
  `
})
export class AiPromptsComponent implements OnInit {
  private svc = inject(AiPromptsService);
  private connSvc = inject(ApiRequestConfigsService);
  private snack = inject(MatSnackBar);

  readonly promptKeys = AI_PROMPT_KEYS;

  prompts = signal<AiPrompt[]>([]);
  connections = signal<ApiRequestConfig[]>([]);
  editingId = signal<string | null>(null);
  editingNew = signal(false);
  testingId = signal<string | null>(null);
  testResults = signal<Record<string, { success: boolean; extractedText: string | null; error: string | null } | undefined>>({});
  testParams = signal<Record<string, Record<string, string>>>({});
  modelOptions = signal<string[]>([]);
  loadingModels = signal(false);

  editForm: EditForm = { ...EMPTY_FORM };

  ngOnInit() {
    this.load();
    this.connSvc.list().subscribe(all => this.connections.set(all.filter(c => c.isAiConnection)));
  }

  private load() { this.svc.getAll().subscribe(p => this.prompts.set(p)); }

  keyLabel(key: string): string {
    return this.promptKeys.find(k => k.value === key)?.label ?? key;
  }

  currentVarHint(): string {
    const meta = this.promptKeys.find(k => k.value === this.editForm.key);
    return meta ? Object.keys(meta.vars).map(v => `{${v}}`).join(', ') : '';
  }

  onKeyChange() {
    if (!this.editForm.label) {
      this.editForm.label = this.keyLabel(this.editForm.key);
    }
    // Only offer starter text while a field is still blank -- never clobber something the
    // admin already typed just because they re-picked the same key.
    const meta = this.promptKeys.find(k => k.value === this.editForm.key);
    if (!this.editForm.systemPrompt.trim() && meta?.systemPromptSuggestion) {
      this.editForm.systemPrompt = meta.systemPromptSuggestion;
    }
    if (!this.editForm.userMessageTemplate.trim() && meta?.userMessageSuggestion) {
      this.editForm.userMessageTemplate = meta.userMessageSuggestion;
    }
  }

  startAdd() {
    this.editingNew.set(true);
    this.editingId.set(null);
    this.editForm = { ...EMPTY_FORM };
    this.modelOptions.set([]);
  }

  startEdit(p: AiPrompt) {
    this.editingNew.set(false);
    this.editingId.set(p.id!);
    this.editForm = {
      key: p.key, label: p.label, systemPrompt: p.systemPrompt,
      userMessageTemplate: p.userMessageTemplate, enabled: p.enabled, connectionId: p.connectionId,
      model: p.model ?? ''
    };
    this.modelOptions.set([]);
  }

  // Live-fetches the chosen connection's provider models to populate the override autocomplete.
  // Any provider error just leaves the field as free text.
  loadModels() {
    const id = this.editForm.connectionId;
    if (!id) return;
    this.loadingModels.set(true);
    this.connSvc.getAiModels(id).subscribe({
      next: models => {
        this.loadingModels.set(false);
        this.modelOptions.set(models);
        if (!models.length) this.snack.open('No models returned — type the model id manually', 'OK', { duration: 3500 });
      },
      error: (err) => {
        this.loadingModels.set(false);
        this.modelOptions.set([]);
        this.snack.open(err.error || 'Could not fetch models — type the model id manually', 'OK', { duration: 3500 });
      }
    });
  }

  cancelEdit() {
    this.editingId.set(null);
    this.editingNew.set(false);
  }

  canSave(): boolean {
    return !!this.editForm.key && !!this.editForm.label.trim() && !!this.editForm.connectionId;
  }

  save() {
    if (!this.canSave()) return;
    const payload: AiPrompt = { ...this.editForm };
    const id = this.editingId();
    const obs = id ? this.svc.update(id, payload) : this.svc.create(payload);
    obs.subscribe({
      next: () => {
        this.snack.open(id ? 'Prompt updated' : 'Prompt added', 'OK', { duration: 2000 });
        this.cancelEdit();
        this.load();
      },
      error: (err) => this.snack.open(err.error?.title ?? err.error?.error ?? 'Failed to save', 'OK', { duration: 4000 })
    });
  }

  deletePrompt(p: AiPrompt) {
    if (!confirm(`Delete the "${p.label}" prompt?`)) return;
    this.svc.delete(p.id!).subscribe({
      next: () => { this.snack.open('Prompt deleted', 'OK', { duration: 2000 }); this.load(); },
      error: () => this.snack.open('Failed to delete', 'OK', { duration: 3000 })
    });
  }

  varsFor(p: AiPrompt): string[] {
    const meta = this.promptKeys.find(k => k.value === p.key);
    return meta ? Object.keys(meta.vars) : [];
  }

  setParam(p: AiPrompt, name: string, value: string) {
    this.testParams.update(all => {
      const forPrompt = { ...(all[p.id!] ?? {}), [name]: value };
      return { ...all, [p.id!]: forPrompt };
    });
  }

  testPrompt(p: AiPrompt) {
    const params: Record<string, string> = {};
    for (const v of this.varsFor(p)) {
      params[v] = this.testParams()[p.id!]?.[v] ?? '';
    }
    this.testingId.set(p.id!);
    this.svc.test(p.id!, params).subscribe({
      next: (result) => {
        this.testingId.set(null);
        this.testResults.update(r => ({ ...r, [p.id!]: result }));
      },
      error: (err) => {
        this.testingId.set(null);
        this.testResults.update(r => ({ ...r, [p.id!]: { success: false, extractedText: null, error: err.error?.error ?? 'Test failed' } }));
      }
    });
  }
}
