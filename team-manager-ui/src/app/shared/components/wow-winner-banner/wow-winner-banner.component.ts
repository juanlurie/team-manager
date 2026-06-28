import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AiBadgeComponent } from '../ai-badge/ai-badge.component';

@Component({
  selector: 'app-wow-winner-banner',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, AiBadgeComponent],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div style="background:linear-gradient(135deg,rgba(255,215,0,0.12),rgba(255,165,0,0.08));border:1px solid rgba(255,215,0,0.35);border-radius:14px;padding:20px 24px;margin-bottom:20px;text-align:center">
      <div style="font-size:2.4rem;margin-bottom:4px">🏆</div>
      <div style="font-size:1.2rem;font-weight:800;color:#FFD700">{{winnerNomineeName()}}</div>
      @if (winnerTitle()) {
        <div style="font-size:0.95rem;opacity:0.8;margin-top:4px">{{winnerTitle()}}</div>
      }
      @if (showPoints()) {
        <div style="margin-top:12px;display:inline-block;background:rgba(255,215,0,0.15);border:1px solid rgba(255,215,0,0.4);border-radius:8px;padding:8px 14px">
          <span style="font-size:0.85rem;font-weight:700;color:#B8860B">🏅 Weekly Champion +10 points</span>
        </div>
      }
      @if (winnerStory()) {
        <div style="margin-top:16px;background:rgba(0,0,0,0.25);border:1px solid rgba(255,215,0,0.2);border-radius:10px;padding:14px 16px;text-align:left">
          <div style="font-size:0.7rem;text-transform:uppercase;letter-spacing:1px;color:#FFD700;opacity:0.7;margin-bottom:8px">✨ Hero Story<app-ai-badge /></div>
          <div style="font-size:0.88rem;line-height:1.6;opacity:0.85;white-space:pre-wrap">{{winnerStory()}}</div>
          <button mat-stroked-button (click)="copyStory.emit(winnerStory()!)"
                  style="margin-top:10px;font-size:0.75rem;height:28px;line-height:28px;min-width:0;padding:0 12px;color:rgba(255,215,0,0.8);border-color:rgba(255,215,0,0.3)">
            <mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle;margin-right:4px">content_copy</mat-icon>
            Copy story
          </button>
        </div>
      }
      <div style="font-size:0.75rem;opacity:0.45;margin-top:12px">Winner of the Week</div>
    </div>
  `
})
export class WowWinnerBannerComponent {
  winnerNomineeName = input.required<string>();
  winnerTitle = input<string | null>(null);
  winnerStory = input<string | null>(null);
  showPoints = input(true);

  copyStory = output<string>();
}
