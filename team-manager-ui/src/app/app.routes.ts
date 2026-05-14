import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
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
    path: 'meetings',
    loadChildren: () => import('./features/meetings/meetings.routes').then(m => m.MEETING_ROUTES)
  },
  {
    path: 'session-types',
    loadChildren: () => import('./features/session-types/session-types.routes').then(m => m.SESSION_TYPES_ROUTES)
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
