import { Component, ChangeDetectionStrategy, inject, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RetroBoardStore } from '../retro-board.store';
import { RETRO_STYLES } from '../retro-board.styles';

// Light, self-contained stylesheet for the printable/PDF version (the app is dark-themed; PDFs read
// better on white). NOTE: this must cover every class the #printArea markup below uses — if you add
// a new element/class to the summary, add its print style here or it renders unstyled in the PDF.
const PRINT_CSS = `
  * { box-sizing:border-box; }
  :root { --surface2:#eceef3; --flag:#8f72ff; --accent:#7d5cff; --border:#e2e3ea; }
  body { font:14px/1.5 system-ui,'Segoe UI',sans-serif; color:#1a1c25; padding:28px; max-width:820px; margin:0 auto; }
  h1 { font-size:22px; margin:0 0 4px; } .sub { color:#6a6e7e; margin:0 0 20px; }
  h3 { font-size:15px; margin:0 0 10px; }
  .card { border:1px solid #e2e3ea; border-radius:12px; padding:16px 18px; margin-bottom:16px; break-inside:avoid; }
  .note { border:1px solid #e6e7ee; border-radius:9px; padding:9px 12px; margin-bottom:8px; background:#fafafb; }
  .muted { color:#6a6e7e; } .lbl { display:block; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#8a8e9c; margin:0 0 6px; }
  .tag, .pill { display:inline-block; font-size:11px; padding:2px 9px; border-radius:20px; background:#eeeefb; color:#5b5b7a; margin:2px; }
  .chips { display:flex; flex-wrap:wrap; gap:5px; margin-top:6px; }
  .stars .star { color:#d8d8e0; } .stars .star.on { color:#f5b544; }
  .bar-row { display:flex; align-items:center; gap:8px; margin:2px 0; }
  .bar-track { flex:1; height:8px; border-radius:4px; background:#eceef3; overflow:hidden; }
  .bar-fill { display:block; height:100%; background:#f5b544; }
  .grid { display:grid; gap:14px; } .g2 { grid-template-columns:1fr 1fr; }
  .row { display:flex; gap:10px; align-items:center; } .between { justify-content:space-between; }
  @page { margin:14mm; }
`;

