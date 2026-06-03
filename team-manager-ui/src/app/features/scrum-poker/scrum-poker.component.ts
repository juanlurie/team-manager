import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { ScrumPokerService } from '../../core/services/scrum-poker.service';
import {
  ScrumPokerSession, ScrumPokerSessionDetail, ScrumPokerVote,
  CreateScrumPokerSessionRequest, SCRUM_POKER_SCALES
} from '../../core/models/scrum-poker.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { WebSocketService } from '../../core/websocket/websocket.service';

@Component({
  selector: 'app-create-session-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatDialogModule],
  styles: [`
    .field-label { font-size:0.78rem;opacity:0.6;display:block;margin-bottom:4px }
    .field { background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:6px;
             color:inherit;font-size:0.85rem;padding:8px 10px;outline:none;width:100%;
             box-sizing:border-box;margin-bottom:12px;transition:border-color 0.2s }
    .field:focus { border-color:#64b5f6 }
  `],
  template: `
    <h2 mat-dialog-title style="font-size:1rem;margin:0 0 4px">New Scrum Poker Session</h2>
    <mat-dialog-content style="padding-top:12px;min-width:340px">
      <label class="field-label">Title *</label>
      <input class="field" [(ngModel)]="title" placeholder="e.g. Sprint Planning #5" (keyup.enter)="submit()">

      <label class="field-label">Story Title (optional)</label>
      <input class="field" [(ngModel)]="storyTitle" placeholder="e.g. User authentication feature">

      <label class="field-label">Description (optional)</label>
      <input class="field" [(ngModel)]="description" placeholder="Additional context…">

      <label class="field-label">Scale</label>
      <select class="field" [(ngModel)]="scale" style="margin-bottom:0">
        @for (s of scales; track s) { <option [ngValue]="s">{{ s }}</option> }
      </select>
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="margin-top:8px">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="!title.trim()" (click)="submit()">
        Create Session
      </button>
    </mat-dialog-actions>
  `
})
export class CreateSessionDialogComponent {
  dialogRef = inject(MatDialogRef<CreateSessionDialogComponent>);
  title = '';
  storyTitle = '';
  description = '';
  scale = 'Fibonacci';
  scales = Object.keys(SCRUM_POKER_SCALES);

  submit() {
    if (!this.title.trim()) return;
    this.dialogRef.close({ title: this.title, storyTitle: this.storyTitle, description: this.description, scale: this.scale });
  }
}

