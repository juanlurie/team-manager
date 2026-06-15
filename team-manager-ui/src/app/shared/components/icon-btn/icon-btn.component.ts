import { Component, Input, Output, EventEmitter, HostBinding, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-icon-btn',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <button mat-icon-button class="app-icon-btn-inner"
            [class.danger-btn]="danger"
            [color]="color"
            [disabled]="disabled"
            [matTooltip]="tooltip || ''"
            (click)="btnClick.emit($event)">
      <mat-icon>{{ icon }}</mat-icon>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    :host {
      display: inline-flex;
      flex-shrink: 0;
      vertical-align: middle;
    }
    button.app-icon-btn-inner {
      margin: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 0 !important;
      min-width: unset !important;
      width: var(--btn-size, 40px) !important;
      height: var(--btn-size, 40px) !important;
      line-height: 1 !important;
    }
    button.app-icon-btn-inner .mat-mdc-button-touch-target {
      width: var(--btn-size, 40px) !important;
      height: var(--btn-size, 40px) !important;
    }
    button.app-icon-btn-inner mat-icon {
      font-size: var(--icon-size, 20px) !important;
      width: var(--icon-size, 20px) !important;
      height: var(--icon-size, 20px) !important;
      line-height: var(--icon-size, 20px) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    button.app-icon-btn-inner.danger-btn mat-icon {
      opacity: 0.45;
      transition: opacity 0.15s ease;
    }
    button.app-icon-btn-inner.danger-btn:hover mat-icon {
      opacity: 1 !important;
    }
  `]
})
export class IconButtonComponent {
  @Input() icon = '';
  @Input() tooltip = '';
  @Input() color: string | null = null;
  @Input() disabled = false;
  @Input() danger = false;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Output() btnClick = new EventEmitter<MouseEvent>();

  @HostBinding('style.--btn-size') get btnSize() {
    return { sm: '32px', md: '40px', lg: '48px' }[this.size];
  }
  @HostBinding('style.--icon-size') get iconSize() {
    return { sm: '16px', md: '20px', lg: '24px' }[this.size];
  }
}
