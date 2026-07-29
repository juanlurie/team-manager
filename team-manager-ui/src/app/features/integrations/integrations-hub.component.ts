import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { RouterOutlet, ActivatedRoute } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HubTabsComponent, HubTab } from '../../shared/components/hub-tabs/hub-tabs.component';

const INTEGRATIONS_TABS: HubTab[] = [
  { label: 'Library',             route: 'library' },
  { label: 'Custom Integrations', route: 'api-configs' },
  { label: 'AI Prompts',          route: 'ai-prompts' },
  { label: 'Config Variables',    route: 'config-variables' },
  { label: 'Credentials',         route: 'credentials' },
  { label: 'Sync Queue',          route: 'sync-queue' },
  { label: 'Services',            route: 'services' },
  { label: 'API Keys',            route: 'api-keys' },
];

@Component({
  selector: 'app-integrations-hub',
  standalone: true,
  imports: [RouterOutlet, MatSnackBarModule, HubTabsComponent],
  template: `
    <div class="hub">
      <app-hub-tabs [tabs]="tabs" />
      <div class="hub-content">
        <router-outlet />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .hub { max-width:1100px;margin:0 auto;padding:8px; }
    .hub-content { min-height:200px; }
  `]
})
export class IntegrationsHubComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  readonly tabs = INTEGRATIONS_TABS;

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('outlook') === 'connected') {
      this.snackBar.open('Outlook Calendar connected!', 'Close', { duration: 4000 });
    } else if (params.get('outlook_error')) {
      this.snackBar.open('Outlook connection failed: ' + params.get('outlook_error'), 'Close', { duration: 5000 });
    } else if (params.get('gcal') === 'connected') {
      this.snackBar.open('Google Calendar connected!', 'Close', { duration: 4000 });
    } else if (params.get('gcal_error')) {
      this.snackBar.open('Google connection failed: ' + params.get('gcal_error'), 'Close', { duration: 5000 });
    }
  }
}
