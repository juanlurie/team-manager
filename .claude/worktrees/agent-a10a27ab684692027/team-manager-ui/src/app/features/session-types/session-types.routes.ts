import { Routes } from '@angular/router';

export const SESSION_TYPES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./session-types.component').then(m => m.SessionTypesComponent)
  }
];
