import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RetroBoardStore } from '../retro-board.store';
import { RETRO_STYLES } from '../retro-board.styles';

@Component({
  selector: 'app-retro-checkin',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES],
  template: `
    @if (store.session(); as s) {
      <div class="phase-head">
        <div><h1>Sprint Check-in</h1><p class="sub">Rate how things have changed since last retro</p></div>
        <div class="ph-right">
          @if (store.amFacilitator()) { <button class="btn primary" (click)="store.goPhase('capture')">Continue to Capture →</button> }
          <div class="responded">
            <span class="muted">{{ store.checkinResponded() }}/{{ s.participants.length }} responded</span>
            <div class="bar-track"><span class="bar-fill" [style.width.%]="s.participants.length ? store.checkinResponded() / s.participants.length * 100 : 0"></span></div>
          </div>
        </div>
      </div>
      @for (q of s.checkinQuestions; track q.id) {
        <div class="card">
          <div style="font-weight:700;font-size:17px">{{ q.text }}</div>
          <div class="muted" style="font-style:italic;margin:4px 0 16px">{{ q.contextText }}</div>
          <div class="grid g4">
            @for (r of store.ratings; track r.v) {
              <div class="rate" [style.borderColor]="q.myRating===r.v ? r.color : null" [style.color]="q.myRating===r.v ? r.color : null" (click)="store.respond(q.id, r.v)">{{ r.label }}</div>
            }
          </div>
        </div>
      }
      @if (s.checkinQuestions.length === 0) { <p class="muted">No check-in questions yet.</p> }
      @if (store.checkinDone()) { <button class="btn" disabled>✓ Responded — waiting for others</button> }
      @else { <button class="btn primary" (click)="store.markDone('checkin')">Done — I've responded</button> }
    }
  `,
})
export class RetroCheckinComponent {
  store = inject(RetroBoardStore);
}
