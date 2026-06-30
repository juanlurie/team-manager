import { Routes } from '@angular/router';
import { DeliveryHubComponent } from './delivery-hub.component';

export const DELIVERY_ROUTES: Routes = [
  {
    path: '',
    component: DeliveryHubComponent,
    children: [
      { path: '', redirectTo: 'sprints', pathMatch: 'full' },
      {
        path: 'sprints',
        loadChildren: () => import('../sprints/sprints.routes').then(m => m.SPRINT_ROUTES),
        data: { featureKey: 'sprints' }
      },
      {
        path: 'features',
        loadComponent: () => import('../all-features/all-features.component').then(m => m.AllFeaturesComponent)
      },
      {
        path: 'progress',
        loadComponent: () => import('../progress/progress.component').then(m => m.ProgressComponent)
      },
      {
        path: 'export',
        loadComponent: () => import('../export/export-panel/export-panel.component').then(m => m.ExportPanelComponent),
        data: { featureKey: 'export' }
      },
    ]
  }
];
