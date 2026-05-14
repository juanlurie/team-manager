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
    path: 'wheel',
    loadChildren: () => import('./features/wheel/wheel.routes').then(m => m.WHEEL_ROUTES)
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
    path: 'leaderboard',
    loadComponent: () => import('./features/leaderboard/leaderboard.component').then(m => m.LeaderboardComponent)
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
    path: 'win-of-the-week',
    loadChildren: () => import('./features/win-of-the-week/win-of-the-week.routes').then(m => m.WIN_OF_THE_WEEK_ROUTES)
  },
  {
    path: 'slot-locations',
    loadChildren: () => import('./features/slot-locations/slot-locations.routes').then(m => m.SLOT_LOCATIONS_ROUTES)
  },
  {
    path: 'session-types',
    loadChildren: () => import('./features/session-types/session-types.routes').then(m => m.SESSION_TYPES_ROUTES)
  },
  {
    path: 'catalog',
    loadChildren: () => import('./features/session-catalog/session-catalog.routes').then(m => m.SESSION_CATALOG_ROUTES)
  },
  {
    path: 'meeting-series',
    loadChildren: () => import('./features/meeting-series/meeting-series.routes').then(m => m.MEETING_SERIES_ROUTES)
  },
  {
    path: 'my-meetings',
    loadComponent: () => import('./features/meeting-series/my-meetings.component').then(m => m.MyMeetingsComponent)
  }
];
