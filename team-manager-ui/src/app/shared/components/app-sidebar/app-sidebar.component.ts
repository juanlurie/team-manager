import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { NavService } from '../../../core/nav/nav.service';
import { AuthService } from '../../../core/auth/auth.service';
import { FeatureAccessService } from '../../../core/services/feature-access.service';
import { AccessRequestsService } from '../../../core/services/access-requests.service';
import { PendingApprovalsDialogComponent } from '../pending-approvals-dialog/pending-approvals-dialog.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule],
  template: `
    <nav class="sidebar" [class.expanded]="nav.expanded()">

      <button class="sidebar-header" (click)="nav.toggleExpanded()"
              [matTooltip]="nav.expanded() ? '' : 'Expand sidebar'" matTooltipPosition="right">
        <mat-icon class="brand-icon">groups</mat-icon>
        <span class="brand">Team Manager</span>
        <mat-icon class="collapse-icon">
          {{ nav.expanded() ? 'chevron_left' : 'chevron_right' }}
        </mat-icon>
      </button>

      <div class="nav-items">
        @for (item of nav.primaryNav(); track item.path) {
          <a class="nav-link" [routerLink]="item.path" routerLinkActive="active"
             [matTooltip]="nav.expanded() ? '' : item.label" matTooltipPosition="right">
            <mat-icon class="nav-icon">{{ item.icon }}</mat-icon>
            <span class="nav-label">{{ item.label }}</span>
          </a>
        }

        <div class="nav-divider"></div>

        @for (item of nav.secondaryNav(); track item.path) {
          <a class="nav-link nav-secondary" [routerLink]="item.path" routerLinkActive="active"
             [matTooltip]="nav.expanded() ? '' : item.label" matTooltipPosition="right">
            <mat-icon class="nav-icon">{{ item.icon }}</mat-icon>
            <span class="nav-label">{{ item.label }}</span>
          </a>
        }
      </div>

      @if (showApprovals()) {
        <button class="sidebar-approvals" [class.flash]="(accessReqs.pendingCount() ?? 0) > 0"
                (click)="openApprovals()"
                [matTooltip]="nav.expanded() ? '' : 'Pending access requests'" matTooltipPosition="right">
          <span class="approvals-icon-wrap">
            <mat-icon class="nav-icon">person_add</mat-icon>
            @if (accessReqs.pendingCount() > 0) {
              <span class="approvals-badge">{{ accessReqs.pendingCount() }}</span>
            }
          </span>
          <span class="nav-label">Approvals</span>
        </button>
      }

      <button class="sidebar-logout" (click)="onLogout()"
              [matTooltip]="nav.expanded() ? '' : 'Logout'" matTooltipPosition="right">
        <mat-icon class="nav-icon">logout</mat-icon>
        <span class="nav-label">Logout</span>
      </button>

    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .sidebar {
      width: 58px;
      height: 100%;
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
      gap: 0;
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
    .sidebar.expanded .sidebar-header { justify-content: flex-start; padding: 14px 12px; gap: 10px; }
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

    .sidebar-logout {
      display: flex;
      align-items: center;
      gap: 0;
      padding: 12px 0;
      justify-content: center;
      color: rgba(255,255,255,0.35);
      background: none;
      border: none;
      border-top: 1px solid rgba(255,255,255,0.05);
      cursor: pointer;
      width: 100%;
      transition: background 0.15s, color 0.15s;
      white-space: nowrap;
      overflow: hidden;
      flex-shrink: 0;
      font-family: inherit;
    }
    .sidebar-logout:hover { background: rgba(239,83,80,0.1); color: #ef5350; }
    .sidebar.expanded .sidebar-logout { padding: 12px 16px; justify-content: flex-start; gap: 12px; }

    .sidebar-approvals {
      display: flex;
      align-items: center;
      gap: 0;
      padding: 12px 0;
      justify-content: center;
      color: rgba(255,255,255,0.45);
      background: none;
      border: none;
      border-top: 1px solid rgba(255,255,255,0.05);
      cursor: pointer;
      width: 100%;
      transition: background 0.15s, color 0.15s;
      white-space: nowrap;
      overflow: hidden;
      flex-shrink: 0;
      font-family: inherit;
    }
    .sidebar-approvals:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.9); }
    .sidebar.expanded .sidebar-approvals { padding: 12px 16px; justify-content: flex-start; gap: 12px; }
    .approvals-icon-wrap { position: relative; display: inline-flex; flex-shrink: 0; }
    .approvals-badge {
      position: absolute; top: -6px; right: -8px;
      min-width: 16px; height: 16px; padding: 0 4px;
      border-radius: 8px; background: #ef5350; color: #fff;
      font-size: 0.62rem; font-weight: 700; line-height: 16px; text-align: center;
    }
    .sidebar-approvals.flash { color: #ffb74d; }
    .sidebar-approvals.flash .nav-icon { animation: approvals-pulse 1.4s ease-in-out infinite; }
    @keyframes approvals-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.55; transform: scale(1.12); }
    }
  `]
})
export class AppSidebarComponent implements OnInit {
  nav = inject(NavService);
  private auth = inject(AuthService);
  private dialog = inject(MatDialog);
  private featureAccess = inject(FeatureAccessService);
  accessReqs = inject(AccessRequestsService);

  showApprovals() { return this.featureAccess.hasAccess('access-requests'); }

  ngOnInit() {
    if (this.showApprovals()) this.accessReqs.refreshCount();
  }

  openApprovals() {
    this.dialog.open(PendingApprovalsDialogComponent, { width: '420px' });
  }

  onLogout() { this.auth.logout(); }
}
