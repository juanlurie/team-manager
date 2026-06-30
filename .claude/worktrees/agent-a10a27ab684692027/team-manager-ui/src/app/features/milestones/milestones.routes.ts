import { Routes } from '@angular/router';

export const MILESTONE_ROUTES: Routes = [
  {
    path: ':id',
    loadComponent: () => import('./milestone-detail.component').then(m => m.MilestoneDetailComponent)
  }
];
