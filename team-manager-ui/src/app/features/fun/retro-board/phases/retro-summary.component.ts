import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RetroBoardStore } from '../retro-board.store';
import { RETRO_STYLES } from '../retro-board.styles';

@Component({
  selector: 'app-retro-summary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES],
  template: `
    @if (store.session(); as s) {
      <h1>Summary</h1><p class="sub">{{ s.title }} — recap</p>
      <div class="card"><h3 style="margin:0 0 12px">Action items</h3>
        @for (a of s.actions; track a.id) {
          <div class="note">{{ a.title }}
            @if (a.assigneeMemberIds.length) { <div class="chips">@for (m of a.assigneeMemberIds; track m) { <span class="tag">{{ store.memberName(m) }}</span> }</div> }</div>
        }
        @if (s.actions.length === 0) { <p class="muted">No actions captured.</p> }
      </div>
      <div class="card"><h3 style="margin:0 0 12px">Check-in sentiment</h3>
        @for (q of s.checkinQuestions; track q.id) {
          <div style="margin-bottom:10px"><div style="font-size:13px;margin-bottom:4px">{{ q.text }}</div>
            <div class="row" style="height:16px;border-radius:5px;overflow:hidden;background:var(--surface2);gap:0">
              <span [style.width.%]="store.pct(q.better,q)" style="background:#34d67f"></span>
              <span [style.width.%]="store.pct(q.same,q)" style="background:#f5b544"></span>
              <span [style.width.%]="store.pct(q.worse,q)" style="background:#f4566b"></span>
            </div></div>
        }
      </div>

      @if (s.feedbackPrompts.length) {
        @if (store.amFacilitator()) {
          <!-- Facilitator: anonymous aggregate -->
          <div class="card"><h3 style="margin:0 0 4px">Session feedback</h3>
            <p class="muted" style="margin:0 0 18px">Anonymous ratings from participants.</p>
            @for (p of s.feedbackPrompts; track p.id) {
              <div style="margin-bottom:22px">
                <div class="row between">
                  <div style="font-weight:600">{{ p.text }}</div>
                  <div class="row" style="gap:8px;align-items:center">
                    <span class="stars sm">@for (n of store.starScale; track n) { <span class="star" [class.on]="(p.averageScore ?? 0) >= n - 0.4">★</span> }</span>
                    <b>{{ store.avgFb(p) }}</b><span class="muted" style="font-size:12px">({{ p.responseCount }})</span>
                  </div>
                </div>
                <div style="margin-top:8px">
                  @for (n of store.starScaleDesc; track n) {
                    <div class="bar-row"><span class="muted" style="width:26px;font-size:12px">{{ n }}★</span>
                      <div class="bar-track"><span class="bar-fill" [style.width.%]="store.distPct(p, n)"></span></div>
                      <span class="muted" style="width:20px;font-size:12px;text-align:right">{{ p.distribution[n-1] }}</span></div>
                  }
                </div>
                @if (p.comments.length) { <div style="margin-top:10px">
                  @for (c of p.comments; track $index) { <div class="note" style="font-style:italic">“{{ c }}”</div> }
                </div> }
              </div>
            }
          </div>
        } @else {
          <!-- Participant: rate the session -->
          <div class="card"><h3 style="margin:0 0 4px">How did we do?</h3>
            <p class="muted" style="margin:0 0 18px">Your ratings are anonymous — only the aggregate is shared with the facilitator.</p>
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
        }
      }
    }
  `,
})
export class RetroSummaryComponent {
  store = inject(RetroBoardStore);
}
