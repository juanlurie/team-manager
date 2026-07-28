import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';

import { RouterOutlet } from '@angular/router';
import { FeatureAccessService } from '../../core/services/feature-access.service';
import { NavService } from '../../core/nav/nav.service';
import { HubTabsComponent, HubTab } from '../../shared/components/hub-tabs/hub-tabs.component';

interface GamesTab extends HubTab {
  featureKey: string;
}

const GAMES_TABS: GamesTab[] = [
  { label: 'Wordle', route: 'wordle', featureKey: 'wordle' },
  { label: 'Quiz Game', route: 'quiz-game', featureKey: 'quiz-game' },
  { label: 'Dots & Boxes', route: 'dots-and-boxes', featureKey: 'dots-and-boxes' },
  { label: '2048', route: '2048', featureKey: '2048' },
  { label: 'Threes', route: 'threes', featureKey: 'threes' },
  { label: 'Tic Tac Toe', route: 'ultimate-ttt', featureKey: 'ultimate-ttt' },
  { label: 'Connections', route: 'connections', featureKey: 'connections' },
  { label: 'Leaderboard', route: 'leaderboard', featureKey: 'leaderboard' },
];

@Component({
  selector: 'app-games-hub',
  standalone: true,
  imports: [RouterOutlet, HubTabsComponent],
  template: `
    <div class="hub" [class.immersive]="nav.hideNav()">
      @if (!nav.hideNav()) {
        <app-hub-tabs [tabs]="visibleTabs()" />
      }
      <div class="hub-content">
        <router-outlet />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .hub { max-width:900px;margin:0 auto;padding:8px; }
    .hub.immersive { padding:0;max-width:100% }
    .hub.immersive .hub-content { min-height:0 }
    .hub-content { min-height:200px; }
  `]
})
export class GamesHubComponent {
  private featureAccess = inject(FeatureAccessService);
  nav = inject(NavService);
  visibleTabs = computed(() => GAMES_TABS.filter(t => this.featureAccess.hasAccess(t.featureKey)));
}
