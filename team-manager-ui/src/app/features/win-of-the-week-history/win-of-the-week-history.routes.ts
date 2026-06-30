import { Routes } from '@angular/router';

export const WIN_OF_THE_WEEK_HISTORY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./win-of-the-week-history.component').then(m => m.WinOfTheWeekHistoryComponent)
  }
];
