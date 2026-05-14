import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MeetingSeriesService } from '../../core/services/meeting-series.service';
import { MeetingSeries, MeetingSeriesItem } from '../../core/models/meeting-series.model';

@Component({
  selector: 'app-meeting-series-item-availability',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      @if (loading()) {
        <div class="spinner-wrap"><mat-spinner diameter="40"></mat-spinner></div>
      } @else if (!series() || !item()) {
        <div class="error-state">
          <h2>Not found</h2>
          <button mat-stroked-button (click)="goBack()">Back</button>
        </div>
      } @else {
        @let s = series()!;
        @let i = item()!;

        <div class="breadcrumb">
          <a (click)="router.navigate(['/meeting-series'])">Meeting Series</a>
          <span> › </span>
          <a (click)="router.navigate(['/meeting-series', s.id])">{{ s.title }}</a>
          <span> › </span>
          <span>{{ i.title }} — Set Availability</span>
        </div>

        <div class="header">
          <h2>{{ i.title }}</h2>
          <div class="meta">Series: {{ s.title }} · Your role: <strong>{{ myRole() }}</strong></div>
        </div>

        @if (s.slots.length === 0) {
          <div class="empty-state">
            <p>No availability slots have been defined for this series yet.</p>
            <span>Check back later.</span>
            <div style="margin-top:12px">
              <button mat-stroked-button (click)="goBack()">← Back</button>
            </div>
          </div>
        } @else {
          <div class="section">
            <div class="section-label">Select the time slots that work for you</div>
            <div class="slot-list">
              @for (slot of s.slots; track slot.id) {
                <div class="slot-checkbox" [class.selected]="selectedSlotIds().has(slot.id)">
                  <label class="checkbox-label" (click)="toggleSlot(slot.id)">
                    <span class="checkbox" [class.checked]="selectedSlotIds().has(slot.id)">
                      @if (selectedSlotIds().has(slot.id)) { ✓ }
                    </span>
                    <span class="slot-info">
                      <span class="slot-date">{{ slot.date }}</span>
                      <span class="slot-time">{{ slot.startTime }}–{{ slot.endTime }}</span>
                      @if (slot.locationName) {
                        <span class="slot-loc-dot" [style.background]="slot.locationColor"></span>
                        <span class="slot-loc">{{ slot.locationName }}</span>
                      }
                    </span>
                  </label>
                </div>
              }
            </div>
            <div class="summary">You selected {{ selectedSlotIds().size }} slot{{ selectedSlotIds().size !== 1 ? 's' : '' }}</div>
          </div>

          <div class="bottom-row">
            <button mat-stroked-button (click)="goBack()">Cancel</button>
            <button mat-raised-button color="primary" [disabled]="saving()" (click)="save()">
              @if (saving()) { Saving... } @else { Save Availability }
            </button>
          </div>

          @if (error()) {
            <div class="error">{{ error() }}</div>
          }
        }
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
    .header { margin-bottom:16px; }
    .header h2 { margin:0;font-size:1.2rem;font-weight:700; }
    .meta { font-size:0.82rem;opacity:0.5;margin-top:4px; }
    .section { margin-bottom:16px;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02); }
    .section-label { font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.4;font-weight:600;margin-bottom:8px; }
    .empty-state { text-align:center;padding:40px; }
    .empty-state p { font-weight:600;margin:0 0 4px; }
    .empty-state span { font-size:0.82rem;opacity:0.5; }
    .slot-list { display:flex;flex-direction:column;gap:6px;margin-bottom:12px; }
    .slot-checkbox { padding:10px 12px;border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);transition:all 0.15s; }
    .slot-checkbox.selected { background:rgba(100,181,246,0.08);border-color:rgba(100,181,246,0.3); }
    .checkbox-label { display:flex;align-items:center;gap:10px;cursor:pointer; }
    .checkbox { width:20px;height:20px;border-radius:4px;border:2px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;font-size:0.75rem;color:#64b5f6;transition:all 0.15s;flex-shrink:0; }
    .checkbox.checked { background:rgba(100,181,246,0.2);border-color:#64b5f6; }
    .slot-info { display:flex;align-items:center;gap:6px;font-size:0.82rem; }
    .slot-date { font-weight:600; }
    .slot-time { opacity:0.6; }
    .slot-loc-dot { width:6px;height:6px;border-radius:50%; }
    .slot-loc { opacity:0.5;font-size:0.75rem; }
    .summary { font-size:0.78rem;opacity:0.6;text-align:center;margin-top:8px; }
    .bottom-row { display:flex;gap:10px;align-items:center;margin-top:16px; }
    .error { color:#ef5350;font-size:0.82rem;margin-top:6px; }
  `]
})
export class MeetingSeriesItemAvailabilityComponent implements OnInit {
  private route = inject(ActivatedRoute);
  router = inject(Router);
  private svc = inject(MeetingSeriesService);
  private snack = inject(MatSnackBar);

  series = signal<MeetingSeries | null>(null);
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  selectedSlotIds = signal<Set<string>>(new Set());

  item = computed(() => {
    const s = this.series();
    const itemId = this.route.snapshot.paramMap.get('itemId');
    if (!s || !itemId) return null;
    return s.items.find(i => i.id === itemId) || null;
  });

  myRole = computed(() => {
    const i = this.item();
    if (!i) return '';
    const p = i.participants.find(p => p.teamMemberId === this.currentMemberId());
    return p?.role || 'Not assigned';
  });

  currentMemberId(): string | null {
    return null; // TODO: get from auth service
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.load(id);
    });
  }

  load(id: string) {
    this.loading.set(true);
    this.svc.getById(id).subscribe({
      next: s => {
        this.series.set(s);
        this.loading.set(false);
        // Pre-select existing availabilities for current user
        const itemId = this.route.snapshot.paramMap.get('itemId');
        const item = s.items.find(i => i.id === itemId);
        if (item) {
          const myAvailabilities = item.availabilities.filter(a => a.teamMemberId === this.currentMemberId());
          this.selectedSlotIds.set(new Set(myAvailabilities.map(a => a.meetingSeriesSlotId)));
        }
      },
      error: () => this.loading.set(false)
    });
  }

  toggleSlot(slotId: string) {
    const set = new Set(this.selectedSlotIds());
    if (set.has(slotId)) set.delete(slotId); else set.add(slotId);
    this.selectedSlotIds.set(set);
  }

  goBack() { const s = this.series(); this.router.navigate(['/meeting-series', s?.id]); }

  save() {
    const i = this.item();
    const s = this.series();
    if (!i || !s) return;

    const memberId = this.currentMemberId();
    if (!memberId) { this.error.set('Could not identify current user'); return; }

    this.saving.set(true);
    this.error.set(null);

    // Remove existing availabilities first, then add new ones
    const existingAvailabilities = i.availabilities.filter(a => a.teamMemberId === memberId);
    const removePromises = existingAvailabilities.map(a =>
      this.svc.removeAvailability(i.id, a.id).toPromise()
    );

    Promise.all(removePromises).then(() => {
      const addPromises = [...this.selectedSlotIds()].map(slotId =>
        this.svc.addAvailability(i.id, { meetingSeriesSlotId: slotId, teamMemberId: memberId }).toPromise()
      );
      return Promise.all(addPromises);
    }).then(() => {
      this.snack.open('Availability saved!', 'OK', { duration: 2000 });
      this.router.navigate(['/meeting-series', s.id]);
    }).catch(err => {
      this.saving.set(false);
      this.error.set('Failed to save availability');
    });
  }
}