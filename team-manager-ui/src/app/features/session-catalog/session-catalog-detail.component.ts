import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SessionDefinitionService } from '../../core/services/session-definition.service';
import { SessionDefinition, SessionDefinitionSlot } from '../../core/models/session-definition.model';
import { MeetingSession } from '../../core/models/meeting-session.model';
import { BookingGridComponent, BookingGridMode } from '../../shared/components/booking-grid/booking-grid.component';
import { SlotLocationService } from '../../core/services/slot-location.service';
import { SlotLocation } from '../../core/models/slot-location.model';

@Component({
  selector: 'app-session-catalog-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule, BookingGridComponent],
  template: `
    <div class="page">
      @if (loading()) {
        <div class="spinner-wrap"><mat-spinner diameter="40"></mat-spinner></div>
      } @else if (!item()) {
        <div class="error-state">
          <h2>Session not found</h2>
          <button mat-stroked-button (click)="router.navigate(['/catalog'])">Back to Catalog</button>
        </div>
      } @else {
        @let i = item()!;

        <div class="breadcrumb">
          <a (click)="router.navigate(['/catalog'])">Catalog</a>
          <span> › </span>
          <span>{{ i.name }}</span>
        </div>

        <div class="header">
          <div>
            <h2>{{ i.name }}</h2>
            @if (i.description) {
              <p class="desc">{{ i.description }}</p>
            }
            <div class="meta">
              Created by {{ i.createdByMemberName }} · {{ i.createdAt | date:'mediumDate' }}
            </div>
          </div>
          <div class="header-actions">
            <button mat-stroked-button (click)="deleteItem()">
              <mat-icon>delete</mat-icon> Delete
            </button>
          </div>
        </div>

        <div class="section">
          <div class="section-label">Participants</div>
          <div class="participant-group">
            <div class="group-label" style="color:#64b5f6">
              <span class="dot" style="background:#64b5f6"></span>
              Mandatory ({{ mandatoryCount() }})
            </div>
            <div class="member-chips">
              @for (p of mandatoryParticipants(); track p.id) {
                <span class="chip"><span class="dot" style="background:#64b5f6"></span>{{ p.teamMemberName }}</span>
              }
            </div>
          </div>
          <div class="participant-group">
            <div class="group-label" style="color:#81c784">
              <span class="dot" style="background:#81c784"></span>
              Optional ({{ optionalCount() }})
            </div>
            <div class="member-chips">
              @for (p of optionalParticipants(); track p.id) {
                <span class="chip"><span class="dot" style="background:#81c784"></span>{{ p.teamMemberName }}</span>
              }
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-label">Slots</div>
          <div class="slots-summary">
            <span>{{ i.slots.length }} slot{{ i.slots.length !== 1 ? 's' : '' }}</span>
            <span>·</span>
            <span>{{ mandatoryFilledCount() }}/{{ mandatoryCount() }} mandatory filled</span>
          </div>

          @if (i.slots.length === 0) {
            <div class="empty-slots">
              <p>No time slots created yet.</p>
              <span>Create available time windows for team members to book.</span>
              <div style="margin-top:12px">
                <button mat-raised-button color="primary" (click)="router.navigate(['/catalog', i.id, 'slots'])">
                  <mat-icon>add</mat-icon> Create Slots
                </button>
              </div>
            </div>
          } @else {
            <div class="slot-list">
              @for (slot of i.slots; track slot.id) {
                <div class="slot-row">
                  <div class="slot-info">
                    <span class="slot-date">{{ slot.date }}</span>
                    <span class="slot-time">{{ slot.startTime }}–{{ slot.endTime }}</span>
                    @if (slot.locationName) {
                      <span class="slot-loc-dot" [style.background]="slot.locationColor"></span>
                      <span class="slot-loc">{{ slot.locationName }}</span>
                    }
                  </div>
                  <div class="slot-status">
                    @if (slot.isConfirmed) {
                      <span class="status-confirmed">✓ Confirmed</span>
                    }
                    <span class="slot-count" [class.warn]="slot.bookingCount < slot.mandatoryCount">
                      {{ slot.bookingCount }}/{{ slot.mandatoryCount }} booked
                    </span>
                  </div>
                  @if (slot.connectedMeetingSessionId) {
                    <a class="slot-meeting-link" [routerLink]="['/meetings', slot.connectedMeetingSessionId]">
                      🔗 Meeting Created → [View Meeting]
                    </a>
                  }
                </div>
              }
            </div>
          }

          <div class="slot-actions">
            <button mat-raised-button color="primary" (click)="router.navigate(['/catalog', i.id, 'slots'])">
              <mat-icon>add</mat-icon> Create Slots
            </button>
            <button mat-stroked-button (click)="router.navigate(['/catalog', i.id, 'book'])"
                    [disabled]="i.slots.length === 0">
              <mat-icon>event</mat-icon> Book Slots
            </button>
          </div>
        </div>

        @if (i.slots.length > 0) {
          <div class="section">
            <div class="section-label">Slot Preview</div>
            <app-booking-grid
              [mode]="'view'"
              [locations]="locations()"
              [existingSlots]="i.slots"
            />
          </div>
        }

        <!-- Connected Meetings -->
        <div class="section connected-section">
          <div class="section-label">
            Connected Meetings {{ connectedMeetings().length > 0 ? '(' + connectedMeetings().length + ')' : '' }}
          </div>
          @if (connectedMeetings().length === 0) {
            <div style="text-align:center;padding:20px;opacity:0.4;font-size:0.82rem">
              No meetings created yet.<br>
              Meetings auto-appear here once all mandatory participants have booked a slot.
            </div>
          } @else {
            <div style="font-size:0.78rem;opacity:0.6;margin-bottom:8px">
              ✅ {{ connectedMeetings().length }} meeting{{ connectedMeetings().length !== 1 ? 's' : '' }} created from this catalog's slots:
            </div>
            @for (m of connectedMeetings(); track m.id) {
              <div class="connected-item">
                <div>
                  <div style="font-weight:500;font-size:0.85rem">{{ m.title }}</div>
                  <div style="font-size:0.75rem;opacity:0.5;margin-top:2px">
                    {{ formatDate(m.date) }} · {{ m.startTime }}–{{ m.endTime }} · {{ m.location }}
                  </div>
                  <div style="font-size:0.72rem;opacity:0.45;margin-top:1px">
                    Status: {{ m.status }} · Type: {{ m.type }}
                  </div>
                </div>
                <a class="meeting-link" [routerLink]="['/meetings', m.id]">View Meeting →</a>
              </div>
            }
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width:900px;margin:0 auto;padding:8px; }
    .spinner-wrap { display:flex;justify-content:center;padding:60px; }
    .error-state { text-align:center;padding:60px; }
    .breadcrumb { font-size:0.75rem;opacity:0.5;margin-bottom:8px; }
    .breadcrumb a { color:#64b5f6;cursor:pointer; }
    .breadcrumb a:hover { text-decoration:underline; }
    .header { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px; }
    .header h2 { margin:0;font-size:1.3rem;font-weight:700; }
    .desc { margin:4px 0 0;font-size:0.85rem;opacity:0.6; }
    .meta { font-size:0.78rem;opacity:0.4;margin-top:4px; }
    .header-actions { display:flex;gap:8px; }
    .section { margin-bottom:16px;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02); }
    .section-label { font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.4;font-weight:600;margin-bottom:8px; }
    .participant-group { margin-bottom:10px; }
    .group-label { display:flex;align-items:center;gap:6px;font-size:0.78rem;font-weight:600;margin-bottom:4px; }
    .dot { width:8px;height:8px;border-radius:50%;flex-shrink:0; }
    .member-chips { display:flex;flex-wrap:wrap;gap:4px; }
    .chip { padding:4px 12px;border-radius:12px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);font-size:0.78rem;display:inline-flex;align-items:center;gap:4px; }
    .slots-summary { font-size:0.82rem;opacity:0.6;margin-bottom:10px;display:flex;gap:6px; }
    .empty-slots { text-align:center;padding:30px; }
    .empty-slots p { margin:0 0 4px;font-weight:600; }
    .empty-slots span { font-size:0.82rem;opacity:0.5; }
    .slot-list { display:flex;flex-direction:column;gap:4px;margin-bottom:12px; }
    .slot-row { display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:6px;background:rgba(255,255,255,0.03); }
    .slot-info { display:flex;align-items:center;gap:6px;font-size:0.82rem; }
    .slot-date { font-weight:600; }
    .slot-time { opacity:0.6; }
    .slot-loc-dot { width:6px;height:6px;border-radius:50%; }
    .slot-loc { opacity:0.5;font-size:0.75rem; }
    .slot-status { display:flex;align-items:center;gap:8px; }
    .status-confirmed { background:rgba(255,215,0,0.15);color:#FFD700;font-size:0.65rem;font-weight:600;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:0.05em; }
    .slot-count { font-size:0.72rem;opacity:0.5; }
    .slot-count.warn { color:#ff9800;opacity:1; }
    .slot-actions { display:flex;gap:8px; }
    .slot-meeting-link {
      font-size: 0.72rem; color: #64b5f6; cursor: pointer;
      display: inline-flex; align-items: center; gap: 4px; margin-left: 8px; flex-shrink: 0;
    }
    .slot-meeting-link:hover { text-decoration: underline; }
    .connected-section { margin-bottom: 16px; }
    .connected-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 10px; border-radius: 6px;
      background: rgba(255,255,255,0.03); margin-bottom: 4px;
    }
    .connected-item .meeting-link { color: #64b5f6; font-size: 0.78rem; cursor: pointer; flex-shrink: 0; margin-left: 12px; }
    .connected-item .meeting-link:hover { text-decoration: underline; }
  `]
})
export class SessionCatalogDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(SessionDefinitionService);
  private locSvc = inject(SlotLocationService);
  private snack = inject(MatSnackBar);
  router = inject(Router);

  item = signal<SessionDefinition | null>(null);
  loading = signal(true);
  locations = signal<SlotLocation[]>([]);
  connectedMeetings = signal<MeetingSession[]>([]);

  mandatoryCount = computed(() => this.item()?.participants.filter(p => p.role === 'Mandatory').length ?? 0);
  optionalCount = computed(() => this.item()?.participants.filter(p => p.role === 'Optional').length ?? 0);
  mandatoryParticipants = computed(() => this.item()?.participants.filter(p => p.role === 'Mandatory') ?? []);
  optionalParticipants = computed(() => this.item()?.participants.filter(p => p.role === 'Optional') ?? []);
  mandatoryFilledCount = computed(() => {
    const item = this.item();
    if (!item) return 0;
    const mandatoryIds = new Set(item.participants.filter(p => p.role === 'Mandatory').map(p => p.teamMemberId));
    const bookedIds = new Set(item.slots.flatMap(s => s.bookings).map(b => b.teamMemberId));
    return [...mandatoryIds].filter(id => bookedIds.has(id)).length;
  });

  ngOnInit() {
    this.locSvc.getAll(true).subscribe(locs => this.locations.set(locs));
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.load(id);
    });
  }

  load(id: string) {
    this.loading.set(true);
    this.svc.getById(id).subscribe({
      next: item => {
        this.item.set(item);
        this.loading.set(false);
        this.loadConnectedMeetings(id);
      },
      error: () => this.loading.set(false)
    });
  }

  loadConnectedMeetings(id: string) {
    this.svc.getConnectedMeetings(id).subscribe({
      next: meetings => this.connectedMeetings.set(meetings),
      error: () => {}
    });
  }

  formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  deleteItem() {
    const item = this.item();
    if (!item) return;
    if (!confirm(`Delete "${item.name}"?`)) return;
    this.svc.delete(item.id).subscribe({
      next: () => { this.snack.open('Deleted', 'OK', { duration: 2000 }); this.router.navigate(['/catalog']); },
      error: () => this.snack.open('Failed to delete', 'OK', { duration: 2000 })
    });
  }
}
