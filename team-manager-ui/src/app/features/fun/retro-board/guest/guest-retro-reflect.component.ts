import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RetroBoardFeedbackPrompt } from '../../../../core/models/retro-board.model';

/** A guest's rating intent for a feedback prompt: the prompt, the 1–5 score, and an optional comment. */
export interface GuestFeedbackResponse { promptId: string; score: number; comment: string | null; }

/**
 * The guest's Reflect surface: rate each feedback prompt 1–5 stars and optionally comment. Ratings are
 * anonymous — the guest only ever sees their own response, never the aggregate (that stays facilitator
 * only, enforced by the server projection). Purely presentational: it emits a respond intent and the
 * host performs the call and feeds back the refreshed board. Mirrors the member Reflect phase.
 */
@Component({
  selector: 'app-guest-retro-reflect',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; }
    .card { background: var(--ds-surface-1, #151b24); border: 1px solid var(--ds-border, rgba(255,255,255,.08)); border-radius: 14px; padding: 20px 18px; }
    .intro { color: var(--ds-text-muted, #9aa6b8); font-size: .85rem; margin: 0 0 18px; }
    .prompt { margin-bottom: 22px; }
    .prompt:last-of-type { margin-bottom: 6px; }
    .p-text { font-weight: 600; font-size: .95rem; margin-bottom: 8px; color: var(--ds-text, #e6e9ef); }
    .stars { display: inline-flex; gap: 4px; align-items: center; }
    .star { cursor: pointer; font-size: 1.5rem; line-height: 1; color: var(--ds-border-strong, rgba(255,255,255,.18)); transition: color .1s, transform .1s; user-select: none; }
    .star:hover { transform: scale(1.12); }
    .star.on { color: var(--ds-warning, #f5b445); }
    .star.disabled { cursor: default; }
    .star.disabled:hover { transform: none; }
    .score { font-size: .78rem; color: var(--ds-text-muted, #9aa6b8); margin-left: 8px; }
    textarea { width: 100%; box-sizing: border-box; margin-top: 8px; padding: 9px 11px; border-radius: 9px; border: 1px solid var(--ds-border-strong, rgba(255,255,255,.14)); background: var(--ds-surface-sunken, #0b0d12); color: var(--ds-text, #e6e9ef); font: inherit; font-size: .88rem; resize: vertical; }
    textarea:focus { outline: none; border-color: var(--ds-primary, #5b9df0); }
    textarea:disabled { opacity: .55; }
    .done { color: var(--ds-success, #34d67f); font-size: .82rem; margin-top: 4px; }
  `],
  template: `
    <div class="card">
      <p class="intro">Rate the session — your ratings are anonymous, only the aggregate is shared with the facilitator.</p>
      @for (p of prompts; track p.id) {
        <div class="prompt">
          <div class="p-text">{{ p.text }}</div>
          <div class="stars">
            @for (n of stars; track n) {
              <span class="star" [class.on]="(p.myScore ?? 0) >= n" [class.disabled]="!interactive"
                    (click)="rate(p, n)">★</span>
            }
            @if (p.myScore) { <span class="score">{{ p.myScore }}/5</span> }
          </div>
          <textarea rows="2" [placeholder]="p.myScore ? 'Optional comment…' : 'Rate first, then add a comment'"
                    [disabled]="!interactive || !p.myScore" [(ngModel)]="comments[p.id]"
                    (blur)="comment(p)"></textarea>
        </div>
      }
      @if (allRated()) { <div class="done">✓ Thanks — your feedback has been recorded. You can still adjust it above.</div> }
    </div>
  `,
})
export class GuestRetroReflectComponent {
  @Input({ required: true })
  set prompts(value: RetroBoardFeedbackPrompt[]) {
    this._prompts = value;
    // Seed each comment draft once from the stored response, so in-progress typing survives the board
    // refreshes that follow every rating without clobbering what the guest is mid-way through writing.
    for (const p of value) if (this.comments[p.id] === undefined) this.comments[p.id] = p.myComment ?? '';
  }
  get prompts(): RetroBoardFeedbackPrompt[] { return this._prompts; }
  private _prompts: RetroBoardFeedbackPrompt[] = [];

  /** When false (an action in flight), the controls are disabled. */
  @Input() interactive = true;

  @Output() respond = new EventEmitter<GuestFeedbackResponse>();

  readonly stars = [1, 2, 3, 4, 5];
  comments: Record<string, string> = {};

  allRated(): boolean {
    return this._prompts.length > 0 && this._prompts.every(p => p.myScore != null);
  }

  rate(p: RetroBoardFeedbackPrompt, score: number) {
    if (!this.interactive) return;
    this.respond.emit({ promptId: p.id, score, comment: (this.comments[p.id] || '').trim() || null });
  }

  // A comment only lands once the prompt is rated (the score is required); re-send with the stored score.
  comment(p: RetroBoardFeedbackPrompt) {
    if (!this.interactive || !p.myScore) return;
    this.respond.emit({ promptId: p.id, score: p.myScore, comment: (this.comments[p.id] || '').trim() || null });
  }
}
