import { Component, signal, computed, HostListener, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter } from 'rxjs/operators';

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

const PRIMARY_NAV: NavItem[] = [
  { path: '/dashboard',  icon: 'dashboard',     label: 'Dashboard'  },
  { path: '/sprints',    icon: 'directions_run', label: 'Sprints'    },
  { path: '/features',   icon: 'view_list',      label: 'Features'   },
  { path: '/progress',   icon: 'track_changes',  label: 'Progress'   },
  { path: '/discussion', icon: 'forum',          label: 'Discussion' },
  { path: '/team',       icon: 'people',         label: 'Team'       },
  { path: '/leave',      icon: 'event_busy',     label: 'Leave'      },
];

const SECONDARY_NAV: NavItem[] = [
  { path: '/export',      icon: 'download',     label: 'Export'      },
  { path: '/leaderboard', icon: 'emoji_events', label: 'Leaderboard' },
  { path: '/wheel',       icon: 'casino',       label: 'Spin Wheel'  },
];

// Bottom bar: 4 core items + "More" button for the rest
const BOTTOM_NAV: NavItem[] = [
  { path: '/dashboard', icon: 'dashboard',     label: 'Dashboard' },
  { path: '/sprints',   icon: 'directions_run', label: 'Sprints'   },
  { path: '/team',      icon: 'people',         label: 'Team'      },
  { path: '/leave',     icon: 'event_busy',     label: 'Leave'     },
];

