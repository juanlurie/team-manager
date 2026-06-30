import { Routes } from '@angular/router';

export const GAME_2048_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./game-2048.component').then(m => m.Game2048Component),
  }
];
