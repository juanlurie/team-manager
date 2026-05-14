import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SessionDefinitionService } from '../../core/services/session-definition.service';
import { SlotLocationService } from '../../core/services/slot-location.service';
import { SessionDefinition, SessionDefinitionSlot } from '../../core/models/session-definition.model';
import { SlotLocation } from '../../core/models/slot-location.model';
import { BookingGridComponent } from '../../shared/components/booking-grid/booking-grid.component';

@Component({
  selector: 'app-session-catalog-booking',
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
          <span>Book Your Slots</span>
        </div>

        <div class="header">
          <h2>{{ i.name }} — Book Your Slots</h2>
          <div class="participant-info">
            Mandatory: {{ mandatoryCount() }} · Optional: {{ optionalCount() }}
          </div>
        </div>

        @if (i.slots.length === 0) {
          <div class="empty-state">
            <p>No time slots available yet.</p>
            <span>The lead needs to create slots before you can book.</span>
            <div style="margin-top:12px">
              <button mat-stroked-button (click)="router.navigate(['/catalog', i.id])">← Back to Detail</button>
            </div>
          </div>
        } @else if (allConfirmed()) {
          <div class="all-confirmed">
            <p>All slots are confirmed</p>
            <app-booking-grid
              [mode]="'view'"
              [locations]="locations()"
              [existingSlots]="i.slots"
            />
          </div>
        } @else {
          <div class="section">
            <app-booking-grid
              [mode]="'book'"
              [locations]="locations()"
              [existingSlots]="i.slots"
              (slotClicked)="onSlotClicked($event)"
            />
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
    .header { margin-bottom:16px; }
    .header h2 { margin:0;font-size:1.2rem;font-weight:700; }
    .participant-info { font-size:0.82rem;opacity:0.5;margin-top:4px; }
    .empty-state { text-align:center;padding:40px; }
    .empty-state p { font-weight:600;margin:0 0 4px; }
    .empty-state span { font-size:0.82rem;opacity:0.5; }
    .all-confirmed { }
    .all-confirmed p { text-align:center;font-size:0.85rem;color:#81c784;font-weight:600;margin-bottom:12px; }
    .section { margin-bottom:12px;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02); }
    .error { color:#ef5350;font-size:0.82rem;margin-top:6px; }
  `]
})
export class SessionCatalogBookingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  router = inject(Router);
  private svc = inject(SessionDefinitionService);
  private locSvc = inject(SlotLocationService);
  private snack = inject(MatSnackBar);

  item = signal<SessionDefinition | null>(null);
  locations = signal<SlotLocation[]>([]);
  error = signal<string | null>(null);
  currentMemberId = signal<string | null>(null);

  mandatoryCount = computed(() => this.item()?.participants.filter(p => p.role === 'Mandatory').length ?? 0);
  optionalCount = computed(() => this.item()?.participants.filter(p => p.role === 'Optional').length ?? 0);
  allConfirmed = computed(() => this.item()?.slots.every(s => s.isConfirmed) ?? false);

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

  onSlotClicked(slot: SessionDefinitionSlot) {
    const item = this.item();
    if (!item) return;

    const myBooking = slot.bookings.find(b => b.teamMemberId === this.currentMemberId());
    if (myBooking) {
      this.svc.unbookSlot(item.id, slot.id).subscribe({
        next: updated => {
          this.item.set(updated);
          this.snack.open('Booking removed', 'OK', { duration: 2000 });
        },
        error: () => this.error.set('Could not unbook slot')
      });
    } else {
      this.svc.bookSlot(item.id, slot.id, { notes: null }).subscribe({
        next: updated => {
          this.item.set(updated);
          this.snack.open('Slot booked!', 'OK', { duration: 2000 });
        },
        error: () => this.error.set('Could not book slot')
      });
    }
  }
}
