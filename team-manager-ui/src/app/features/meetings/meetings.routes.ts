import { Routes } from '@angular/router';

export const MEETING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./meetings-hub.component').then(m => m.MeetingsHubComponent),
    children: [
      { path: '', redirectTo: 'sessions', pathMatch: 'full' },
      {
        path: 'sessions',
        loadComponent: () => import('./meeting-planner/meeting-planner.component').then(m => m.MeetingPlannerComponent)
      },
      {
        path: 'series',
        loadChildren: () => import('../meeting-series/meeting-series.routes').then(m => m.MEETING_SERIES_ROUTES)
      },
      {
        path: 'my-meetings',
        loadComponent: () => import('./my-meetings.component').then(m => m.MyMeetingsComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./meeting-settings.component').then(m => m.MeetingSettingsComponent)
      },
      // Back-compat for old deep links -- Locations/Session Types/My Series no longer have their
      // own tabs, folded into 'settings' and 'my-meetings' respectively.
      { path: 'my-series', redirectTo: 'my-meetings', pathMatch: 'full' },
      { path: 'locations', redirectTo: 'settings', pathMatch: 'full' },
      { path: 'session-types', redirectTo: 'settings', pathMatch: 'full' },
    ]
  },
  {
    path: 'create',
    loadComponent: () => import('./meeting-create-page/meeting-create-page.component').then(m => m.MeetingCreatePageComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./meeting-detail/meeting-detail.component').then(m => m.MeetingDetailComponent)
  }
];
