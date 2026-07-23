import { Component, Input, signal, computed, OnDestroy, ChangeDetectionStrategy } from '@angular/core';

/**
 * The guest's read-only phase clock. Reads the same `liveStateJson` the facilitator's timer controls
 * write (and that arrives on every rb_live_state broadcast), and counts it down locally so a guest
 * sees the same "time left on this step" the members do. Self-hides when no timer is set.
 *
 * The countdown uses the device clock against the server-issued `startedAt`; a well-synced phone is
 * within a second, which is plenty for a retro step timer (we don't gate anything on it — it's purely
 * informational for the guest).
 */
@Component({
  selector: 'app-guest-retro-timer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: inline-flex; }
    .timer { display: inline-flex; align-items: baseline; gap: 8px; padding: 4px 12px; border-radius: 999px;
      background: var(--ds-surface-2, #1a2230); border: 1px solid var(--ds-border, rgba(255,255,255,.08)); }
    .t-label { font-size: .72rem; font-weight: 600; letter-spacing: .3px; color: var(--ds-text-muted, #9aa6b8); }
    .t-time { font-size: 1rem; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--ds-text, #e6e9ef); }
    .timer.low .t-time { color: var(--ds-danger, #ef5b58); }
    .timer.idle .t-time { color: var(--ds-text-muted, #9aa6b8); }
    .t-paused { font-size: .68rem; text-transform: uppercase; letter-spacing: .5px; color: var(--ds-text-faint, #667085); }
  `],
  template: `
    @if (active()) {
      <div class="timer" [class.low]="remaining()! <= 15 && !paused()" [class.idle]="paused()">
        <span class="t-label">⏱ {{ label }}</span>
        <span class="t-time">{{ fmt(remaining()!) }}</span>
        @if (paused()) { <span class="t-paused">paused</span> }
      </div>
    }
  `,
})
export class GuestRetroTimerComponent implements OnDestroy {
  /** The phase this timer belongs to, e.g. "Vote" — shown beside the clock. */
  @Input() label = '';

  @Input()
  set liveStateJson(value: string | null) { this.live.set(value); }
  private live = signal<string | null>(null);

  // Ticks only while a countdown is actually running, so a paused/absent timer costs no change detection.
  private now = signal(Date.now());
  private tick = setInterval(() => { if (this.running()) this.now.set(Date.now()); }, 1000);

  private parsed = computed(() => {
    const v = this.live();
    if (!v) return null;
    try { return JSON.parse(v) as { startedAt?: string | null; seconds?: number; paused?: boolean }; }
    catch { return null; }
  });

  /** A timer worth showing at all (some seconds are configured for this phase). */
  active = computed(() => !!this.parsed()?.seconds);
  paused = computed(() => { const p = this.parsed(); return !!(p && (p.paused || !p.startedAt)); });
  private running = computed(() => { const p = this.parsed(); return !!(p?.startedAt && p.seconds && !p.paused); });

  remaining = computed(() => {
    const p = this.parsed();
    if (!p?.seconds) return null;
    // Paused (or never started): `seconds` holds the frozen remaining directly.
    if (p.paused || !p.startedAt) return Math.max(0, Math.round(p.seconds));
    const rem = Math.round(p.seconds - (this.now() - new Date(p.startedAt).getTime()) / 1000);
    return rem > 0 ? rem : 0;
  });

  fmt(s: number): string { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`; }

  ngOnDestroy() { clearInterval(this.tick); }
}
