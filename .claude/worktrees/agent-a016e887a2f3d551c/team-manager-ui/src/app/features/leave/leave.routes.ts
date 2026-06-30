import { Routes } from '@angular/router';

export const LEAVE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./leave-overview/leave-overview.component').then(m => m.LeaveOverviewComponent)
  },
  {
    path: 'config',
    loadComponent: () => import('../leave-fetch-config/leave-fetch-config.component').then(m => m.LeaveFetchConfigComponent)
  }
];
