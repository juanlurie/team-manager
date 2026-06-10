import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CredentialsService, CredentialEntry } from '../../../core/services/credentials.service';

interface EntryState {
  entry: CredentialEntry;
  revealed: boolean;
  editing: boolean;
  editName: string;
  editKeyName: string;
  manualValue: string;
  showPaste: boolean;
}

@Component({
  selector: 'app-portal-credentials',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, MatSnackBarModule],
  template: `
    <div class="wrap">
      <div class="hdr">
        <a class="back-btn" routerLink="/settings"><mat-icon>arrow_back</mat-icon></a>
        <div>
          <h1>Credentials</h1>
          <p class="subtitle">Stored credentials (cookies, tokens) used by request configs and sync. Each entry is read from a localStorage key — typically written by your browser extension.</p>
        </div>
      </div>

      <div class="entries-list">
        @for (es of entryStates(); track es.entry.id) {
          <div class="entry-card" [class.has-value]="hasValue(es)">

            <!-- Header row -->
            <div class="entry-hdr">
              <div class="entry-hdr-left">
                <div class="entry-name">{{ es.entry.name }}</div>
                <div class="entry-key"><mat-icon>vpn_key</mat-icon>{{ es.entry.keyName }}</div>
              </div>
              <div class="entry-hdr-right">
                <div class="status-chip" [class.present]="hasValue(es)" [class.missing]="!hasValue(es)">
                  <mat-icon>{{ hasValue(es) ? 'check_circle' : 'cancel' }}</mat-icon>
                  {{ hasValue(es) ? 'Present' : 'Missing' }}
                </div>
                <button class="icon-btn" (click)="toggleEdit(es)" [class.active]="es.editing" matTitle="Edit">
                  <mat-icon>edit</mat-icon>
                </button>
                <button class="icon-btn danger" (click)="removeEntry(es)" title="Remove cookie">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>

            <!-- Edit form -->
            @if (es.editing) {
              <div class="edit-form">
                <div class="edit-row">
                  <label class="field-label">Display name</label>
                  <input class="field-input" [(ngModel)]="es.editName" placeholder="e.g. Work Portal" />
                </div>
                <div class="edit-row">
                  <label class="field-label">localStorage key</label>
                  <input class="field-input" [(ngModel)]="es.editKeyName" placeholder="portalCookie" />
                </div>
                <div class="edit-actions">
                  <button class="btn-ghost" (click)="cancelEdit(es)">Cancel</button>
                  <button class="btn-primary" (click)="saveEdit(es)" [disabled]="!es.editName.trim() || !es.editKeyName.trim()">Save</button>
                </div>
              </div>
            }

            <!-- Value section -->
            @if (hasValue(es)) {
              <div class="value-section">
                <div class="cookie-value" [class.revealed]="es.revealed">
                  {{ es.revealed ? getValue(es) : maskedValue(es) }}
                </div>
                <div class="value-actions">
                  @if (updatedAt(es)) {
                    <span class="updated-at">Updated {{ updatedAt(es) | date:'d MMM, HH:mm' }}</span>
                  }
                  <div class="value-btns">
                    <button class="btn-link" (click)="toggleReveal(es)">
                      <mat-icon>{{ es.revealed ? 'visibility_off' : 'visibility' }}</mat-icon>
                      {{ es.revealed ? 'Hide' : 'Reveal' }}
                    </button>
                    <button class="btn-link" (click)="copyValue(es)">
                      <mat-icon>content_copy</mat-icon>Copy
                    </button>
                    <button class="btn-link danger" (click)="clearValue(es)">
                      <mat-icon>delete</mat-icon>Clear
                    </button>
                  </div>
                </div>
              </div>
            }

            <!-- Paste section -->
            <div class="paste-toggle">
              <button class="btn-link" (click)="es.showPaste = !es.showPaste">
                <mat-icon>{{ es.showPaste ? 'expand_less' : 'expand_more' }}</mat-icon>
                {{ es.showPaste ? 'Hide' : 'Set value manually' }}
              </button>
            </div>
            @if (es.showPaste) {
              <div class="paste-form">
                <textarea class="field-input field-textarea" [(ngModel)]="es.manualValue"
                  placeholder="Paste the cookie value here…" rows="3"></textarea>
                <div style="display:flex;justify-content:flex-end;margin-top:8px">
                  <button class="btn-primary" (click)="saveManualValue(es)" [disabled]="!es.manualValue.trim()">
                    Save value
                  </button>
                </div>
              </div>
            }

          </div>
        }
      </div>

      <!-- Add new cookie -->
      @if (!showAddForm()) {
        <button class="btn-add" (click)="showAddForm.set(true)">
          <mat-icon>add</mat-icon>
          Add cookie
        </button>
      } @else {
        <div class="entry-card add-card">
          <div class="section-title">Add cookie</div>
          <div class="edit-row">
            <label class="field-label">Display name</label>
            <input class="field-input" [(ngModel)]="newName" placeholder="e.g. Work Portal" />
          </div>
          <div class="edit-row">
            <label class="field-label">localStorage key</label>
            <input class="field-input" [(ngModel)]="newKeyName" placeholder="portalCookie" />
          </div>
          <div class="edit-actions">
            <button class="btn-ghost" (click)="cancelAdd()">Cancel</button>
            <button class="btn-primary" (click)="addEntry()" [disabled]="!newName.trim() || !newKeyName.trim()">
              Add
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .wrap { max-width: 640px; margin: 0 auto; padding: 24px 16px 80px; }

    .hdr { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 24px; }
    .back-btn { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 8px; color: rgba(255,255,255,0.5); text-decoration: none; flex-shrink: 0; margin-top: 2px; transition: background 0.15s, color 0.15s; }
    .back-btn:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.9); }
    h1 { font-size: 1.2rem; font-weight: 700; margin: 0 0 4px; }
    .subtitle { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 0; line-height: 1.5; }

    .entries-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }

    .entry-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; padding: 14px 16px; transition: border-color 0.15s; }
    .entry-card.has-value { border-color: rgba(76,175,80,0.2); }
    .add-card { border-color: rgba(100,181,246,0.2); }

    .entry-hdr { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 2px; }
    .entry-hdr-left { min-width: 0; }
    .entry-name { font-size: 0.9rem; font-weight: 600; color: rgba(255,255,255,0.9); margin-bottom: 3px; }
    .entry-key { display: flex; align-items: center; gap: 4px; font-size: 0.72rem; font-family: monospace; color: rgba(255,255,255,0.4); }
    .entry-key mat-icon { font-size: 12px; width: 12px; height: 12px; }

    .entry-hdr-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

    .status-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 0.72rem; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
    .status-chip mat-icon { font-size: 12px; width: 12px; height: 12px; }
    .status-chip.present { background: rgba(76,175,80,0.12); color: #4caf50; }
    .status-chip.missing { background: rgba(158,158,158,0.1); color: rgba(255,255,255,0.35); }

    .icon-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: none; border: none; cursor: pointer; color: rgba(255,255,255,0.35); transition: background 0.15s, color 0.15s; }
    .icon-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .icon-btn:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.75); }
    .icon-btn.active { color: #64b5f6; background: rgba(100,181,246,0.1); }
    .icon-btn.danger:hover { color: #ef5350; background: rgba(239,83,80,0.08); }

    .edit-form, .paste-form { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06); }
    .edit-row { margin-bottom: 10px; }
    .edit-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }

    .value-section { margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.05); }
    .cookie-value { font-family: monospace; font-size: 0.7rem; word-break: break-all; color: rgba(255,255,255,0.45); line-height: 1.5; max-height: 48px; overflow: hidden; }
    .cookie-value.revealed { max-height: none; color: rgba(255,255,255,0.8); }
    .value-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; flex-wrap: wrap; gap: 4px; }
    .updated-at { font-size: 0.7rem; color: rgba(255,255,255,0.25); }
    .value-btns { display: flex; gap: 2px; }

    .paste-toggle { margin-top: 8px; }

    .field-label { display: block; font-size: 0.72rem; color: rgba(255,255,255,0.4); margin-bottom: 5px; font-weight: 500; }
    .field-input { width: 100%; box-sizing: border-box; padding: 7px 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 7px; color: inherit; font-size: 0.83rem; font-family: inherit; outline: none; transition: border-color 0.15s; }
    .field-input:focus { border-color: rgba(100,181,246,0.5); }
    .field-textarea { resize: vertical; min-height: 70px; font-family: monospace; font-size: 0.73rem; }

    .section-title { font-size: 0.88rem; font-weight: 600; color: rgba(255,255,255,0.8); margin-bottom: 12px; }

    .btn-link { display: inline-flex; align-items: center; gap: 3px; background: none; border: none; cursor: pointer; font-size: 0.74rem; color: rgba(255,255,255,0.4); padding: 3px 6px; border-radius: 4px; font-family: inherit; transition: color 0.15s, background 0.15s; }
    .btn-link mat-icon { font-size: 13px; width: 13px; height: 13px; }
    .btn-link:hover { color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.06); }
    .btn-link.danger:hover { color: #ef5350; background: rgba(239,83,80,0.08); }

    .btn-primary { padding: 7px 16px; border-radius: 7px; border: none; background: #64b5f6; color: #0d1b2a; font-size: 0.82rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: background 0.15s; white-space: nowrap; }
    .btn-primary:hover:not(:disabled) { background: #90caf9; }
    .btn-primary:disabled { opacity: 0.35; cursor: not-allowed; }

    .btn-ghost { padding: 7px 14px; border-radius: 7px; border: 1px solid rgba(255,255,255,0.12); background: none; color: rgba(255,255,255,0.6); font-size: 0.82rem; cursor: pointer; font-family: inherit; transition: background 0.15s; }
    .btn-ghost:hover { background: rgba(255,255,255,0.06); }

    .btn-add { display: flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 10px; border: 1px dashed rgba(255,255,255,0.15); background: none; color: rgba(255,255,255,0.45); font-size: 0.83rem; cursor: pointer; font-family: inherit; width: 100%; justify-content: center; transition: border-color 0.15s, color 0.15s, background 0.15s; }
    .btn-add:hover { border-color: rgba(100,181,246,0.4); color: #64b5f6; background: rgba(100,181,246,0.04); }
    .btn-add mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `]
})
export class PortalCredentialsComponent {
  private svc = inject(CredentialsService);
  private snack = inject(MatSnackBar);

