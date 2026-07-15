import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { RETRO_STYLES } from './retro-board.styles';

/** Small "N/M responded" progress meter shown in a phase header. Presentational — the caller
 *  passes the counts (see the store's respondedFor/respondedTotal). */
@Component({
  selector: 'app-responded-meter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES],
  template: `
    <div class="responded">
      <span class="muted">{{ done() }}/{{ total() }} responded</span>
      <div class="bar-track"><span class="bar-fill" [style.width.%]="total() ? done() / total() * 100 : 0"></span></div>
    </div>
  `,
})
export class RespondedMeterComponent {
  done = input.required<number>();
  total = input.required<number>();
}
