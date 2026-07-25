import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

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
const THEMES: { label: string; value: string }[] = [
  { label: 'Epic hero saga',        value: 'an epic hero saga' },
  { label: 'Superhero origin',      value: 'a superhero origin story' },
  { label: 'Noir detective',        value: 'a noir detective mystery' },
  { label: 'Sports commentary',     value: 'an over-the-top live sports commentary' },
  { label: 'Nature documentary',    value: 'a David Attenborough-style nature documentary' },
  { label: 'Fairy tale',            value: 'a classic fairy tale' },
  { label: 'Sci-fi space opera',    value: 'a sci-fi space opera' },
  { label: 'Spaghetti western',     value: 'a spaghetti western' },
  { label: 'Heist thriller',        value: 'a high-stakes heist thriller' },
  { label: 'Rock anthem',           value: 'a stadium rock anthem' },
];

const CUSTOM = '__custom__';

@Component({
  selector: 'app-wow-close-week-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .winner { padding-top: 4px; font-size: 0.9rem; opacity: 0.75; }
    .fields { display: flex; flex-direction: column; gap: 4px; margin-top: 12px; min-width: 320px; }
    .fields mat-form-field { width: 100%; }
    .hint { font-size: 0.75rem; opacity: 0.5; margin-top: -6px; }
  `],
  template: `
    <h2 mat-dialog-title>Close week?</h2>
    <mat-dialog-content>
      <div class="winner">Winner: <strong>{{ data.winnerLabel }}</strong> ({{ data.voteCount }} vote{{ data.voteCount === 1 ? '' : 's' }}).</div>
      <div class="fields">
        <mat-form-field appearance="outline">
          <mat-label>Hero story theme</mat-label>
          <mat-select [(ngModel)]="selected">
            @for (t of themes; track t.value) {
              <mat-option [value]="t.value">{{ t.label }}</mat-option>
            }
            <mat-option [value]="CUSTOM">Add custom…</mat-option>
          </mat-select>
        </mat-form-field>
        @if (selected() === CUSTOM) {
          <mat-form-field appearance="outline">
            <mat-label>Custom theme</mat-label>
            <input matInput [(ngModel)]="customTheme" placeholder="e.g. a medieval bard's ballad" maxlength="120">
          </mat-form-field>
          <div class="hint">Used for this story only — not saved for next time.</div>
        }
      </div>
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
