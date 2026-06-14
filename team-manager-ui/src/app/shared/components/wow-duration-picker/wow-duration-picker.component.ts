import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-wow-duration-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    :host { display: flex; align-items: center; gap: 6px; }
    .step-btn { border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.75); border-radius: 6px; padding: 4px 9px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: background 0.12s; white-space: nowrap; }
    .step-btn:hover:not(:disabled) { background: rgba(255,255,255,0.14); }
    .step-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .step-btn.lg { color: rgba(255,255,255,0.5); }
    .display { min-width: 52px; text-align: center; font-size: 1rem; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: 1px; }
  `],
  template: `
    <button class="step-btn lg" (click)="adjust(-30)" [disabled]="disabled() || value() <= 15">−30s</button>
    <button class="step-btn"    (click)="adjust(-15)" [disabled]="disabled() || value() <= 15">−15s</button>
    <span class="display">{{ display() }}</span>
    <button class="step-btn"    (click)="adjust(15)"  [disabled]="disabled() || value() >= max()">+15s</button>
    <button class="step-btn lg" (click)="adjust(30)"  [disabled]="disabled() || value() >= max()">+30s</button>
  `
})
export class WowDurationPickerComponent {
  value    = input.required<number>();
  max      = input(600);
  disabled = input(false);

  valueChange = output<number>();

  readonly display = computed(() => {
    const s = this.value();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  });

  adjust(delta: number) {
    const next = Math.min(this.max(), Math.max(15, this.value() + delta));
    if (next !== this.value()) this.valueChange.emit(next);
  }
}
