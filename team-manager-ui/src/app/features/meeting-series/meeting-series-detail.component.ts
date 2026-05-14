import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MeetingSeriesService } from '../../core/services/meeting-series.service';
import { MeetingSeries, MeetingSeriesItem } from '../../core/models/meeting-series.model';

@Component({
  selector: 'app-meeting-series-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      @if (loading()) {
        <div class="spinner-wrap"><mat-spinner diameter="40"></mat-spinner></div>
      } @else if (!series()) {
        <div class="error-state">
          <h2>Series not found</h2>
          <button mat-stroked-button (click)="router.navigate(['/meeting-series'])">Back to Series</button>
        </div>
      } @else {
        @let s = series()!;

        <div class="breadcrumb">
          <a (click)="router.navigate(['/meeting-series'])">Meeting Series</a>
          <span> › </span>
          <span>{{ s.title }}</span>
        </div>

        <div class="header">
          <div>
            <h2>{{ s.title }}</h2>
            @if (s.description) {
              <p class="desc">{{ s.description }}</p>
            }
            <div class="meta">
              Created by {{ s.createdByMemberName }} · {{ s.createdAt | date:'mediumDate' }}
              <span class="status-badge" [class.status-active]="s.isActive" [class.status-inactive]="!s.isActive">
                {{ s.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </div>
          <div class="header-actions">
            <button mat-stroked-button (click)="deleteSeries()">
              <mat-icon>delete</mat-icon> Delete
            </button>
          </div>
        </div>

        <div class="section">
          <div class="section-label">Availability Slots ({{ s.slots.length }})</div>
          @if (s.slots.length === 0) {
            <div class="empty-slots">
              <p>No availability slots defined yet.</p>
              <span>Add time windows so team members can indicate their availability.</span>
              <div style="margin-top:12px">
                <button mat-raised-button color="primary" (click)="router.navigate(['/meeting-series', s.id, 'slots'])">
                  <mat-icon>add</mat-icon> Add Slots
                </button>
              </div>
            </div>
          } @else {
            <div class="slot-list">
              @for (slot of s.slots; track slot.id) {
                <div class="slot-row">
                  <div class="slot-info">
                    <span class="slot-date">{{ slot.date }}</span>
                    <span class="slot-time">{{ slot.startTime }}–{{ slot.endTime }}</span>
                    @if (slot.locationName) {
                      <span class="slot-loc-dot" [style.background]="slot.locationColor"></span>
                      <span class="slot-loc">{{ slot.locationName }}</span>
                    }
                  </div>
                  <button mat-icon-button style="flex-shrink:0" (click)="deleteSlot(slot.id)">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              }
            </div>
            <div class="slot-actions">
              <button mat-stroked-button (click)="router.navigate(['/meeting-series', s.id, 'slots'])">
                <mat-icon>add</mat-icon> Add More Slots
              </button>
            </div>
          }
        </div>

        <div class="section">
          <div class="section-label">Meeting Items ({{ s.items.length }})</div>
          <div class="slot-actions" style="margin-bottom:12px">
            <button mat-raised-button color="primary" (click)="router.navigate(['/meeting-series', s.id, 'items', 'create'])">
              <mat-icon>add</mat-icon> Create Item
            </button>
          </div>
          @if (s.items.length === 0) {
            <div class="empty-items">
              <p>No meeting items yet.</p>
              <span>Create individual meetings and assign participants.</span>
            </div>
          } @else {
            <div class="item-list">
              @for (item of s.items; track item.id) {
                <div class="item-card" (click)="router.navigate(['/meeting-series', s.id, 'items', item.id])">
                  <div style="flex:1;min-width:0">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                      <span class="item-icon">{{ item.isConfirmed ? '✅' : '⬜' }}</span>
                      <span style="font-weight:500;font-size:0.9rem">{{ item.title }}</span>
                      <span class="item-status" [class.confirmed]="item.isConfirmed">
                        {{ item.isConfirmed ? 'Confirmed' : 'Pending' }}
                      </span>
                    </div>
                    <div style="font-size:0.78rem;opacity:0.5;margin-top:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                      <span>Mandatory: {{ mandatoryCount(item) }}</span>
                      <span>·</span>
                      <span>Optional: {{ optionalCount(item) }}</span>
                      <span>·</span>
                      <span>{{ mandatoryFilledCount(item) }}/{{ mandatoryCount(item) }} filled</span>
                    </div>
                    @if (item.isConfirmed && item.confirmedSlotId) {
                      <div style="font-size:0.75rem;color:#81c784;margin-top:4px">
                        ✓ Confirmed slot
                      </div>
                    }
                  </div>
                  <button mat-icon-button style="flex-shrink:0" (click)="$event.stopPropagation(); deleteItem(item.id)">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              }
            </div>
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
    .meta { font-size:0.78rem;opacity:0.4;margin-top:4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap; }
    .header-actions { display:flex;gap:8px; }
    .section { margin-bottom:16px;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02); }
    .section-label { font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.4;font-weight:600;margin-bottom:8px; }
    .status-badge {
      font-size:0.65rem;font-weight:600;padding:2px 8px;border-radius:10px;
      text-transform:uppercase;letter-spacing:0.05em;
    }
    .status-active { background:rgba(76,175,80,0.15);color:#81c784; }
    .status-inactive { background:rgba(158,158,158,0.15);color:#bdbdbd; }
    .empty-slots,.empty-items { text-align:center;padding:30px; }
    .empty-slots p,.empty-items p { margin:0 0 4px;font-weight:600; }
    .empty-slots span,.empty-items span { font-size:0.82rem;opacity:0.5; }
    .slot-list { display:flex;flex-direction:column;gap:4px;margin-bottom:12px; }
    .slot-row { display:flex;justify-content:space-between;align-items:center;padding:8px 10px;border-radius:6px;background:rgba(255,255,255,0.03); }
    .slot-info { display:flex;align-items:center;gap:6px;font-size:0.82rem; }
    .slot-date { font-weight:600; }
    .slot-time { opacity:0.6; }
    .slot-loc-dot { width:6px;height:6px;border-radius:50%; }
    .slot-loc { opacity:0.5;font-size:0.75rem; }
    .slot-actions { display:flex;gap:8px; }
    .item-list { display:flex;flex-direction:column;gap:6px; }
    .item-card {
      display:flex;align-items:center;padding:10px 12px;border-radius:8px;gap:12px;
      background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
      cursor:pointer;transition:background 0.15s;
    }
    .item-card:hover { background:rgba(255,255,255,0.06); }
    .item-icon { font-size:1rem; }
    .item-status { font-size:0.65rem;font-weight:600;padding:2px 8px;border-radius:10px;text-transform:uppercase; }
    .item-status.confirmed { background:rgba(76,175,80,0.15);color:#81c784; }
  `]
})
export class MeetingSeriesDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(MeetingSeriesService);
  private snack = inject(MatSnackBar);
  router = inject(Router);

  series = signal<MeetingSeries | null>(null);
  loading = signal(true);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.load(id);
    });
  }

  load(id: string) {
    this.loading.set(true);
    this.svc.getById(id).subscribe({
      next: item => { this.series.set(item); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  mandatoryCount(item: MeetingSeriesItem): number {
    return item.participants.filter(p => p.role === 'Mandatory').length;
  }

  optionalCount(item: MeetingSeriesItem): number {
    return item.participants.filter(p => p.role === 'Optional').length;
  }

  mandatoryFilledCount(item: MeetingSeriesItem): number {
    const mandatoryIds = new Set(item.participants.filter(p => p.role === 'Mandatory').map(p => p.teamMemberId));
    const bookedIds = new Set(item.availabilities.map(a => a.teamMemberId));
    return [...mandatoryIds].filter(id => bookedIds.has(id)).length;
  }

  deleteSeries() {
    const s = this.series();
    if (!s) return;
    if (!confirm(`Delete "${s.title}"? This will also delete all items and connected meetings.`)) return;
    this.svc.delete(s.id).subscribe({
      next: () => { this.snack.open('Series deleted', 'OK', { duration: 2000 }); this.router.navigate(['/meeting-series']); },
      error: () => this.snack.open('Failed to delete', 'OK', { duration: 2000 })
    });
  }

  deleteSlot(slotId: string) {
    const s = this.series();
    if (!s) return;
    if (!confirm('Delete this slot?')) return;
    this.svc.deleteSlot(s.id, slotId).subscribe({
      next: () => { this.snack.open('Slot deleted', 'OK', { duration: 2000 }); this.load(s.id); },
      error: () => this.snack.open('Failed to delete slot', 'OK', { duration: 2000 })
    });
  }

  deleteItem(itemId: string) {
    const s = this.series();
    if (!s) return;
    if (!confirm('Delete this meeting item?')) return;
    this.svc.deleteItem(s.id, itemId).subscribe({
      next: () => { this.snack.open('Item deleted', 'OK', { duration: 2000 }); this.load(s.id); },
      error: () => this.snack.open('Failed to delete item', 'OK', { duration: 2000 })
    });
  }
}