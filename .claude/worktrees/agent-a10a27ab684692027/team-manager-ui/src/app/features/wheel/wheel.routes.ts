import { Routes } from '@angular/router';

export const WHEEL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./wheel.component').then(m => m.WheelComponent)
  }
];
