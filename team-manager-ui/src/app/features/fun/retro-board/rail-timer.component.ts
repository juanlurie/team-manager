import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RetroBoardStore } from './retro-board.store';
import { RETRO_STYLES } from './retro-board.styles';

/**
 * The phase clock in the board rail: the countdown everyone sees, plus the facilitator's controls.
 *
 * Extracted from the board container, which had grown a rail holding both this and the participant
 * list. The quick nudges (−30s / +30s / +1m) are the piece that makes it behave like Win of the
 * Week's host timer — a facilitator overwhelmingly wants "give them another thirty seconds", not a
 * restart, and Restart was previously the only way to change a running clock.
 */
@Component({
  selector: 'app-retro-rail-timer',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES, `
    /* No box of its own, so .rail-timer stays a direct child of .rail and the rail's desktop column
       / mobile horizontal-strip layout is unchanged by the extraction. */
    :host { display: contents; }

    .rt-nudge { display: flex; gap: 4px; margin-top: 6px; justify-content: center; flex-wrap: wrap; }
    .rt-nudge button { font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; border-radius: 999px;
      padding: 3px 9px; border: 1px solid var(--ds-border-strong, rgba(255,255,255,.14));
      background: transparent; color: var(--ds-text-muted, #9aa6b8); }
    .rt-nudge button:hover:not(:disabled) { border-color: var(--ds-primary, #5b9df0); color: var(--ds-primary, #5b9df0); }
    .rt-nudge button:disabled { opacity: .4; cursor: default; }
  `],
  template: `
    @if (store.session(); as s) {
      <div class="rail-timer">
        <div class="rt-label">⏱ {{ store.phaseLabel(s.phase) }}</div>
        <div class="rt-time"
             [class.low]="store.timer() !== null && store.timer()! <= 15"
             [class.idle]="store.timer() === null || store.isPaused()">
          {{ store.timer() !== null ? store.fmt(store.timer()!) : '—:—' }}
        </div>
        @if (store.isPaused()) { <div class="muted" style="font-size:12px">paused</div> }

        @if (store.amFacilitator() && store.phaseTimerKey()) {
          <div class="rt-controls">
            @if (store.timer() === null) { <button class="btn ghost sm" (click)="store.startTimer()">▶ Start</button> }
            @else {
              @if (store.isPaused()) { <button class="btn ghost sm" (click)="store.resumeTimer()">▶ Resume</button> }
              @else { <button class="btn ghost sm" (click)="store.pauseTimer()">⏸ Pause</button> }
              <button class="btn ghost sm" (click)="store.startTimer()" title="Restart this phase timer">↻ Restart</button>
            }
          </div>
          <div class="rt-nudge">
            @for (n of store.timerNudges; track n) {
              <button (click)="store.addTime(n)" [disabled]="!store.canAddTime(n)"
                      [title]="n > 0 ? 'Add time to the clock' : 'Take time off the clock'">{{ label(n) }}</button>
            }
          </div>
        }
      </div>
    }
  `,
})
export class RetroRailTimerComponent {
  store = inject(RetroBoardStore);

  /** "+30s" / "−30s" / "+1m" — minutes once the nudge divides evenly, so the row stays readable. */
  label(seconds: number): string {
    const sign = seconds > 0 ? '+' : '−';
    const abs = Math.abs(seconds);
    return abs % 60 === 0 ? `${sign}${abs / 60}m` : `${sign}${abs}s`;
  }
}
