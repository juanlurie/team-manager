import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RetroBoardStore } from '../retro-board.store';
import { RETRO_STYLES } from '../retro-board.styles';
import { RespondedMeterComponent } from '../responded-meter.component';

@Component({
  selector: 'app-retro-reflect',
  standalone: true,
  imports: [CommonModule, FormsModule, RespondedMeterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES],
  template: `
    @if (store.session(); as s) {
      <div class="phase-head">
        <div><h1>Reflect</h1><p class="sub">Rate the session — your ratings are anonymous, only the aggregate is shared</p></div>
        <div class="ph-right">
          @if (store.liveFacilitation()) { <button class="btn primary" (click)="store.goPhase('summary')">Continue to Summary →</button> }
          <app-responded-meter [done]="store.respondedFor('reflect')" [total]="store.respondedTotal()" />
        </div>
      </div>
      @if (s.feedbackPrompts.length) {
        <div class="card">
          @for (p of s.feedbackPrompts; track p.id) {
            <div style="margin-bottom:20px">
              <div style="font-weight:600;margin-bottom:6px">{{ p.text }}</div>
              <div class="stars">
                @for (n of store.starScale; track n) { <span class="star" [class.on]="(p.myScore ?? 0) >= n" (click)="store.rateFeedback(p.id, n)">★</span> }
                @if (p.myScore) { <span class="muted" style="font-size:12px;margin-left:8px;align-self:center">{{ p.myScore }}/5</span> }
              </div>
              <textarea class="f" rows="2" style="margin-top:8px" [placeholder]="p.myScore ? 'Optional comment…' : 'Rate first, then add a comment'"
                [disabled]="!p.myScore" [(ngModel)]="store.fbComments[p.id]" (change)="store.commentFeedback(p.id)"></textarea>
            </div>
          }
          @if (store.feedbackDone()) { <div class="muted">✓ Thanks — your feedback has been recorded. You can still adjust it above.</div> }
        </div>
      } @else { <p class="muted">No feedback prompts for this retro.</p> }
    }
  `,
})
export class RetroReflectComponent {
  store = inject(RetroBoardStore);
}
