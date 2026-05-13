import { Routes } from '@angular/router';

export const MEETING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./meeting-planner/meeting-planner.component').then(m => m.MeetingPlannerComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./meeting-detail/meeting-detail.component').then(m => m.MeetingDetailComponent)
  }
];
