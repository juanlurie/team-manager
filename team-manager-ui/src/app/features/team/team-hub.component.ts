import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';

import { RouterOutlet } from '@angular/router';
import { FeatureAccessService } from '../../core/services/feature-access.service';
import { HubTabsComponent, HubTab } from '../../shared/components/hub-tabs/hub-tabs.component';

interface TeamTab extends HubTab {
  featureKey: string;
}

const TEAM_TABS: TeamTab[] = [
  { label: 'Members',            route: 'members',             featureKey: 'team' },
  { label: 'Timesheet',          route: 'timesheet',           featureKey: 'team' },
  { label: 'Timesheet Approval', route: 'timesheet-approval',  featureKey: 'team' },
  { label: 'Leave',              route: 'leave',               featureKey: 'leave' },
  { label: 'Expenses',           route: 'expense-claim',       featureKey: 'expense-claim' },
  { label: 'Access Requests',    route: 'access-requests',     featureKey: 'access-requests' },
];

@Component({
  selector: 'app-team-hub',
  standalone: true,
  imports: [RouterOutlet, HubTabsComponent],
  template: `
    <div class="hub">
      <app-hub-tabs [tabs]="visibleTabs()" />
      <div class="hub-content">
        <router-outlet />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .hub { max-width:1100px;margin:0 auto;padding:8px; }
    .hub-content { min-height:200px; }
  `]
})
export class TeamHubComponent {
  private featureAccess = inject(FeatureAccessService);
  visibleTabs = computed(() => TEAM_TABS.filter(t => this.featureAccess.hasAccess(t.featureKey)));
}
