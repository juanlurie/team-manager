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
        path: 'dots-and-boxes',
        loadChildren: () => import('../dots-and-boxes/dots-and-boxes.routes').then(m => m.DOTS_AND_BOXES_ROUTES)
      },
      {
        path: '2048',
        loadChildren: () => import('../game-2048/game-2048.routes').then(m => m.GAME_2048_ROUTES)
      },
      {
        path: 'threes',
        loadChildren: () => import('../game-threes/game-threes.routes').then(m => m.GAME_THREES_ROUTES)
      },
      {
        path: 'leaderboard',
        loadComponent: () => import('../leaderboard/leaderboard.component').then(m => m.LeaderboardComponent)
      }
    ]
  }
];
