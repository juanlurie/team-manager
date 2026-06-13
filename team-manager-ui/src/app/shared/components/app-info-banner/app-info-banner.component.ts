import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';

type BannerType = 'info' | 'warning' | 'success' | 'error';

const COLORS: Record<BannerType, { bg: string; border: string; text: string }> = {
  info:    { bg: 'rgba(100,181,246,0.08)', border: 'rgba(100,181,246,0.15)', text: '#64b5f6' },
  warning: { bg: 'rgba(255,152,0,0.08)',   border: 'rgba(255,152,0,0.2)',    text: '#ffb74d' },
  success: { bg: 'rgba(76,175,80,0.08)',   border: 'rgba(76,175,80,0.2)',    text: '#4caf50' },
  error:   { bg: 'rgba(239,83,80,0.08)',   border: 'rgba(239,83,80,0.3)',    text: '#ef5350' },
};

@Component({
  selector: 'app-info-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div [style.background]="colors().bg"
         [style.border]="'1px solid ' + colors().border"
         [style.color]="colors().text"
         style="border-radius:8px;padding:10px 14px;margin-bottom:16px;font-size:0.8rem">
      <ng-content />
    </div>
  `
})
export class AppInfoBannerComponent {
  type = input<BannerType>('info');
  colors = computed(() => COLORS[this.type()]);
}
