import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { featureGuard } from './core/guards/feature.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/login/login.component').then(m => m.LoginComponent) },
  { path: 'not-registered', loadComponent: () => import('./features/not-registered/not-registered.component').then(m => m.NotRegisteredComponent) },
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authGuard, featureGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'team',
        loadChildren: () => import('./features/team/team.routes').then(m => m.TEAM_ROUTES)
      },
      {
        path: 'sprints',
        loadChildren: () => import('./features/sprints/sprints.routes').then(m => m.SPRINT_ROUTES)
      },
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES)
      },
      {
        path: 'leave',
        loadChildren: () => import('./features/leave/leave.routes').then(m => m.LEAVE_ROUTES)
      },
      {
        path: 'export',
        loadChildren: () => import('./features/export/export.routes').then(m => m.EXPORT_ROUTES)
      },
      {
        path: 'fun',
        loadChildren: () => import('./features/fun/fun.routes').then(m => m.FUN_ROUTES)
      },
      {
        path: 'discussion',
        loadChildren: () => import('./features/discussion/discussion.routes').then(m => m.DISCUSSION_ROUTES)
      },
      {
        path: 'features',
        loadChildren: () => import('./features/all-features/all-features.routes').then(m => m.ALL_FEATURES_ROUTES)
      },
      {
        path: 'progress',
        loadComponent: () => import('./features/progress/progress.component').then(m => m.ProgressComponent)
      },
      {
        path: 'pis',
        loadChildren: () => import('./features/pi-detail/pi-detail.routes').then(m => m.PI_DETAIL_ROUTES)
      },
      {
        path: 'milestones',
        loadChildren: () => import('./features/milestones/milestones.routes').then(m => m.MILESTONE_ROUTES)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
      },
      {
        path: 'session-types',
        loadChildren: () => import('./features/session-types/session-types.routes').then(m => m.SESSION_TYPES_ROUTES)
      },
      {
        path: 'showcase',
        loadComponent: () => import('./features/showcase/features-showcase.component').then(m => m.FeaturesShowcaseComponent)
      },
      {
        path: 'request-configs',
        loadComponent: () => import('./features/api-request-configs/api-request-configs.component').then(m => m.ApiRequestConfigsComponent)
      },
      {
        path: 'sync-queue',
        loadComponent: () => import('./features/sync-queue/sync-queue.component').then(m => m.SyncQueueComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        path: 'settings/api-keys',
        loadChildren: () => import('./features/settings/api-keys/api-keys.routes').then(m => m.API_KEYS_ROUTES)
      },
      {
        path: 'settings/feature-permissions',
        loadChildren: () => import('./features/settings/feature-permissions/feature-permissions.routes').then(m => m.FEATURE_PERMISSIONS_ROUTES)
      },
      {
        path: 'settings/portal-credentials',
        loadComponent: () => import('./features/settings/portal-credentials/portal-credentials.component').then(m => m.PortalCredentialsComponent)
      },
      {
        path: 'access-requests',
        loadComponent: () => import('./features/access-requests/access-requests.component').then(m => m.AccessRequestsComponent)
      },
      {
        path: 'expense-claim',
        loadComponent: () => import('./features/expense-claim/expense-claim.component').then(m => m.ExpenseClaimComponent)
      },
      {
        path: 'timesheet',
        loadComponent: () => import('./features/timesheet/timesheet-page.component').then(m => m.TimesheetPageComponent),
        data: { featureKey: 'team' }
      },
    ]
  },
  // Guest access (no auth required)
  {
    path: 'guest',
    loadChildren: () => import('./features/guest-wow/guest-wow.routes').then(m => m.GUEST_WOW_ROUTES)
  },
  // Backward compatibility redirects
  { path: 'win-of-the-week', redirectTo: 'fun/win-of-the-week', pathMatch: 'full' },
  { path: 'leaderboard', redirectTo: 'fun/leaderboard', pathMatch: 'full' },
  { path: 'wheel', redirectTo: 'fun/wheel', pathMatch: 'full' },
  { path: 'meeting-series', redirectTo: 'meetings/series', pathMatch: 'full' },
  { path: 'meeting-series/:id', redirectTo: 'meetings/series/:id', pathMatch: 'full' },
  { path: 'meeting-series/:id/:rest', redirectTo: 'meetings/series/:id/:rest', pathMatch: 'prefix' },
  { path: 'my-meetings', redirectTo: 'meetings/my-meetings', pathMatch: 'full' },
  { path: 'my-meeting-series', redirectTo: 'meetings/my-series', pathMatch: 'full' },
  { path: 'slot-locations', redirectTo: 'meetings/locations', pathMatch: 'full' }
];
