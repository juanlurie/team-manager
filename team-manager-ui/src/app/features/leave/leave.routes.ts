import { Routes } from '@angular/router';

export const LEAVE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./leave-overview/leave-overview.component').then(m => m.LeaveOverviewComponent)
  }
];
