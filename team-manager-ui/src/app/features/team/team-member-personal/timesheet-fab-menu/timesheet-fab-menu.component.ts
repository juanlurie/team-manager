import { Component, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-timesheet-fab-menu',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .fab { position:fixed; bottom:80px; right:16px; z-index:1000; }
    .fab-btn { width:56px; height:56px; border-radius:50%; background:#64b5f6; border:none; color:#0f1923; font-size:24px; font-weight:700; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.4); transition:transform 0.1s, box-shadow 0.1s; }
    .fab-btn:active { transform:scale(0.95); box-shadow:0 2px 8px rgba(0,0,0,0.3); }
    .menu { position:absolute; bottom:66px; right:0; display:flex; flex-direction:column; gap:8px; align-items:flex-end; }
    .opt { display:flex; align-items:center; gap:8px; }
    .opt-lbl { font-size:12px; font-weight:600; color:rgba(255,255,255,0.8); background:rgba(0,0,0,0.6); padding:4px 10px; border-radius:6px; white-space:nowrap; }
    .opt-btn { width:44px; height:44px; border-radius:50%; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 3px 10px rgba(0,0,0,0.3); font-size:18px; }
    .opt-btn.add { background:#64b5f6; color:#0f1923; }
    .opt-btn.cfg { background:rgba(255,255,255,0.15); color:rgba(255,255,255,0.8); }
  `],
  template: `
    <div class="fab">
      @if (open()) {
        <div class="menu">
          <div class="opt">
            <span class="opt-lbl">Settings</span>
            <button class="opt-btn cfg" (click)="config.emit();open.set(false)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
          </div>
          <div class="opt">
            <span class="opt-lbl">Log time</span>
            <button class="opt-btn add" (click)="add.emit();open.set(false)">
              <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 2v10M2 7h10"/></svg>
            </button>
          </div>
        </div>
      }
      <button class="fab-btn" (click)="open.set(!open())">
        @if (open()) {
          <svg width="22" height="22" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3l8 8M11 3l-8 8"/></svg>
        } @else {
          <svg width="22" height="22" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 2v10M2 7h10"/></svg>
        }
      </button>
    </div>
  `
})
export class TimesheetFabMenuComponent {
  open = signal(false);
  add = output<void>();
  config = output<void>();
}
