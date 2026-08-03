import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

export interface WowCloseWeekDialogData {
  winnerLabel: string;
  voteCount: number;
}

export interface WowCloseWeekResult {
  theme: string;
}

// Prepopulated hero-story themes. `value` is the phrase handed to the AiChatWinStory prompt's
// {theme} placeholder; `label` is what the host sees. A custom entry is a one-off — deliberately
// not persisted (see the theme-storage decision), so there is no add-to-list here.
const THEMES: { label: string; value: string; icon: string }[] = [
  { label: 'Epic hero saga',        value: 'an epic hero saga',                                icon: 'shield' },
  { label: 'Superhero origin',      value: 'a superhero origin story',                          icon: 'bolt' },
  { label: 'Noir detective',        value: 'a noir detective mystery',                          icon: 'search' },
  { label: 'Sports commentary',     value: 'an over-the-top live sports commentary',            icon: 'sports_soccer' },
  { label: 'Nature documentary',    value: 'a David Attenborough-style nature documentary',     icon: 'forest' },
  { label: 'Fairy tale',            value: 'a classic fairy tale',                              icon: 'auto_stories' },
  { label: 'Sci-fi space opera',    value: 'a sci-fi space opera',                               icon: 'rocket_launch' },
  { label: 'Spaghetti western',     value: 'a spaghetti western',                               icon: 'terrain' },
  { label: 'Heist thriller',        value: 'a high-stakes heist thriller',                      icon: 'lock_open' },
  { label: 'Rock anthem',           value: 'a stadium rock anthem',                             icon: 'music_note' },
];

const CUSTOM = '__custom__';

@Component({
  selector: 'app-wow-close-week-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .winner { padding-top: 4px; font-size: 0.95rem; opacity: 0.8; margin-bottom: 16px; }
    .theme-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.5; margin-bottom: 10px; }
    .tile-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; min-width: 320px; }
    .tile {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
      padding: 16px 10px; border-radius: 12px; cursor: pointer; text-align: center;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.8); font-family: inherit; font-size: 0.8rem; font-weight: 600;
      transition: background 0.15s, border-color 0.15s, transform 0.1s;
    }
    .tile:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); }
    .tile:active { transform: scale(0.97); }
    .tile mat-icon { font-size: 26px; width: 26px; height: 26px; opacity: 0.75; }
    .tile.selected { background: rgba(100,181,246,0.14); border-color: #64b5f6; color: #64b5f6; }
    .tile.selected mat-icon { opacity: 1; color: #64b5f6; }
    .fields { margin-top: 14px; }
    .fields mat-form-field { width: 100%; }
    .hint { font-size: 0.75rem; opacity: 0.5; margin-top: -6px; }
  `],
  template: `
    <h2 mat-dialog-title>Close week?</h2>
    <mat-dialog-content>
      <div class="winner">🏆 Winner: <strong>{{ data.winnerLabel }}</strong> ({{ data.voteCount }} vote{{ data.voteCount === 1 ? '' : 's' }})</div>
      <div class="theme-label">Hero story theme</div>
      <div class="tile-grid">
        @for (t of themes; track t.value) {
          <button type="button" class="tile" [class.selected]="selected() === t.value" (click)="selected.set(t.value)">
            <mat-icon>{{ t.icon }}</mat-icon>
            {{ t.label }}
          </button>
        }
        <button type="button" class="tile" [class.selected]="selected() === CUSTOM" (click)="selected.set(CUSTOM)">
          <mat-icon>add_circle_outline</mat-icon>
          Custom…
        </button>
      </div>
      @if (selected() === CUSTOM) {
        <div class="fields">
          <mat-form-field appearance="outline">
            <mat-label>Custom theme</mat-label>
            <input matInput [(ngModel)]="customTheme" placeholder="e.g. a medieval bard's ballad" maxlength="120">
          </mat-form-field>
          <div class="hint">Used for this story only — not saved for next time.</div>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [disabled]="!canConfirm()" (click)="confirm()">Close</button>
    </mat-dialog-actions>
  `
})
export class WowCloseWeekDialogComponent {
  private dialogRef = inject(MatDialogRef<WowCloseWeekDialogComponent, WowCloseWeekResult>);
  data: WowCloseWeekDialogData = inject(MAT_DIALOG_DATA);

  readonly themes = THEMES;
  readonly CUSTOM = CUSTOM;
  selected = signal<string>(THEMES[0].value);
  customTheme = signal<string>('');

  canConfirm(): boolean {
    return this.selected() !== CUSTOM || this.customTheme().trim().length > 0;
  }

  confirm() {
    const theme = this.selected() === CUSTOM ? this.customTheme().trim() : this.selected();
    this.dialogRef.close({ theme });
  }
}
