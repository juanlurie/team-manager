import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-wow-tie-break-spinner',
  standalone: true,
  styles: [`
    @keyframes spinnerPop {
      0%   { transform: scale(0.92); opacity: 0.6; }
      50%  { transform: scale(1.04); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    .spinner-name { animation: spinnerPop 0.12s ease-out; }
  `],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (show()) {
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:2000;backdrop-filter:blur(6px)">
        <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:3px;opacity:0.4;margin-bottom:28px">🎲 Breaking the tie</div>
        <div class="spinner-name"
             style="font-size:2.2rem;font-weight:800;color:#ef5350;min-width:300px;text-align:center;padding:24px 36px;background:rgba(239,83,80,0.08);border:2px solid rgba(239,83,80,0.4);border-radius:20px">
          {{name()}}
        </div>
      </div>
    }
  `
})
export class WowTieBreakSpinnerComponent {
  show = input.required<boolean>();
  name = input.required<string>();
}
