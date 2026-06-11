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
      { path: 'sprints', redirectTo: 'delivery/sprints', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES)
      },
      {
        path: 'delivery',
        loadChildren: () => import('./features/delivery/delivery.routes').then(m => m.DELIVERY_ROUTES)
      },
      {
        path: 'export',
        redirectTo: 'delivery/export',
        pathMatch: 'full'
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
        path: 'meetings',
        loadChildren: () => import('./features/meetings/meetings.routes').then(m => m.MEETING_ROUTES)
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
      // Moved into hubs — keep old paths working
      { path: 'features', redirectTo: 'delivery/features', pathMatch: 'full' },
      { path: 'progress', redirectTo: 'delivery/progress', pathMatch: 'full' },
      { path: 'session-types', redirectTo: 'meetings/session-types', pathMatch: 'full' },
      { path: 'leave', redirectTo: 'team/leave', pathMatch: 'prefix' },
      {
        path: 'showcase',
        loadComponent: () => import('./features/showcase/features-showcase.component').then(m => m.FeaturesShowcaseComponent)
      },
      {
        path: 'integrations',
        loadChildren: () => import('./features/integrations/integrations.routes').then(m => m.INTEGRATIONS_ROUTES)
      },
      {
        path: 'request-configs',
        redirectTo: 'integrations',
        pathMatch: 'full'
      },
      {
        path: 'sync-queue',
        redirectTo: 'integrations/sync-queue',
        pathMatch: 'full'
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
        path: 'settings/credentials',
        redirectTo: 'integrations/credentials',
        pathMatch: 'full'
      },
      {
        path: 'settings/config-variables',
        redirectTo: 'integrations/config-variables',
        pathMatch: 'full'
      },
      {
        path: 'settings/portal-credentials',
        redirectTo: 'integrations/credentials',
        pathMatch: 'full'
      },
      {
        path: 'access-requests',
        redirectTo: 'team/access-requests',
        pathMatch: 'full'
      },
      {
        path: 'expense-claim',
        redirectTo: 'team/expense-claim',
        pathMatch: 'full'
      },
      { path: 'timesheet', redirectTo: 'team/timesheet', pathMatch: 'full' },
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
