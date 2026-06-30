import { Routes } from '@angular/router';

export const WIN_OF_THE_WEEK_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./win-of-the-week.component').then(m => m.WinOfTheWeekComponent)
  }
];
