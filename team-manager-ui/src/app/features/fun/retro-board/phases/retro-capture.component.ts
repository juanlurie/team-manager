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
      <div class="row between"><div><h1>Capture Notes</h1><p class="sub">Add your thoughts to each category</p></div>
        @if (store.amFacilitator()) { <div class="row" style="gap:8px">
          <button class="btn ghost" (click)="store.reveal()" [disabled]="s.notesRevealed">{{ s.notesRevealed ? '✓ Revealed' : 'Reveal to all' }}</button>
          <button class="btn primary" (click)="store.goPhase('introduce')">Continue →</button></div> }
      </div>
      <div class="cols">
        @for (c of s.columns; track c.id) {
          <div class="col" [style.borderColor]="c.color+'55'">
            <h3 [style.color]="c.color">{{ c.label }}</h3><p class="desc">{{ store.notesFor(c.id).length }} notes</p>
            <textarea class="f" rows="2" [(ngModel)]="store.draft[c.id]" placeholder="Add a note…"></textarea>
            <div class="row between" style="margin:8px 0 12px">
              <label class="row muted" style="gap:6px;cursor:pointer;font-size:13px"><input type="checkbox" [(ngModel)]="store.draftAnon[c.id]"> anon</label>
              <button class="btn primary sm" (click)="store.addNote(c.id)">+ Add</button>
            </div>
            @for (n of store.notesFor(c.id); track n.id) {
              <div class="note">
                <div>{{ store.masked(n) ? '•••' : n.text }}</div>
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
