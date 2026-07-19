import { Component, OnInit, OnDestroy, signal, computed, effect, input, output, ChangeDetectionStrategy } from '@angular/core';
import { fmtDuration } from '../../../core/utils/time-format';

/**
 * Session-platform Shared Clock (primitive 3 — see docs/session-platform.md).
 *
 * A presentational, server-authoritative countdown. The owning feature holds the
 * deadline (`endsAt`); this component only renders the time remaining and ticks it
 * down once a second. Pass `serverNow` alongside `endsAt` to correct for clock skew
 * between machines (the server owns the deadline, so two clients with differently-set
 * clocks still count down to the same instant) — omit it to render against the local
 * clock. Emits `(expired)` once when the countdown first crosses zero.
 *
 * Supersedes the feature-branded `app-wow-countdown`, which was already shared by WoW
 * and Quiz Game but lacked skew correction and hardcoded its colour.
 */
@Component({
  selector: 'app-shared-countdown',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="clock" [class.warning]="isWarning()" [class.urgent]="isUrgent()">{{ display() }}</span>
  `,
  styles: [`
    .clock {
      font-size: 1.6rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      letter-spacing: 2px;
      line-height: 1;
      /* --ds-danger arrives with the design-system token layer; fall back to WoW's
         original red until that lands so this renders on either merge order. */
      color: var(--ds-danger, #ef5350);
    }
    .clock.warning { animation: clockPulse 1s ease-in-out infinite; }
    .clock.urgent { animation: clockPulse 0.3s ease-in-out infinite; }
    @keyframes clockPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `]
})
export class SharedCountdownComponent implements OnInit, OnDestroy {
  /** Authoritative deadline — ISO-8601 string or epoch ms. Null renders the idle dash. */
  endsAt = input<string | number | null>(null);
  /** The server's clock captured with `endsAt` (ISO-8601 or epoch ms), used to correct
   *  for skew between machines. Omit to render against the local clock. */
  serverNow = input<string | number | null>(null);
  /** Seconds remaining at which the slow warning pulse begins. */
  warnAtSec = input(30);
  /** Seconds remaining at which the faster urgent pulse begins. */
  urgentAtSec = input(10);
  /** Fires once, the moment the countdown first reaches zero. */
  readonly expired = output<void>();

  private now = signal(Date.now());
  private tick: ReturnType<typeof setInterval> | null = null;
  private hasExpired = false;

  // Offset between the server's clock and this machine's clock, captured whenever
  // `serverNow` changes (its value at that instant is the receipt time). Zero when no
  // `serverNow` is supplied, which degrades gracefully to the local clock.
  private readonly offsetMs = signal(0);

  constructor() {
    effect(() => {
      const s = this.serverNow();
      const serverMs = s === null || s === undefined || s === '' ? NaN
        : typeof s === 'number' ? s : new Date(s).getTime();
      this.offsetMs.set(isNaN(serverMs) ? 0 : serverMs - Date.now());
    });
  }

  private readonly correctedNow = computed(() => this.now() + this.offsetMs());

  readonly remaining = computed(() => {
    const e = this.endsAt();
    if (e === null || e === undefined || e === '') return null;
    const endMs = typeof e === 'number' ? e : new Date(e).getTime();
    if (isNaN(endMs)) return null;
    return Math.max(0, endMs - this.correctedNow());
  });

  readonly display = computed(() => {
    const r = this.remaining();
    if (r === null) return '—';
    return fmtDuration(Math.floor(r / 1000));
  });

  readonly isWarning = computed(() => {
    const r = this.remaining();
    return r !== null && r < this.warnAtSec() * 1000 && r >= this.urgentAtSec() * 1000;
  });

  readonly isUrgent = computed(() => {
    const r = this.remaining();
    return r !== null && r < this.urgentAtSec() * 1000;
  });

  ngOnInit() {
    this.tick = setInterval(() => this.advance(), 1000);
    // Mobile browsers throttle setInterval when the screen dims or the tab backgrounds --
    // resync immediately on resume so the displayed time doesn't sit stale.
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy() {
    if (this.tick) clearInterval(this.tick);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  // Advance the clock and fire `expired` exactly once per deadline. Reading `remaining()`
  // here is a plain (non-reactive) read of the latest value — the emit stays out of the
  // computed so it never runs as a side effect of change detection.
  private advance(): void {
    this.now.set(Date.now());
    const r = this.remaining();
    if (r === 0 && this.endsAt() != null && this.endsAt() !== '') {
      if (!this.hasExpired) {
        this.hasExpired = true;
        this.expired.emit();
      }
    } else if (r !== 0) {
      this.hasExpired = false; // a fresh deadline was set — re-arm
    }
  }

  private onVisibilityChange = () => {
    if (document.visibilityState === 'visible') this.advance();
  };
}
