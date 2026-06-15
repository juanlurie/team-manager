import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div style="text-align:center;padding:64px;opacity:0.35">
      @if (icon()) {
        <mat-icon style="font-size:3rem;width:3rem;height:3rem;opacity:0.3">{{icon()}}</mat-icon>
      }
      <div style="margin-top:12px;font-weight:600">{{title()}}</div>
      @if (subtitle()) {
        <div style="margin-top:4px;font-size:0.85rem">{{subtitle()}}</div>
      }
      @if (actionLabel()) {
        <button mat-raised-button color="primary" (click)="actionClick.emit()" style="margin-top:16px">
          {{actionLabel()}}
        </button>
      }
    </div>
  `
})
export class AppEmptyStateComponent {
  icon = input('');
  title = input.required<string>();
  subtitle = input('');
  actionLabel = input('');
  actionClick = output<void>();
}
