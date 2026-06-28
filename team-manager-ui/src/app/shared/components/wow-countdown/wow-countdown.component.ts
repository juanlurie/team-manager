import { Component, OnInit, OnDestroy, signal, computed, input, ChangeDetectionStrategy } from '@angular/core';


@Component({
  selector: 'app-wow-countdown',
  standalone: true,
  imports: [],
  template: `
    <span class="wow-clock" [class.warning]="isWarning()" [class.urgent]="isUrgent()">{{ display() }}</span>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .wow-clock {
      font-size: 1.6rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      letter-spacing: 2px;
      line-height: 1;
      color: #ef5350;
    }
    .wow-clock.warning {
      animation: clockPulse 1s ease-in-out infinite;
    }
    .wow-clock.urgent {
      animation: clockPulse 0.3s ease-in-out infinite;
    }
    @keyframes clockPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
  `]
})
export class WowCountdownComponent implements OnInit, OnDestroy {
  endsAt = input<string | null>(null);

  private now = signal(Date.now());
  private tick: ReturnType<typeof setInterval> | null = null;

  readonly remaining = computed(() => {
    const e = this.endsAt();
    if (!e) return null;
    return Math.max(0, new Date(e).getTime() - this.now());
  });

  readonly display = computed(() => {
    const r = this.remaining();
    if (r === null) return '—';
    const mins = Math.floor(r / 60000);
    const secs = Math.floor((r % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  });

  readonly isWarning = computed(() => {
    const r = this.remaining();
    return r !== null && r < 30000 && r >= 10000;
  });

  readonly isUrgent = computed(() => {
    const r = this.remaining();
    return r !== null && r < 10000;
  });

  ngOnInit() {
    this.tick = setInterval(() => this.now.set(Date.now()), 1000);
    // Mobile browsers throttle setInterval when the screen dims or the tab backgrounds --
    // resync immediately on resume so the displayed time doesn't sit stale.
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy() {
    if (this.tick) clearInterval(this.tick);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private onVisibilityChange = () => {
    if (document.visibilityState === 'visible') this.now.set(Date.now());
  };
}
