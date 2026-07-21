import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { RetroBoardSession, RetroBoardColumn, RetroBoardNote } from '../../../../core/models/retro-board.model';

/**
 * Read-only render of a RetroBoard for a joined guest: columns, their notes (with the server's
 * visibility/anonymity already applied in the guest projection), and the roster. No interactions —
 * contributing (adding notes, voting) is a later slice. Purely presentational; the host owns the data
 * and its refresh.
 */
@Component({
  selector: 'app-guest-retro-board-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; }
    .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .col { background: var(--ds-surface-1, #151b24); border: 1px solid var(--ds-border, rgba(255,255,255,.08)); border-radius: 14px; overflow: hidden; }
    .col-head { padding: 12px 14px; font-weight: 700; font-size: .9rem; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--ds-border, rgba(255,255,255,.08)); }
    .col-dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
    .col-count { margin-left: auto; font-size: .72rem; font-weight: 600; color: var(--ds-text-faint, #667085); }
    .notes { padding: 12px; display: flex; flex-direction: column; gap: 10px; min-height: 40px; }
    .note { background: var(--ds-surface-2, #1a2230); border: 1px solid var(--ds-border, rgba(255,255,255,.08)); border-radius: 10px; padding: 10px 12px; }
    .note.mine { border-color: var(--ds-primary-border, rgba(91,157,240,.35)); }
    .note-text { font-size: .9rem; line-height: 1.45; color: var(--ds-text, #e6e9ef); white-space: pre-wrap; word-break: break-word; }
    .note-hidden { font-style: italic; color: var(--ds-text-faint, #667085); }
    .note-meta { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: .72rem; color: var(--ds-text-muted, #9aa6b8); }
    .note-author { font-weight: 600; }
    .note-votes { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; }
    .empty { color: var(--ds-text-faint, #667085); font-size: .8rem; padding: 6px 2px; }
  `],
  template: `
    <div class="cols">
      @for (col of board.columns; track col.id) {
        <section class="col">
          <header class="col-head">
            <span class="col-dot" [style.background]="col.color"></span>
            <span>{{ col.label }}</span>
            <span class="col-count">{{ notesFor(col).length }}</span>
          </header>
          <div class="notes">
            @for (n of notesFor(col); track n.id) {
              <article class="note" [class.mine]="n.isOwn">
                @if (n.text === null) {
                  <div class="note-text note-hidden">Hidden until the facilitator reveals</div>
                } @else {
                  <div class="note-text">{{ n.text }}</div>
                }
                <div class="note-meta">
                  <span class="note-author">{{ n.isAnonymous ? 'Anonymous' : (n.authorName || '—') }}</span>
                  @if (n.isOwn) { <span>· you</span> }
                  @if (n.voteCount > 0) { <span class="note-votes">▲ {{ n.voteCount }}</span> }
                </div>
              </article>
            } @empty {
              <div class="empty">No notes yet</div>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class GuestRetroBoardViewComponent {
  @Input({ required: true }) board!: RetroBoardSession;

  notesFor(col: RetroBoardColumn): RetroBoardNote[] {
    return this.board.notes.filter(n => n.columnId === col.id);
  }
}
