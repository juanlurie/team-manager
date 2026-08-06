import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RetroBoardStore } from './retro-board.store';
import { RETRO_STYLES } from './retro-board.styles';

/**
 * The participant list in the board rail: who's here, who's hosting, who has checked in, and the
 * facilitator's roster controls (grant/revoke host, remove, re-admit).
 *
 * Extracted from the board container alongside the rail timer — with removal added, the roster is a
 * self-contained job with its own permissions rather than a few lines of shell markup.
 */
@Component({
  selector: 'app-retro-participant-rail',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES, `
    /* The host generates no box of its own, so these rows stay direct children of .rail and keep the
       rail's layout untouched by the extraction — a vertical list on desktop, and the horizontal
       scrolling strip the <=760px rule turns .rail into on mobile. */
    :host { display: contents; }
    /* The shared sheet styles this heading as ".rail h4", which can't reach across a component
       boundary under emulated encapsulation (.rail belongs to the container, the h4 to this
       component). Restated here, scoped to the element that actually lives in this template. */
    h4 { font-size:11px; letter-spacing:.1em; color:var(--mute); margin:0 0 12px 6px; text-transform:uppercase; }
    @media (max-width: 760px) { h4 { display:none; } }

    .p-row .rm-btn { font: inherit; font-size: 11px; cursor: pointer; background: none; border: none; padding: 0 3px;
      color: var(--ds-text-faint, #667085); }
    .p-row .rm-btn:hover { color: var(--ds-danger, #ef5b58); }
    .removed-head { margin: 16px 0 6px; font-size: 11px; font-weight: 700; letter-spacing: .5px;
      text-transform: uppercase; color: var(--ds-text-faint, #667085); }
    .p-row.removed span { opacity: .5; }
    .p-row.removed .readmit { opacity: 1; font: inherit; font-size: 11px; font-weight: 600; cursor: pointer;
      background: none; border: none; padding: 0 3px; color: var(--ds-text-muted, #9aa6b8); }
    .p-row.removed .readmit:hover { color: var(--ds-primary, #5b9df0); }
  `],
  template: `
    @if (store.session(); as s) {
      <h4>Participants · {{ s.participants.length }}</h4>
      @for (p of s.participants; track p.id) {
        <div class="p-row">
          <span class="avatar" [style.background]="store.tint(p.memberId ?? p.id)" [style.color]="store.ink(p.memberId ?? p.id)">{{ store.initials(p.name) }}</span>
          <span>{{ store.shortName(p.name) }}</span>
          @if (p.isGuest) { <span class="guest-tag">guest</span> }
          @if (p.role === 'facilitator') { <span class="crown">★</span> }
          @else if (store.amFacilitator() && (s.status === 'open' || s.phase === 'checkin') && p.responded['checkin']) { <span class="tick" title="Checked in">✓</span> }
          @if (store.canManageHost(p)) {
            <button class="host-btn" (click)="store.setHost(p, p.role !== 'facilitator')"
                    [title]="p.role === 'facilitator' ? 'Remove host' : 'Make host'">
              {{ p.role === 'facilitator' ? '− host' : '+ host' }}
            </button>
          }
          @if (store.canRemove(p)) {
            <button class="rm-btn" (click)="store.removeParticipant(p)"
                    [title]="'Remove ' + p.name + ' from this retro'">✕</button>
          }
        </div>
      }

      <!-- Facilitator-only, and the list is empty unless something was actually removed. -->
      @if (s.removedParticipants.length) {
        <div class="removed-head">Removed</div>
        @for (p of s.removedParticipants; track p.id) {
          <div class="p-row removed">
            <span class="avatar" [style.background]="store.tint(p.memberId ?? p.id)" [style.color]="store.ink(p.memberId ?? p.id)">{{ store.initials(p.name) }}</span>
            <span>{{ store.shortName(p.name) }}</span>
            @if (p.isGuest) { <span class="guest-tag">guest</span> }
            <button class="readmit" (click)="store.readmitParticipant(p)"
                    title="Let them back in — their revoked votes aren't restored">↩ re-admit</button>
          </div>
        }
      }
    }
  `,
})
export class RetroParticipantRailComponent {
  store = inject(RetroBoardStore);
}
