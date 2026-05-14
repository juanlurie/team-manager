import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MeetingSession, MeetingSlot } from '../../../core/models/meeting-session.model';
import { MeetingSessionService } from '../../../core/services/meeting-session.service';
import { MeetingFormDialogComponent } from '../meeting-form-dialog/meeting-form-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { IconButtonComponent } from '../../../shared/components/icon-btn/icon-btn.component';

@Component({
  selector: 'app-meeting-detail',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatProgressSpinnerModule, MatTooltipModule, RouterLink, IconButtonComponent],
  template: `
    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    } @else {
      @if (session(); as s) {
      <!-- Header -->
      <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:24px;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <h2 style="margin:0">{{ s.title }}</h2>
            <span class="type-badge">{{ s.type }}</span>
            <span class="status-badge" [class.status-open]="s.status === 'Open'"
                  [class.status-filled]="s.status === 'Filled'"
                  [class.status-cancelled]="s.status === 'Cancelled'">
              {{ s.status }}
            </span>
          </div>
          <div style="margin-top:6px;font-size:0.88rem;opacity:0.6;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <span>{{ formatDate(s.date) }}</span>
            <span>{{ s.startTime }} – {{ s.endTime }}</span>
            <span>{{ locationIcon(s.location) }} {{ s.location }}</span>
            @if (s.createdByMemberName) {
              <span>Created by {{ s.createdByMemberName }}</span>
            }
          </div>
          @if (s.description) {
            <div style="margin-top:12px;font-size:0.85rem;opacity:0.7;max-width:600px;line-height:1.5">{{ s.description }}</div>
          }
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">
          <button mat-stroked-button (click)="editSession(s)">
            <mat-icon>edit</mat-icon> Edit
          </button>
          <button mat-stroked-button (click)="cancelSession(s)" [disabled]="s.status === 'Cancelled'">
            <mat-icon>cancel</mat-icon> {{ s.status === 'Cancelled' ? 'Cancelled' : 'Cancel Session' }}
          </button>
          <button mat-stroked-button color="warn" (click)="deleteSession(s)">
            <mat-icon>delete</mat-icon> Delete
          </button>
        </div>
      </div>

      <!-- Slots -->
      <div style="margin-top:24px">
        <!-- Team Member slots -->
        <div style="margin-bottom:24px">
          <div style="font-size:0.78rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;opacity:0.5;margin-bottom:10px">
            Team Members ({{ teamMemberFilledCount() }}/{{ teamMemberSlots().length }} filled)
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            @for (slot of teamMemberSlots(); track slot.id) {
              <div class="slot-card" [class.slot-booked]="slot.teamMemberId !== null"
                   [class.slot-mine]="slot.teamMemberId === currentMemberId">
                <div class="slot-avatar">{{ slot.teamMemberName ? getInitials(slot.teamMemberName) : '?' }}</div>
                <div style="flex:1;min-width:0">
                  @if (slot.teamMemberName) {
                    <div style="font-weight:500;font-size:0.88rem">
                      {{ slot.teamMemberName }}
                      @if (slot.teamMemberId === currentMemberId) {
                        <span style="font-size:0.7rem;opacity:0.5;margin-left:6px">(You)</span>
                      }
                    </div>
                    @if (slot.notes) {
                      <div style="font-size:0.75rem;opacity:0.5;margin-top:2px">{{ slot.notes }}</div>
                    }
                  } @else {
                    <div style="font-size:0.85rem;opacity:0.35">Available</div>
                  }
                  @if (slot.startTime && slot.date) {
                    <div style="font-size:0.7rem;opacity:0.4;margin-top:2px">
                      {{ formatDateShort(slot.date) }} {{ slot.startTime }}–{{ slot.endTime }}
                    </div>
                  }
                </div>
                @if (slot.teamMemberId === null && s.status === 'Open') {
                  <button mat-stroked-button style="flex-shrink:0;min-width:0;padding:0 12px;height:32px;font-size:0.78rem"
                          (click)="bookSlot(s, slot)">
                    Book
                  </button>
                }
                @if (slot.teamMemberId !== null) {
                  @if (slot.teamMemberId === currentMemberId) {
                    <button mat-stroked-button style="flex-shrink:0;min-width:0;padding:0 12px;height:32px;font-size:0.78rem"
                            (click)="unbookSlot(s, slot)">
                      Unbook
                    </button>
                  }
                }
              </div>
            }
            @if (teamMemberSlots().length === 0) {
              <div style="opacity:0.3;font-size:0.82rem;padding:8px 0">No team member slots configured</div>
            }
          </div>
        </div>

        <!-- Facilitator slots -->
        <div>
          <div style="font-size:0.78rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;opacity:0.5;margin-bottom:10px">
            Facilitators ({{ facilitatorFilledCount() }}/{{ facilitatorSlots().length }} filled)
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            @for (slot of facilitatorSlots(); track slot.id) {
              <div class="slot-card" [class.slot-booked]="slot.teamMemberId !== null"
                   [class.slot-mine]="slot.teamMemberId === currentMemberId">
                <div class="slot-avatar">{{ slot.teamMemberName ? getInitials(slot.teamMemberName) : 'F' }}</div>
                <div style="flex:1;min-width:0">
                  @if (slot.teamMemberName) {
                    <div style="font-weight:500;font-size:0.88rem">
                      {{ slot.teamMemberName }}
                      @if (slot.teamMemberId === currentMemberId) {
                        <span style="font-size:0.7rem;opacity:0.5;margin-left:6px">(You)</span>
                      }
                    </div>
                    @if (slot.notes) {
                      <div style="font-size:0.75rem;opacity:0.5;margin-top:2px">{{ slot.notes }}</div>
                    }
                  } @else {
                    <div style="font-size:0.85rem;opacity:0.35">Available</div>
                  }
                  @if (slot.startTime && slot.date) {
                    <div style="font-size:0.7rem;opacity:0.4;margin-top:2px">
                      {{ formatDateShort(slot.date) }} {{ slot.startTime }}–{{ slot.endTime }}
                    </div>
                  }
                </div>
                @if (slot.teamMemberId === null && s.status === 'Open') {
                  <button mat-stroked-button style="flex-shrink:0;min-width:0;padding:0 12px;height:32px;font-size:0.78rem"
                          (click)="bookSlot(s, slot)">
                    Book as Facilitator
                  </button>
                }
                @if (slot.teamMemberId === currentMemberId) {
                  <button mat-stroked-button style="flex-shrink:0;min-width:0;padding:0 12px;height:32px;font-size:0.78rem"
                          (click)="unbookSlot(s, slot)">
                    Unbook
                  </button>
                }
              </div>
            }
            @if (facilitatorSlots().length === 0) {
              <div style="opacity:0.3;font-size:0.82rem;padding:8px 0">No facilitator slots configured</div>
            }
          </div>
        </div>
      </div>

      <div style="margin-top:24px">
        <button mat-stroked-button routerLink="/meetings">
          <mat-icon>arrow_back</mat-icon> Back to Meetings
        </button>
      </div>
    } @else {
      <div style="text-align:center;padding:64px;opacity:0.4">Session not found</div>
    }
    }
  `,
  styles: [`
    .type-badge {
      font-size: 0.65rem; font-weight: 600; padding: 3px 10px; border-radius: 10px;
      text-transform: uppercase; letter-spacing: 0.05em;
      background: rgba(255,215,0,0.12); color: #FFD700;
    }
    .status-badge {
      font-size: 0.65rem; font-weight: 600; padding: 3px 10px; border-radius: 10px;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .status-open { background: rgba(76,175,80,0.15); color: #81c784; }
    .status-filled { background: rgba(33,150,243,0.15); color: #64b5f6; }
    .status-cancelled { background: rgba(158,158,158,0.15); color: #bdbdbd; }
    .slot-card {
      display: flex; align-items: center; padding: 10px 14px; border-radius: 8px; gap: 12px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
      transition: background 0.15s;
    }
    .slot-card.slot-booked { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
    .slot-card.slot-mine { background: rgba(100,181,246,0.08); border-color: rgba(100,181,246,0.2); }
    .slot-avatar {
      width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
      background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 600;
    }
    .slot-card.slot-booked .slot-avatar { background: rgba(100,181,246,0.2); }
  `]
})
export class MeetingDetailComponent implements OnInit {
  private svc = inject(MeetingSessionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  loading = signal(true);
  session = signal<MeetingSession | null>(null);
  currentMemberId: string | null = null; // TODO: get from auth

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadSession(id);
  }

