import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MilestoneScope } from '../../core/models/milestone.model';

@Component({
  selector: 'app-milestone-scope-badge',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  template: `
    @if (scope() === 'Global') {
      <span class="badge badge-global" [matTooltip]="'Global milestone — visible to all'">
        <mat-icon style="font-size:12px;width:12px;height:12px;line-height:12px;margin-right:3px">public</mat-icon>
        Global
      </span>
    } @else {
      <span class="badge badge-squad" [style.background]="squadBg()" [matTooltip]="squadName() || ''">
        <span class="squad-dot" [style.background]="squadColor() || '#9e9e9e'"></span>
        {{ squadName() || 'Squad' }}
      </span>
    }
  `,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.65rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .badge-global {
      background: rgba(33, 150, 243, 0.12);
      color: rgba(255, 255, 255, 0.6);
    }
    .badge-squad {
      color: rgba(255, 255, 255, 0.7);
    }
    .squad-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 5px;
      flex-shrink: 0;
    }
  `]
})
export class MilestoneScopeBadgeComponent {
  scope = input.required<MilestoneScope>();
  squadName = input<string | null>(null);
  squadColor = input<string | null>(null);

  squadBg = computed(() => {
    const color = this.squadColor();
    if (!color) return 'rgba(158, 158, 158, 0.12)';
    return this.hexToRgba(color, 0.12);
  });

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
