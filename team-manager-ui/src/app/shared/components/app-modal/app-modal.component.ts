import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    @if (show()) {
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000"
           (click)="closed.emit()">
        <div [style.max-width]="maxWidth()"
             style="background:#1e1e2e;border-radius:16px;padding:24px;width:90%;max-height:85dvh;overflow-y:auto;overscroll-behavior:contain;border:1px solid rgba(255,255,255,0.1);-webkit-overflow-scrolling:touch"
             (click)="$event.stopPropagation()">
          <h3 style="margin:0 0 16px;font-size:1.1rem;font-weight:700">{{title()}}</h3>
          <ng-content />
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;position:sticky;bottom:0;background:#1e1e2e;padding-top:8px">
            <ng-content select="[modal-footer]" />
          </div>
        </div>
      </div>
    }
  `
})
export class AppModalComponent {
  title = input.required<string>();
  show = input.required<boolean>();
  maxWidth = input('440px');
  closed = output<void>();
}
