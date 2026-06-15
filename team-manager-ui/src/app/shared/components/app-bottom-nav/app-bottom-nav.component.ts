import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { NavService } from '../../../core/nav/nav.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule],
  template: `
    <nav class="bottom-nav">
      @for (item of nav.bottomNav(); track item.path) {
        <a class="bnav-item" [routerLink]="item.path" routerLinkActive="active">
          <mat-icon class="bnav-icon">{{ item.icon }}</mat-icon>
          <span class="bnav-label">{{ item.label }}</span>
        </a>
      }
      <button class="bnav-item" [class.active]="nav.isMoreActive()"
              (click)="moreOpen.set(!moreOpen())">
        <mat-icon class="bnav-icon">{{ moreOpen() ? 'close' : 'more_horiz' }}</mat-icon>
        <span class="bnav-label">More</span>
      </button>
    </nav>

    @if (moreOpen()) {
      <div class="backdrop" (click)="moreOpen.set(false)"></div>
      <div class="more-sheet">
        <div class="more-handle"></div>
        <div class="more-grid">
          @for (item of nav.moreNav(); track item.path) {
            <a class="more-item" [routerLink]="item.path" routerLinkActive="active"
               (click)="moreOpen.set(false)">
              <mat-icon class="more-icon">{{ item.icon }}</mat-icon>
              <span>{{ item.label }}</span>
            </a>
          }
          <button class="more-item more-logout" (click)="onLogout()">
            <mat-icon class="more-icon">logout</mat-icon>
            <span>Logout</span>
          </button>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
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
      background: none;
      border: none;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s, color 0.15s;
      -webkit-tap-highlight-color: transparent;
    }
    .more-item:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.9); }
    .more-item.active { background: rgba(100,181,246,0.12); color: #64b5f6; }
    .more-icon { font-size: 26px; width: 26px; height: 26px; line-height: 26px; }
    .more-logout { color: rgba(239,83,80,0.7); }
    .more-logout:hover { background: rgba(239,83,80,0.1); color: #ef5350; }
  `]
})
export class AppBottomNavComponent {
  nav = inject(NavService);
  private auth = inject(AuthService);
  moreOpen = signal(false);

  constructor() {
    inject(Router).events.subscribe(e => {
      if (e instanceof NavigationEnd) this.moreOpen.set(false);
    });
  }

  onLogout() { this.auth.logout(); }
}
