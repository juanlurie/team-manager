import { Component, signal, computed, HostListener, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, NavigationStart, NavigationCancel, NavigationError } from '@angular/router';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { trigger, animate, style, transition } from '@angular/animations';
import { QuickOpenDialogComponent } from './core/components/quick-open-dialog/quick-open-dialog.component';
import { KPickerData, KPickerResult } from './core/components/k-picker/k-picker.types';
import { GlobalFilterService } from './core/services/global-filter.service';
import { AuthService } from './core/auth/auth.service';
import { FeatureAccessService } from './core/services/feature-access.service';
import { TimesheetDefaultsService } from './core/services/timesheet-defaults.service';
import { NavItem } from './core/nav/nav.types';
import { AppSidebarComponent } from './shared/components/app-sidebar/app-sidebar.component';
import { AppBottomNavComponent } from './shared/components/app-bottom-nav/app-bottom-nav.component';

const ALL_PRIMARY_NAV: NavItem[] = [
  { path: '/dashboard',      icon: 'dashboard',       label: 'Dashboard',    featureKey: 'dashboard' },
  { path: '/delivery',       icon: 'rocket_launch',   label: 'Delivery',     featureKey: 'features' },
  { path: '/discussion',     icon: 'forum',           label: 'Discussion',   featureKey: 'discussion' },
  { path: '/meetings',       icon: 'event',           label: 'Meetings',     featureKey: 'meetings' },
  { path: '/team',           icon: 'people',          label: 'Team',         featureKey: 'team' },
  { path: '/fun',            icon: 'casino',          label: 'Fun Hub',      featureKey: 'fun-hub' },
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
  { path: '/fun',            icon: 'casino',         label: 'Fun Hub',       featureKey: 'fun-hub' },
  { path: '/integrations',   icon: 'hub',            label: 'Integrations',  featureKey: 'settings' },
  { path: '/settings',       icon: 'settings',       label: 'Settings',      featureKey: 'settings' },
  { path: '/profile',        icon: 'person',         label: 'Profile' },
];

const routeFade = trigger('routeFade', [
  transition('* <=> *', [
    style({ opacity: 0.4 }),
    animate('180ms ease-out', style({ opacity: 1 })),
  ]),
]);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatDialogModule, AppSidebarComponent, AppBottomNavComponent],
  animations: [routeFade],
  template: `
    <!-- ── Nav progress bar ── -->
    @if (navLoading()) {
      <div class="nav-progress"><div class="nav-progress-bar"></div></div>
    }

    <!-- ── Initial auth-checking splash ── -->
    @if (authChecking()) {
      <div class="splash">
        <div class="splash-icon">
          <span class="material-icons splash-groups">groups</span>
          <div class="splash-ring"></div>
        </div>
        <div class="splash-name">Team Manager</div>
        <div class="splash-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    }

    <div class="shell" [class.mobile]="isMobile()">

      @if (isMobile() && !isLoginPage() && isAuthorized()) {
        <app-bottom-nav
          [items]="bottomNav()"
          [moreItems]="moreNav()"
          [isMoreActive]="isMoreActive()"
          (logout)="onLogout()" />
      }

      @if (!isMobile() && !isLoginPage() && isAuthorized()) {
        <app-sidebar
          [primaryNav]="primaryNav()"
          [secondaryNav]="secondaryNav()"
          [expanded]="expanded()"
          (toggleExpand)="toggleExpanded()"
          (logout)="onLogout()" />
      }

      <main class="content">
        <div class="page-wrap" [@routeFade]="currentUrl()">
          <router-outlet />
        </div>
      </main>

    </div>
  `,
  styles: [`
    .shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: #0f1923;
    }

    /* ── Main content ── */
    .content { flex: 1; overflow-y: auto; min-width: 0; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
    .shell.mobile .content { padding-bottom: 60px; }
    .page-wrap { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .shell.mobile .page-wrap { padding: 0 4px 72px; }

    /* ── Nav progress bar ── */
    .nav-progress {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 3px;
      z-index: 9999;
      background: rgba(100,181,246,0.15);
      overflow: hidden;
    }
    .nav-progress-bar {
      height: 100%;
      background: #64b5f6;
      animation: nav-progress-slide 1.4s ease-in-out infinite;
    }
    @keyframes nav-progress-slide {
      0%   { left: -45%; right: 100%; }
      50%  { left: 30%;  right: 20%; }
      100% { left: 100%; right: -10%; }
    }

    /* ── Auth-checking splash ── */
    .splash {
      position: fixed;
      inset: 0;
      background: #0f1117;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
      z-index: 8000;
    }
    .splash-icon {
      position: relative;
      width: 72px; height: 72px;
      display: flex; align-items: center; justify-content: center;
    }
    .splash-groups {
      font-family: 'Material Icons';
      font-size: 36px;
      color: #64b5f6;
      z-index: 1;
    }
    .splash-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 2px solid transparent;
      border-top-color: #64b5f6;
      border-right-color: rgba(100,181,246,0.3);
      animation: splash-spin 1s linear infinite;
    }
    @keyframes splash-spin {
      to { transform: rotate(360deg); }
    }
    .splash-name {
      font-size: 1.1rem;
      font-weight: 600;
      color: rgba(255,255,255,0.6);
      letter-spacing: 0.04em;
    }
    .splash-dots {
      display: flex; gap: 6px;
    }
    .splash-dots span {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: rgba(100,181,246,0.5);
      animation: splash-dot 1.2s ease-in-out infinite;
    }
    .splash-dots span:nth-child(2) { animation-delay: 0.2s; }
    .splash-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes splash-dot {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40%            { transform: scale(1);   opacity: 1; }
    }
  `]
})
export class AppComponent {
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private globalFilterSvc = inject(GlobalFilterService);
  private auth = inject(AuthService);
  private featureAccess = inject(FeatureAccessService);
  private tsd = inject(TimesheetDefaultsService);

