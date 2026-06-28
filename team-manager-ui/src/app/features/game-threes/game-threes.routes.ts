import { Routes } from '@angular/router';

export const GAME_THREES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./game-threes.component').then(m => m.GameThreesComponent)
  }
];
