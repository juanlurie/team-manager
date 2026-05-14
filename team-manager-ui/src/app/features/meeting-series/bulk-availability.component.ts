import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MeetingSeriesService } from '../../core/services/meeting-series.service';
import {
  BulkAvailabilityResponse,
  BulkAvailabilityItem,
  BulkAvailabilitySlot,
  BulkAvailabilityRequest
} from '../../core/models/meeting-series.model';

@Component({
  selector: 'app-bulk-availability',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    <div class="page">
      @if (loading()) {
        <div class="spinner-wrap"><mat-spinner diameter="40"></mat-spinner></div>
      } @else if (!bulkData()) {
        <div class="error-state">
          <mat-icon style="font-size:48px;width:48px;height:48px;opacity:0.3">event_busy</mat-icon>
          <h2>No items assigned</h2>
          <p>You are not assigned to any meeting items in this series.</p>
          <button mat-stroked-button (click)="goBack()">Back to Series</button>
        </div>
      } @else {
        <div class="breadcrumb">
          <a (click)="router.navigate(['/meeting-series'])">Meeting Series</a>
          <span> &rsaquo; </span>
          <a (click)="router.navigate(['/meeting-series', bulkData()!.seriesId])">{{ seriesTitle() }}</a>
          <span> &rsaquo; </span>
          <span>Set My Availability</span>
        </div>

        <div class="header">
          <div>
            <h2>{{ seriesTitle() }} &mdash; Set Your Availability</h2>
            <div class="meta">Your role: <strong>Participant</strong></div>
          </div>
        </div>

        @if (conflictError()) {
          <div class="conflict-banner">
            <mat-icon>warning</mat-icon>
            <div>
              <strong>Some slots were claimed while you were editing.</strong>
              Please review your availability and try again.
            </div>
            <button mat-icon-button (click)="conflictError.set(false)"><mat-icon>close</mat-icon></button>
          </div>
        }

        @if (allSlotsClaimed()) {
          <div class="info-banner">
            <mat-icon>info</mat-icon>
            All slots in this series are currently claimed. If a slot is released, you will be able to update your availability.
          </div>
        }

        <div class="section">
          <div class="section-label">Availability Matrix</div>
          <div class="matrix-container">
            <table class="matrix" role="grid" [attr.aria-label]="'Availability matrix for ' + seriesTitle()">
              <thead>
                <tr>
                  <th class="row-header">Item</th>
                  @for (slot of bulkData()!.slots; track slot.slotId) {
                    <th class="col-header">
                      <div class="slot-date">{{ formatDate(slot.date) }}</div>
                      <div class="slot-time">{{ slot.startTime }}&ndash;{{ slot.endTime }}</div>
                      @if (slot.locationName) {
                        <div class="slot-loc">
                          <span class="slot-loc-dot" [style.background]="slot.locationColor"></span>
                          {{ slot.locationName }}
                        </div>
                      }
                      @if (slot.isClaimed) {
                        <div class="claim-badge" [class.claimed-by-self]="isClaimedBySelf(slot)">
                          <mat-icon style="font-size:14px;width:14px;height:14px">lock</mat-icon>
                        </div>
                      }
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (item of bulkData()!.items; track item.itemId) {
                  <tr>
                    <td class="row-header">
                      <div class="item-title">{{ item.itemTitle }}</div>
                      <span class="item-status" [class.confirmed]="item.isConfirmed">
                        {{ item.isConfirmed ? 'Confirmed' : 'Pending' }}
                      </span>
                    </td>
                    @for (slot of bulkData()!.slots; track slot.slotId) {
                      <td class="cell"
                          [class.checked]="isSelected(item.itemId, slot.slotId)"
                          [class.claimed]="slot.isClaimed && !isClaimedByItem(item.itemId, slot.slotId)"
                          [class.claimed-by-self]="isClaimedByItem(item.itemId, slot.slotId)"
                          [class.free]="!slot.isClaimed"
                          (click)="!slot.isClaimed && toggleSlot(item.itemId, slot.slotId)"
                          role="gridcell"
                          [attr.aria-label]="getCellLabel(item, slot)"
                          [attr.aria-checked]="isSelected(item.itemId, slot.slotId)">
                        @if (slot.isClaimed && !isClaimedByItem(item.itemId, slot.slotId)) {
                          <span class="lock-icon" [matTooltip]="'This slot is confirmed for ' + getClaimingItemTitle(slot)">
                            <mat-icon style="font-size:16px;width:16px;height:16px">lock</mat-icon>
                          </span>
                        } @else {
                          <span class="checkbox" [class.checked]="isSelected(item.itemId, slot.slotId)">
                            @if (isSelected(item.itemId, slot.slotId)) { &check; }
                          </span>
                        }
                      </td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="slot-summary">
            <span class="summary-label">Slots:</span>
            @for (slot of bulkData()!.slots; track slot.slotId; let last = $last) {
              <span class="summary-slot">
                {{ formatDateShort(slot.date) }} {{ slot.startTime }}
                @if (slot.isClaimed) {
                  <mat-icon style="font-size:14px;width:14px;height:14px">lock</mat-icon>
                  {{ getClaimingItemTitle(slot) }}
                } @else {
                  (free)
                }
              </span>
              @if (!last) { <span class="summary-sep">&middot;</span> }
            }
          </div>
        </div>

        <div class="action-bar">
          <div class="change-indicator" aria-live="polite">
            @if (changeCount() > 0) {
              You have {{ changeCount() }} unsaved change{{ changeCount() !== 1 ? 's' : '' }}
            }
          </div>
          <div class="action-buttons">
            <button mat-stroked-button (click)="goBack()">Cancel</button>
            <button mat-raised-button color="primary"
                    [disabled]="!hasChanges() || saving()"
                    (click)="save()">
              @if (saving()) {
                <mat-spinner diameter="18" style="display:inline-block;margin-right:8px"></mat-spinner>
              }
              Save Availability
            </button>
          </div>
        </div>

        @if (error()) {
          <div class="error">{{ error() }}</div>
        }
      }
    </div>
  `,
  styles: [`
    .page { max-width:900px;margin:0 auto;padding:8px; }
    .spinner-wrap { display:flex;justify-content:center;padding:60px; }
    .error-state { text-align:center;padding:60px; }
    .error-state h2 { margin:12px 0 8px; }
    .error-state p { opacity:0.5;margin-bottom:16px; }
    .breadcrumb { font-size:0.75rem;opacity:0.5;margin-bottom:8px; }
    .breadcrumb a { color:#64b5f6;cursor:pointer; }
    .breadcrumb a:hover { text-decoration:underline; }
    .header { margin-bottom:16px; }
    .header h2 { margin:0;font-size:1.2rem;font-weight:700; }
    .meta { font-size:0.82rem;opacity:0.5;margin-top:4px; }
    .section { margin-bottom:16px;padding:14px;border-radius:10px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02); }
    .section-label { font-size:0.68rem;text-transform:uppercase;letter-spacing:0.05em;opacity:0.4;font-weight:600;margin-bottom:12px; }
    .conflict-banner {
      display:flex;align-items:flex-start;gap:10px;padding:12px 16px;margin-bottom:12px;
      background:rgba(255,152,0,0.1);border:1px solid rgba(255,152,0,0.3);border-radius:8px;
      color:#ff9800;font-size:0.85rem;
    }
    .conflict-banner button { margin-left:auto;flex-shrink:0; }
    .info-banner {
      display:flex;align-items:center;gap:8px;padding:12px 16px;margin-bottom:12px;
      background:rgba(100,181,246,0.08);border:1px solid rgba(100,181,246,0.2);border-radius:8px;
      color:#64b5f6;font-size:0.85rem;
    }
    .matrix-container { overflow-x:auto; }
    .matrix { width:100%;border-collapse:collapse; }
    .matrix th, .matrix td { padding:8px 10px;text-align:left;vertical-align:middle; }
    .row-header {
      position:sticky;left:0;z-index:1;background:rgba(30,30,30,0.95);
      font-size:0.82rem;min-width:160px;
    }
    .row-header .item-title { font-weight:600;font-size:0.85rem; }
    .row-header .item-status { font-size:0.6rem;font-weight:600;padding:1px 6px;border-radius:8px;text-transform:uppercase; }
    .row-header .item-status.confirmed { background:rgba(76,175,80,0.15);color:#81c784; }
    .col-header { font-size:0.75rem;min-width:120px;text-align:center; }
    .col-header .slot-date { font-weight:600;font-size:0.78rem; }
    .col-header .slot-time { opacity:0.6;font-size:0.72rem; }
    .col-header .slot-loc { display:flex;align-items:center;gap:4px;font-size:0.7rem;opacity:0.5;margin-top:2px; }
    .col-header .slot-loc-dot { width:5px;height:5px;border-radius:50%; }
    .col-header .claim-badge {
      display:inline-flex;align-items:center;gap:2px;margin-top:4px;
      color:#ff9800;font-size:0.65rem;
    }
    .col-header .claim-badge.claimed-by-self { color:#4caf50; }
    .cell {
      text-align:center;cursor:pointer;transition:all 0.15s;
      background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);
      border-radius:6px;padding:10px;min-width:80px;
    }
    .cell.free:hover { background:rgba(100,181,246,0.06);border-color:rgba(100,181,246,0.15); }
    .cell.checked.free { background:rgba(100,181,246,0.08);border-color:rgba(100,181,246,0.3); }
    .cell.claimed { background:rgba(255,152,0,0.06);border-color:rgba(255,152,0,0.2);cursor:not-allowed;opacity:0.7; }
    .cell.claimed-by-self { background:rgba(76,175,80,0.08);border-color:rgba(76,175,80,0.25);cursor:not-allowed; }
    .checkbox {
      display:inline-flex;align-items:center;justify-content:center;
      width:20px;height:20px;border-radius:4px;border:2px solid rgba(255,255,255,0.2);
      font-size:0.75rem;color:#64b5f6;transition:all 0.15s;
    }
    .checkbox.checked { background:rgba(100,181,246,0.2);border-color:#64b5f6; }
    .lock-icon { color:#ff9800; }
    .slot-summary { margin-top:12px;font-size:0.78rem;opacity:0.6;display:flex;flex-wrap:wrap;gap:4px;align-items:center; }
    .summary-label { font-weight:600; }
    .summary-slot { display:inline-flex;align-items:center;gap:4px; }
    .summary-sep { opacity:0.3; }
    .action-bar {
      display:flex;justify-content:space-between;align-items:center;
      padding:12px 16px;margin-top:12px;border-radius:10px;
      background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);
    }
    .change-indicator { font-size:0.82rem;color:#64b5f6; }
    .action-buttons { display:flex;gap:10px; }
    .error { color:#ef5350;font-size:0.82rem;margin-top:12px;text-align:center; }
  `]
})
export class BulkAvailabilityComponent implements OnInit {
  private route = inject(ActivatedRoute);
  router = inject(Router);
  private svc = inject(MeetingSeriesService);
  private snack = inject(MatSnackBar);

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  conflictError = signal<boolean>(false);
  bulkData = signal<BulkAvailabilityResponse | null>(null);
  seriesTitle = signal('');
  selections = signal<Map<string, Set<string>>>(new Map());
  originalSelections = signal<Map<string, Set<string>>>(new Map());
  currentMemberId = signal<string | null>(null);

  hasChanges = computed(() => this.changeCount() > 0);

  changeCount = computed(() => {
    const current = this.selections();
    const original = this.originalSelections();
    let count = 0;
    for (const [itemId, slots] of current) {
      const origSlots = original.get(itemId) || new Set();
      for (const s of slots) { if (!origSlots.has(s)) count++; }
      for (const s of origSlots) { if (!slots.has(s)) count++; }
    }
    return count;
  });

  allSlotsClaimed = computed(() => {
    const data = this.bulkData();
    if (!data) return false;
    return data.slots.every(s => s.isClaimed);
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.load(id);
    });
  }

  load(seriesId: string) {
    this.loading.set(true);
    this.error.set(null);
    this.conflictError.set(false);

    this.svc.getById(seriesId).subscribe({
      next: series => {
        this.seriesTitle.set(series.title);
        this.svc.getBulkAvailability(seriesId).subscribe({
          next: data => {
            this.bulkData.set(data);
            this.currentMemberId.set(data.memberId);
            const sel = new Map<string, Set<string>>();
            for (const item of data.items) {
              sel.set(item.itemId, new Set(item.availableSlotIds));
            }
            this.selections.set(sel);
            const orig = new Map<string, Set<string>>();
            for (const [k, v] of sel) {
              orig.set(k, new Set(v));
            }
            this.originalSelections.set(orig);
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
            this.error.set('Failed to load availability data');
          }
        });
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load series');
      }
    });
  }

  isSelected(itemId: string, slotId: string): boolean {
    return this.selections().get(itemId)?.has(slotId) ?? false;
  }

  toggleSlot(itemId: string, slotId: string) {
    const current = new Map(this.selections());
    const slots = new Set<string>(current.get(itemId) || []);
    if (slots.has(slotId)) {
      slots.delete(slotId);
    } else {
      slots.add(slotId);
    }
    current.set(itemId, slots);
    this.selections.set(current);
  }

  isClaimedByItem(itemId: string, slotId: string): boolean {
    const data = this.bulkData();
    if (!data) return false;
    const slot = data.slots.find(s => s.slotId === slotId);
    return !!slot?.isClaimed && slot.claimedByItemId === itemId;
  }

  isClaimedBySelf(slot: BulkAvailabilitySlot): boolean {
    const data = this.bulkData();
    if (!data || !slot.claimedByItemId) return false;
    const item = data.items.find(i => i.itemId === slot.claimedByItemId);
    return !!item?.isConfirmed;
  }

  getCellLabel(item: BulkAvailabilityItem, slot: BulkAvailabilitySlot): string {
    if (slot.isClaimed && slot.claimedByItemId !== item.itemId) {
      return `${item.itemTitle}, ${this.formatDateShort(slot.date)} ${slot.startTime}, Slot claimed by ${this.getClaimingItemTitle(slot)}`;
    }
    return `${item.itemTitle}, ${this.formatDateShort(slot.date)} ${slot.startTime}, ${this.isSelected(item.itemId, slot.slotId) ? 'Available' : 'Not available'}`;
  }

  getClaimingItemTitle(slot: BulkAvailabilitySlot): string {
    const data = this.bulkData();
    if (!data || !slot.claimedByItemId) return 'Unknown';
    const item = data.items.find(i => i.itemId === slot.claimedByItemId);
    return item?.itemTitle || 'Unknown';
  }

  formatDate(date: string): string {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  formatDateShort(date: string): string {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  goBack() {
    const data = this.bulkData();
    if (data) {
      this.router.navigate(['/meeting-series', data.seriesId]);
    } else {
      this.router.navigate(['/meeting-series']);
    }
  }

  save() {
    const data = this.bulkData();
    if (!data) return;

    this.saving.set(true);
    this.error.set(null);
    this.conflictError.set(false);

    const availabilities: { itemId: string; slotId: string }[] = [];
    for (const [itemId, slots] of this.selections()) {
      for (const slotId of slots) {
        availabilities.push({ itemId, slotId });
      }
    }

    const request: BulkAvailabilityRequest = { availabilities };

    this.svc.submitBulkAvailability(data.seriesId, request).subscribe({
      next: () => {
        this.snack.open('Availability saved!', 'OK', { duration: 2000 });
        this.router.navigate(['/meeting-series', data.seriesId]);
      },
      error: (err) => {
        this.saving.set(false);
        if (err.status === 409) {
          this.conflictError.set(true);
          this.load(data.seriesId);
        } else if (err.status === 400) {
          this.error.set('Could not save availability. Some selections are invalid.');
        } else {
          this.error.set('Failed to save availability. Please try again.');
        }
      }
    });
  }
}