  showAddForm = signal(false);
  newName = '';
  newKeyName = '';

  private _tick = signal(0);
  private _stateMap = new Map<string, Omit<EntryState, 'entry'>>();

  entryStates = computed<EntryState[]>(() => {
    this._tick();
    return this.svc.entries().map(entry => {
      if (!this._stateMap.has(entry.id)) {
        this._stateMap.set(entry.id, {
          revealed: false, editing: false,
          editName: entry.name, editKeyName: entry.keyName,
          manualValue: '', showPaste: false
        });
      }
      const s = this._stateMap.get(entry.id)!;
      return { entry, ...s };
    });
  });

  hasValue(es: EntryState): boolean {
    return !!this.svc.getValueFor(es.entry);
  }

  getValue(es: EntryState): string {
    return this.svc.getValueFor(es.entry);
  }

  maskedValue(es: EntryState): string {
    const v = this.svc.getValueFor(es.entry);
    if (!v) return '';
    return v.slice(0, 10) + '••••••••••••' + (v.length > 20 ? v.slice(-6) : '');
  }

  updatedAt(es: EntryState): Date | null {
    const raw = this.svc.getUpdatedAtFor(es.entry);
    return raw ? new Date(raw) : null;
  }

  toggleReveal(es: EntryState) {
    const s = this._stateMap.get(es.entry.id)!;
    s.revealed = !s.revealed;
    this._refresh();
  }

