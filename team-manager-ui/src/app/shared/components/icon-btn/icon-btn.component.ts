import { Component, Input, Output, EventEmitter, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-icon-btn',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <button mat-icon-button
            [class]="btnClass"
            [color]="color"
            [disabled]="disabled"
            [matTooltip]="tooltip || ''"
            (click)="btnClick.emit($event)">
      <mat-icon>{{ icon }}</mat-icon>
    </button>
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; justify-content: center; line-height: 0; }
    button { margin: 0; padding: 0; border-radius: 50%; }
    mat-icon { display: flex; align-items: center; justify-content: center; }
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

  @HostBinding('style.width') get btnWidth() {
    return { sm: '32px', md: '40px', lg: '48px' }[this.size];
  }
  @HostBinding('style.height') get btnHeight() {
    return { sm: '32px', md: '40px', lg: '48px' }[this.size];
  }
  @HostBinding('style.flex-shrink') get flexShrink() {
    return '0';
  }

  get btnClass() {
    const classes: string[] = [];
    if (this.danger) classes.push('danger-btn');
    return classes.join(' ');
  }
}
