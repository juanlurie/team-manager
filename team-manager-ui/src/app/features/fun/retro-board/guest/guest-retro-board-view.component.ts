import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RetroBoardSession, RetroBoardColumn, RetroBoardNote } from '../../../../core/models/retro-board.model';

/** A note the guest wants to add: which column, the text, and whether it's anonymous. */
export interface GuestNoteDraft { columnId: string; text: string; isAnonymous: boolean; }

/**
 * The guest's board surface: columns with their notes, plus lightweight participation — add a note,
 * delete your own, and vote/unvote (the server enforces the caps). Purely presentational: it emits
 * intents and the host performs them and feeds back the refreshed board. The server's
 * visibility/anonymity is already applied in the projection it receives.
 */
@Component({
  selector: 'app-guest-retro-board-view',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; }
    .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .col { background: var(--ds-surface-1, #151b24); border: 1px solid var(--ds-border, rgba(255,255,255,.08)); border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; }
    .col-head { padding: 12px 14px; font-weight: 700; font-size: .9rem; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--ds-border, rgba(255,255,255,.08)); }
    .col-dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
    .col-count { margin-left: auto; font-size: .72rem; font-weight: 600; color: var(--ds-text-faint, #667085); }
    .notes { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
    .note { background: var(--ds-surface-2, #1a2230); border: 1px solid var(--ds-border, rgba(255,255,255,.08)); border-radius: 10px; padding: 10px 12px; }
    .note.mine { border-color: var(--ds-primary-border, rgba(91,157,240,.35)); }
    .note-text { font-size: .9rem; line-height: 1.45; color: var(--ds-text, #e6e9ef); white-space: pre-wrap; word-break: break-word; }
    .note-hidden { font-style: italic; color: var(--ds-text-faint, #667085); }
    .note-meta { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: .72rem; color: var(--ds-text-muted, #9aa6b8); }
    .note-author { font-weight: 600; }
    .spacer { margin-left: auto; }
    .vote { display: inline-flex; align-items: center; gap: 4px; }
    .icon-btn { font: inherit; cursor: pointer; border: 1px solid var(--ds-border-strong, rgba(255,255,255,.14)); background: transparent; color: var(--ds-text-muted, #9aa6b8); border-radius: 999px; padding: 1px 8px; font-size: .72rem; line-height: 1.6; }
    .icon-btn:hover { border-color: var(--ds-primary, #5b9df0); color: var(--ds-primary, #5b9df0); }
    .icon-btn:disabled { opacity: .5; cursor: default; }
    .icon-btn.del:hover { border-color: var(--ds-danger, #ef5b58); color: var(--ds-danger, #ef5b58); }
    .voted { color: var(--ds-primary, #5b9df0); font-weight: 700; }
    .composer { padding: 10px 12px; border-top: 1px solid var(--ds-border, rgba(255,255,255,.08)); display: flex; flex-direction: column; gap: 8px; }
    .composer input[type=text] { width: 100%; box-sizing: border-box; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--ds-border-strong, rgba(255,255,255,.14)); background: var(--ds-surface-sunken, #0b0d12); color: var(--ds-text, #e6e9ef); font-size: .88rem; }
    .composer input[type=text]:focus { outline: none; border-color: var(--ds-primary, #5b9df0); }
    .composer-row { display: flex; align-items: center; gap: 10px; }
    .anon { font-size: .74rem; color: var(--ds-text-muted, #9aa6b8); display: inline-flex; align-items: center; gap: 5px; cursor: pointer; }
    .add-btn { margin-left: auto; font: inherit; font-weight: 600; font-size: .8rem; cursor: pointer; border: none; border-radius: 8px; padding: 7px 14px; background: var(--ds-primary, #5b9df0); color: var(--ds-primary-on, #081120); }
    .add-btn:disabled { opacity: .5; cursor: default; }
    .empty { color: var(--ds-text-faint, #667085); font-size: .8rem; }
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
                  <span class="spacer"></span>
                  @if (n.isOwn) {
                    <button class="icon-btn del" (click)="deleteNote.emit(n.id)" [disabled]="!interactive" title="Delete">✕</button>
                  }
                  <span class="vote">
                    @if (n.myVoteCount > 0) {
                      <button class="icon-btn" (click)="unvote.emit(n.id)" [disabled]="!interactive" title="Remove a vote">−</button>
                    }
                    <button class="icon-btn" (click)="vote.emit(n.id)" [disabled]="!interactive" title="Vote">▲</button>
                    <span [class.voted]="n.myVoteCount > 0">{{ n.voteCount }}</span>
                  </span>
                </div>
              </article>
            } @empty {
              <div class="empty">No notes yet</div>
            }
          </div>

          <div class="composer">
            <input type="text" [(ngModel)]="drafts[col.id]" maxlength="500"
                   placeholder="Add a note…" (keyup.enter)="submit(col.id)" [disabled]="!interactive" />
            <div class="composer-row">
              @if (board.allowAnonymous) {
                <label class="anon"><input type="checkbox" [(ngModel)]="anon[col.id]" [disabled]="!interactive" /> Anonymous</label>
              }
              <button class="add-btn" (click)="submit(col.id)" [disabled]="!interactive || !(drafts[col.id] || '').trim()">Add</button>
            </div>
          </div>
        </section>
      }
    </div>
  `,
})
export class GuestRetroBoardViewComponent {
  @Input({ required: true }) board!: RetroBoardSession;
  /** When false (a closed retro, or an action in flight), the controls are disabled. */
  @Input() interactive = true;

  @Output() addNote = new EventEmitter<GuestNoteDraft>();
  @Output() deleteNote = new EventEmitter<string>();
  @Output() vote = new EventEmitter<string>();
  @Output() unvote = new EventEmitter<string>();

  // Local composer state (presentational): per-column draft text and anonymous toggle.
  drafts: Record<string, string> = {};
  anon: Record<string, boolean> = {};

  notesFor(col: RetroBoardColumn): RetroBoardNote[] {
    return this.board.notes.filter(n => n.columnId === col.id);
  }

  submit(columnId: string) {
    const text = (this.drafts[columnId] || '').trim();
    if (!text || !this.interactive) return;
    this.addNote.emit({ columnId, text, isAnonymous: !!this.anon[columnId] });
    this.drafts[columnId] = '';
  }
}
