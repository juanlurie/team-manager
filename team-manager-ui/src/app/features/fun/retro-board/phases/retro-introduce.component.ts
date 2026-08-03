import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RetroBoardStore } from '../retro-board.store';
import { RETRO_STYLES } from '../retro-board.styles';
import { RetroTopicComponent } from '../retro-topic.component';
import { GroupSimilarButtonComponent } from '../group-similar-button.component';

@Component({
  selector: 'app-retro-introduce',
  standalone: true,
  imports: [CommonModule, RetroTopicComponent, GroupSimilarButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES],
  template: `
    @if (store.session(); as s) {
      <div class="phase-head">
        <div><h1>Introduce Topics</h1><p class="sub">Read the notes, flag anything that needs explaining, and merge the duplicates</p></div>
        <div class="ph-right">
          <app-group-similar-button />
          @if (store.liveFacilitation()) { <button class="btn primary" (click)="store.goNext()">Continue to {{ store.nextPhaseLabel() }} →</button> }
        </div>
      </div>

      @if (store.flagged().length) {
        <div class="card" style="border-color:color-mix(in srgb,var(--flag) 40%, transparent)">
          <div style="color:var(--flag);font-size:12px;letter-spacing:.08em">{{ store.flagged().length }} FLAGGED TO INTRODUCE</div>
          @for (g of store.flaggedByColumn(); track g.column.id) {
            <div style="margin-top:12px">
              <div style="font-weight:600;font-size:12.5px" [style.color]="g.column.color">{{ g.column.label }}</div>
              @for (n of g.notes; track n.id) { <div style="margin-top:4px">• {{ n.text }} <span class="intro-by">— {{ store.introducer(n) }}</span></div> }
            </div>
          }
        </div>
      }

      @if (store.canGroup()) {
        <p class="muted" style="font-size:12.5px;margin:12px 0 0">Spotted the same idea twice? Drag one note onto the other to merge them — they'll be voted on as one topic.</p>
      }

      <div class="cols">
        @for (c of s.columns; track c.id) {
          <div class="col" [style.borderColor]="c.color+'55'">
            <h3 [style.color]="c.color">{{ c.label }}</h3>
            @for (t of store.topicsFor(c.id); track t.id) {
              <app-retro-topic [topic]="t" variant="introduce" />
            }
          </div>
        }
      </div>
    }
  `,
})
export class RetroIntroduceComponent {
  store = inject(RetroBoardStore);
}
