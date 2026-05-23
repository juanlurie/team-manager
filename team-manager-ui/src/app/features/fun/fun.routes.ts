import { Routes } from '@angular/router';
import { FunHubComponent } from './fun-hub.component';

export const FUN_ROUTES: Routes = [
  {
    path: '',
    component: FunHubComponent,
    children: [
      { path: '', redirectTo: 'win-of-the-week', pathMatch: 'full' },
      {
        path: 'win-of-the-week',
        loadChildren: () => import('../win-of-the-week/win-of-the-week.routes').then(m => m.WIN_OF_THE_WEEK_ROUTES)
      },
      {
        path: 'win-of-the-week/history',
        loadComponent: () => import('../win-of-the-week-history/win-of-the-week-history.component').then(m => m.WinOfTheWeekHistoryComponent)
      },
      {
        path: 'win-of-the-month',
        loadChildren: () => import('../win-of-the-month/win-of-the-month.routes').then(m => m.WIN_OF_THE_MONTH_ROUTES)
      },
      {
        path: 'leaderboard',
        loadComponent: () => import('../leaderboard/leaderboard.component').then(m => m.LeaderboardComponent)
      },
      {
        path: 'wheel',
        loadChildren: () => import('../wheel/wheel.routes').then(m => m.WHEEL_ROUTES)
      },
      {
        path: 'coffee-run',
        loadChildren: () => import('../coffee-run/coffee-run.routes').then(m => m.COFFEE_RUN_ROUTES)
      },
      {
        path: 'manage-menus',
        loadChildren: () => import('../manage-menus/manage-menus.routes').then(m => m.MANAGE_MENUS_ROUTES)
      }
    ]
  }
];
