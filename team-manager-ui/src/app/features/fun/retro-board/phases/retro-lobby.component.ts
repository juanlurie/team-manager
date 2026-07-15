import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RetroBoardStore } from '../retro-board.store';
import { RETRO_STYLES } from '../retro-board.styles';

@Component({
  selector: 'app-retro-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES],
  template: `
    <div class="main" style="max-width:720px;margin:0 auto">
      <h1>RetroBoard</h1>
      <p class="sub">Start a new retrospective or join an open one.</p>

      <div class="row" style="gap:10px;margin-bottom:16px">
        <button class="btn" [class.primary]="mode()==='create'" (click)="mode.set('create')">Create new</button>
        <button class="btn" [class.primary]="mode()==='join'" (click)="mode.set('join')">Join with code</button>
      </div>

      @if (mode()==='create') {
        <div class="card">
          <div class="row"><input class="f" [(ngModel)]="store.newTitle" placeholder="" aria-label="Retro name" (keydown.enter)="store.create()">
            <button class="btn primary" (click)="store.create()" [disabled]="store.creating()">Create</button></div>
        </div>
      } @else {
        <div class="card">
          <div style="display:flex;align-items:center;gap:14px">
            <span style="color:var(--mute);font-size:18px" aria-hidden="true">🔗</span>
            <input class="f" style="min-width:0" [(ngModel)]="store.joinCode" placeholder="Session code (e.g. crisp-gecko)"
                   aria-label="Session code" (keydown.enter)="store.joinByCode()">
          </div>
          <button class="btn primary" style="margin-top:16px" (click)="store.joinByCode()" [disabled]="store.joining()">Join →</button>
        </div>
      }
      <h3 style="margin:24px 0 12px">Open retros</h3>
      @if (store.summaries().length === 0) { <p class="muted">None yet.</p> }
      @for (s of store.summaries(); track s.id) {
        <div class="lobby-card">
          <div class="lc-main" (click)="store.open(s.id)">
            <div style="font-weight:600">{{ s.title || 'Untitled retro' }}</div>
            <div class="muted" style="font-size:12.5px">{{ s.createdByName }} · {{ s.noteCount }} notes · {{ s.participantCount }} joined</div>
          </div>
          <span class="tag" [class.draft]="s.status==='draft'" [class.open]="s.status==='open'" [class.live]="s.status==='live'" [class.closed]="s.status==='closed'">{{ s.status }}</span>
          @if (s.isFacilitator && s.status==='closed') {
            <button class="btn ghost sm" (click)="store.reopen(s.id, $event)">Reopen</button>
            <button class="btn ghost sm" (click)="store.archive(s.id, $event)">Archive</button>
          }
          @if (s.status==='draft' && s.createdByMemberId===store.myId) { <button class="btn ghost sm" title="Delete draft" (click)="store.del(s.id, $event)">✕</button> }
        </div>
      }

      <div class="row between" style="margin:24px 0 12px">
        <h3 style="margin:0">Archived</h3>
        <button class="btn ghost sm" (click)="store.toggleArchived()">{{ store.showArchived() ? 'Hide' : 'Show' }}</button>
      </div>
      @if (store.showArchived()) {
        @if (store.archived().length === 0) { <p class="muted">No archived retros.</p> }
        @for (s of store.archived(); track s.id) {
          <div class="lobby-card">
            <div class="lc-main" (click)="store.open(s.id)">
              <div style="font-weight:600">{{ s.title || 'Untitled retro' }}</div>
              <div class="muted" style="font-size:12.5px">{{ s.createdByName }} · {{ s.noteCount }} notes · {{ s.participantCount }} joined</div>
            </div>
            <span class="tag closed">{{ s.status }}</span>
            @if (s.isFacilitator) { <button class="btn ghost sm" (click)="store.unarchive(s.id, $event)">Restore</button> }
            @if (s.createdByMemberId===store.myId) { <button class="btn ghost sm" title="Delete permanently" (click)="store.del(s.id, $event)">✕</button> }
          </div>
        }
      }
      @if (store.error()) { <p class="err">{{ store.error() }}</p> }
    </div>
  `,
})
export class RetroLobbyComponent {
  store = inject(RetroBoardStore);
  /** Which lobby panel is showing — create a new retro or join an existing one by code. */
  mode = signal<'create' | 'join'>('create');
}
