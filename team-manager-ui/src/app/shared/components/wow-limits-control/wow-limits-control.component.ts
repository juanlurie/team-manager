import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Host control for the per-person weekly budgets (nominations and votes). Kept out of
 * wow-current-week so the host panel doesn't absorb yet another piece of stateful UI: this owns the
 * clamping and step buttons, and only reports the resulting pair upwards.
 */
@Component({
  selector: 'app-wow-limits-control',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; }
    .row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; gap: 8px; }
    .label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.45; }
    .stepper { display: inline-flex; align-items: center; gap: 4px; }
    .step-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; padding: 0;
      border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.75); border-radius: 6px; cursor: pointer; transition: background 0.12s;
    }
    .step-btn:hover:not(:disabled) { background: rgba(255,255,255,0.14); }
    .step-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .step-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .value { min-width: 22px; text-align: center; font-size: 0.9rem; font-weight: 700; font-variant-numeric: tabular-nums; color: #64b5f6; }
  `],
  template: `
    <div class="row">
      <span class="label">Nominations / Person</span>
      <span class="stepper">
        <button class="step-btn" type="button" aria-label="Fewer nominations per person"
                [disabled]="disabled() || maxNominations() <= min()" (click)="step('nominations', -1)">
          <mat-icon>remove</mat-icon>
        </button>
        <span class="value">{{ maxNominations() }}</span>
        <button class="step-btn" type="button" aria-label="More nominations per person"
                [disabled]="disabled() || maxNominations() >= max()" (click)="step('nominations', 1)">
          <mat-icon>add</mat-icon>
        </button>
      </span>
    </div>

    <div class="row">
      <span class="label">Votes / Person</span>
      <span class="stepper">
        <button class="step-btn" type="button" aria-label="Fewer votes per person"
                [disabled]="disabled() || maxVotes() <= min()" (click)="step('votes', -1)">
          <mat-icon>remove</mat-icon>
        </button>
        <span class="value">{{ maxVotes() }}</span>
        <button class="step-btn" type="button" aria-label="More votes per person"
                [disabled]="disabled() || maxVotes() >= max()" (click)="step('votes', 1)">
          <mat-icon>add</mat-icon>
        </button>
      </span>
    </div>
  `
})
export class WowLimitsControlComponent {
  maxNominations = input.required<number>();
  maxVotes       = input.required<number>();
  /** Mirrors WinOfTheWeekLimits.MinPerPerson / MaxPerPerson on the API, which clamps anyway. */
  min      = input(1);
  max      = input(20);
  disabled = input(false);

  limitsChange = output<{ maxNominations: number; maxVotes: number }>();

  step(which: 'nominations' | 'votes', delta: number) {
    const clamp = (v: number) => Math.min(this.max(), Math.max(this.min(), v));
    const next = {
      maxNominations: which === 'nominations' ? clamp(this.maxNominations() + delta) : this.maxNominations(),
      maxVotes:       which === 'votes'       ? clamp(this.maxVotes() + delta)       : this.maxVotes()
    };
    if (next.maxNominations !== this.maxNominations() || next.maxVotes !== this.maxVotes())
      this.limitsChange.emit(next);
  }
}
