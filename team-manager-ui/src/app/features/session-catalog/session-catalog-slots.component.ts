import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SessionDefinitionService } from '../../core/services/session-definition.service';
import { SlotLocationService } from '../../core/services/slot-location.service';
import { SessionDefinition, SlotTimeDefinition } from '../../core/models/session-definition.model';
import { SlotLocation } from '../../core/models/slot-location.model';
import { BookingGridComponent } from '../../shared/components/booking-grid/booking-grid.component';

@Component({
  selector: 'app-session-catalog-slots',
  standalone: true,
  imports: [CommonModule, MatButtonModule, BookingGridComponent],
  template: `
    <div class="page">
      @if (!item()) {
        <div class="loading">Loading...</div>
      } @else {
        @let i = item()!;

        <div class="breadcrumb">
          <a (click)="router.navigate(['/catalog'])">Catalog</a>
          <span> › </span>
          <a (click)="router.navigate(['/catalog', i.id])">{{ i.name }}</a>
          <span> › </span>
          <span>Create Time Slots</span>
        </div>

        <h2>{{ i.name }} — Create Time Slots</h2>

        @if (locations().length === 0) {
          <div class="warning">No locations configured. Ask an admin to create slot locations first.</div>
        } @else {
          <div class="section">
            <app-booking-grid
              [mode]="'create'"
              [locations]="locations()"
              [existingSlots]="i.slots"
              (cellClicked)="onCellClicked($event)"
            />
          </div>

          <div class="summary-bar">
            @for (loc of locations(); track loc.id) {
              @let count = countMap()[loc.id] ?? 0;
              @if (count > 0) {
                <span class="summary-item">
                  <span class="dot" [style.background]="loc.color"></span>
                  {{ loc.name }}: {{ count }}
                </span>
              }
            }
            @if (selectedSlots().length > 0) {
              <span>{{ selectedSlots().length }} slot{{ selectedSlots().length !== 1 ? 's' : '' }} selected</span>
              <button class="clear-btn" (click)="clearSlots()">Clear all</button>
            } @else {
              <span style="opacity:0.5">No slots selected</span>
            }
          </div>

          <div class="actions">
            <button mat-stroked-button (click)="goBack()">Cancel</button>
            <button mat-raised-button color="primary"
                    [disabled]="saving() || selectedSlots().length === 0"
                    (click)="saveSlots()">
              @if (saving()) { Saving... }
              @else { Save {{ selectedSlots().length }} Slot{{ selectedSlots().length !== 1 ? 's' : '' }} }
            </button>
          </div>
        }

        @if (error()) {
          <div class="error">{{ error() }}</div>
        }
      }
    </div>
  `,
  styles: [`
    .page { max-width:900px;margin:0 auto;padding:8px; }
    .loading { text-align:center;padding:40px;opacity:0.5; }
    .breadcrumb { font-size:0.75rem;opacity:0.5;margin-bottom:8px; }
    .breadcrumb a { color:#64b5f6;cursor:pointer; }
    .breadcrumb a:hover { text-decoration:underline; }
    h2 { margin:0 0 16px;font-size:1.2rem;font-weight:700; }
    .warning { padding:12px;border-radius:8px;background:rgba(255,152,0,0.1);border:1px solid rgba(255,152,0,0.2);color:#ff9800;font-size:0.85rem; }
    .section { margin-bottom:12px;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02); }
    .summary-bar { display:flex;gap:12px;align-items:center;flex-wrap:wrap;font-size:0.78rem;margin-bottom:12px;padding:8px 0; }
    .summary-item { display:flex;align-items:center;gap:4px; }
    .dot { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
    .clear-btn { cursor:pointer;color:#64b5f6;text-decoration:underline;font-size:0.72rem;margin-left:auto;background:none;border:none;font-family:inherit; }
    .actions { display:flex;gap:10px;margin-top:8px; }
    .error { color:#ef5350;font-size:0.82rem;margin-top:6px; }
  `]
})
export class SessionCatalogSlotsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  router = inject(Router);
  private svc = inject(SessionDefinitionService);
  private locSvc = inject(SlotLocationService);
  private snack = inject(MatSnackBar);

  item = signal<SessionDefinition | null>(null);
  locations = signal<SlotLocation[]>([]);
  selectedSlots = signal<SlotTimeDefinition[]>([]);
  saving = signal(false);
  error = signal<string | null>(null);

  countMap = computed(() => {
    const counts: Record<string, number> = {};
    for (const s of this.selectedSlots()) {
      if (s.locationId) counts[s.locationId] = (counts[s.locationId] || 0) + 1;
    }
    return counts;
  });

  ngOnInit() {
    this.locSvc.getAll(true).subscribe(locs => this.locations.set(locs));
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.load(id);
    });
  }

  load(id: string) {
    this.svc.getById(id).subscribe({
      next: item => this.item.set(item),
      error: () => this.router.navigate(['/catalog'])
    });
  }

  onCellClicked(slot: { date: string; startTime: string; endTime: string }) {
    const already = this.selectedSlots().find(
      s => s.date === slot.date && s.startTime === slot.startTime
    );
    if (already) {
      this.selectedSlots.set(this.selectedSlots().filter(s => s !== already));
    } else {
      this.selectedSlots.set([...this.selectedSlots(), { ...slot, locationId: null }]);
    }
  }

  clearSlots() { this.selectedSlots.set([]); }

  goBack() {
    const item = this.item();
    this.router.navigate(item ? ['/catalog', item.id] : ['/catalog']);
  }

  saveSlots() {
    if (this.selectedSlots().length === 0) return;
    const item = this.item();
    if (!item) return;
    this.saving.set(true);
    this.error.set(null);

    this.svc.createSlots(item.id, { slots: this.selectedSlots() }).subscribe({
      next: () => {
        this.snack.open(`${this.selectedSlots().length} slots created`, 'OK', { duration: 2000 });
        this.selectedSlots.set([]);
        this.load(item.id);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Failed to create slots');
      }
    });
  }
}
