import { Routes } from '@angular/router';
import { GamesHubComponent } from './games-hub.component';

export const GAMES_ROUTES: Routes = [
  {
    path: '',
    component: GamesHubComponent,
    children: [
      { path: '', redirectTo: 'wordle', pathMatch: 'full' },
      {
        path: 'wordle',
        loadChildren: () => import('../wordle/wordle.routes').then(m => m.WORDLE_ROUTES)
      },
      {
        path: 'quiz-game',
        loadChildren: () => import('../quiz-game/quiz-game.routes').then(m => m.QUIZ_GAME_ROUTES)
      },
      {
        path: 'leaderboard',
        loadComponent: () => import('../leaderboard/leaderboard.component').then(m => m.LeaderboardComponent)
      }
    ]
  }
];
