import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';

import { RouterOutlet } from '@angular/router';
import { FeatureAccessService } from '../../core/services/feature-access.service';
import { NavService } from '../../core/nav/nav.service';
import { HubTabsComponent, HubTab } from '../../shared/components/hub-tabs/hub-tabs.component';

interface PulseTab extends HubTab {
  featureKey: string;
}

// Kept to team rituals. Process flows live under Delivery, personal map boards under the
// individual team member, and the two retro variants behind the nested Retro hub.
const PULSE_TABS: PulseTab[] = [
  { label: 'Win of the Week', route: 'win-of-the-week', featureKey: 'win-of-week' },
  { label: 'Coffee Run', route: 'coffee-run', featureKey: 'coffee-run' },
  { label: 'Spin Wheel', route: 'wheel', featureKey: 'wheel' },
  { label: 'Scrum Poker', route: 'scrum-poker', featureKey: 'scrum-poker' },
  { label: 'Polls', route: 'polls', featureKey: 'polls' },
  { label: 'Retro', route: 'retro', featureKey: 'retro' },
  { label: 'Jokes', route: 'jokes', featureKey: 'jokes' },
];

@Component({
  selector: 'app-pulse-hub',
  standalone: true,
  imports: [RouterOutlet, HubTabsComponent],
  template: `
    <div class="hub" [class.immersive]="nav.hideNav() || nav.hideSubNav()">
      @if (!nav.hideNav() && !nav.hideSubNav()) {
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
export class PulseHubComponent {
  private featureAccess = inject(FeatureAccessService);
  nav = inject(NavService);
  visibleTabs = computed(() => PULSE_TABS.filter(t => this.featureAccess.hasAccess(t.featureKey)));
}
