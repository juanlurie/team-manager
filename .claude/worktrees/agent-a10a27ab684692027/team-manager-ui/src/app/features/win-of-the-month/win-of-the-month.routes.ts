import { Routes } from '@angular/router';

export const WIN_OF_THE_MONTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./win-of-the-month.component').then(m => m.WinOfTheMonthComponent)
  }
];
