import { Component, ChangeDetectionStrategy } from '@angular/core';

import { RouterOutlet } from '@angular/router';
import { HubTabsComponent, HubTab } from '../../shared/components/hub-tabs/hub-tabs.component';

const MEETINGS_TABS: HubTab[] = [
  { label: 'Sessions',    route: 'sessions', exact: true },
  { label: 'Series',      route: 'series' },
  { label: 'My Meetings', route: 'my-meetings' },
  { label: 'Settings',    route: 'settings' },
];

@Component({
  selector: 'app-meetings-hub',
  standalone: true,
  imports: [RouterOutlet, HubTabsComponent],
  template: `
    <div class="hub">
      <app-hub-tabs [tabs]="tabs" />
      <div class="hub-content">
        <router-outlet />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .hub { max-width:900px;margin:0 auto;padding:8px; }
    .hub-content { min-height:200px; }
  `]
})
export class MeetingsHubComponent {
  readonly tabs = MEETINGS_TABS;
}
