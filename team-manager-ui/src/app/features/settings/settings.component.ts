import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

interface ConfigCard {
  icon: string;
  label: string;
  description: string;
  path: string;
  color: string;
}

const CONFIG_CARDS: ConfigCard[] = [
  {
    icon: 'shield',
    label: 'Feature Permissions',
    description: 'Control which features are available to each role',
    path: '/settings/feature-permissions',
    color: '#64b5f6'
  },
  {
    icon: 'key',
    label: 'API Keys',
    description: 'Manage your personal API keys for programmatic access',
    path: '/settings/api-keys',
    color: '#4caf50'
  },
  {
    icon: 'api',
    label: 'Request Configs',
    description: 'API request templates tied to actions: fetch leave, add timesheet, etc.',
    path: '/request-configs',
    color: '#2196f3'
  },
  {
    icon: 'event',
    label: 'Session Types',
    description: 'Define meeting session types and durations',
    path: '/session-types',
    color: '#9c27b0'
  },
  {
    icon: 'location_on',
    label: 'Slot Locations',
    description: 'Manage physical or virtual meeting locations',
    path: '/slot-locations',
    color: '#ff9800'
  },
];

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <div class="settings-page">
      <div class="page-header">
        <mat-icon class="header-icon">settings</mat-icon>
        <h1>Settings</h1>
      </div>

      <div class="cards-grid">
        @for (card of cards; track card.path) {
          <a class="config-card" [routerLink]="card.path" [matTooltip]="card.description">
            <div class="card-icon" [style.background]="card.color + '22'" [style.color]="card.color">
              <mat-icon>{{ card.icon }}</mat-icon>
            </div>
            <div class="card-content">
              <h3>{{ card.label }}</h3>
              <p>{{ card.description }}</p>
            </div>
            <mat-icon class="card-arrow">chevron_right</mat-icon>
          </a>
        }
      </div>
    </div>
  `,
  styles: [`
    .settings-page { max-width: 900px; margin: 0 auto; padding: 8px; }
    .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 32px; }
    .header-icon { font-size: 28px; width: 28px; height: 28px; color: #64b5f6; }
    .page-header h1 { font-size: 1.3rem; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0; }

    .cards-grid { display: flex; flex-direction: column; gap: 8px; }

    .config-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 12px;
      text-decoration: none;
      color: inherit;
      transition: background 0.15s, border-color 0.15s, transform 0.15s;
    }
    .config-card:hover {
      background: rgba(255,255,255,0.06);
      border-color: rgba(255,255,255,0.12);
      transform: translateX(4px);
    }

    .card-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .card-icon mat-icon { font-size: 24px; width: 24px; height: 24px; }

    .card-content { flex: 1; min-width: 0; }
    .card-content h3 { font-size: 0.95rem; font-weight: 600; color: rgba(255,255,255,0.9); margin: 0 0 2px 0; }
    .card-content p { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 0; line-height: 1.3; }

    .card-arrow { color: rgba(255,255,255,0.2); flex-shrink: 0; }
    .config-card:hover .card-arrow { color: rgba(255,255,255,0.5); }
  `]
})
export class SettingsComponent {
  cards = CONFIG_CARDS;
}
