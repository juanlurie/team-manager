import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PollDetail } from '../../../core/models/poll.model';

/**
 * The vote / results half of a poll, without any page or dialog chrome around it. Shared by the
 * Polls page and the popup that fires when someone starts a poll, so both stay identical as the
 * voting rules (hidden results, creator peek, changing a vote) evolve.
 */
@Component({
  selector: 'app-poll-body',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .option-btn {
      width:100%;margin-bottom:10px;padding:14px 16px;height:auto;white-space:normal;
      text-align:left;justify-content:flex-start;align-items:center;display:flex;gap:10px;
      border:1.5px solid rgba(100,181,246,0.35);background:rgba(100,181,246,0.07);
      border-radius:10px;font-size:0.95rem;font-weight:500;transition:all 0.15s ease;
    }
    .option-btn:hover { background:rgba(100,181,246,0.16);border-color:#64b5f6;transform:translateY(-1px) }
    .option-btn .option-icon { opacity:0.55;flex-shrink:0;color:#64b5f6 }
    .vote-prompt { font-size:0.78rem;opacity:0.65;margin-bottom:10px }
    .result-row { margin-bottom:10px }
    .result-label { display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:4px }
    .result-label.mine { color:#64b5f6;font-weight:600 }
    .result-bar-track { height:8px;border-radius:4px;background:rgba(255,255,255,0.08);overflow:hidden }
    .result-bar-fill { height:100%;border-radius:4px;background:linear-gradient(90deg,#64b5f6,#81c784);transition:width 0.3s ease }
    .total-votes { font-size:0.72rem;opacity:0.45;margin-top:12px }
    .hidden-results { font-size:0.82rem;opacity:0.6;text-align:center;padding:16px;background:rgba(255,255,255,0.03);border-radius:8px }
    .peek-banner { font-size:0.75rem;opacity:0.7;margin-bottom:10px;padding:8px 10px;background:rgba(100,181,246,0.08);border-radius:6px }
    .inline-icon { font-size:14px;width:14px;height:14px;line-height:14px;vertical-align:-2px;color:#64b5f6 }
  `],
  template: `
    @let p = poll();
    @if (!p.isClosed && p.myOptionId === null) {
      <div class="vote-prompt"><mat-icon class="inline-icon">touch_app</mat-icon> Tap an option below to cast your vote</div>
      @for (opt of p.options; track opt.id) {
        <button mat-stroked-button class="option-btn" (click)="voted.emit(opt.id)">
          <mat-icon class="option-icon">radio_button_unchecked</mat-icon>
          <span>{{ opt.text }}</span>
        </button>
      }
    } @else if (!p.resultsVisible) {
      <div class="hidden-results">
        <mat-icon class="inline-icon">lock</mat-icon> You voted for <strong>{{ myVoteText(p) }}</strong>. Results are hidden until the poll closes.
      </div>
      <div style="display:flex;gap:4px;margin-top:8px">
        <button mat-button style="font-size:0.75rem;opacity:0.6" (click)="changeVoteRequested.emit()">Change my vote</button>
        @if (p.isCreator) {
          <button mat-button style="font-size:0.75rem;opacity:0.6" (click)="peekToggled.emit(true)">
            <mat-icon class="inline-icon">visibility</mat-icon> Peek at results
          </button>
        }
      </div>
    } @else {
      @if (p.isPeekingAsCreator) {
        <div class="peek-banner">
          <mat-icon class="inline-icon">visibility</mat-icon> Only you can see this — results stay hidden from everyone else.
        </div>
      }
      @for (opt of p.options; track opt.id) {
        <div class="result-row">
          <div class="result-label" [class.mine]="opt.id === p.myOptionId">
            <span>{{ opt.text }} @if (opt.id === p.myOptionId) { — your vote }</span>
            <span>{{ opt.voteCount }} ({{ opt.percentage }}%)</span>
          </div>
          <div class="result-bar-track"><div class="result-bar-fill" [style.width]="opt.percentage + '%'"></div></div>
        </div>
      }
      <div style="display:flex;gap:4px;margin-top:4px">
        @if (p.isPeekingAsCreator) {
          <button mat-button style="font-size:0.75rem;opacity:0.6" (click)="peekToggled.emit(false)">
            <mat-icon class="inline-icon">visibility_off</mat-icon> Stop peeking
          </button>
        } @else if (!p.isClosed) {
          <button mat-button style="font-size:0.75rem;opacity:0.6" (click)="changeVoteRequested.emit()">Change my vote</button>
        }
      </div>
    }

    @if (p.resultsVisible) {
      <div class="total-votes">{{ p.totalVotes }} total vote{{ p.totalVotes === 1 ? '' : 's' }}</div>
    } @else if (p.hideResultsUntilClosed && !p.isClosed) {
      <div class="total-votes">Results will be revealed when the poll closes</div>
    }
  `
})
export class PollBodyComponent {
  poll = input.required<PollDetail>();

  voted = output<string>();
  changeVoteRequested = output<void>();
  peekToggled = output<boolean>();

  // Results being hidden only withholds aggregate counts -- a voter should still be able to
  // see which option they themselves picked, even though option.voteCount/percentage are
  // zeroed out server-side while hidden.
  myVoteText(p: PollDetail): string {
    return p.options.find(o => o.id === p.myOptionId)?.text ?? '';
  }
}
