import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RetroBoardStore } from '../retro-board.store';
import { RETRO_STYLES } from '../retro-board.styles';

@Component({
  selector: 'app-retro-introduce',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES],
  template: `
    @if (store.session(); as s) {
      <div class="row between"><div><h1>Introduce Topics</h1><p class="sub">Read the notes and flag anything that needs the owner to explain it</p></div>
        @if (store.amFacilitator()) { <button class="btn primary" (click)="store.goPhase('vote')">Continue to Vote →</button> }</div>
      @if (store.flagged().length) { <div class="card" style="border-color:color-mix(in srgb,var(--flag) 40%, transparent)"><div style="color:var(--flag);font-size:12px;letter-spacing:.08em">{{ store.flagged().length }} FLAGGED TO DISCUSS</div>
        @for (n of store.flagged(); track n.id) { <div style="margin-top:6px">• {{ n.text }} <span class="intro-by">— {{ store.introducer(n) }}</span></div> }</div> }
      <div class="cols">
        @for (c of s.columns; track c.id) {
          <div class="col" [style.borderColor]="c.color+'55'"><h3 [style.color]="c.color">{{ c.label }}</h3>
            @for (n of store.notesFor(c.id); track n.id) {
              <div class="note" [style.borderColor]="n.flagged ? 'var(--flag)' : null">
                <div>{{ n.text }}</div>
                @if (n.clarification) { <div class="muted" style="font-style:italic;margin-top:6px">↳ {{ n.clarification }}</div> }
                <div class="meta">
                  @if (n.isAnonymous) { <span class="muted">anon</span> } @else { <span>{{ n.authorName }}</span> }
                  @if (n.flagged) { <span class="intro-by">will introduce</span> }
                  <span class="pill" [class.on]="n.flagged" (click)="store.toggleFlag(n)">⚑ {{ n.flagged ? 'Flagged to discuss' : 'Flag to discuss' }}</span>
                </div>
              </div>
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
