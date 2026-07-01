import { Injectable, computed, inject, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { FeatureAccessService } from '../services/feature-access.service';
import { NavItem } from './nav.types';

const ALL_PRIMARY_NAV: NavItem[] = [
  { path: '/dashboard',      icon: 'dashboard',       label: 'Dashboard',    featureKey: 'dashboard' },
  { path: '/delivery',       icon: 'rocket_launch',   label: 'Delivery',     featureKey: 'features' },
  { path: '/discussion',     icon: 'forum',           label: 'Discussion',   featureKey: 'discussion' },
  { path: '/meetings',       icon: 'event',           label: 'Meetings',     featureKey: 'meetings' },
  { path: '/team',           icon: 'people',          label: 'Team',         featureKey: 'team' },
  { path: '/pulse',          icon: 'favorite',        label: 'Pulse',        featureKey: 'fun-hub' },
  { path: '/games',          icon: 'sports_esports',  label: 'Games',        featureKey: 'fun-hub' },
];

const ALL_SECONDARY_NAV: NavItem[] = [
  { path: '/integrations', icon: 'hub',      label: 'Integrations', featureKey: 'settings' },
  { path: '/settings',     icon: 'settings', label: 'Settings',     featureKey: 'settings' },
  { path: '/profile',      icon: 'person',   label: 'Profile' },
];

const ALL_BOTTOM_NAV: NavItem[] = [
  { path: '/dashboard',      icon: 'dashboard',       label: 'Dashboard',    featureKey: 'dashboard' },
  { path: '/delivery',       icon: 'rocket_launch',   label: 'Delivery',     featureKey: 'features' },
  { path: '/team/timesheet', icon: 'schedule',        label: 'Timesheet',    featureKey: 'team' },
  { path: '/team/members',   icon: 'people',          label: 'Team',         featureKey: 'team' },
];

const ALL_MORE_NAV: NavItem[] = [
  { path: '/delivery',       icon: 'rocket_launch',  label: 'Delivery',      featureKey: 'features' },
  { path: '/discussion',     icon: 'forum',          label: 'Discussion',    featureKey: 'discussion' },
  { path: '/meetings',       icon: 'event',          label: 'Meetings',      featureKey: 'meetings' },
  { path: '/pulse',          icon: 'favorite',       label: 'Pulse',         featureKey: 'fun-hub' },
  { path: '/games',          icon: 'sports_esports', label: 'Games',         featureKey: 'fun-hub' },
  { path: '/integrations',   icon: 'hub',            label: 'Integrations',  featureKey: 'settings' },
  { path: '/settings',       icon: 'settings',       label: 'Settings',      featureKey: 'settings' },
  { path: '/profile',        icon: 'person',         label: 'Profile' },
];

@Injectable({ providedIn: 'root' })
export class NavService {
  private featureAccess = inject(FeatureAccessService);
  private router = inject(Router);

  currentUrl = signal(this.router.url);
  expanded = signal(localStorage.getItem('nav-expanded') === 'true');
  hideNav = signal(false);
  /** Hides just a hub's own sub-nav tabs (e.g. Pulse's tab row) to save space, unlike hideNav which hides the whole app shell. */
  hideSubNav = signal(false);

  isLoginPage = computed(() => this.currentUrl() === '/login');
  isMoreActive = computed(() => ALL_MORE_NAV.some(item => this.currentUrl().startsWith(item.path)));

  primaryNav = computed(() => this.filterNav(ALL_PRIMARY_NAV));
  secondaryNav = computed(() => this.filterNav(ALL_SECONDARY_NAV));
  bottomNav = computed(() => this.filterNav(ALL_BOTTOM_NAV));
  moreNav = computed(() => this.filterNav(ALL_MORE_NAV));

  constructor() {
    this.router.events.subscribe(e => {
      if (e instanceof NavigationEnd) this.currentUrl.set(e.urlAfterRedirects);
    });
  }

  toggleExpanded() {
    const next = !this.expanded();
    this.expanded.set(next);
    localStorage.setItem('nav-expanded', String(next));
  }

  private filterNav(items: NavItem[]): NavItem[] {
    return items.filter(item => !item.featureKey || this.featureAccess.hasAccess(item.featureKey));
  }
}
