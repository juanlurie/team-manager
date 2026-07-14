import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RetroBoardStore } from '../retro-board.store';
import { RETRO_STYLES } from '../retro-board.styles';

@Component({
  selector: 'app-retro-vote',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES],
  template: `
    @if (store.session(); as s) {
      <div class="row between"><div><h1>Vote</h1><p class="sub">Up to 3 votes per topic — spend on what matters most</p></div>
        @if (store.amFacilitator()) { <button class="btn primary" (click)="store.goPhase('discuss')">Continue to Discuss →</button> }</div>
      <div class="card row" style="gap:8px">You have <b>{{ s.votesPerUser - s.myVotesUsed }}</b> of <b>{{ s.votesPerUser }}</b> votes left</div>
      @for (c of s.columns; track c.id) {
        <h3 [style.color]="c.color" style="margin:18px 0 8px">{{ c.label }}</h3>
        @for (n of store.notesFor(c.id); track n.id) {
          <div class="card row between" style="padding:12px 16px;margin-bottom:10px">
            <div style="flex:1">{{ n.text }} <span class="muted" style="font-size:12px">· {{ n.voteCount }} total</span></div>
            <div class="row" style="gap:10px">
              <span class="vote-dots">@for (d of [0,1,2]; track d) { <i [class.on]="d < n.myVoteCount"></i> }</span>
              <button class="btn ghost sm" (click)="store.unvote(n)" [disabled]="n.myVoteCount===0">−</button>
              <button class="btn ghost sm" (click)="store.vote(n)" [disabled]="n.myVoteCount>=3 || s.myVotesUsed>=s.votesPerUser">+</button>
            </div>
          </div>
        }
      }
    }
  `,
})
export class RetroVoteComponent {
  store = inject(RetroBoardStore);
}