@Component({
  selector: 'app-scrum-poker',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule,
    MatTooltipModule, MatDialogModule, MatSnackBarModule, MatProgressSpinnerModule
  ],
  templateUrl: './scrum-poker.component.html',
  styleUrls: ['./scrum-poker.component.scss']
})
export class ScrumPokerComponent implements OnInit, OnDestroy {
  private service = inject(ScrumPokerService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private ws = inject(WebSocketService);

  loading = signal(true);
  sessions = signal<ScrumPokerSession[]>([]);
  selectedSession = signal<ScrumPokerSessionDetail | null>(null);
  selectedSessionLoading = signal(false);

  private destroy$ = new Subject<void>();

  // Before reveal the backend only returns the current user's own vote value (others are null)
  myVote = computed((): string | null => {
    const s = this.selectedSession();
    if (!s || s.revealed) return null;
    return s.votes.find(v => v.value !== null)?.value ?? null;
  });

  consensusMode = computed((): string | null => {
    const s = this.selectedSession();
    if (!s?.revealed || !s.votes.length) return null;
    const real = s.votes.filter(v => v.value && v.value !== '?');
    if (!real.length) return null;
    const freq: Record<string, number> = {};
    for (const v of real) freq[v.value!] = (freq[v.value!] || 0) + 1;
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  });

  consensusAverage = computed((): string | null => {
    const s = this.selectedSession();
    if (!s?.revealed) return null;
    const nums = s.votes.map(v => parseFloat(v.value ?? '')).filter(n => !isNaN(n));
    if (!nums.length) return null;
    return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
  });

  consensusDistribution = computed((): { value: string; count: number }[] => {
    const s = this.selectedSession();
    if (!s?.revealed) return [];
    const freq: Record<string, number> = {};
    for (const v of s.votes) { const val = v.value ?? '–'; freq[val] = (freq[val] || 0) + 1; }
    return Object.entries(freq).map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
  });

  ngOnInit() {
    this.loadSessions();
    this.ws.connect();
    this.ws.messages$.pipe(
      takeUntil(this.destroy$),
      filter(msg => msg !== null && msg.type.startsWith('scrum_poker_'))
    ).subscribe(msg => {
      const sessionId = msg!.data['sessionId'] as string | undefined;
      const current = this.selectedSession();

      if (msg!.type === 'scrum_poker_session_deleted') {
        if (current && current.id === sessionId) {
          this.selectedSession.set(null);
          this.snackBar.open('This session was deleted', 'Close', { duration: 4000 });
        }
        this.loadSessions();
        return;
      }

      if (msg!.type === 'scrum_poker_session_created') {
        if (!current) this.loadSessions();
        return;
      }

      if (current && sessionId === current.id) {
        this.service.getSession(current.id).subscribe({
          next: d => this.selectedSession.set(d)
        });
      }

      this.loadSessions();
    });
  }

  ngOnDestroy() {
    this.destroy$.next(); this.destroy$.complete();
  }

  loadSessions() {
    this.loading.set(true);
    this.service.getActiveSessions().subscribe({
      next: r => { this.sessions.set(r.items); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  selectSession(session: ScrumPokerSession) {
    this.selectedSessionLoading.set(true);
    this.service.getSession(session.id).subscribe({
      next: d => {
        this.selectedSession.set(d);
        this.selectedSessionLoading.set(false);
      },
      error: () => this.selectedSessionLoading.set(false)
    });
  }

  backToList() {
    this.selectedSession.set(null);
    this.loadSessions();
  }

  openCreateDialog() {
    this.dialog.open(CreateSessionDialogComponent, { width: '420px' })
      .afterClosed().subscribe(result => {
        if (!result) return;
        const req: CreateScrumPokerSessionRequest = {
          title: result.title,
          storyTitle: result.storyTitle || undefined,
          description: result.description || undefined,
          scale: result.scale
        };
        this.service.createSession(req).subscribe({
          next: d => {
            this.selectedSession.set(d);
            this.loadSessions();
            this.snackBar.open('Session created', 'Close', { duration: 3000 });
          },
          error: () => this.snackBar.open('Failed to create session', 'Close', { duration: 4000 })
        });
      });
  }

  castVote(value: string) {
    const s = this.selectedSession();
    if (!s) return;
    this.service.castVote(s.id, { value }).subscribe({
      next: d => this.selectedSession.set(d),
      error: () => this.snackBar.open('Failed to cast vote', 'Close', { duration: 4000 })
    });
  }

  revealVotes() {
    const s = this.selectedSession();
    if (!s) return;
    this.service.revealVotes(s.id).subscribe({
      error: () => this.snackBar.open('Failed to reveal votes', 'Close', { duration: 4000 })
    });
  }

  resetSession() {
    const s = this.selectedSession();
    if (!s) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Reset session?', message: 'All votes will be cleared.', danger: true }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.service.resetSession(s.id).subscribe({
        error: () => this.snackBar.open('Failed to reset session', 'Close', { duration: 4000 })
      });
    });
  }

  deleteSession() {
    const s = this.selectedSession();
    if (!s) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete session?', message: 'This session will be permanently removed.', danger: true }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.service.deleteSession(s.id).subscribe({
        next: () => { this.backToList(); this.snackBar.open('Session deleted', 'Close', { duration: 3000 }); },
        error: () => this.snackBar.open('Failed to delete session', 'Close', { duration: 4000 })
      });
    });
  }

  getScaleValues(scale: string): string[] {
    return SCRUM_POKER_SCALES[scale as keyof typeof SCRUM_POKER_SCALES] || [];
  }

  isOutlier(vote: ScrumPokerVote): boolean {
    const s = this.selectedSession();
    if (!s?.revealed || !vote.value || vote.value === '?') return false;
    const mode = this.consensusMode();
    if (!mode || mode === '?') return false;
    const vals = this.getScaleValues(s.scale);
    const mi = vals.indexOf(mode), vi = vals.indexOf(vote.value);
    if (mi === -1 || vi === -1) return false;
    return Math.abs(mi - vi) > 2;
  }

  relativeTime(dateStr: string): string {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

}
