import { Routes } from '@angular/router';
import { PulseHubComponent } from './fun-hub.component';

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
        path: 'retro',
        loadComponent: () => import('./retro/retro.component').then(m => m.FunRetroComponent)
      },
      {
        // Must precede 'retro/:id' -- static segments have to be listed before param segments
        // in the same array or 'retro/:id' greedily matches 'retro/themes' with id='themes'.
        path: 'retro/themes',
        loadComponent: () => import('./retro/retro-theme-manager.component').then(m => m.RetroThemeManagerComponent)
      },
      {
        path: 'retro/:id',
        loadComponent: () => import('./retro/retro.component').then(m => m.FunRetroComponent)
      },
      {
        path: 'jokes',
        loadComponent: () => import('../jokes/jokes.component').then(m => m.JokesComponent)
      },
      {
        path: 'process-flows',
        loadComponent: () => import('./process-flow/process-flow.component').then(m => m.ProcessFlowComponent)
      },
      {
        path: 'process-flows/:id',
        loadComponent: () => import('./process-flow/process-flow.component').then(m => m.ProcessFlowComponent)
      },
      {
        path: 'personal-maps',
        loadComponent: () => import('./personal-map/personal-map.component').then(m => m.PersonalMapComponent)
      },
      {
        path: 'personal-maps/:id',
        loadComponent: () => import('./personal-map/personal-map.component').then(m => m.PersonalMapComponent)
      }
    ]
  }
];
