import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RetroBoardStore } from '../retro-board.store';
import { RETRO_STYLES } from '../retro-board.styles';

@Component({
  selector: 'app-retro-reflect',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES],
  template: `
    @if (store.session(); as s) {
      <div class="row between"><div><h1>Reflect</h1><p class="sub">AI synthesis of the board</p></div>
        @if (store.amFacilitator() && s.aiSummary) { <button class="btn primary" (click)="store.goPhase('summary')">Continue to Summary →</button> }</div>
      <div class="card">
        @if (!s.aiSummary) {
          <p class="muted">{{ store.amFacilitator() ? 'Generate a summary of themes, insights and suggested actions.' : 'The facilitator is generating the summary…' }}</p>
          @if (store.amFacilitator()) { <button class="btn primary" (click)="store.analyse()" [disabled]="store.analysing()">{{ store.analysing() ? 'Synthesizing…' : 'Generate AI summary' }}</button> }
          @if (store.error()) { <p class="err">{{ store.error() }}</p> }
        } @else {
          <div class="grid g2">
            <div><label class="lbl">Strength themes</label>@for (t of s.aiSummary.strengthThemes; track t) { <span class="pill" style="margin:3px">{{ t }}</span> }</div>
            <div><label class="lbl">Improvement themes</label>@for (t of s.aiSummary.improveThemes; track t) { <span class="pill" style="margin:3px">{{ t }}</span> }</div>
          </div>
          <label class="lbl" style="margin-top:16px">Key insights</label>@for (t of s.aiSummary.insights; track t) { <div style="margin:6px 0">◆ {{ t }}</div> }
          <label class="lbl" style="margin-top:16px">Suggested actions</label>@for (t of s.aiSummary.suggestedActions; track t) { <div style="margin:6px 0">→ {{ t }}</div> }
        }
      </div>
    }
  `,
})
export class RetroReflectComponent {
  store = inject(RetroBoardStore);
}
