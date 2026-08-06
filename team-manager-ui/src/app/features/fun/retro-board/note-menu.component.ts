import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';

/**
 * The "⋯" overflow for a note or a topic.
 *
 * Every per-item action the board has accumulated — raise an action, ungroup, flag, delete — lives
 * behind this one control instead of sitting on the card as its own button. The note had reached the
 * point where its own text was competing with five affordances for attention; grouping would have
 * added two more.
 *
 * Deliberately a thin shell around MatMenu with projected items rather than a component with an
 * `items` input: each phase offers a genuinely different set, and projecting keeps the click
 * handlers and permission checks in the phase that owns them.
 *
 * Usage:
 * ```html
 * <app-note-menu>
 *   <button mat-menu-item (click)="…">+ Action</button>
 * </app-note-menu>
 * ```
 */
@Component({
  selector: 'app-note-menu',
  standalone: true,
  imports: [MatMenuModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: inline-flex; flex: none; }
    .dots {
      font: inherit; line-height: 1; cursor: pointer; border: none; background: transparent;
      color: var(--ds-text-faint, #667085); border-radius: 7px; padding: 2px 7px; font-size: 16px;
    }
    .dots:hover, .dots[aria-expanded="true"] { background: var(--ds-surface-2, rgba(255,255,255,.06)); color: var(--ds-text, #e6e9ef); }
  `],
  template: `
    <button class="dots" [matMenuTriggerFor]="menu" [attr.aria-label]="label"
            (click)="$event.stopPropagation()">⋯</button>
    <mat-menu #menu="matMenu"><ng-content /></mat-menu>
  `,
})
export class NoteMenuComponent {
  /** Screen-reader name for the trigger — say what it acts on ("Actions for this topic"). */
  @Input() label = 'More actions';
}
