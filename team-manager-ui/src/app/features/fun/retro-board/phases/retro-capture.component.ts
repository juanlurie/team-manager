import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RetroBoardStore } from '../retro-board.store';
import { RETRO_STYLES } from '../retro-board.styles';

@Component({
  selector: 'app-retro-capture',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES],
  template: `
    @if (store.session(); as s) {
      <div class="phase-head"><div><h1>Capture Notes</h1><p class="sub">Add your thoughts to each category</p></div>
        @if (store.amFacilitator()) { <div class="row" style="gap:8px">
          @if (s.notesRevealed) { <button class="btn ghost" (click)="store.hideNotes()" title="Undo an accidental reveal">↺ Hide all</button> }
          @else { <button class="btn ghost" (click)="store.reveal()">Reveal to all</button> }
          <button class="btn primary" (click)="store.goPhase('introduce')">Continue →</button></div> }
      </div>
      <div class="cols">
        @for (c of s.columns; track c.id) {
          <div class="col" [style.borderColor]="c.color+'55'">
            <h3 [style.color]="c.color">{{ c.label }}</h3><p class="desc">{{ store.notesFor(c.id).length }} notes</p>
            <textarea class="f" rows="2" [(ngModel)]="store.draft[c.id]" placeholder="Add a note… (Enter to add, Shift+Enter for a new line)"
              (keydown.enter)="$event.preventDefault(); store.addNote(c.id)"></textarea>
            <div class="row between" style="margin:8px 0 12px">
              <label class="row muted" style="gap:6px;cursor:pointer;font-size:13px"><input type="checkbox" [(ngModel)]="store.draftAnon[c.id]"> anon</label>
              <button class="btn primary sm" (click)="store.addNote(c.id)">+ Add</button>
            </div>
            @for (n of store.notesFor(c.id); track n.id) {
              <div class="note">
                <div class="row between" style="gap:8px;align-items:flex-start">
                  <div style="flex:1;min-width:0">{{ store.masked(n) ? '•••' : n.text }}</div>
                  @if (store.canDelNote(n)) { <button class="btn ghost sm" style="padding:2px 7px" (click)="store.delNote(n)" title="Delete note">✕</button> }
                </div>
                <div class="meta">
                  @if (store.masked(n)) { <span class="muted">hidden until reveal</span> }
                  @else if (n.isAnonymous) { <span class="muted">anon</span> }
                  @else { <span>{{ n.authorName }}{{ n.isOwn ? ' · you' : '' }}</span> }
                </div>
              </div>
            }
          </div>
        }
      </div>
    }
  `,
})
export class RetroCaptureComponent {
  store = inject(RetroBoardStore);
}