  loadSession(id: string) {
    this.loading.set(true);
    this.svc.getById(id).subscribe({
      next: (s) => { this.session.set(s); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  teamMemberSlots = () =>
    this.session()?.slots.filter(sl => sl.slotType === 'TeamMember') ?? [];

  facilitatorSlots = () =>
    this.session()?.slots.filter(sl => sl.slotType === 'Facilitator') ?? [];

  teamMemberFilledCount = () =>
    this.teamMemberSlots().filter(sl => sl.teamMemberId !== null).length;

  facilitatorFilledCount = () =>
    this.facilitatorSlots().filter(sl => sl.teamMemberId !== null).length;

  formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatDateShort(date: string): string {
    const d = new Date(date + 'T12:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  locationIcon(location: string): string {
    switch (location) {
      case 'Remote': return '🏠';
      case 'OnSite': return '🏢';
      case 'Hybrid': return '🔄';
      default: return '📍';
    }
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  editSession(s: MeetingSession) {
    const ref = this.dialog.open(MeetingFormDialogComponent, { width: '520px', data: { session: s } });
    ref.afterClosed().subscribe(r => { if (r) this.loadSession(s.id); });
  }

  cancelSession(s: MeetingSession) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Cancel session?', message: `Mark "${s.title}" as cancelled?`, danger: false, confirmLabel: 'Cancel Session' }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.svc.updateStatus(s.id, { status: 'Cancelled' }).subscribe({
        next: () => { this.snack.open('Session cancelled', 'OK', { duration: 2000 }); this.loadSession(s.id); },
        error: () => this.snack.open('Failed to cancel', 'OK', { duration: 2000 })
      });
    });
  }

  deleteSession(s: MeetingSession) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete session?', message: `Remove "${s.title}" permanently?`, danger: true, confirmLabel: 'Delete' }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.svc.delete(s.id).subscribe({
        next: () => { this.snack.open('Session deleted', 'OK', { duration: 2000 }); this.router.navigate(['/meetings']); },
        error: () => this.snack.open('Failed to delete', 'OK', { duration: 2000 })
      });
    });
  }

  bookSlot(s: MeetingSession, slot: MeetingSlot) {
    this.svc.bookSlot(s.id, slot.id, { notes: null }).subscribe({
      next: () => { this.snack.open('Slot booked!', 'OK', { duration: 2000 }); this.loadSession(s.id); },
      error: () => this.snack.open('Could not book slot', 'OK', { duration: 2000 })
    });
  }

  unbookSlot(s: MeetingSession, slot: MeetingSlot) {
    this.svc.unbookSlot(s.id, slot.id).subscribe({
      next: () => { this.snack.open('Booking removed', 'OK', { duration: 2000 }); this.loadSession(s.id); },
      error: () => this.snack.open('Could not remove booking', 'OK', { duration: 2000 })
    });
  }
}
