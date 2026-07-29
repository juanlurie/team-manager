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
      // Moved out of Pulse: process diagrams document how delivery work flows, not team morale.
      {
        path: 'process-flows',
        loadComponent: () => import('./process-flow/process-flow.component').then(m => m.ProcessFlowComponent),
        data: { featureKey: 'process-flows' }
      },
      {
        path: 'process-flows/:id',
        loadComponent: () => import('./process-flow/process-flow.component').then(m => m.ProcessFlowComponent),
        data: { featureKey: 'process-flows' }
      },
      {
        path: 'export',
        loadComponent: () => import('../export/export-panel/export-panel.component').then(m => m.ExportPanelComponent),
        data: { featureKey: 'export' }
      },
    ]
  }
];
