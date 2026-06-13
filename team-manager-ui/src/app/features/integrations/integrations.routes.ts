import { Routes } from '@angular/router';
import { IntegrationsHubComponent } from './integrations-hub.component';

export const INTEGRATIONS_ROUTES: Routes = [
  {
    path: '',
    component: IntegrationsHubComponent,
    children: [
      { path: '', redirectTo: 'api-configs', pathMatch: 'full' },
      {
        path: 'api-configs',
        loadComponent: () => import('../api-request-configs/api-request-configs.component').then(m => m.ApiRequestConfigsComponent)
      },
      {
        path: 'api-configs/new',
        loadComponent: () => import('../api-request-configs/api-request-config-edit.component').then(m => m.ApiRequestConfigEditComponent)
      },
      {
        path: 'api-configs/:id/edit',
        loadComponent: () => import('../api-request-configs/api-request-config-edit.component').then(m => m.ApiRequestConfigEditComponent)
      },
      {
        path: 'config-variables',
        loadComponent: () => import('../settings/config-variables/config-variables.component').then(m => m.ConfigVariablesComponent)
      },
      {
        path: 'credentials',
        loadComponent: () => import('../settings/portal-credentials/portal-credentials.component').then(m => m.PortalCredentialsComponent)
      },
      {
        path: 'sync-queue',
        loadComponent: () => import('../sync-queue/sync-queue.component').then(m => m.SyncQueueComponent)
      },
      {
        path: 'services',
        loadComponent: () => import('./connected-services.component').then(m => m.ConnectedServicesComponent)
      },
      {
        path: 'api-keys',
        loadComponent: () => import('../settings/api-keys/api-keys.component').then(m => m.ApiKeysComponent)
      },
    ]
  }
];
