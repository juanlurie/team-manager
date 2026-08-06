import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FunRetroAnalysis } from '../../../core/models/fun-retro.model';

/**
 * Shown as a dialog (not an inline page panel) because the desktop retro view is a full-viewport
 * freeform canvas that captures wheel scroll for zoom -- an inline panel below it was effectively
 * unreachable, so "Analyse with AI" looked like it did nothing even though the analysis had come
 * back and was saved on the session.
 */
@Component({
  selector: 'app-retro-ai-analysis-dialog',
  standalone: true,
  imports: [MatIconModule, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .ai-panel-header { display:flex;align-items:center;gap:8px;margin-bottom:14px; }
    .ai-badge {
      display:inline-flex;align-items:center;gap:4px;
      font-size:0.68rem;font-weight:600;letter-spacing:0.04em;
      padding:3px 8px;border-radius:10px;
      background:rgba(100,181,246,0.15);border:1px solid rgba(100,181,246,0.3);
      color:#64b5f6;
    }
    .ai-panel-title { font-size:0.95rem;font-weight:600;color:rgba(255,255,255,0.85); }
    .ai-section { margin-bottom:14px; }
    .ai-section:last-child { margin-bottom:0; }
    .ai-section-label {
      font-size:0.72rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;
      margin-bottom:6px;opacity:0.6;
    }
    .ai-chips { display:flex;flex-wrap:wrap;gap:6px; }
    .ai-chip {
      font-size:0.78rem;padding:4px 10px;border-radius:14px;
      background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);
      color:rgba(255,255,255,0.8);
    }
    .ai-list { display:flex;flex-direction:column;gap:5px; }
    .ai-list-item {
      font-size:0.82rem;color:rgba(255,255,255,0.75);line-height:1.4;
      padding-left:12px;position:relative;
    }
    .ai-list-item::before { content:'•';position:absolute;left:0;color:rgba(100,181,246,0.6); }
    .ai-sentiment { display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap; }
    .ai-sentiment-chip {
      font-size:0.72rem;font-weight:700;letter-spacing:0.03em;padding:3px 10px;border-radius:12px;
      background:rgba(129,199,132,0.15);border:1px solid rgba(129,199,132,0.4);color:#81c784;
    }
    .ai-sentiment-summary { font-size:0.82rem;color:rgba(255,255,255,0.8); }
    .ai-celebrate-section {
      background:rgba(129,199,132,0.08);border:1px solid rgba(129,199,132,0.25);
      border-radius:8px;padding:10px 12px;margin-bottom:14px;
    }
    .ai-celebrate-item {
      font-size:0.85rem;color:rgba(255,255,255,0.9);line-height:1.4;
      padding-left:20px;position:relative;margin-bottom:4px;
    }
    .ai-celebrate-item:last-child { margin-bottom:0; }
    .ai-celebrate-item::before { content:'🎉';position:absolute;left:0;font-size:0.8rem; }
    .close-row { display:flex;justify-content:flex-end;margin-top:16px; }
  `],
  template: `
    <div mat-dialog-content style="max-width:520px">
      <div class="ai-panel-header">
        <span class="ai-badge"><mat-icon style="font-size:12px;height:12px;width:12px">auto_awesome</mat-icon>AI-generated</span>
        <span class="ai-panel-title">Retro Analysis</span>
      </div>

      @if (data.sentiment) {
        <div class="ai-sentiment">
          <span class="ai-sentiment-chip">{{ data.sentiment }}</span>
          @if (data.sentimentSummary) { <span class="ai-sentiment-summary">{{ data.sentimentSummary }}</span> }
        </div>
      }
      @if (data.celebrations.length) {
        <div class="ai-celebrate-section">
          @for (c of data.celebrations; track c) { <div class="ai-celebrate-item">{{ c }}</div> }
        </div>
      }
      @if (data.wellThemes.length) {
        <div class="ai-section">
          <div class="ai-section-label" style="color:#4caf50">What went well</div>
          <div class="ai-chips">@for (t of data.wellThemes; track t) { <span class="ai-chip">{{ t }}</span> }</div>
        </div>
      }
      @if (data.betterThemes.length) {
        <div class="ai-section">
          <div class="ai-section-label" style="color:#ff9800">Areas to improve</div>
          <div class="ai-chips">@for (t of data.betterThemes; track t) { <span class="ai-chip">{{ t }}</span> }</div>
        </div>
      }
      @if (data.actionThemes.length) {
        <div class="ai-section">
          <div class="ai-section-label" style="color:#e91e8c">Action item themes</div>
          <div class="ai-chips">@for (t of data.actionThemes; track t) { <span class="ai-chip">{{ t }}</span> }</div>
        </div>
      }
      @if (data.keyInsights.length) {
        <div class="ai-section">
          <div class="ai-section-label">Key insights</div>
          <div class="ai-list">@for (i of data.keyInsights; track i) { <div class="ai-list-item">{{ i }}</div> }</div>
        </div>
      }
      @if (data.suggestedActions.length) {
        <div class="ai-section">
          <div class="ai-section-label" style="color:#e91e8c">Suggested actions</div>
          <div class="ai-list">@for (a of data.suggestedActions; track a) { <div class="ai-list-item">{{ a }}</div> }</div>
        </div>
      }
      <div class="close-row">
        <button mat-button (click)="ref.close()">Close</button>
      </div>
    </div>
  `,
})
export class RetroAiAnalysisDialogComponent {
  ref = inject(MatDialogRef<RetroAiAnalysisDialogComponent>);
  data = inject<FunRetroAnalysis>(MAT_DIALOG_DATA);
}
