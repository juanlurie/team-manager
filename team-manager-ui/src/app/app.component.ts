import { Component, inject, signal, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

const NAV: NavItem[] = [
  { path: '/dashboard',  icon: 'dashboard',      label: 'Dashboard'   },
  { path: '/sprints',    icon: 'directions_run',  label: 'Sprints'     },
  { path: '/features',   icon: 'view_list',       label: 'Features'    },
  { path: '/progress',   icon: 'track_changes',   label: 'Progress'    },
  { path: '/discussion', icon: 'forum',           label: 'Discussion'  },
  { path: '/team',       icon: 'people',          label: 'Team'        },
  { path: '/leave',      icon: 'event_busy',      label: 'Leave'       },
  { path: '/export',     icon: 'download',        label: 'Export'      },
  { path: '/leaderboard',icon: 'emoji_events',    label: 'Leaderboard' },
  { path: '/wheel',      icon: 'casino',          label: 'Spin Wheel'  },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="shell" [class.mobile]="isMobile()">

      <!-- ── Mobile top bar ── -->
      @if (isMobile()) {
        <header class="topbar">
          <button class="icon-btn" (click)="mobileOpen.set(!mobileOpen())">
            <mat-icon>{{ mobileOpen() ? 'close' : 'menu' }}</mat-icon>
          </button>
          <mat-icon style="color:rgba(255,255,255,0.7)">groups</mat-icon>
          <span class="brand">Team Manager</span>
        </header>

        <!-- Mobile overlay backdrop -->
        @if (mobileOpen()) {
          <div class="backdrop" (click)="mobileOpen.set(false)"></div>
          <nav class="drawer">
            <div class="nav-items">
              @for (item of nav; track item.path) {
                <a class="nav-link" [routerLink]="item.path" routerLinkActive="active"
                   (click)="mobileOpen.set(false)">
                  <mat-icon class="nav-icon">{{ item.icon }}</mat-icon>
                  <span class="nav-label">{{ item.label }}</span>
                </a>
              }
            </div>
          </nav>
        }
      }

      <!-- ── Desktop sidebar ── -->
      @if (!isMobile()) {
        <nav class="sidebar" [class.collapsed]="collapsed()">
          <div class="sidebar-header">
            <mat-icon class="brand-icon">groups</mat-icon>
            @if (!collapsed()) {
              <span class="brand">Team Manager</span>
            }
          </div>

          <div class="nav-items">
            @for (item of nav; track item.path) {
              <a class="nav-link" [routerLink]="item.path" routerLinkActive="active"
                 [matTooltip]="collapsed() ? item.label : ''" matTooltipPosition="right">
                <mat-icon class="nav-icon">{{ item.icon }}</mat-icon>
                @if (!collapsed()) {
                  <span class="nav-label">{{ item.label }}</span>
                }
              </a>
            }
          </div>

          <button class="collapse-btn" (click)="collapsed.set(!collapsed())" [title]="collapsed() ? 'Expand' : 'Collapse'">
            <mat-icon style="font-size:18px;width:18px;height:18px;line-height:18px;transition:transform 0.25s"
                      [style.transform]="collapsed() ? 'rotate(180deg)' : 'rotate(0)'">
              chevron_left
            </mat-icon>
          </button>
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
      width: 220px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      background: #131e2b;
      border-right: 1px solid rgba(255,255,255,0.06);
      transition: width 0.25s cubic-bezier(0.4,0,0.2,1);
      overflow: hidden;
    }
    .sidebar.collapsed { width: 58px; }

    .sidebar-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 18px 14px 16px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      min-height: 56px;
      overflow: hidden;
      white-space: nowrap;
    }
    .brand-icon { color: rgba(255,255,255,0.5); flex-shrink: 0; }
    .brand { font-size: 0.9rem; font-weight: 600; opacity: 0.75; }

    .nav-items {
      flex: 1;
      display: flex;
      flex-direction: column;
      padding: 8px 0;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 9px 14px;
      color: rgba(255,255,255,0.5);
      text-decoration: none;
      border-radius: 0;
      transition: background 0.15s, color 0.15s;
      white-space: nowrap;
      overflow: hidden;
      position: relative;
    }
    .nav-link:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.85); }
    .nav-link.active {
      background: rgba(100,181,246,0.12);
      color: #64b5f6;
    }
    .nav-link.active::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 3px;
      background: #64b5f6;
      border-radius: 0 2px 2px 0;
    }

    .nav-icon { font-size: 20px; width: 20px; height: 20px; line-height: 20px; flex-shrink: 0; }
    .nav-label { font-size: 0.85rem; font-weight: 500; }

    .collapse-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      border: none;
      background: none;
      color: rgba(255,255,255,0.25);
      cursor: pointer;
      border-top: 1px solid rgba(255,255,255,0.05);
      transition: color 0.15s;
    }
    .collapse-btn:hover { color: rgba(255,255,255,0.6); }

    /* ── Mobile top bar ── */
    .topbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 52px;
      background: #131e2b;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 12px;
      z-index: 200;
    }
    .icon-btn {
      display: flex; align-items: center; justify-content: center;
      width: 36px; height: 36px;
      border: none; background: none; color: rgba(255,255,255,0.6); cursor: pointer;
      border-radius: 8px;
    }
    .icon-btn:hover { background: rgba(255,255,255,0.07); }

    .backdrop {
      position: fixed; inset: 0; z-index: 300;
      background: rgba(0,0,0,0.5);
    }
    .drawer {
      position: fixed;
      top: 52px; left: 0; bottom: 0;
      width: 240px;
      background: #131e2b;
      border-right: 1px solid rgba(255,255,255,0.07);
      z-index: 310;
      overflow-y: auto;
      padding: 8px 0;
    }
    .drawer .nav-link {
      border-radius: 0;
    }

    /* ── Main content ── */
    .content {
      flex: 1;
      overflow-y: auto;
      min-width: 0;
    }
    .shell.mobile .content {
      margin-top: 52px;
    }
    .page-wrap {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }
  `]
})
export class AppComponent {
  readonly nav = NAV;
  collapsed  = signal(false);
  mobileOpen = signal(false);
  isMobile   = signal(false);

  constructor() { this.checkMobile(); }

  @HostListener('window:resize')
  checkMobile() { this.isMobile.set(window.innerWidth < 768); }
}
