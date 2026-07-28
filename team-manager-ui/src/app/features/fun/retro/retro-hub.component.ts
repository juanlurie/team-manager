import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavService } from '../../../core/nav/nav.service';
import { HubTabsComponent, HubTab } from '../../../shared/components/hub-tabs/hub-tabs.component';

// The two retro variants (classic timed retro and the freeform board) plus theme admin, split off
// the Pulse tab row so Pulse only carries one "Retro" entry.
const RETRO_TABS: HubTab[] = [
  { label: 'Retro', route: 'classic' },
  { label: 'RetroBoard', route: 'board' },
  { label: 'Themes', route: 'themes' },
];

@Component({
  selector: 'app-retro-hub',
  standalone: true,
  imports: [RouterOutlet, HubTabsComponent],
  template: `
    <!-- Same hideSubNav signal the Pulse hub honours: an open board hides both tab rows. -->
    @if (!nav.hideNav() && !nav.hideSubNav()) {
      <app-hub-tabs [tabs]="tabs" />
    }
    <router-outlet />
  `,
  changeDetection: ChangeDetectionStrategy.Default,
})
export class RetroHubComponent {
  nav = inject(NavService);
  readonly tabs = RETRO_TABS;
}
