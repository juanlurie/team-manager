import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RetroBoardStore } from '../retro-board.store';
import { RETRO_STYLES } from '../retro-board.styles';
import { RespondedMeterComponent } from '../responded-meter.component';
import { RetroTopicComponent } from '../retro-topic.component';
import { GroupSimilarButtonComponent } from '../group-similar-button.component';

@Component({
  selector: 'app-retro-vote',
  standalone: true,
  imports: [CommonModule, RespondedMeterComponent, RetroTopicComponent, GroupSimilarButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES],
  template: `
    @if (store.session(); as s) {
      <div class="phase-head">
        <div><h1>Vote</h1><p class="sub">Up to 3 votes per topic — merged notes count as one</p></div>
        <div class="ph-right">
          <app-group-similar-button />
          @if (store.liveFacilitation()) { <button class="btn primary" (click)="store.goNext()">Continue to {{ store.nextPhaseLabel() }} →</button> }
          <app-responded-meter [done]="store.respondedFor('vote')" [total]="store.respondedTotal()" />
        </div>
      </div>

      @if (store.canVote()) {
        <div class="card row" style="gap:8px">You have <b>{{ store.votesLeft() }}</b> of <b>{{ s.votesPerUser }}</b> votes left</div>
      } @else {
        <div class="card row" style="gap:8px"><span class="muted">{{ store.voteClosedHint() }}</span></div>
      }
      @if (store.canGroup()) {
        <p class="muted" style="font-size:12.5px;margin:10px 0 0">Drag a note onto another to merge near-duplicates — the team then votes on the merged topic once.</p>
      }

      @for (c of s.columns; track c.id) {
        <h3 [style.color]="c.color" style="margin:18px 0 8px">{{ c.label }}</h3>
        @for (t of store.topicsFor(c.id); track t.id) {
          <app-retro-topic [topic]="t" variant="vote" />
        }
      }
    }
  `,
})
export class RetroVoteComponent {
  store = inject(RetroBoardStore);
}
