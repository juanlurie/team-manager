import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';

import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { FeatureAccessService } from '../../core/services/feature-access.service';

interface DeliveryTab {
  label: string;
  route: string;
  featureKey: string;
}

const DELIVERY_TABS: DeliveryTab[] = [
  { label: 'Sprints',  route: 'sprints',  featureKey: 'sprints' },
  { label: 'Features', route: 'features', featureKey: 'features' },
  { label: 'Progress', route: 'progress', featureKey: 'progress' },
  { label: 'Export',   route: 'export',   featureKey: 'export' },
];

@Component({
  selector: 'app-delivery-hub',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="hub">
      <nav class="hub-tabs" role="tablist">
        @for (tab of visibleTabs(); track tab.route) {
          <a class="hub-tab" [routerLink]="tab.route" routerLinkActive="active" role="tab">{{ tab.label }}</a>
        }
      </nav>
      <div class="hub-content">
        <router-outlet />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    .hub { max-width:900px;margin:0 auto;padding:8px; }
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
export class DeliveryHubComponent {
  private featureAccess = inject(FeatureAccessService);
  visibleTabs = computed(() => DELIVERY_TABS.filter(t => this.featureAccess.hasAccess(t.featureKey)));
}