@Component({
  selector: 'app-retro-summary',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES],
  template: `
    @if (store.session(); as s) {
      <div class="phase-head">
        <div><h1>Summary</h1><p class="sub">{{ s.title }} — recap</p></div>
        <button class="btn ghost" (click)="downloadPdf()" title="Save the summary as a PDF">⤓ Download PDF</button>
      </div>

      <div #printArea>
        <!-- AI summary (work in progress) -->
        <div class="card">
          <div class="row between" style="margin-bottom:12px">
            <h3 style="margin:0">AI Summary <span class="muted" style="font-size:12px;font-weight:400">· work in progress</span></h3>
            @if (store.amFacilitator()) { <button class="btn ghost sm" (click)="store.analyse()" [disabled]="store.analysing()">{{ store.analysing() ? 'Synthesizing…' : (s.aiSummary ? 'Regenerate' : 'Generate') }}</button> }
          </div>
          @if (s.aiSummary; as ai) {
            <div class="grid g2">
              <div><label class="lbl">Strength themes</label>@for (t of ai.strengthThemes; track t) { <span class="pill" style="margin:3px">{{ t }}</span> }</div>
              <div><label class="lbl">Improvement themes</label>@for (t of ai.improveThemes; track t) { <span class="pill" style="margin:3px">{{ t }}</span> }</div>
            </div>
            <label class="lbl" style="margin-top:16px">Key insights</label>@for (t of ai.insights; track t) { <div style="margin:6px 0">◆ {{ t }}</div> }
            <label class="lbl" style="margin-top:16px">Suggested actions</label>@for (t of ai.suggestedActions; track t) { <div style="margin:6px 0">→ {{ t }}</div> }
          } @else {
            <p class="muted">{{ store.amFacilitator() ? 'Generate an AI synthesis of themes, insights and suggested actions.' : 'No AI summary yet.' }}</p>
            @if (store.error()) { <p class="err">{{ store.error() }}</p> }
          }
        </div>

        <!-- Action items -->
        <div class="card"><h3 style="margin:0 0 12px">Action items</h3>
          @for (a of s.actions; track a.id) {
            <div class="note">{{ a.title }}
              @if (a.assigneeMemberIds.length) { <div class="chips">@for (m of a.assigneeMemberIds; track m) { <span class="tag">{{ store.memberName(m) }}</span> }</div> }</div>
          }
          @if (s.actions.length === 0) { <p class="muted">No actions captured.</p> }
        </div>

        <!-- Check-in sentiment -->
        <div class="card"><h3 style="margin:0 0 12px">Check-in sentiment</h3>
          @for (q of s.checkinQuestions; track q.id) {
            <div style="margin-bottom:10px"><div style="font-size:13px;margin-bottom:4px">{{ q.text }}</div>
              <div class="row" style="height:16px;border-radius:5px;overflow:hidden;background:var(--surface2);gap:0">
                <span [style.width.%]="store.pct(q.better,q)" style="background:#34d67f"></span>
                <span [style.width.%]="store.pct(q.same,q)" style="background:#f5b544"></span>
                <span [style.width.%]="store.pct(q.worse,q)" style="background:#f4566b"></span>
              </div></div>
          }
          @if (s.checkinQuestions.length === 0) { <p class="muted">No check-in questions.</p> }
        </div>

        <!-- Notes grouped by theme -->
        <div class="card"><h3 style="margin:0 0 12px">Notes</h3>
          @for (c of s.columns; track c.id) {
            @if (store.notesFor(c.id).length) {
              <div style="margin-bottom:14px">
                <div style="font-weight:600;font-size:13px" [style.color]="c.color">{{ c.label }}</div>
                @for (n of store.notesFor(c.id); track n.id) {
                  <div class="note">{{ n.text }}
                    <div class="muted" style="font-size:12px;margin-top:4px">{{ n.isAnonymous ? 'anon' : n.authorName }}@if (n.voteCount) { <span> · {{ n.voteCount }} vote{{ n.voteCount === 1 ? '' : 's' }}</span> }</div>
                  </div>
                }
              </div>
            }
          }
          @if (s.notes.length === 0) { <p class="muted">No notes captured.</p> }
        </div>

        <!-- Session feedback -->
        @if (s.feedbackPrompts.length) {
          <div class="card"><h3 style="margin:0 0 4px">Session feedback</h3>
            @if (store.amFacilitator()) {
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
            } @else {
              <p class="muted" style="margin:0 0 14px">Your ratings — anonymous, only the aggregate is shared with the facilitator.</p>
              @for (p of s.feedbackPrompts; track p.id) {
                <div class="row between" style="margin-bottom:10px">
                  <div style="font-weight:600">{{ p.text }}</div>
                  <span class="stars sm">@for (n of store.starScale; track n) { <span class="star" [class.on]="(p.myScore ?? 0) >= n">★</span> }</span>
                </div>
              }
            }
          </div>
        }
      </div>
    }
  `,
})
export class RetroSummaryComponent {
  store = inject(RetroBoardStore);
  private snackBar = inject(MatSnackBar);
  private printArea = viewChild<ElementRef<HTMLElement>>('printArea');

  /** Open the recap in a clean, light, self-contained window and hand off to the browser's
   *  print dialog (which offers "Save as PDF"). Avoids pulling in a PDF library. */
  downloadPdf() {
    const el = this.printArea()?.nativeElement;
    if (!el) return;
    const title = this.store.session()?.title || 'Retro';
    const w = window.open('', '_blank', 'width=920,height=1200');
    if (!w) { this.snackBar.open('Couldn’t open the print view — allow pop-ups for this site and try again.', 'Close', { duration: 5000 }); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${this.escape(title)} — Summary</title>`
      + `<style>${PRINT_CSS}</style></head><body>`
      + `<h1>${this.escape(title)}</h1><p class="sub">Retro summary</p>${el.innerHTML}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  }

  private escape(s: string) {
    return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] || c));
  }
}
