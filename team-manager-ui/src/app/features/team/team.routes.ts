import { Routes } from '@angular/router';

export const TEAM_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./team-list/team-list.component').then(m => m.TeamListComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./team-member-personal/team-member-personal.component').then(m => m.TeamMemberPersonalComponent)
  }
];
