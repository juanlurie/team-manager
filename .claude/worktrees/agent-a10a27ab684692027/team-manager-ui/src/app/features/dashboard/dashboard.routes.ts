import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./sprint-dashboard/sprint-dashboard.component').then(m => m.SprintDashboardComponent)
  }
];
