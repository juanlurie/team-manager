import { Routes } from '@angular/router';

export const COFFEE_RUN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./coffee-run.component').then(m => m.CoffeeRunComponent)
  }
];
