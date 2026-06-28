import { Routes } from '@angular/router';

export const DOTS_AND_BOXES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./dots-and-boxes.component').then(m => m.DotsAndBoxesComponent)
  }
];
