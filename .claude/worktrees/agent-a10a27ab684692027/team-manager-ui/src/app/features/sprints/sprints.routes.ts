import { Routes } from '@angular/router';

export const SPRINT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./sprint-list/sprint-list.component').then(m => m.SprintListComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./sprint-detail/sprint-detail.component').then(m => m.SprintDetailComponent)
  },
  {
    path: ':id/features',
    loadComponent: () => import('./sprint-features/sprint-features.component').then(m => m.SprintFeaturesComponent)
  }
];
