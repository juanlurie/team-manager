import { Routes } from '@angular/router';
import { IntegrationsHubComponent } from './integrations-hub.component';

export const INTEGRATIONS_ROUTES: Routes = [
  // Standalone edit pages — must come before the hub route so Angular matches them directly
  // without rendering the hub (tabs) around them.
  {
    path: 'api-configs/new',
    loadComponent: () => import('../api-request-configs/api-request-config-edit.component').then(m => m.ApiRequestConfigEditComponent)
  },
  {
    path: 'api-configs/:id/edit',
    loadComponent: () => import('../api-request-configs/api-request-config-edit.component').then(m => m.ApiRequestConfigEditComponent)
  },
  {
    path: '',
    component: IntegrationsHubComponent,
    children: [
      { path: '', redirectTo: 'library', pathMatch: 'full' },
      {
        path: 'api-configs',
        loadComponent: () => import('../api-request-configs/api-request-configs.component').then(m => m.ApiRequestConfigsComponent)
      },
      {
        path: 'ai-prompts',
        loadChildren: () => import('../ai-prompts/ai-prompts.routes').then(m => m.AI_PROMPTS_ROUTES)
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
        path: 'library',
        loadComponent: () => import('./integration-library.component').then(m => m.IntegrationLibraryComponent)
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
