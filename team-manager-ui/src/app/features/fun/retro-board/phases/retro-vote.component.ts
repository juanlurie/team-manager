import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RetroBoardStore, MAX_VOTES_PER_NOTE } from '../retro-board.store';
import { RETRO_STYLES } from '../retro-board.styles';
import { RespondedMeterComponent } from '../responded-meter.component';
import { NoteCommentsComponent } from '../note-comments.component';

@Component({
  selector: 'app-retro-vote',
  standalone: true,
  imports: [CommonModule, RespondedMeterComponent, NoteCommentsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES],
  template: `
    @if (store.session(); as s) {
      <div class="phase-head">
        <div><h1>Vote</h1><p class="sub">Up to 3 votes per topic — spend on what matters most</p></div>
        <div class="ph-right">
          @if (store.liveFacilitation()) { <button class="btn primary" (click)="store.goNext()">Continue to {{ store.nextPhaseLabel() }} →</button> }
          <app-responded-meter [done]="store.respondedFor('vote')" [total]="store.respondedTotal()" />
        </div>
      </div>
      @if (store.canVote()) {
        <div class="card row" style="gap:8px">You have <b>{{ store.votesLeft() }}</b> of <b>{{ s.votesPerUser }}</b> votes left</div>
      } @else {
        <div class="card row" style="gap:8px"><span class="muted">{{ store.voteClosedHint() }}</span></div>
      }
      @for (c of s.columns; track c.id) {
        <h3 [style.color]="c.color" style="margin:18px 0 8px">{{ c.label }}</h3>
        @for (n of store.notesFor(c.id); track n.id) {
          <div class="card" style="padding:12px 16px;margin-bottom:10px">
            <div class="row between">
              <div style="flex:1">{{ n.text }} <span class="muted" style="font-size:12px">· {{ n.voteCount }} total</span></div>
              <div class="row" style="gap:10px">
                <span class="vote-dots">@for (d of dots; track d) { <i [class.on]="d < n.myVoteCount"></i> }</span>
                <!-- Disabled states are driven by state the store has ALREADY credited with clicks
                     still in flight, so hammering + can't outrun the budget into a 409. -->
                <button class="btn ghost sm" (click)="store.unvote(n)" [disabled]="!store.canUnvoteOn(n)">−</button>
                <button class="btn ghost sm" (click)="store.vote(n)" [disabled]="!store.canVoteOn(n)">+</button>
              </div>
            </div>
            <app-note-comments [comments]="n.comments" [canComment]="store.canComment()"
              [canModerate]="store.amFacilitator()"
              [lockedHint]="'Comments reopen in Discuss.'"
              (addComment)="store.addComment(n.id, $event)"
              (deleteComment)="store.delComment(n.id, $event)" />
          </div>
        }
      }
    }
  `,
})
export class RetroVoteComponent {
  store = inject(RetroBoardStore);
  /** One dot per vote you're allowed to put on a single note. */
  readonly dots = Array.from({ length: MAX_VOTES_PER_NOTE }, (_, i) => i);
}
