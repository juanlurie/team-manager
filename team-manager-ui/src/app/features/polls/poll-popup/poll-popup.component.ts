import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PollService } from '../../../core/services/poll.service';
import { PollDetail } from '../../../core/models/poll.model';
import { WebSocketService } from '../../../core/websocket/websocket.service';
import { PollEvent, POLL_EVENT_TYPES } from '../../../core/websocket/events/poll.events';
import { PollBodyComponent } from '../poll-body/poll-body.component';

export interface PollPopupData {
  poll: PollDetail;
}

/**
 * Fires in front of whatever the user is doing the moment a poll opens -- a poll is a
 * "everyone answer now" moment, and waiting for people to notice a new row on the Polls page
 * (or be on it at all) was losing votes. Stays live over the socket, so it follows the poll
 * through votes and closing without the user reopening anything.
 */
@Component({
  selector: 'app-poll-popup',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatDialogModule, PollBodyComponent],
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .headline { display:flex;align-items:center;gap:8px;font-size:0.72rem;font-weight:700;
                text-transform:uppercase;letter-spacing:0.6px;color:#64b5f6;margin-bottom:10px }
    .headline mat-icon { font-size:18px;width:18px;height:18px;line-height:18px }
    .live-dot {
      width:8px;height:8px;border-radius:50%;background:#64b5f6;
      box-shadow:0 0 0 0 rgba(100,181,246,0.7);animation:pulse-dot 1.6s ease-out infinite;
    }
    @keyframes pulse-dot {
      to { box-shadow:0 0 0 10px rgba(100,181,246,0); }
    }
    @media (prefers-reduced-motion: reduce) { .live-dot { animation:none } }
    .question { font-weight:700;font-size:1.1rem;margin-bottom:4px }
    .by-line { font-size:0.75rem;opacity:0.5;margin-bottom:16px }
    .closed-chip { font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;
                   padding:3px 8px;border-radius:10px;background:rgba(239,83,80,0.15);color:#ef5350 }
  `],
  template: `
    <mat-dialog-content style="min-width:min(420px,80vw);padding-top:20px">
      <div class="headline">
        <span class="live-dot"></span>
        <mat-icon>poll</mat-icon>
        {{ poll().isClosed ? 'Poll closed' : 'New poll started' }}
      </div>
      <div class="question">{{ poll().question }}</div>
      <div class="by-line">
        By {{ poll().createdByName }}
        @if (poll().isClosed) { · <span class="closed-chip">Closed</span> }
      </div>

      <app-poll-body [poll]="poll()"
                     (voted)="vote($event)"
                     (changeVoteRequested)="changeVote()"
                     (peekToggled)="togglePeek($event)" />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="openFullPoll()">Open poll</button>
      <button mat-flat-button color="primary" mat-dialog-close>Done</button>
    </mat-dialog-actions>
  `
})
export class PollPopupComponent implements OnInit, OnDestroy {
  private data = inject<PollPopupData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<PollPopupComponent>);
  private service = inject(PollService);
  private ws = inject(WebSocketService);
  private router = inject(Router);

  poll = signal<PollDetail>(this.data.poll);
  private peeking = signal(false);
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.ws.roomEvents<PollEvent>(POLL_EVENT_TYPES).pipe(takeUntil(this.destroy$)).subscribe(msg => {
      if ((msg.data['pollId'] as string | undefined) !== this.poll().id) return;
      // The poll this popup is about vanished -- nothing left to show.
      if (msg.type === 'poll_deleted') { this.dialogRef.close(); return; }
      this.refresh();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private refresh() {
    this.service.getDetail(this.poll().id, this.peeking()).subscribe({ next: d => this.poll.set(d) });
  }

  vote(optionId: string) {
    this.service.vote(this.poll().id, optionId).subscribe({ next: d => this.poll.set(d) });
  }

  changeVote() {
    this.poll.update(p => ({ ...p, myOptionId: null }));
  }

  togglePeek(value: boolean) {
    this.peeking.set(value);
    this.service.getDetail(this.poll().id, value).subscribe({ next: d => this.poll.set(d) });
  }

  openFullPoll() {
    this.dialogRef.close();
    this.router.navigate(['/pulse/polls', this.poll().slug ?? this.poll().id]);
  }
}
