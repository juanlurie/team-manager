import { Routes } from '@angular/router';

export const GAME_CONNECTIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./game-connections.component').then(m => m.GameConnectionsComponent),
  }
];
