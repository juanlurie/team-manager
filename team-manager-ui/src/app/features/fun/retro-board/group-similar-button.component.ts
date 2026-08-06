import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RetroBoardStore } from './retro-board.store';
import { RETRO_STYLES } from './retro-board.styles';

/**
 * The facilitator's bulk "do the merging for me" button, offered in every phase where grouping is
 * open. Hides itself entirely when grouping isn't available, so it costs nothing in the phases that
 * don't want it.
 *
 * It applies its result through the same anchor mechanic the drag does, so there's no such thing as
 * an "AI group" on the board — just groups, some of which the AI made, all of which the facilitator
 * can rename, extend by dragging, or pull apart.
 */
@Component({
  selector: 'app-group-similar-button',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES],
  template: `
    @if (store.canGroup()) {
      <button class="btn ghost" (click)="store.groupSimilar()" [disabled]="store.grouping()"
              title="Let the AI merge near-duplicate notes into topics">
        {{ store.grouping() ? 'Merging…' : '✦ Merge similar' }}
      </button>
    }
  `,
})
export class GroupSimilarButtonComponent {
  store = inject(RetroBoardStore);
}
