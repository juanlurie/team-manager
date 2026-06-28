import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';

// Shows how long until the next round starts, while a quiz answer is revealed.
// Driven entirely by a CSS animation sized to the remaining time at render -- no JS ticking needed,
// since `endsAt` is a fixed timestamp that doesn't change again until the component is torn down.
// Emits `drained` once the bar empties, so the parent can show a loading spinner if the next
// question hasn't actually arrived yet (e.g. the AI call is taking a moment).
@Component({
  selector: 'app-reveal-progress-bar',
  standalone: true,
  imports: [],
  template: `
    @if (durationMs() > 0) {
      <div class="bar-track">
        <div class="bar-fill" [style.animation-duration]="durationMs() + 'ms'" (animationend)="drained.emit()"></div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .bar-track {
      width: 100%;
      height: 4px;
      background: rgba(255,255,255,0.1);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 10px;
    }
    .bar-fill {
      height: 100%;
      width: 100%;
      background: linear-gradient(90deg, #64b5f6, #81c784);
      border-radius: 2px;
      transform-origin: left;
      animation-name: revealDrain;
      animation-timing-function: linear;
      animation-fill-mode: forwards;
    }
    @keyframes revealDrain {
      from { transform: scaleX(1); }
      to { transform: scaleX(0); }
    }
  `]
})
export class RevealProgressBarComponent {
  endsAt = input<string | null>(null);
  drained = output<void>();

  readonly durationMs = computed(() => {
    const e = this.endsAt();
    if (!e) return 0;
    return Math.max(0, new Date(e).getTime() - Date.now());
  });
}
