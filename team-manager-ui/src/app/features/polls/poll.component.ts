import { Component, OnInit, OnDestroy, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { PollService } from '../../core/services/poll.service';
import { PollDetail, PollSummary } from '../../core/models/poll.model';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

function toLocalDateTimeInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

@Component({
  selector: 'app-create-poll-dialog',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatCheckboxModule, MatDialogModule],
  styles: [`
    .field-label { font-size:0.78rem;opacity:0.6;display:block;margin-bottom:4px }
    .field { background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:6px;
             color:inherit;font-size:0.85rem;padding:8px 10px;outline:none;width:100%;
             box-sizing:border-box;margin-bottom:8px;transition:border-color 0.2s }
    .field:focus { border-color:#64b5f6 }
    .option-row { display:flex;gap:6px;align-items:center;margin-bottom:8px }
    .option-row .field { margin-bottom:0 }
  `],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <h2 mat-dialog-title style="font-size:1rem;margin:0 0 4px">New Poll</h2>
    <mat-dialog-content style="padding-top:12px;min-width:360px">
      <label class="field-label">Question *</label>
      <input class="field" [(ngModel)]="question" placeholder="e.g. Where should we go for the team lunch?">

      <label class="field-label">Options (2–8)</label>
      @for (opt of options; let i = $index; track i) {
        <div class="option-row">
          <input class="field" [(ngModel)]="options[i]" [placeholder]="'Option ' + (i + 1)">
          @if (options.length > 2) {
            <button mat-icon-button (click)="removeOption(i)"><mat-icon>close</mat-icon></button>
          }
        </div>
      }
      @if (options.length < 8) {
        <button mat-stroked-button style="width:100%;margin-top:4px" (click)="addOption()">+ Add option</button>
      }

      <mat-checkbox style="margin-top:14px;font-size:0.85rem" [(ngModel)]="hideResultsUntilClosed">
        Hide results until I close the poll
      </mat-checkbox>

      <label class="field-label" style="margin-top:14px">Auto-close at (optional)</label>
      <input type="datetime-local" class="field" [(ngModel)]="scheduledCloseAt" [min]="minDateTime">
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="margin-top:8px">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [disabled]="!canSubmit()" (click)="submit()">Create Poll</button>
    </mat-dialog-actions>
  `
})
export class CreatePollDialogComponent {
  dialogRef = inject(MatDialogRef<CreatePollDialogComponent>);
  question = '';
  options = ['', ''];
  hideResultsUntilClosed = false;
  scheduledCloseAt = '';
  // datetime-local's value/min are local-time strings with no timezone -- toISOString() returns
  // UTC, which silently breaks the min bound (and picked dates) for anyone not in UTC+0.
  minDateTime = toLocalDateTimeInputValue(new Date(Date.now() + 60_000));

  addOption() { if (this.options.length < 8) this.options.push(''); }
  removeOption(i: number) { if (this.options.length > 2) this.options.splice(i, 1); }

  canSubmit(): boolean {
    if (this.question.trim().length === 0) return false;
    if (this.options.filter(o => o.trim().length > 0).length < 2) return false;
    if (this.scheduledCloseAt && new Date(this.scheduledCloseAt).getTime() <= Date.now()) return false;
    return true;
  }

  submit() {
    if (!this.canSubmit()) return;
    this.dialogRef.close({
      question: this.question.trim(),
      options: this.options.map(o => o.trim()).filter(Boolean),
      hideResultsUntilClosed: this.hideResultsUntilClosed,
      scheduledCloseAt: this.scheduledCloseAt ? new Date(this.scheduledCloseAt).toISOString() : null
    });
  }
}

@Component({
  selector: 'app-poll',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatDialogModule, MatSnackBarModule, MatProgressSpinnerModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .wrap { max-width: 700px; margin: 0 auto; }
    .lobby-header { display:flex;justify-content:space-between;align-items:center;margin-bottom:16px }
    .lobby-header h2 { margin:0;font-size:1.1rem }
    .poll-card {
      display:flex;justify-content:space-between;align-items:center;gap:12px;
      background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:12px;
      padding:14px 16px;margin-bottom:10px;cursor:pointer;transition:background 0.15s;
    }
    .poll-card:hover { background:rgba(255,255,255,0.07) }
    .poll-question { font-weight:600;font-size:0.92rem }
    .poll-meta { font-size:0.75rem;opacity:0.55;margin-top:2px }
    .empty { text-align:center;opacity:0.5;padding:40px 0;font-size:0.85rem }
    .back-link { font-size:0.78rem;opacity:0.6;cursor:pointer;display:inline-flex;align-items:center;gap:4px;margin-bottom:12px }
    .back-link:hover { opacity:1 }
    .poll-detail-card { background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:20px }
    .question-text { font-weight:700;font-size:1.1rem;margin-bottom:6px }
    .detail-meta { font-size:0.75rem;opacity:0.5;margin-bottom:16px }
    .option-btn { width:100%;margin-bottom:8px;padding:12px;height:auto;white-space:normal;text-align:left;justify-content:flex-start }
    .vote-prompt { font-size:0.78rem;opacity:0.65;margin-bottom:10px }
    .result-row { margin-bottom:10px }
    .result-label { display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:4px }
    .result-label.mine { color:#64b5f6;font-weight:600 }
    .result-bar-track { height:8px;border-radius:4px;background:rgba(255,255,255,0.08);overflow:hidden }
    .result-bar-fill { height:100%;border-radius:4px;background:linear-gradient(90deg,#64b5f6,#81c784);transition:width 0.3s ease }
    .total-votes { font-size:0.72rem;opacity:0.45;margin-top:12px }
    .hidden-results { font-size:0.82rem;opacity:0.6;text-align:center;padding:16px;background:rgba(255,255,255,0.03);border-radius:8px }
    .closed-chip { font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;padding:3px 8px;border-radius:10px;background:rgba(239,83,80,0.15);color:#ef5350 }
  `],
  template: `
    <div class="wrap">
      @if (!selectedPoll()) {
        <div class="lobby-header">
          <h2>🗳️ Polls</h2>
          <button mat-flat-button color="primary" (click)="openCreateDialog()">New Poll</button>
        </div>

        @if (loading()) {
          <div style="text-align:center;padding:40px 0"><mat-spinner diameter="32" style="margin:0 auto"></mat-spinner></div>
        } @else if (polls().length === 0) {
          <div class="empty">No polls open right now — start one!</div>
        } @else {
          @for (p of polls(); track p.id) {
            <div class="poll-card" (click)="selectPoll(p.id)">
              <div>
                <div class="poll-question">{{ p.question }}</div>
                <div class="poll-meta">
                  By {{ p.createdByName }} · {{ p.optionCount }} options
                  @if (p.hideResultsUntilClosed) { · 🔒 results hidden } @else { · {{ p.totalVotes }} vote{{ p.totalVotes === 1 ? '' : 's' }} }
                  @if (p.scheduledCloseAt) { · ⏰ closes {{ p.scheduledCloseAt | date:'MMM d, h:mm a' }} }
                </div>
              </div>
            </div>
          }
        }
      } @else {
        <span class="back-link" (click)="backToLobby()"><mat-icon style="font-size:16px;width:16px;height:16px">arrow_back</mat-icon> All polls</span>

        @if (selectedPollLoading()) {
          <div style="text-align:center;padding:40px 0"><mat-spinner diameter="32" style="margin:0 auto"></mat-spinner></div>
        } @else {
          @let p = selectedPoll()!;
          <div class="poll-detail-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
              <div class="question-text">{{ p.question }}</div>
              <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
                @if (p.isClosed) { <span class="closed-chip">Closed</span> }
                <button mat-icon-button (click)="sharePoll(p.id)" title="Copy share link" aria-label="Copy share link">
                  <mat-icon>share</mat-icon>
                </button>
              </div>
            </div>
            <div class="detail-meta">
              By {{ p.createdByName }}
              @if (p.scheduledCloseAt && !p.isClosed) { · ⏰ closes {{ p.scheduledCloseAt | date:'MMM d, h:mm a' }} }
            </div>

            @if (!p.isClosed && p.myOptionId === null) {
              <div class="vote-prompt">👉 Tap an option below to cast your vote</div>
              @for (opt of p.options; track opt.id) {
                <button mat-stroked-button class="option-btn" (click)="vote(opt.id)">{{ opt.text }}</button>
              }
            } @else if (!p.resultsVisible) {
              <div class="hidden-results">
                🔒 Your vote is locked in. Results are hidden until the poll closes.
              </div>
              <button mat-button style="margin-top:8px;font-size:0.75rem;opacity:0.6" (click)="changeVote()">Change my vote</button>
            } @else {
              @for (opt of p.options; track opt.id) {
                <div class="result-row">
                  <div class="result-label" [class.mine]="opt.id === p.myOptionId">
                    <span>{{ opt.text }} @if (opt.id === p.myOptionId) { — your vote }</span>
                    <span>{{ opt.voteCount }} ({{ opt.percentage }}%)</span>
                  </div>
                  <div class="result-bar-track"><div class="result-bar-fill" [style.width]="opt.percentage + '%'"></div></div>
                </div>
              }
              @if (!p.isClosed) {
                <button mat-button style="margin-top:4px;font-size:0.75rem;opacity:0.6" (click)="changeVote()">Change my vote</button>
              }
            }

            @if (p.resultsVisible) {
              <div class="total-votes">{{ p.totalVotes }} total vote{{ p.totalVotes === 1 ? '' : 's' }}</div>
            } @else if (p.hideResultsUntilClosed && !p.isClosed) {
              <div class="total-votes">Results will be revealed when the poll closes</div>
            }

            @if (p.isCreator) {
              <div style="display:flex;gap:8px;margin-top:14px">
                @if (!p.isClosed) {
                  <button mat-stroked-button style="flex:1" (click)="closePoll()">Close Poll</button>
                }
                <button mat-stroked-button color="warn" style="flex:1" (click)="deletePoll()">Delete</button>
              </div>
            }
          </div>
        }
      }
    </div>
  `
})
export class PollComponent implements OnInit, OnDestroy {
  private service = inject(PollService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private ws = inject(WebSocketService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = signal(true);
  polls = signal<PollSummary[]>([]);
  selectedPoll = signal<PollDetail | null>(null);
  selectedPollLoading = signal(false);

  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.ws.connect();
    this.ws.messages$.pipe(
      takeUntil(this.destroy$),
      filter(msg => msg !== null && msg.type.startsWith('poll_'))
    ).subscribe(msg => {
      const pollId = msg!.data['pollId'] as string | undefined;
      const current = this.selectedPoll();

      if (msg!.type === 'poll_deleted' && current && pollId === current.id) {
        this.snackBar.open('This poll was deleted', 'Close', { duration: 4000 });
        this.backToLobby();
        return;
      }

      if (current && pollId === current.id) {
        this.service.getDetail(current.id).subscribe({ next: d => this.selectedPoll.set(d) });
      }
      if (!current) this.loadPolls();
    });

    // The URL is the single source of truth for which poll is open, so a poll's detail
    // page is a real shareable link, not just internal component state.
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadPollDetail(id);
      } else {
        this.selectedPoll.set(null);
        this.loadPolls();
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next(); this.destroy$.complete();
  }

  loadPolls() {
    this.loading.set(true);
    this.service.getOpenPolls().subscribe({
      next: items => { this.polls.set(items); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  private loadPollDetail(pollId: string) {
    this.selectedPollLoading.set(true);
    this.service.getDetail(pollId).subscribe({
      next: d => { this.selectedPoll.set(d); this.selectedPollLoading.set(false); },
      error: () => {
        this.selectedPollLoading.set(false);
        this.snackBar.open('Failed to open poll', 'Close', { duration: 4000 });
        this.backToLobby();
      }
    });
  }

  selectPoll(pollId: string) {
    this.router.navigate(['/fun/polls', pollId]);
  }

  sharePoll(pollId: string) {
    const url = `${window.location.origin}/fun/polls/${pollId}`;
    navigator.clipboard.writeText(url).then(
      () => this.snackBar.open('Share link copied to clipboard', 'Close', { duration: 3000 }),
      () => this.snackBar.open(url, 'Close', { duration: 10000 })
    );
  }

  backToLobby() {
    this.router.navigate(['/fun/polls']);
  }

  openCreateDialog() {
    this.dialog.open(CreatePollDialogComponent, { width: '420px' })
      .afterClosed().subscribe(result => {
        if (!result) return;
        this.service.create(result).subscribe({
          next: d => { this.router.navigate(['/fun/polls', d.id]); this.snackBar.open('Poll created', 'Close', { duration: 3000 }); },
          error: (err) => this.snackBar.open(err.error?.error ?? 'Failed to create poll', 'Close', { duration: 4000 })
        });
      });
  }

  vote(optionId: string) {
    const p = this.selectedPoll();
    if (!p) return;
    this.service.vote(p.id, optionId).subscribe({
      next: d => this.selectedPoll.set(d),
      error: (err) => this.snackBar.open(err.error?.error ?? 'Failed to vote', 'Close', { duration: 4000 })
    });
  }

  changeVote() {
    const p = this.selectedPoll();
    if (!p) return;
    this.selectedPoll.set({ ...p, myOptionId: null });
  }

  closePoll() {
    const p = this.selectedPoll();
    if (!p) return;
    this.service.close(p.id).subscribe({
      next: d => this.selectedPoll.set(d),
      error: (err) => this.snackBar.open(err.error?.error ?? 'Failed to close poll', 'Close', { duration: 4000 })
    });
  }

  deletePoll() {
    const p = this.selectedPoll();
    if (!p) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete poll?', message: 'This poll and all its votes will be permanently removed.', danger: true }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.service.delete(p.id).subscribe({
        next: () => { this.backToLobby(); this.snackBar.open('Poll deleted', 'Close', { duration: 3000 }); },
        error: (err) => this.snackBar.open(err.error?.error ?? 'Failed to delete poll', 'Close', { duration: 4000 })
      });
    });
  }
}
