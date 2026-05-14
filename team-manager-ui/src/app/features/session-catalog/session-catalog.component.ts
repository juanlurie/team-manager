import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SessionDefinitionService } from '../../core/services/session-definition.service';
import { SessionDefinition } from '../../core/models/session-definition.model';

@Component({
  selector: 'app-session-catalog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page">
      <div class="header">
        <h2>Session Catalog</h2>
        <button mat-raised-button color="primary" (click)="router.navigate(['/catalog/create'])">
          <mat-icon>add</mat-icon> Create Item
        </button>
      </div>

      @if (loading()) {
        <div class="loading">Loading...</div>
      } @else if (error()) {
        <div class="error-state">
          <mat-icon>error_outline</mat-icon>
          <p>Could not load catalog</p>
          <button mat-stroked-button (click)="load()">Retry</button>
        </div>
      } @else if (items().length === 0) {
        <div class="empty-state">
          <mat-icon>list_alt</mat-icon>
          <p>No catalog items yet</p>
          <span>Create the first session catalog item to get started.</span>
          <button mat-raised-button color="primary" (click)="router.navigate(['/catalog/create'])">
            <mat-icon>add</mat-icon> Create Catalog Item
          </button>
        </div>
      } @else {
        <div class="catalog-list">
          @for (item of items(); track item.id) {
            <div class="session-card" (click)="router.navigate(['/catalog', item.id])">
              <div class="card-header">
                <span class="participant-badge">
                  <mat-icon>people</mat-icon>
                  {{ mandatoryCount(item) }} mandatory{{ optionalCount(item) > 0 ? ' / ' + optionalCount(item) + ' optional' : '' }}
                </span>
              </div>
              <h3>{{ item.name }}</h3>
              @if (item.description) {
                <p class="desc">{{ item.description }}</p>
              }
              <div class="card-meta">
                <span>{{ item.slots.length }} slot{{ item.slots.length !== 1 ? 's' : '' }}</span>
                <span>·</span>
                <span>{{ filledCount(item) }}/{{ mandatoryCount(item) }} mandatory filled</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" [style.width.%]="fillPercent(item)"></div>
              </div>
              <div class="card-actions">
                <button mat-stroked-button (click)="router.navigate(['/catalog', item.id]); $event.stopPropagation()">View</button>
                <button class="delete-btn" (click)="deleteItem(item.id); $event.stopPropagation()">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width:900px;margin:0 auto;padding:8px; }
    .header { display:flex;justify-content:space-between;align-items:center;margin-bottom:24px; }
    .header h2 { margin:0;font-size:1.3rem;font-weight:700; }
    .loading { text-align:center;padding:40px;opacity:0.5; }
    .error-state,.empty-state { text-align:center;padding:60px 20px;display:flex;flex-direction:column;align-items:center;gap:8px; }
    .error-state mat-icon,.empty-state mat-icon { font-size:48px;width:48px;height:48px;opacity:0.3;margin-bottom:8px; }
    .empty-state span { font-size:0.85rem;opacity:0.5;margin-bottom:12px; }
    .catalog-list { display:flex;flex-direction:column;gap:12px; }
    .session-card { padding:16px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02);cursor:pointer;transition:background 0.12s; }
    .session-card:hover { background:rgba(255,255,255,0.04); }
    .card-header { margin-bottom:8px; }
    .participant-badge { display:inline-flex;align-items:center;gap:4px;font-size:0.72rem;padding:3px 10px;border-radius:10px;background:rgba(100,181,246,0.12);color:#64b5f6; }
    .participant-badge mat-icon { font-size:14px;width:14px;height:14px; }
    .session-card h3 { margin:0 0 4px;font-size:1rem;font-weight:600; }
    .desc { margin:0 0 8px;font-size:0.82rem;opacity:0.6; }
    .card-meta { font-size:0.78rem;opacity:0.5;display:flex;gap:6px;margin-bottom:6px; }
    .progress-bar { height:3px;background:rgba(255,255,255,0.06);border-radius:2px;margin-bottom:8px;overflow:hidden; }
    .progress-fill { height:100%;background:rgba(100,181,246,0.5);border-radius:2px;transition:width 0.3s; }
    .card-actions { display:flex;gap:8px;align-items:center; }
    .card-actions button { font-size:0.78rem;font-family:inherit; }
    .delete-btn { background:none;border:none;color:rgba(255,255,255,0.3);cursor:pointer;padding:4px;margin-left:auto; }
    .delete-btn:hover { color:#ef5350; }
  `]
})
export class SessionCatalogComponent implements OnInit {
  private svc = inject(SessionDefinitionService);
  private snack = inject(MatSnackBar);
  router = inject(Router);

  items = signal<SessionDefinition[]>([]);
  loading = signal(true);
  error = signal(false);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.error.set(false);
    this.svc.getAll().subscribe({
      next: items => { this.items.set(items); this.loading.set(false); },
      error: () => { this.loading.set(false); this.error.set(true); }
    });
  }

  mandatoryCount(item: SessionDefinition) { return item.participants.filter(p => p.role === 'Mandatory').length; }
  optionalCount(item: SessionDefinition) { return item.participants.filter(p => p.role === 'Optional').length; }
  filledCount(item: SessionDefinition) {
    const mandatoryIds = new Set(item.participants.filter(p => p.role === 'Mandatory').map(p => p.teamMemberId));
    const bookedIds = new Set(item.slots.flatMap(s => s.bookings).map(b => b.teamMemberId));
    return [...mandatoryIds].filter(id => bookedIds.has(id)).length;
  }
  fillPercent(item: SessionDefinition) {
    const m = this.mandatoryCount(item);
    if (m === 0) return 0;
    return Math.round((this.filledCount(item) / m) * 100);
  }

  deleteItem(id: string) {
    if (!confirm('Delete this catalog item?')) return;
    this.svc.delete(id).subscribe({
      next: () => { this.items.set(this.items().filter(i => i.id !== id)); this.snack.open('Deleted', 'OK', { duration: 2000 }); },
      error: () => this.snack.open('Failed to delete', 'OK', { duration: 2000 })
    });
  }
}
