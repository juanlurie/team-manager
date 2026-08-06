import { Component, Input, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { RetroBoardStore } from './retro-board.store';
import { RETRO_STYLES } from './retro-board.styles';
import { NoteMenuComponent } from './note-menu.component';
import { NoteCommentsComponent } from './note-comments.component';
import { RetroBoardNote, RetroTopic } from '../../../core/models/retro-board.model';

/**
 * One votable topic — a group of merged notes, or a single loose one — as it appears from Introduce
 * onwards. Shared by all three of those phases through a `variant`, because the thing being rendered
 * is the same object with the same drag/merge/menu behaviour; only the trimmings differ.
 *
 * <b>Merging is a drag.</b> Every note is a drag source and every topic a drop target, so dropping
 * one note on another stacks them, exactly like the physical sticky-note gesture it's imitating.
 * Everything else about a group — rename, ungroup, pull one note back out — lives in the ⋯ menu,
 * so the card itself carries no more chrome than it did before grouping existed.
 */
@Component({
  selector: 'app-retro-topic',
  standalone: true,
  imports: [FormsModule, MatMenuModule, NoteMenuComponent, NoteCommentsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES, `
    :host { display: block; }
    .topic { position: relative; }
    /* Only ever applied while a drag is actually in flight, so the board is still at rest. */
    .topic.drop-ok { outline: 2px dashed var(--ds-primary, #5b9df0); outline-offset: 3px; border-radius: 12px; }
    .topic.dragging { opacity: .45; }
    [draggable=true] { cursor: grab; }

    .g-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .g-badge { font-size: 10.5px; font-weight: 700; letter-spacing: .4px; text-transform: uppercase;
      padding: 2px 8px; border-radius: 999px; flex: none;
      background: var(--ds-primary-soft, rgba(91,157,240,.14)); color: var(--ds-primary, #5b9df0); }
    .g-name { font-weight: 600; font-size: 14px; flex: 1; min-width: 0; }
    .g-name.untitled { color: var(--mute); font-weight: 500; font-style: italic; }
    .g-rename { flex: 1; min-width: 0; }
    .g-members { display: flex; flex-direction: column; gap: 6px; }
    .g-member { display: flex; align-items: flex-start; gap: 8px; }
    .g-member .bullet { color: var(--mute); flex: none; line-height: 1.5; }
    .g-member .txt { flex: 1; min-width: 0; }

    .actions-from { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
    .action-chip { font-size: 11px; padding: 2px 9px; border-radius: 999px; display: inline-flex; gap: 5px;
      background: var(--ds-surface-2, rgba(255,255,255,.06)); color: var(--ds-text-muted, #9aa6b8); }
    .action-chip b { color: var(--ds-text, #e6e9ef); font-weight: 600; }
  `],
  template: `
    <div class="card topic"
         [class.drop-ok]="store.canDropOnTopic(topic)"
         [class.dragging]="isDragging()"
         [style.borderLeft]="variant === 'discuss' ? ('3px solid ' + store.columnColor(topic.columnId)) : null"
         style="padding:12px 16px;margin-bottom:10px"
         (dragover)="onDragOver($event)" (drop)="onDrop($event)">

      <!-- ── Group heading: what the merged topic is called, and the controls for it ── -->
      @if (topic.isGroup) {
        <div class="g-head">
          <span class="g-badge">{{ topic.notes.length }} merged</span>
          @if (renaming()) {
            <input class="f g-rename" [(ngModel)]="draftLabel" placeholder="Name this topic…"
                   (keyup.enter)="commitRename()" (keyup.escape)="renaming.set(false)" />
            <button class="btn primary sm" (click)="commitRename()">Save</button>
            <button class="btn ghost sm" (click)="renaming.set(false)">Cancel</button>
          } @else {
            <span class="g-name" [class.untitled]="!topic.label">{{ topic.label || store.topicTitle(topic) }}</span>
          }
          @if (!renaming() && menuVisible()) {
            <app-note-menu label="Actions for this topic">
              @if (variant === 'discuss' && store.amFacilitator()) {
                <button mat-menu-item (click)="store.startTopicAction(topic)">+ Action</button>
              }
              @if (store.canGroup()) {
                <button mat-menu-item (click)="startRename()">Rename topic</button>
                <button mat-menu-item (click)="store.ungroupTopic(topic)">Ungroup all</button>
              }
            </app-note-menu>
          }
        </div>
      }

      <!-- ── The notes themselves. Each is its own drag source, so you can pull one out of a
             stack and drop it on a different one. ── -->
      <div class="g-members">
        @for (n of topic.notes; track n.id) {
          <div class="g-member"
               [attr.draggable]="store.canGroup() ? 'true' : null"
               (dragstart)="store.startDrag(n)" (dragend)="store.endDrag()">
            @if (topic.isGroup) { <span class="bullet">·</span> }
            <div class="txt">
              <div>{{ store.masked(n) ? '•••' : n.text }}</div>
              <div class="meta">
                @if (store.masked(n)) { <span class="muted">hidden until reveal</span> }
                @else if (n.isAnonymous) { <span class="muted">anon</span> }
                @else { <span>{{ n.authorName }}{{ n.isOwn ? ' · you' : '' }}</span> }
                @if (variant === 'introduce' && n.flagged) { <span class="intro-by">will introduce</span> }
              </div>
            </div>

            <!-- A loose note's menu sits here; a group's sits in the heading above. -->
            @if (!topic.isGroup && menuVisible()) {
              <app-note-menu label="Actions for this note">
                @if (variant === 'discuss' && store.amFacilitator()) {
                  <button mat-menu-item (click)="store.startAction(n)">+ Action</button>
                }
                @if (variant === 'introduce') {
                  <button mat-menu-item (click)="store.toggleFlag(n)">{{ n.flagged ? 'Unflag' : 'Flag to introduce' }}</button>
                }
                @if (store.canDelNote(n)) { <button mat-menu-item (click)="store.delNote(n)">Delete note</button> }
              </app-note-menu>
            }
            @if (topic.isGroup && store.canGroup()) {
              <app-note-menu label="Actions for this note">
                <button mat-menu-item (click)="store.ungroupNote(n)">Pull out of topic</button>
                @if (variant === 'introduce') {
                  <button mat-menu-item (click)="store.toggleFlag(n)">{{ n.flagged ? 'Unflag' : 'Flag to introduce' }}</button>
                }
                @if (store.canDelNote(n)) { <button mat-menu-item (click)="store.delNote(n)">Delete note</button> }
              </app-note-menu>
            }
          </div>
        }
      </div>

      <!-- ── Votes are cast on the topic, never on a note inside it ── -->
      @if (variant === 'vote') {
        <div class="row between" style="margin-top:10px">
          <span class="muted" style="font-size:12px">{{ topic.voteCount }} total</span>
          <div class="row" style="gap:10px">
            <span class="vote-dots">@for (d of dots; track d) { <i [class.on]="d < topic.myVoteCount"></i> }</span>
            <button class="btn ghost sm" (click)="store.unvote(topic)" [disabled]="!store.canUnvoteOn(topic)">−</button>
            <button class="btn ghost sm" (click)="store.vote(topic)" [disabled]="!store.canVoteOn(topic)">+</button>
          </div>
        </div>
      }
      @if (variant === 'discuss') {
        <span class="avatar" style="position:absolute;top:12px;right:16px"
              [style.background]="store.columnColor(topic.columnId)+'22'"
              [style.color]="store.columnColor(topic.columnId)">{{ topic.voteCount }}</span>
      }

      <!-- Actions raised from this topic, so the note and what it produced stay visibly connected. -->
      @if (store.actionsFromTopic(topic); as raised) {
        @if (raised.length) {
          <div class="actions-from">
            @for (a of raised; track a.id) { <span class="action-chip">→ <b>{{ a.title }}</b></span> }
          </div>
        }
      }

      @if (showComments && !allMasked()) {
        <app-note-comments [comments]="store.topicComments(topic)" [canComment]="store.canComment()"
          [canModerate]="store.amFacilitator()"
          (addComment)="store.addTopicComment(topic, $event)"
          (deleteComment)="store.delTopicComment(topic, $event)" />
      }
    </div>
  `,
})
export class RetroTopicComponent {
  @Input({ required: true }) topic!: RetroTopic;
  /** Which phase is rendering this — decides the trimmings (flagging, votes, actions), not the
   *  drag/merge behaviour, which is the same everywhere it's offered. */
  @Input() variant: 'introduce' | 'vote' | 'discuss' = 'introduce';
  @Input() showComments = true;

  store = inject(RetroBoardStore);
  readonly dots = [0, 1, 2];

  renaming = signal(false);
  draftLabel = '';

  /** The ⋯ is worth showing only when it would hold something. */
  menuVisible() {
    return this.store.canGroup()
      || (this.variant === 'discuss' && this.store.amFacilitator())
      || this.variant === 'introduce';
  }

  isDragging() { const id = this.store.dragNoteId(); return !!id && this.topic.notes.some(n => n.id === id); }
  allMasked() { return this.topic.notes.every(n => this.store.masked(n)); }

  startRename() { this.draftLabel = this.topic.label ?? ''; this.renaming.set(true); }
  commitRename() { this.store.renameTopic(this.topic, this.draftLabel); this.renaming.set(false); }

  // preventDefault on dragover is what marks an element as a valid drop target at all; only do it
  // when the drop would actually merge something, so invalid targets show the "no drop" cursor.
  onDragOver(e: DragEvent) { if (this.store.canDropOnTopic(this.topic)) e.preventDefault(); }
  onDrop(e: DragEvent) { e.preventDefault(); this.store.dropOnTopic(this.topic); }
}
