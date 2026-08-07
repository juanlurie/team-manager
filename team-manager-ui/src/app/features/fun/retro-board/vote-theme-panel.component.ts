import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RetroBoardStore } from './retro-board.store';
import { RETRO_STYLES } from './retro-board.styles';
import { RetroBoardSession } from '../../../core/models/retro-board.model';

/**
 * AI synthesis of converging themes across voted notes — 2-4 clusters with a title, short
 * description, and the notes each draws from, so Discuss starts from a synthesized shape instead of
 * a flat vote-count list. Auto-fires once on entering Discuss (server-side, see
 * `RetroBoardService.SetPhaseAsync`) — not on entering Vote, since no votes exist yet at that instant.
 * This panel also offers a manual "Analyse"/"Re-analyse" trigger that's always callable, independent
 * of that auto-fire's own dedupe state — useful mid-Vote, before Discuss starts. Shared between Vote
 * and Summary (the recap), so it lives as its own component rather than being duplicated or bolted
 * onto either phase file.
 */
@Component({
  selector: 'app-vote-theme-panel',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES, `
    .theme-card { border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; }
    .theme-card .from-note { font-size: 11.5px; color: var(--mute); margin-top: 3px; font-style: italic; }
  `],
  template: `
    @if (store.session(); as s) {
      <div class="card">
        <div class="row between" style="margin-bottom:12px">
          <h3 style="margin:0">Vote Themes <span class="muted" style="font-size:12px;font-weight:400">· AI synthesis</span></h3>
          @if (store.amFacilitator()) {
            <button class="btn ghost sm" (click)="store.analyseVotingThemes()" [disabled]="store.analysingThemes()">
              {{ store.analysingThemes() ? 'Analysing…' : (s.voteThemes ? 'Re-analyse' : 'Analyse themes') }}
            </button>
          }
        </div>

        @if (s.voteThemes?.themes?.length) {
          @for (t of s.voteThemes!.themes; track t.title) {
            <div class="theme-card">
              <div style="font-weight:600">{{ t.title }}</div>
              <p class="muted" style="margin:4px 0 0">{{ t.description }}</p>
              @for (n of store.notesForTheme(t); track n.id) {
                <div class="from-note">“{{ n.text }}”</div>
              }
            </div>
          }
        } @else if (analysing(s)) {
          <p class="muted">Analysing votes for themes…</p>
        } @else {
          <p class="muted">{{ store.amFacilitator() ? 'Analyse voted notes for converging themes.' : 'No themes yet.' }}</p>
        }
        @if (s.voteThemesError) { <p class="err">{{ s.voteThemesError }}</p> }
      </div>
    }
  `,
})
export class VoteThemePanelComponent {
  store = inject(RetroBoardStore);

  // The Discuss-phase auto-fire runs server-side with no client-visible "in flight" signal of its
  // own — infer it from being in Discuss with no themes/error yet, so refresh doesn't need to invent one.
  analysing(s: RetroBoardSession) {
    return this.store.analysingThemes() || (s.phase === 'discuss' && !s.voteThemes && !s.voteThemesError);
  }
}
