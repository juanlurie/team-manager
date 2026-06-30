import { Routes } from '@angular/router';

export const MEETING_SERIES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./meeting-series-list.component').then(m => m.MeetingSeriesListComponent)
  },
  {
    path: 'create',
    loadComponent: () => import('./meeting-series-create.component').then(m => m.MeetingSeriesCreateComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./meeting-series-detail.component').then(m => m.MeetingSeriesDetailComponent)
  },
  {
    path: ':id/availability',
    loadComponent: () => import('./my-availability.component').then(m => m.MyAvailabilityComponent)
  },
  {
    path: ':id/slots',
    loadComponent: () => import('./meeting-series-slots.component').then(m => m.MeetingSeriesSlotsComponent)
  },
  {
    path: ':id/items/create',
    loadComponent: () => import('./meeting-series-item-create.component').then(m => m.MeetingSeriesItemCreateComponent)
  },
  {
    path: ':id/items/:itemId',
    loadComponent: () => import('./meeting-series-item-detail.component').then(m => m.MeetingSeriesItemDetailComponent)
  },
  {
    path: ':id/items/:itemId/availability',
    redirectTo: ':id/availability'
  }
];

export { MyMeetingSeriesComponent } from './my-meeting-series.component';