import { Routes } from '@angular/router';

export const GAME_ULTIMATE_TTT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./game-ultimate-ttt.component').then(m => m.GameUltimateTttComponent)
  }
];