  currentUrl = signal(this.router.url);

  primaryNav = computed(() => this.filterNav(ALL_PRIMARY_NAV));
  secondaryNav = computed(() => this.filterNav(ALL_SECONDARY_NAV));
  bottomNav = computed(() => this.filterNav(ALL_BOTTOM_NAV));
  moreNav = computed(() => this.filterNav(ALL_MORE_NAV));

  isMoreActive = computed(() => ALL_MORE_NAV.some(item => this.currentUrl().startsWith(item.path)));
  isLoginPage = computed(() => this.currentUrl() === '/login');
  isAuthorized = signal(false);
  navLoading = signal(false);
  authChecking = signal(true);
  isMobile = signal(false);

  expanded = signal(localStorage.getItem('nav-expanded') === 'true');

  private forceDesktop = false;

  constructor() {
    if (new URLSearchParams(window.location.search).get('desktop') === 'true') {
      this.forceDesktop = true;
      sessionStorage.setItem('force-desktop', 'true');
    } else if (sessionStorage.getItem('force-desktop') === 'true') {
      this.forceDesktop = true;
    }
    this.checkMobile();

    this.auth.authStatus$.subscribe(status => {
      this.authChecking.set(false);
      this.isAuthorized.set(status === 'authorized');
      if (status === 'authorized') {
        this.featureAccess.loadPermissions();
        this.tsd.load();
      }
    });

    this.router.events.subscribe(e => {
      if (e instanceof NavigationStart) {
        this.navLoading.set(true);
      } else if (e instanceof NavigationEnd) {
        this.navLoading.set(false);
        this.currentUrl.set(e.urlAfterRedirects);
        this.globalFilterSvc.clearFilters();
      } else if (e instanceof NavigationCancel || e instanceof NavigationError) {
        this.navLoading.set(false);
      }
    });

    window.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
        event.preventDefault();
        event.stopPropagation();
        this.openQuickOpen();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        event.stopPropagation();
        this.openKPicker();
      }
    }, true);
  }

  @HostListener('window:resize')
  checkMobile() { this.isMobile.set(!this.forceDesktop && window.innerWidth < 768); }

  toggleExpanded() {
    const next = !this.expanded();
    this.expanded.set(next);
    localStorage.setItem('nav-expanded', String(next));
  }

  onLogout() {
    this.auth.logout();
  }

  private filterNav(items: NavItem[]): NavItem[] {
    return items.filter(item => !item.featureKey || this.featureAccess.hasAccess(item.featureKey));
  }

  private openQuickOpen(): void {
    if (this.dialog.openDialogs.length > 0) return;
    this.dialog.open(QuickOpenDialogComponent, {
      width: 'auto',
      maxWidth: '90vw',
      panelClass: 'quick-open-panel',
    });
  }

  private async openKPicker(): Promise<void> {
    if (this.dialog.openDialogs.length > 0) return;
    const { KPickerDialogComponent } = await import(
      './core/components/k-picker/k-picker-dialog.component'
    );
    const dialogRef = this.dialog.open(KPickerDialogComponent, {
      width: '852px',
      maxWidth: '95vw',
      panelClass: 'k-picker-panel',
      backdropClass: 'k-picker-backdrop',
      disableClose: true,
      autoFocus: '.k-search-input',
      data: { preSelectedMembers: this.globalFilterSvc.selectedMembers(), mode: 'multi' } as KPickerData,
    });
    dialogRef.afterClosed().subscribe((result: KPickerResult | undefined) => {
      if (result) {
        this.globalFilterSvc.setSelectedMembers(result.selectedMembers);
        if (result.selectedMembers.length > 0) {
          const hint = result.selectedMembers
            .map(m => `@${m.firstName} ${m.lastName}`)
            .join(' ');
          this.globalFilterSvc.setSearchHint(hint);
          this.globalFilterSvc.setFilters({ squadId: null, featureId: null, leadId: null });
        } else {
          this.globalFilterSvc.setSearchHint('');
          this.globalFilterSvc.setFilters(result.filters);
        }
      }
    });
  }
}
