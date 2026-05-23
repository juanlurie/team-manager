import { Routes } from '@angular/router';

export const MANAGE_MENUS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./manage-menus.component').then(m => m.ManageMenusComponent)
  }
];
