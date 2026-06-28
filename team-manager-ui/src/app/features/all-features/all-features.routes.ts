import { Routes } from '@angular/router';

export const ALL_FEATURES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./all-features.component').then(m => m.AllFeaturesComponent)
  }
];
