import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';

import { RouterOutlet } from '@angular/router';
import { FeatureAccessService } from '../../core/services/feature-access.service';
import { NavService } from '../../core/nav/nav.service';
import { HubTabsComponent, HubTab } from '../../shared/components/hub-tabs/hub-tabs.component';

interface DeliveryTab extends HubTab {
  featureKey: string;
}

const DELIVERY_TABS: DeliveryTab[] = [
  { label: 'Sprints',       route: 'sprints',       featureKey: 'sprints' },
  { label: 'Features',      route: 'features',      featureKey: 'features' },
  { label: 'Progress',      route: 'progress',      featureKey: 'progress' },
  { label: 'Process Flows', route: 'process-flows', featureKey: 'process-flows' },
  { label: 'Export',        route: 'export',        featureKey: 'export' },
];

@Component({
  selector: 'app-delivery-hub',
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
    .hub { padding:8px; }
    .hub.immersive { padding:0 }
    .hub.immersive .hub-content { min-height:0 }
    .hub-content { min-height:200px; }
  `]
})
export class DeliveryHubComponent {
  private featureAccess = inject(FeatureAccessService);
  nav = inject(NavService);
  visibleTabs = computed(() => DELIVERY_TABS.filter(t => this.featureAccess.hasAccess(t.featureKey)));
}
