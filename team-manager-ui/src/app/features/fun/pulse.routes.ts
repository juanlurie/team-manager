import { Routes } from '@angular/router';
import { PulseHubComponent } from './fun-hub.component';
import { RetroHubComponent } from './retro/retro-hub.component';

export const PULSE_ROUTES: Routes = [
  {
    path: '',
    component: PulseHubComponent,
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
        path: 'coffee-run',
        loadChildren: () => import('../coffee-run/coffee-run.routes').then(m => m.COFFEE_RUN_ROUTES)
      },
      {
        path: 'manage-menus',
        loadChildren: () => import('../manage-menus/manage-menus.routes').then(m => m.MANAGE_MENUS_ROUTES)
      },
      {
        path: 'wheel',
        loadChildren: () => import('../wheel/wheel.routes').then(m => m.WHEEL_ROUTES)
      },
      {
        path: 'scrum-poker',
        loadChildren: () => import('../scrum-poker/scrum-poker.routes').then(m => m.SCRUM_POKER_ROUTES)
      },
      {
        path: 'polls',
        loadChildren: () => import('../polls/poll.routes').then(m => m.POLL_ROUTES)
      },
      {
        // Nested hub: one Pulse tab, its own row for classic retro / board / themes.
        path: 'retro',
        component: RetroHubComponent,
        children: [
          { path: '', redirectTo: 'classic', pathMatch: 'full' },
          {
            path: 'classic',
            loadComponent: () => import('./retro/retro.component').then(m => m.FunRetroComponent)
          },
          {
            path: 'classic/:id',
            loadComponent: () => import('./retro/retro.component').then(m => m.FunRetroComponent)
          },
          {
            path: 'themes',
            loadComponent: () => import('./retro/retro-theme-manager.component').then(m => m.RetroThemeManagerComponent)
          },
          {
            path: 'board',
            loadComponent: () => import('./retro-board/retro-board.component').then(m => m.RetroBoardComponent)
          },
          {
            path: 'board/:id',
            loadComponent: () => import('./retro-board/retro-board.component').then(m => m.RetroBoardComponent)
          },
          // Legacy /pulse/retro/<slug> share links. Must stay last -- a param segment listed before
          // the static ones would greedily swallow 'classic', 'board' and 'themes'.
          { path: ':id', redirectTo: 'classic/:id' },
        ]
      },
      // Legacy retro-board links (shared before the retro hub existed).
      { path: 'retro-board', redirectTo: 'retro/board', pathMatch: 'full' },
      { path: 'retro-board/:id', redirectTo: 'retro/board/:id' },
      // Moved out of Pulse; keep old links working.
      { path: 'process-flows', redirectTo: '/delivery/process-flows', pathMatch: 'full' },
      { path: 'process-flows/:id', redirectTo: '/delivery/process-flows/:id' },
      {
        path: 'jokes',
        loadComponent: () => import('../jokes/jokes.component').then(m => m.JokesComponent)
      },
      // Personal maps moved to the individual team member (/team/:memberId/personal-maps). The
      // target depends on who is asking, so a shim component resolves it against the current user.
      {
        path: 'personal-maps',
        loadComponent: () => import('../team/personal-map/personal-map-redirect.component').then(m => m.PersonalMapRedirectComponent)
      },
      {
        path: 'personal-maps/:id',
        loadComponent: () => import('../team/personal-map/personal-map-redirect.component').then(m => m.PersonalMapRedirectComponent)
      }
    ]
  }
];
