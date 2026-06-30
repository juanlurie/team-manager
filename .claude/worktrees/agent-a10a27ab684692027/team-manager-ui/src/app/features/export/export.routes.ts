import { Routes } from '@angular/router';

export const EXPORT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./export-panel/export-panel.component').then(m => m.ExportPanelComponent)
  }
];
