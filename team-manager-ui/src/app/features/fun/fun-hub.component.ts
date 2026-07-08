import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';

import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FeatureAccessService } from '../../core/services/feature-access.service';
import { NavService } from '../../core/nav/nav.service';

interface FunTab {
  label: string;
  route: string;
  featureKey: string;
}

const FUN_TABS: FunTab[] = [
  { label: 'Win of the Week', route: 'win-of-the-week', featureKey: 'win-of-week' },
  { label: 'Coffee Run', route: 'coffee-run', featureKey: 'coffee-run' },
  { label: 'Spin Wheel', route: 'wheel', featureKey: 'wheel' },
  { label: 'Scrum Poker', route: 'scrum-poker', featureKey: 'scrum-poker' },
  { label: 'Polls', route: 'polls', featureKey: 'polls' },
  { label: 'Retro', route: 'retro', featureKey: 'retro' },
  { label: 'Process Flows', route: 'process-flows', featureKey: 'process-flows' },
  { label: 'Personal Maps', route: 'personal-maps', featureKey: 'personal-maps' },
  { label: 'Jokes', route: 'jokes', featureKey: 'jokes' },
];

@Component({
  selector: 'app-pulse-hub',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="hub" [class.immersive]="nav.hideNav() || nav.hideSubNav()">
      @if (!nav.hideNav() && !nav.hideSubNav()) {
        <nav class="hub-tabs" role="tablist">
          @for (tab of visibleTabs(); track tab.route) {
            <a class="hub-tab" [routerLink]="tab.route" routerLinkActive="active" role="tab">{{ tab.label }}</a>
          }
        </nav>
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
    .hub-tabs {
      display:flex;gap:0;margin-bottom:16px;
      border-bottom:1px solid rgba(255,255,255,0.08);
      overflow-x:auto;scrollbar-width:none;
      -ms-overflow-style:none;
    }
    .hub-tabs::-webkit-scrollbar { display:none; }
    .hub-tab {
      padding:12px 16px;font-size:0.85rem;font-weight:500;
      color:rgba(255,255,255,0.45);text-decoration:none;
      border-bottom:2px solid transparent;
      transition:all 0.15s;white-space:nowrap;cursor:pointer;
      font-family:inherit;background:none;border-top:none;border-left:none;border-right:none;
    }
    .hub-tab:hover { color:rgba(255,255,255,0.75);background:rgba(255,255,255,0.04); }
    .hub-tab.active { color:#64b5f6;border-bottom-color:#64b5f6; }
    .hub-tab:focus-visible { outline:2px solid #64b5f6;outline-offset:-2px; }
    .hub-content { min-height:200px; }
  `]
})
export class PulseHubComponent {
  private featureAccess = inject(FeatureAccessService);
  nav = inject(NavService);
  visibleTabs = computed(() => FUN_TABS.filter(t => this.featureAccess.hasAccess(t.featureKey)));
}