  toggleEdit(es: EntryState) {
    const s = this._stateMap.get(es.entry.id)!;
    s.editing = !s.editing;
    if (s.editing) { s.editName = es.entry.name; s.editKeyName = es.entry.keyName; }
    this._refresh();
  }

  cancelEdit(es: EntryState) {
    const s = this._stateMap.get(es.entry.id)!;
    s.editing = false;
    this._refresh();
  }

  saveEdit(es: EntryState) {
    const s = this._stateMap.get(es.entry.id)!;
    if (!s.editName.trim() || !s.editKeyName.trim()) return;
    this.svc.update(es.entry.id, s.editName, s.editKeyName);
    s.editing = false;
    this._refresh();
    this.snack.open('Cookie updated', '', { duration: 2000 });
  }

  removeEntry(es: EntryState) {
    this.svc.remove(es.entry.id);
    this._stateMap.delete(es.entry.id);
    this._refresh();
    this.snack.open('Cookie removed', '', { duration: 2000 });
  }

  saveManualValue(es: EntryState) {
    const s = this._stateMap.get(es.entry.id)!;
    const v = s.manualValue.trim();
    if (!v) return;
    this.svc.setValueFor(es.entry, v);
    s.manualValue = '';
    s.showPaste = false;
    this._refresh();
    this.snack.open('Cookie value saved', '', { duration: 2000 });
  }

  copyValue(es: EntryState) {
    navigator.clipboard.writeText(this.svc.getValueFor(es.entry)).then(() => {
      this.snack.open('Copied to clipboard', '', { duration: 1500 });
    });
  }

  clearValue(es: EntryState) {
    this.svc.clearEntry(es.entry);
    const s = this._stateMap.get(es.entry.id)!;
    s.revealed = false;
    this._refresh();
    this.snack.open('Cookie cleared', '', { duration: 2000 });
  }

  addEntry() {
    if (!this.newName.trim() || !this.newKeyName.trim()) return;
    this.svc.add(this.newName, this.newKeyName);
    this.newName = '';
    this.newKeyName = '';
    this.showAddForm.set(false);
    this.snack.open('Cookie added', '', { duration: 2000 });
  }

  cancelAdd() {
    this.newName = '';
    this.newKeyName = '';
    this.showAddForm.set(false);
  }

  private _refresh() {
    this._tick.set(this._tick() + 1);
  }
}
