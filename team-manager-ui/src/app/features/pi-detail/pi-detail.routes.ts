import { Routes } from '@angular/router';

export const PI_DETAIL_ROUTES: Routes = [
  {
    path: ':id',
    loadComponent: () => import('./pi-detail.component').then(m => m.PIDetailComponent)
  }
];
