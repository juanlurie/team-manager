import { Component, signal, ChangeDetectionStrategy } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { SearchesSectionComponent } from './sections/searches-section.component';
import { TuiSectionComponent } from './sections/tui-section.component';
import { McpSectionComponent } from './sections/mcp-section.component';
import { FeaturesSectionComponent } from './sections/features-section.component';

type TabId = 'searches' | 'tui' | 'mcp' | 'features';

interface TabDef {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: TabDef[] = [
  { id: 'searches', label: 'Searches', icon: 'search' },
  { id: 'tui', label: 'TUI', icon: 'terminal' },
  { id: 'mcp', label: 'MCP', icon: 'api' },
  { id: 'features', label: 'Features', icon: 'view_module' },
];

@Component({
  selector: 'app-features-showcase',
  standalone: true,
  imports: [
    MatIconModule,
    SearchesSectionComponent,
    TuiSectionComponent,
    McpSectionComponent,
    FeaturesSectionComponent
],
  template: `
    <div class="showcase">
      <div class="page-header">
        <mat-icon class="header-icon">auto_awesome</mat-icon>
        <h1 class="page-title">System Showcase</h1>
        <p class="page-subtitle">Explore the capabilities and features of the Team Manager platform.</p>
      </div>

      <nav class="showcase-tabs" role="tablist">
        @for (tab of tabs; track tab.id) {
          <button class="showcase-tab" [class.active]="activeTab() === tab.id"
                  (click)="activeTab.set(tab.id)" role="tab">
            <mat-icon class="tab-icon">{{ tab.icon }}</mat-icon>
            {{ tab.label }}
          </button>
        }
      </nav>

      <div class="showcase-content">
        @switch (activeTab()) {
          @case ('searches') { <app-searches-section /> }
          @case ('tui') { <app-tui-section /> }
          @case ('mcp') { <app-mcp-section /> }
          @case ('features') { <app-features-section /> }
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .showcase { max-width: 1200px; margin: 0 auto; }

    .page-header {
      margin-bottom: 16px;
    }
    .header-icon { font-size: 28px; width: 28px; height: 28px; color: #64b5f6; }
    .page-title { font-size: 1.3rem; font-weight: 700; color: rgba(255,255,255,0.9); margin: 8px 0 4px; display: flex; align-items: center; gap: 12px; }
    .page-subtitle { font-size: 0.85rem; color: rgba(255,255,255,0.4); margin: 0 0 20px; }

    .showcase-tabs {
      display: flex; gap: 0; margin-bottom: 24px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      overflow-x: auto; scrollbar-width: none;
    }
    .showcase-tabs::-webkit-scrollbar { display: none; }
    .showcase-tab {
      display: flex; align-items: center; gap: 6px;
      padding: 12px 20px; font-size: 0.85rem; font-weight: 500;
      color: rgba(255,255,255,0.45); border: none; background: none;
      border-bottom: 2px solid transparent; cursor: pointer;
      transition: all 0.15s; white-space: nowrap; font-family: inherit;
    }
    .showcase-tab:hover { color: rgba(255,255,255,0.75); background: rgba(255,255,255,0.04); }
    .showcase-tab.active { color: #64b5f6; border-bottom-color: #64b5f6; }
    .tab-icon { font-size: 18px; width: 18px; height: 18px; }

    .showcase-content { min-height: 300px; }
  `],
})
export class FeaturesShowcaseComponent {
  tabs = TABS;
  activeTab = signal<TabId>('searches');
}
