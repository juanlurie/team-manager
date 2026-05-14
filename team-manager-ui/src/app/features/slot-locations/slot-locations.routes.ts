import { Routes } from '@angular/router';

export const SLOT_LOCATIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./slot-locations.component').then(m => m.SlotLocationsComponent)
  }
];
