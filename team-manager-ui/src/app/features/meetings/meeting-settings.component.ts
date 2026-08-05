import { Component, signal, ChangeDetectionStrategy } from '@angular/core';

import { LocationsConfigComponent } from './locations-config.component';
import { SessionTypesComponent } from '../session-types/session-types.component';

type SettingsPanel = 'locations' | 'session-types';

// Locations and Session Types were separate top-level hub tabs even though both are just
// meeting-configuration screens nobody visits often -- folded into one tab with a small local
// toggle instead of consuming a slot in the main Meetings nav.
@Component({
  selector: 'app-meeting-settings',
  standalone: true,
  imports: [LocationsConfigComponent, SessionTypesComponent],
  template: `
    <div class="page">
      <div class="panel-toggle">
        <button class="toggle-btn" [class.active]="panel() === 'locations'" (click)="panel.set('locations')">
          Locations
        </button>
        <button class="toggle-btn" [class.active]="panel() === 'session-types'" (click)="panel.set('session-types')">
          Session Types
        </button>
      </div>
      @if (panel() === 'locations') {
        <app-locations-config />
      } @else {
        <app-session-types />
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .page { max-width:900px;margin:0 auto;padding:8px; }
    .panel-toggle { display:flex;gap:6px;margin-bottom:20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:4px;width:fit-content; }
    .toggle-btn { border:none;background:transparent;color:rgba(255,255,255,0.55);font-size:0.82rem;font-weight:600;padding:7px 16px;border-radius:7px;cursor:pointer;font-family:inherit;transition:background 0.15s,color 0.15s; }
    .toggle-btn:hover { color:rgba(255,255,255,0.85); }
    .toggle-btn.active { background:rgba(100,181,246,0.15);color:#64b5f6; }
  `]
})
export class MeetingSettingsComponent {
  panel = signal<SettingsPanel>('locations');
}
