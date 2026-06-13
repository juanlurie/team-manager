import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { ShowcaseDataService } from '../services/showcase-data.service';
import { SearchCapability } from '../models/showcase.model';

@Component({
  selector: 'app-searches-section',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="section">
      <h2 class="section-title">Search Capabilities</h2>
      <p class="section-desc">Multiple search and navigation patterns throughout the app so you can find what you need as fast as possible.</p>
      <div class="cards-grid">
        @for (cap of capabilities; track cap.name) {
          <div class="card">
            <div class="card-header">
              <mat-icon class="card-icon">{{ cap.icon }}</mat-icon>
              <div class="card-title-row">
                <span class="card-name">{{ cap.name }}</span>
                <span class="trigger-badge">{{ cap.trigger }}</span>
              </div>
            </div>
            <p class="card-desc">{{ cap.description }}</p>
            <ul class="feature-list">
              @for (f of cap.features; track f) {
                <li>{{ f }}</li>
              }
            </ul>
          </div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    .section { padding: 8px 0; }
    .section-title { font-size: 1.1rem; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 6px; }
    .section-desc { font-size: 0.82rem; color: rgba(255,255,255,0.45); margin: 0 0 20px; line-height: 1.5; }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    @media (max-width: 768px) {
      .cards-grid { grid-template-columns: 1fr; }
    }

    .card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 10px;
      padding: 20px;
      transition: background 0.15s, transform 0.15s;
    }
    .card:hover { background: rgba(255,255,255,0.05); transform: translateY(-2px); }

    .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .card-icon { color: #64b5f6; font-size: 22px; width: 22px; height: 22px; }
    .card-title-row { display: flex; align-items: center; gap: 8px; flex: 1; }
    .card-name { font-size: 0.95rem; font-weight: 600; color: rgba(255,255,255,0.85); }
    .trigger-badge {
      font-size: 0.7rem; font-weight: 600; color: #64b5f6;
      background: rgba(100,181,246,0.12); padding: 2px 8px; border-radius: 4px;
    }
    .card-desc { font-size: 0.82rem; color: rgba(255,255,255,0.55); margin: 0 0 12px; }
    .feature-list { list-style: none; padding: 0; margin: 0; }
    .feature-list li {
      font-size: 0.78rem; color: rgba(255,255,255,0.45); padding: 3px 0;
      padding-left: 14px; position: relative;
    }
    .feature-list li::before {
      content: '·'; position: absolute; left: 0; color: rgba(255,255,255,0.25);
    }
  `],
})
export class SearchesSectionComponent {
  private svc = inject(ShowcaseDataService);
  capabilities: SearchCapability[] = this.svc.getSearchCapabilities();
}
