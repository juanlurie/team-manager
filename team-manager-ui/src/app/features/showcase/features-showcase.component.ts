import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SearchesSectionComponent } from './sections/searches-section.component';
import { TuiSectionComponent } from './sections/tui-section.component';
import { McpSectionComponent } from './sections/mcp-section.component';
import { FeaturesSectionComponent } from './sections/features-section.component';
import { ShowcaseDataService } from './services/showcase-data.service';
import { SystemStats } from './models/showcase.model';

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
    CommonModule,
    MatIconModule,
    SearchesSectionComponent,
    TuiSectionComponent,
    McpSectionComponent,
    FeaturesSectionComponent,
  ],
  template: `
    <div class="showcase">
      <div class="page-header">
        <mat-icon class="header-icon">auto_awesome</mat-icon>
        <h1 class="page-title">System Showcase</h1>
      </div>

      <div class="stats-bar" *ngIf="stats(); else statsLoading">
        <div class="stat-pill">
          <span class="stat-num">{{ stats()!.activeMembers }}</span>
          <span class="stat-label">Members</span>
        </div>
        <div class="stat-pill">
          <span class="stat-num">{{ stats()!.sprints }}</span>
          <span class="stat-label">Sprints</span>
        </div>
        <div class="stat-pill">
          <span class="stat-num">{{ stats()!.pis }}</span>
          <span class="stat-label">PIs</span>
        </div>
        <div class="stat-pill">
          <span class="stat-num">{{ stats()!.squads }}</span>
          <span class="stat-label">Squads</span>
        </div>
        <div class="stat-pill">
          <span class="stat-num">{{ stats()!.features }}</span>
          <span class="stat-label">Features</span>
        </div>
        <div class="stat-pill">
          <span class="stat-num">{{ stats()!.meetingSeries }}</span>
          <span class="stat-label">Meeting Series</span>
        </div>
        <div class="stat-pill">
          <span class="stat-num">{{ stats()!.discussionPoints }}</span>
          <span class="stat-label">Discussions</span>
        </div>
        <div class="stat-pill">
          <span class="stat-num">{{ stats()!.wheels }}</span>
          <span class="stat-label">Wheels</span>
        </div>
        <div class="stat-pill">
          <span class="stat-num">130+</span>
          <span class="stat-label">MCP Tools</span>
        </div>
        <div class="stat-pill">
          <span class="stat-num">4</span>
          <span class="stat-label">TUI Screens</span>
        </div>
      </div>
      <ng-template #statsLoading>
        <div class="stats-bar stats-bar-loading">
          @for (_ of [1,2,3,4,5,6,7,8,9,10]; track _) {
            <div class="stat-pill stat-pill-loading">
              <div class="stat-num stat-num-loading"></div>
              <div class="stat-label stat-label-loading"></div>
            </div>
          }
        </div>
      </ng-template>

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
          @case ('features') { @if (stats()) { <app-features-section [stats]="stats()!" /> } }
        }
      </div>
    </div>
  `,
  styles: [`
    .showcase { max-width: 1200px; margin: 0 auto; }

    .page-header {
      display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
    }
    .header-icon { font-size: 28px; width: 28px; height: 28px; color: #64b5f6; }
    .page-title { font-size: 1.3rem; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0; }

    .stats-bar {
      display: flex; flex-wrap: wrap; gap: 10px; padding: 14px 16px;
      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px; margin-bottom: 20px;
    }
    .stats-bar-loading { opacity: 0.5; }
    .stat-pill {
      display: flex; flex-direction: column; align-items: center;
      padding: 6px 14px; background: rgba(255,255,255,0.03); border-radius: 8px;
      min-width: 80px;
    }
    .stat-num { font-size: 1.15rem; font-weight: 700; color: #64b5f6; }
    .stat-label { font-size: 0.65rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.04em; margin-top: 2px; }

    .stat-num-loading {
      width: 30px; height: 18px; background: rgba(255,255,255,0.08); border-radius: 4px;
    }
    .stat-label-loading {
      width: 40px; height: 8px; background: rgba(255,255,255,0.05); border-radius: 3px; margin-top: 4px;
    }

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
export class FeaturesShowcaseComponent implements OnInit {
  private svc = inject(ShowcaseDataService);
  tabs = TABS;
  activeTab = signal<TabId>('searches');
  stats = signal<SystemStats | null>(null);

  ngOnInit() {
    this.svc.getSystemStats().subscribe(s => this.stats.set(s));
  }
}
