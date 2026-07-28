import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { PollService } from './poll.service';
import { PollDetail } from '../models/poll.model';
import { FeatureAccessService } from './feature-access.service';
import { WebSocketService } from '../websocket/websocket.service';
import { PollEvent, POLL_EVENT_TYPES } from '../websocket/events/poll.events';

/**
 * Watches the socket app-wide and throws a newly started poll up on screen wherever the user
 * happens to be. Without this a poll only exists on the Polls page, so people either never see
 * it or see it long after it mattered.
 */
@Injectable({ providedIn: 'root' })
export class PollAnnouncerService {
  private ws = inject(WebSocketService);
  private polls = inject(PollService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private featureAccess = inject(FeatureAccessService);

  /** Polls already popped in this tab -- a reconnect replaying an event must not re-open one. */
  private announced = new Set<string>();
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;

    this.ws.roomEvents<PollEvent>(POLL_EVENT_TYPES).subscribe(msg => {
      if (msg.type !== 'poll_created') return;
      const pollId = msg.data['pollId'] as string | undefined;
      if (!pollId || this.announced.has(pollId)) return;
      if (!this.featureAccess.hasAccess('polls')) return;
      // Already looking at this poll (or at a modal of some other kind) -- don't cover it.
      if (this.router.url.includes(`/polls/${pollId}`)) return;
      this.announced.add(pollId);

      this.polls.getDetail(pollId).subscribe({
        next: poll => {
          // The person who started it is already looking at it; and a poll that closed between
          // the broadcast and this fetch is no longer an "answer now" moment.
          if (poll.isCreator || poll.isClosed) return;
          this.openPopup(poll);
        },
        // A poll we can't read (deleted, or not ours to see) simply isn't announced.
        error: () => this.announced.add(pollId),
      });
    });
  }

  private async openPopup(poll: PollDetail) {
    const { PollPopupComponent } = await import('../../features/polls/poll-popup/poll-popup.component');
    this.dialog.open(PollPopupComponent, {
      data: { poll },
      width: '460px',
      maxWidth: '95vw',
      autoFocus: false,
      panelClass: 'poll-popup-panel',
    });
  }
}
