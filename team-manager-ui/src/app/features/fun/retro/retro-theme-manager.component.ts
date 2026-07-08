import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RetroThemeEditorComponent } from './retro-theme-editor.component';

// Standalone page for authoring the shared retro theme library, reachable outside any active
// retro session (unlike the old settings-drawer-only CRUD). Thin host -- all the actual editing
// logic lives in RetroThemeEditorComponent (mode="full"), shared with the in-session picker.
@Component({
  selector: 'app-retro-theme-manager',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, RetroThemeEditorComponent],
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    :host { display:block;padding:8px 0; }
    .header { display:flex;align-items:center;gap:8px;margin-bottom:16px; }
    .title { font-size:1.1rem;font-weight:600;color:rgba(255,255,255,0.9); }
  `],
  template: `
    <div class="header">
      <button mat-icon-button (click)="back()">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <span class="title">Theme Manager</span>
    </div>
    <app-retro-theme-editor mode="full" />
  `,
})
export class RetroThemeManagerComponent {
  private router = inject(Router);

  back(): void {
    this.router.navigate(['/pulse/retro']);
  }
}
