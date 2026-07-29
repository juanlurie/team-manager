import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RetroBoardNoteComment } from '../../../core/models/retro-board.model';

/**
 * The comment thread hanging off a single note — context added in place of the second sticky people
 * traditionally post to explain the first.
 *
 * Purely presentational and identity-agnostic: it takes the comments and emits intents, so the same
 * component serves the member board (which talks to the store) and the guest board (which owns its
 * own calls). Collapsed by default so a busy Capture column doesn't turn into a wall of text; it
 * opens automatically the moment there's something to read.
 */
@Component({
  selector: 'app-note-comments',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; margin-top: 8px; }
    .toggle { font: inherit; font-size: 12px; cursor: pointer; background: none; border: none; padding: 2px 0;
      color: var(--ds-text-muted, #9aa6b8); display: inline-flex; align-items: center; gap: 5px; }
    .toggle:hover { color: var(--ds-primary, #5b9df0); }
    .toggle .count { font-weight: 700; }
    .thread { margin-top: 6px; display: flex; flex-direction: column; gap: 6px; }
    .c { font-size: 12px; line-height: 1.45; display: flex; gap: 6px; align-items: baseline;
      border-left: 2px solid var(--ds-border, rgba(255,255,255,.12)); padding-left: 8px; }
    .c .who { font-weight: 600; color: var(--ds-text-muted, #9aa6b8); flex: none; }
    .c .txt { color: var(--ds-text, #e6e9ef); white-space: pre-wrap; word-break: break-word; flex: 1; min-width: 0; }
    .c .del { font: inherit; font-size: 11px; cursor: pointer; background: none; border: none; padding: 0 2px;
      color: var(--ds-text-faint, #667085); flex: none; }
    .c .del:hover { color: var(--ds-danger, #ef5b58); }
    .compose { display: flex; gap: 6px; margin-top: 2px; }
    .compose input { flex: 1; min-width: 0; box-sizing: border-box; padding: 6px 8px; font: inherit; font-size: 12px;
      border-radius: 8px; border: 1px solid var(--ds-border-strong, rgba(255,255,255,.14));
      background: var(--ds-surface-sunken, #0b0d12); color: var(--ds-text, #e6e9ef); }
    .compose input:focus { outline: none; border-color: var(--ds-primary, #5b9df0); }
    .compose button { font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; border: none; border-radius: 8px;
      padding: 6px 10px; background: var(--ds-primary, #5b9df0); color: var(--ds-primary-on, #081120); }
    .compose button:disabled { opacity: .5; cursor: default; }
    .locked { font-size: 11px; color: var(--ds-text-faint, #667085); margin-top: 4px; }
  `],
  template: `
    <button class="toggle" (click)="toggle()" [attr.aria-expanded]="open()">
      💬 <span class="count">{{ comments.length }}</span>
      <span>{{ open() ? 'hide' : (comments.length === 1 ? 'comment' : 'comments') }}</span>
    </button>

    @if (open()) {
      <div class="thread">
        @for (c of comments; track c.id) {
          <div class="c">
            <span class="who">{{ c.authorName || 'Someone' }}</span>
            <span class="txt">{{ c.text }}</span>
            @if (canDelete(c)) {
              <button class="del" (click)="deleteComment.emit(c.id)" title="Delete comment">✕</button>
            }
          </div>
        }

        @if (canComment) {
          <div class="compose">
            <input type="text" [(ngModel)]="draft" maxlength="1000" placeholder="Add a comment…"
                   (keyup.enter)="submit()" [disabled]="busy" />
            <button (click)="submit()" [disabled]="busy || !draft.trim()">Post</button>
          </div>
        } @else if (comments.length === 0) {
          <p class="locked">{{ lockedHint || 'Comments are closed for this step.' }}</p>
        }
      </div>
    }
  `,
})
export class NoteCommentsComponent implements OnChanges {
  @Input({ required: true }) comments: RetroBoardNoteComment[] = [];
  /** False outside the phases that allow commenting — the thread stays readable, the composer goes. */
  @Input() canComment = true;
  /** True while a request is in flight, so the composer can't be double-submitted. */
  @Input() busy = false;
  /** Set when the viewer moderates the board: they can delete anyone's comment, not just their own. */
  @Input() canModerate = false;
  /** Explains why the composer is hidden, when there's nothing else in the thread to look at. */
  @Input() lockedHint = '';

  @Output() addComment = new EventEmitter<string>();
  @Output() deleteComment = new EventEmitter<string>();

  open = signal(false);
  draft = '';
  /** Set once the reader opens or closes the thread themselves — from then on their choice sticks and
   *  the auto-open below stops second-guessing it (a live refetch must not re-open what they closed). */
  private touched = false;

  ngOnChanges() { if (!this.touched) this.open.set(this.comments.length > 0); }

  toggle() { this.touched = true; this.open.update(v => !v); }

  canDelete(c: RetroBoardNoteComment) { return c.isOwn || this.canModerate; }

  submit() {
    const text = this.draft.trim();
    if (!text || this.busy) return;
    this.addComment.emit(text);
    this.draft = '';
  }
}
