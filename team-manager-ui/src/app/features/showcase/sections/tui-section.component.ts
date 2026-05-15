import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ShowcaseDataService } from '../services/showcase-data.service';
import { TuiScreen, TuiKeyBinding } from '../models/showcase.model';

@Component({
  selector: 'app-tui-section',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">Terminal UI (TUI)</h2>
        <p class="section-desc">A full-featured terminal application for managing sprints directly from your command line. Perfect for quick updates, standup prep, or when you prefer keyboard-driven workflows.</p>
      </div>
      <div class="meta-bar">
        <span class="meta-item"><mat-icon>code</mat-icon> Framework: Textual (Python)</span>
        <span class="meta-item"><mat-icon>terminal</mat-icon> Entry: <code>python tui/app.py</code></span>
        <span class="meta-item"><mat-icon>link</mat-icon> API: <code>TEAM_MANAGER_API_URL</code> env var</span>
      </div>

      <h3 class="subsection-title">Screens</h3>
      <div class="screens-row">
        @for (screen of screens; track screen.name) {
          <div class="screen-card">
            <mat-icon class="screen-icon">{{ screen.icon }}</mat-icon>
            <span class="screen-name">{{ screen.name }}</span>
            <p class="screen-desc">{{ screen.description }}</p>
            <code class="screen-file">{{ screen.file }}</code>
          </div>
        }
      </div>

      <div class="bottom-grid">
        <div class="key-bindings">
          <h3 class="subsection-title">Key Bindings</h3>
          <div class="key-table">
            <div class="key-row">
              <span class="key-label">Key</span>
              <span class="key-action">Action</span>
            </div>
            @for (kb of keyBindings; track kb.key) {
              <div class="key-row">
                <span class="key-chords">
                  <kbd class="key-chord">{{ kb.key }}</kbd>
                  @if (kb.macKey && kb.macKey !== kb.key) {
                    <span class="key-or">or</span>
                    <kbd class="key-chord mac">{{ kb.macKey }}</kbd>
                  }
                </span>
                <span class="key-action">{{ kb.action }}</span>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .section { padding: 8px 0; }
    .section-title { font-size: 1.1rem; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 6px; }
    .section-desc { font-size: 0.82rem; color: rgba(255,255,255,0.45); margin: 0 0 12px; line-height: 1.5; }

    .meta-bar {
      display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;
      padding: 12px 16px; background: rgba(255,255,255,0.02); border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .meta-item {
      display: flex; align-items: center; gap: 6px; font-size: 0.78rem;
      color: rgba(255,255,255,0.55);
    }
    .meta-item mat-icon { font-size: 16px; width: 16px; height: 16px; color: #64b5f6; }
    .meta-item code {
      background: rgba(100,181,246,0.1); color: #64b5f6; padding: 1px 6px;
      border-radius: 3px; font-size: 0.75rem; font-family: 'SF Mono', 'Fira Code', monospace;
    }

    .subsection-title { font-size: 0.95rem; font-weight: 600; color: rgba(255,255,255,0.7); margin: 0 0 12px; }

    .screens-row {
      display: flex; gap: 14px; overflow-x: auto; padding-bottom: 8px; margin-bottom: 28px;
      scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent;
    }
    .screen-card {
      flex: 0 0 200px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px; padding: 18px; display: flex; flex-direction: column; align-items: center;
      text-align: center; transition: background 0.15s;
    }
    .screen-card:hover { background: rgba(255,255,255,0.05); }
    .screen-icon { font-size: 32px; width: 32px; height: 32px; color: #64b5f6; margin-bottom: 8px; }
    .screen-name { font-size: 0.88rem; font-weight: 600; color: rgba(255,255,255,0.85); margin-bottom: 6px; }
    .screen-desc { font-size: 0.75rem; color: rgba(255,255,255,0.45); margin: 0 0 10px; line-height: 1.4; }
    .screen-file {
      font-size: 0.68rem; color: rgba(100,181,246,0.7); background: rgba(100,181,246,0.08);
      padding: 3px 8px; border-radius: 4px; font-family: 'SF Mono', 'Fira Code', monospace;
    }

    .bottom-grid { display: grid; grid-template-columns: 1fr; gap: 20px; max-width: 600px; }

    .key-table {
      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 8px; overflow: hidden;
    }
    .key-row {
      display: flex; align-items: center; padding: 8px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .key-row:last-child { border-bottom: none; }
    .key-row:first-child { background: rgba(255,255,255,0.03); font-weight: 600; }
    .key-chords { flex: 0 0 160px; display: flex; align-items: center; gap: 6px; }
    .key-chord {
      font-size: 0.78rem; font-weight: 600; color: #64b5f6;
      background: rgba(100,181,246,0.12); padding: 3px 10px; border-radius: 4px;
      font-family: 'SF Mono', 'Fira Code', monospace; text-align: center;
    }
    .key-chord.mac { color: #81c784; background: rgba(129,199,132,0.12); }
    .key-or { font-size: 0.7rem; color: rgba(255,255,255,0.3); }
    .key-label { flex: 0 0 80px; font-size: 0.82rem; color: rgba(255,255,255,0.7); }
    .key-action { flex: 1; font-size: 0.8rem; color: rgba(255,255,255,0.55); }
  `],
})
export class TuiSectionComponent {
  private svc = inject(ShowcaseDataService);
  screens: TuiScreen[] = this.svc.getTuiScreens();
  keyBindings: TuiKeyBinding[] = this.svc.getTuiKeyBindings();
}
