import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type RetroCanvasTool = 'select' | 'add-card';

/** Minimal icon-only tool sidebar for the single-canvas retro board -- Select/Pan (default)
 *  and Add-Card (click-to-place). Deliberately does not replicate a full whiteboard tool
 *  palette (shapes/frames/connectors/etc.) -- zoom controls stay in their existing
 *  bottom-right cluster rather than moving here. */
@Component({
  selector: 'app-retro-canvas-sidebar',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .sidebar {
      position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
      display: flex; flex-direction: column; gap: 4px;
      background: rgba(20,20,24,0.85); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px; padding: 6px; z-index: 5;
    }
    .tool-btn {
      display:flex;align-items:center;justify-content:center;
      width:32px;height:32px;border-radius:8px;
      background:transparent;border:none;cursor:pointer;
      color:rgba(255,255,255,0.6);transition:background .12s,color .12s;
    }
    .tool-btn:hover { background:rgba(255,255,255,0.1);color:#fff; }
    .tool-btn.active { background:rgba(100,181,246,0.18);color:#64b5f6; }
    .tool-btn mat-icon { font-size:18px;width:18px;height:18px;line-height:18px; }
  `],
  template: `
    <div class="sidebar" (mousedown)="$event.stopPropagation()">
      <button class="tool-btn" [class.active]="activeTool() === 'select'" title="Select / Pan"
              (click)="toolSelected.emit('select')">
        <mat-icon>near_me</mat-icon>
      </button>
      <button class="tool-btn" [class.active]="activeTool() === 'add-card'" title="Add card"
              (click)="toolSelected.emit('add-card')">
        <mat-icon>note_add</mat-icon>
      </button>
    </div>
  `,
})
export class RetroCanvasSidebarComponent {
  activeTool = input<RetroCanvasTool>('select');
  toolSelected = output<RetroCanvasTool>();
}
