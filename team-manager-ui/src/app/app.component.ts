import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, NavigationStart, NavigationCancel, NavigationError } from '@angular/router';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { trigger, animate, style, transition } from '@angular/animations';
import { QuickOpenDialogComponent } from './core/components/quick-open-dialog/quick-open-dialog.component';
import { KPickerData, KPickerResult } from './core/components/k-picker/k-picker.types';
import { GlobalFilterService } from './core/services/global-filter.service';
import { AuthService } from './core/auth/auth.service';
import { FeatureAccessService } from './core/services/feature-access.service';
import { TimesheetDefaultsService } from './core/services/timesheet-defaults.service';
import { NavService } from './core/nav/nav.service';
import { MobileService } from './core/services/mobile.service';
import { AppSidebarComponent } from './shared/components/app-sidebar/app-sidebar.component';
import { AppBottomNavComponent } from './shared/components/app-bottom-nav/app-bottom-nav.component';

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
    @if (navLoading()) {
      <div class="nav-progress"><div class="nav-progress-bar"></div></div>
    }

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

    <div class="shell" [class.mobile]="mobile.isMobile()">

      @if (mobile.isMobile() && !nav.isLoginPage() && isAuthorized()) {
        <app-bottom-nav />
      }

      @if (!mobile.isMobile() && !nav.isLoginPage() && isAuthorized()) {
        <app-sidebar />
      }

      <main class="content">
        <div class="page-wrap" [@routeFade]="nav.currentUrl()">
          <router-outlet />
        </div>
      </main>

    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    .shell {
      display: flex;
      height: 100vh;
      overflow: hidden;
      background: #0f1923;
    }

    .content { flex: 1; overflow-y: auto; min-width: 0; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }
    .shell.mobile .content { padding-bottom: 60px; }
    .page-wrap { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .shell.mobile .page-wrap { padding: 0 4px 72px; }

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
    .splash-dots { display: flex; gap: 6px; }
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

  nav = inject(NavService);
  mobile = inject(MobileService);

  isAuthorized = signal(false);
  navLoading = signal(false);
  authChecking = signal(true);

  constructor() {
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
