import { Routes } from '@angular/router';

export const MEETING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./meeting-planner/meeting-planner.component').then(m => m.MeetingPlannerComponent)
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
