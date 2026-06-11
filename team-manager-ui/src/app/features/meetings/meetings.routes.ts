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
        path: 'my-series',
        loadComponent: () => import('./my-meeting-series.component').then(m => m.MyMeetingSeriesComponent)
      },
      {
        path: 'locations',
        loadComponent: () => import('./locations-config.component').then(m => m.LocationsConfigComponent)
      },
      {
        path: 'session-types',
        loadComponent: () => import('../session-types/session-types.component').then(m => m.SessionTypesComponent)
      },
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