const MORE_NAV: NavItem[] = [
  { path: '/features',    icon: 'view_list',     label: 'Features'    },
  { path: '/progress',    icon: 'track_changes', label: 'Progress'    },
  { path: '/discussion',  icon: 'forum',         label: 'Discussion'  },
  { path: '/export',      icon: 'download',      label: 'Export'      },
  { path: '/leaderboard', icon: 'emoji_events',  label: 'Leaderboard' },
  { path: '/wheel',       icon: 'casino',        label: 'Spin Wheel'  },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="shell" [class.mobile]="isMobile()">

      <!-- ── Mobile bottom nav ── -->
      @if (isMobile()) {
        <!-- Bottom nav bar -->
        <nav class="bottom-nav">
          @for (item of bottomNav; track item.path) {
            <a class="bnav-item" [routerLink]="item.path" routerLinkActive="active">
              <mat-icon class="bnav-icon">{{ item.icon }}</mat-icon>
              <span class="bnav-label">{{ item.label }}</span>
            </a>
          }
          <button class="bnav-item" [class.active]="isMoreActive()"
                  (click)="moreOpen.set(!moreOpen())">
            <mat-icon class="bnav-icon">{{ moreOpen() ? 'close' : 'more_horiz' }}</mat-icon>
            <span class="bnav-label">More</span>
          </button>
        </nav>

        <!-- More sheet -->
        @if (moreOpen()) {
          <div class="backdrop" (click)="moreOpen.set(false)"></div>
          <div class="more-sheet">
            <div class="more-handle"></div>
            <div class="more-grid">
              @for (item of moreNav; track item.path) {
                <a class="more-item" [routerLink]="item.path" routerLinkActive="active"
                   (click)="moreOpen.set(false)">
                  <mat-icon class="more-icon">{{ item.icon }}</mat-icon>
                  <span>{{ item.label }}</span>
                </a>
              }
            </div>
          </div>
        }
      }

      <!-- ── Desktop sidebar ── -->
      @if (!isMobile()) {
        <nav class="sidebar" [class.expanded]="expanded()">

          <button class="sidebar-header" (click)="toggleExpanded()"
                  [matTooltip]="expanded() ? '' : 'Expand sidebar'" matTooltipPosition="right">
            <mat-icon class="brand-icon">groups</mat-icon>
            <span class="brand">Team Manager</span>
            <mat-icon class="collapse-icon">
              {{ expanded() ? 'chevron_left' : 'chevron_right' }}
            </mat-icon>
          </button>

          <div class="nav-items">
            @for (item of primaryNav; track item.path) {
              <a class="nav-link" [routerLink]="item.path" routerLinkActive="active"
                 [matTooltip]="expanded() ? '' : item.label" matTooltipPosition="right">
                <mat-icon class="nav-icon">{{ item.icon }}</mat-icon>
                <span class="nav-label">{{ item.label }}</span>
              </a>
            }

            <div class="nav-divider"></div>

            @for (item of secondaryNav; track item.path) {
              <a class="nav-link nav-secondary" [routerLink]="item.path" routerLinkActive="active"
                 [matTooltip]="expanded() ? '' : item.label" matTooltipPosition="right">
                <mat-icon class="nav-icon">{{ item.icon }}</mat-icon>
                <span class="nav-label">{{ item.label }}</span>
              </a>
            }
          </div>

        </nav>
      }

      <!-- ── Main content ── -->
      <main class="content">
        <div class="page-wrap">
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

    /* ── Sidebar (desktop) ── */
    .sidebar {
      width: 58px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      background: #131e2b;
      border-right: 1px solid rgba(255,255,255,0.06);
      transition: width 0.2s cubic-bezier(0.4,0,0.2,1);
      overflow: hidden;
      z-index: 100;
    }
    .sidebar.expanded { width: 220px; }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 14px 0;
      border: none;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      background: none;
      min-height: 56px;
      overflow: hidden;
      white-space: nowrap;
      flex-shrink: 0;
      cursor: pointer;
      width: 100%;
      transition: background 0.15s;
    }
    .sidebar-header:hover { background: rgba(255,255,255,0.04); }
    .brand-icon {
      color: rgba(255,255,255,0.75);
      flex-shrink: 0;
      font-size: 24px; width: 24px; height: 24px; line-height: 24px;
    }
    .brand {
      font-size: 0.9rem; font-weight: 600; color: rgba(255,255,255,0.75);
      opacity: 0; max-width: 0; overflow: hidden;
      transition: opacity 0.15s, max-width 0.2s;
      flex: 1; text-align: left;
    }
    .collapse-icon {
      color: rgba(255,255,255,0.3);
      font-size: 18px; width: 18px; height: 18px; line-height: 18px;
      flex-shrink: 0;
      opacity: 0; max-width: 0; overflow: hidden;
      transition: opacity 0.15s, max-width 0.2s;
    }
    .sidebar.expanded .sidebar-header { justify-content: flex-start; padding: 14px 12px; }
    .sidebar.expanded .brand { opacity: 1; max-width: 160px; }
    .sidebar.expanded .collapse-icon { opacity: 1; max-width: 18px; }

    .nav-items {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 8px 0;
      overflow: hidden;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 0;
      padding: 12px 0;
      justify-content: center;
      color: rgba(255,255,255,0.45);
      text-decoration: none;
      transition: background 0.15s, color 0.15s;
      white-space: nowrap;
      overflow: hidden;
      position: relative;
    }
    .nav-link:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.9); }
    .nav-link.active { background: rgba(100,181,246,0.12); color: #64b5f6; }
    .nav-link.active::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 3px;
      background: #64b5f6;
      border-radius: 0 2px 2px 0;
    }
    .nav-secondary { opacity: 0.65; }
    .nav-secondary.active { opacity: 1; }

    .nav-icon { font-size: 24px; width: 24px; height: 24px; line-height: 24px; flex-shrink: 0; }
    .nav-label {
      font-size: 0.85rem; font-weight: 500;
      max-width: 0; overflow: hidden; opacity: 0;
      transition: max-width 0.2s, opacity 0.15s;
    }

    .sidebar.expanded .nav-link { padding: 9px 16px; justify-content: flex-start; gap: 12px; }
    .sidebar.expanded .nav-icon { font-size: 20px; width: 20px; height: 20px; line-height: 20px; }
    .sidebar.expanded .nav-label { max-width: 160px; opacity: 1; }

    .nav-divider {
      margin: 6px 10px;
      border-top: 1px solid rgba(255,255,255,0.05);
      flex-shrink: 0;
    }

    /* ── Bottom nav ── */
    .bottom-nav {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      height: 60px;
      background: #131e2b;
      border-top: 1px solid rgba(255,255,255,0.07);
      display: flex;
      align-items: stretch;
      z-index: 200;
    }
    .bnav-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      color: rgba(255,255,255,0.4);
      text-decoration: none;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      transition: color 0.15s;
      -webkit-tap-highlight-color: transparent;
    }
    .bnav-item:hover { color: rgba(255,255,255,0.75); }
    .bnav-item.active { color: #64b5f6; }
    .bnav-icon { font-size: 22px; width: 22px; height: 22px; line-height: 22px; }
    .bnav-label { font-size: 0.6rem; font-weight: 500; letter-spacing: 0.01em; }

    /* ── More sheet ── */
    .backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 60px;
      background: rgba(0,0,0,0.55);
      z-index: 300;
    }
    .more-sheet {
      position: fixed;
      left: 0; right: 0; bottom: 60px;
      background: #1a2636;
      border-top: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px 16px 0 0;
      z-index: 310;
      padding: 8px 0 16px;
    }
    .more-handle {
      width: 36px; height: 4px;
      background: rgba(255,255,255,0.15);
      border-radius: 2px;
      margin: 0 auto 12px;
    }
    .more-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;
      padding: 0 12px;
    }
    .more-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 16px 8px;
      border-radius: 12px;
      color: rgba(255,255,255,0.6);
      text-decoration: none;
      font-size: 0.75rem;
      font-weight: 500;
      transition: background 0.15s, color 0.15s;
      -webkit-tap-highlight-color: transparent;
    }
    .more-item:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.9); }
    .more-item.active { background: rgba(100,181,246,0.12); color: #64b5f6; }
    .more-icon { font-size: 26px; width: 26px; height: 26px; line-height: 26px; }

    /* ── Main content ── */
    .content { flex: 1; overflow-y: auto; min-width: 0; }
    .shell.mobile .content { padding-bottom: 60px; }
    .page-wrap { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .shell.mobile .page-wrap { padding: 16px 12px; }
  `]
})
export class AppComponent {
  readonly primaryNav   = PRIMARY_NAV;
  readonly secondaryNav = SECONDARY_NAV;
  readonly bottomNav    = BOTTOM_NAV;
  readonly moreNav      = MORE_NAV;

  private router = inject(Router);
  private currentUrl = signal(this.router.url);

  isMoreActive = computed(() => MORE_NAV.some(item => this.currentUrl().startsWith(item.path)));

  expanded = signal(localStorage.getItem('nav-expanded') === 'true');

  moreOpen = signal(false);
  isMobile = signal(false);

  constructor() {
    this.checkMobile();
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(e => {
      this.currentUrl.set((e as NavigationEnd).urlAfterRedirects);
      this.moreOpen.set(false);
    });
  }

  @HostListener('window:resize')
  checkMobile() { this.isMobile.set(window.innerWidth < 768); }

  toggleExpanded() {
    const next = !this.expanded();
    this.expanded.set(next);
    localStorage.setItem('nav-expanded', String(next));
  }
}
