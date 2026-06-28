import { Routes } from '@angular/router';

export const GUEST_WOW_ROUTES: Routes = [
  {
    path: 'wow/:token',
    loadComponent: () => import('./guest-wow.component').then(m => m.GuestWowComponent)
  }
];
