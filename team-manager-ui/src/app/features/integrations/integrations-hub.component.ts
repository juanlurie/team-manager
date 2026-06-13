import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, ActivatedRoute } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-integrations-hub',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, MatSnackBarModule],
  template: `
    <div class="hub">
      <nav class="hub-tabs" role="tablist">
        <a class="hub-tab" routerLink="api-configs" routerLinkActive="active" role="tab">Integrations</a>
        <a class="hub-tab" routerLink="config-variables" routerLinkActive="active" role="tab">Config Variables</a>
        <a class="hub-tab" routerLink="credentials" routerLinkActive="active" role="tab">Credentials</a>
        <a class="hub-tab" routerLink="sync-queue" routerLinkActive="active" role="tab">Sync Queue</a>
        <a class="hub-tab" routerLink="services" routerLinkActive="active" role="tab">Services</a>
        <a class="hub-tab" routerLink="api-keys" routerLinkActive="active" role="tab">API Keys</a>
      </nav>
      <div class="hub-content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .hub { max-width:1100px;margin:0 auto;padding:8px; }
    .hub-tabs {
      display:flex;gap:0;margin-bottom:16px;
      border-bottom:1px solid rgba(255,255,255,0.08);
      overflow-x:auto;scrollbar-width:none;
      -ms-overflow-style:none;
    }
    .hub-tabs::-webkit-scrollbar { display:none; }
    .hub-tab {
      padding:12px 16px;font-size:0.85rem;font-weight:500;
      color:rgba(255,255,255,0.45);text-decoration:none;
      border-bottom:2px solid transparent;
      transition:all 0.15s;white-space:nowrap;cursor:pointer;
      font-family:inherit;background:none;border-top:none;border-left:none;border-right:none;
    }
    .hub-tab:hover { color:rgba(255,255,255,0.75);background:rgba(255,255,255,0.04); }
    .hub-tab.active { color:#64b5f6;border-bottom-color:#64b5f6; }
    .hub-tab:focus-visible { outline:2px solid #64b5f6;outline-offset:-2px; }
    .hub-content { min-height:200px; }
  `]
})
export class IntegrationsHubComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

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
