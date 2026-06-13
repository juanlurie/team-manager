import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (spinner()) {
      <div style="display:flex;justify-content:center;padding:60px">
        <mat-spinner diameter="40" />
      </div>
    } @else {
      <div style="text-align:center;padding:64px;opacity:0.35">Loading...</div>
    }
  `
})
export class AppLoadingComponent {
  spinner = input(false);
}
