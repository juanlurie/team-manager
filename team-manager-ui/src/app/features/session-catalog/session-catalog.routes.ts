import { Routes } from '@angular/router';

export const SESSION_CATALOG_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./session-catalog.component').then(m => m.SessionCatalogComponent)
  },
  {
    path: 'create',
    loadComponent: () => import('./session-catalog-create.component').then(m => m.SessionCatalogCreateComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./session-catalog-detail.component').then(m => m.SessionCatalogDetailComponent)
  },
  {
    path: ':id/slots',
    loadComponent: () => import('./session-catalog-slots.component').then(m => m.SessionCatalogSlotsComponent)
  },
  {
    path: ':id/book',
    loadComponent: () => import('./session-catalog-booking.component').then(m => m.SessionCatalogBookingComponent)
  }
];
