import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ShowcaseDataService } from '../services/showcase-data.service';
import { FeatureCard } from '../models/showcase.model';

@Component({
  selector: 'app-features-section',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink],
  template: `
    <div class="section">
      <h2 class="section-title">System Features</h2>
      <div class="feature-grid">
        @for (card of featureCards; track card.domain) {
          <a class="feature-card" [routerLink]="card.route" [style.border-left-color]="card.color">
            <mat-icon class="card-icon" [style.color]="card.color">{{ card.icon }}</mat-icon>
            <span class="card-domain">{{ card.domain }}</span>
            <p class="card-desc">{{ card.description }}</p>
            @if (card.tags && card.tags.length) {
              <div class="card-tags">
                @for (tag of card.tags; track tag) {
                  <span class="tag">{{ tag }}</span>
                }
              </div>
            }
          </a>
        }
      </div>
    </div>
  `,
  styles: [`
    .section { padding: 8px 0; }
    .section-title { font-size: 1.1rem; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 20px; }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 14px;
    }
    @media (max-width: 1200px) { .feature-grid { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 768px) { .feature-grid { grid-template-columns: repeat(2, 1fr); } }

    .feature-card {
      display: flex; flex-direction: column; align-items: center; text-align: center;
      padding: 20px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
      border-left: 3px solid transparent; border-radius: 10px; text-decoration: none;
      transition: background 0.15s, transform 0.15s; cursor: pointer;
    }
    .feature-card:hover { background: rgba(255,255,255,0.05); transform: translateY(-2px); }

    .card-icon { font-size: 28px; width: 28px; height: 28px; margin-bottom: 8px; }
    .card-domain { font-size: 0.85rem; font-weight: 600; color: rgba(255,255,255,0.8); margin-bottom: 4px; }
    .card-desc { font-size: 0.72rem; color: rgba(255,255,255,0.4); margin: 0 0 12px; line-height: 1.3; }

    .card-tags { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
    .tag {
      font-size: 0.62rem; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.03em;
      background: rgba(255,255,255,0.06); border-radius: 4px; padding: 3px 8px;
    }
  `],
})
export class FeaturesSectionComponent {
  private svc = inject(ShowcaseDataService);
  featureCards: FeatureCard[] = this.svc.getFeatureCards();
}
