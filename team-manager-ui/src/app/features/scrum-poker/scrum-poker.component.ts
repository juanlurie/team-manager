import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { ScrumPokerService } from '../../core/services/scrum-poker.service';
import { ScrumPokerSession, ScrumPokerSessionDetail, ScrumPokerVote, CreateScrumPokerSessionRequest, SCRUM_POKER_SCALES } from '../../core/models/scrum-poker.model';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-scrum-poker',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule,
    MatTooltipModule, MatDialogModule, MatSnackBarModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatProgressSpinnerModule
  ],
  templateUrl: './scrum-poker.component.html',
  styleUrls: ['./scrum-poker.component.scss']
})
export class ScrumPokerComponent implements OnInit {
  private service = inject(ScrumPokerService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  loading = signal(true);
  sessions = signal<ScrumPokerSession[]>([]);
  selectedSession = signal<ScrumPokerSessionDetail | null>(null);
  selectedSessionLoading = signal(false);

  showCreateDialog = signal(false);
  newSessionTitle = '';
  newSessionStoryTitle = '';
  newSessionDescription = '';
  newSessionScale = 'Fibonacci';

  scales = Object.keys(SCRUM_POKER_SCALES);
  scaleValues = SCRUM_POKER_SCALES;

  ngOnInit() {
    this.loadSessions();
  }

  loadSessions() {
    this.loading.set(true);
    this.service.getActiveSessions().subscribe({
      next: result => { this.sessions.set(result.items); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  selectSession(session: ScrumPokerSession) {
    this.selectedSessionLoading.set(true);
    this.service.getSession(session.id).subscribe({
      next: d => { this.selectedSession.set(d); this.selectedSessionLoading.set(false); },
      error: () => this.selectedSessionLoading.set(false)
    });
  }

  backToList() {
    this.selectedSession.set(null);
    this.loadSessions();
  }

  openCreateDialog() {
    this.showCreateDialog.set(true);
    this.newSessionTitle = '';
    this.newSessionStoryTitle = '';
    this.newSessionDescription = '';
    this.newSessionScale = 'Fibonacci';
  }

  closeCreateDialog() {
    this.showCreateDialog.set(false);
  }

  createSession() {
    const title = this.newSessionTitle.trim();
    if (!title) return;

    const req: CreateScrumPokerSessionRequest = {
      title,
      storyTitle: this.newSessionStoryTitle.trim() || undefined,
      description: this.newSessionDescription.trim() || undefined,
      scale: this.newSessionScale
    };

    this.service.createSession(req).subscribe({
      next: d => {
        this.showCreateDialog.set(false);
        this.selectedSession.set(d);
        this.loadSessions();
        this.snackBar.open('Session created', 'Close', { duration: 3000 });
      },
      error: () => this.snackBar.open('Failed to create session', 'Close', { duration: 4000 })
    });
  }

  castVote(value: string) {
    const session = this.selectedSession();
    if (!session) return;

    this.service.castVote(session.id, { value }).subscribe({
      next: d => this.selectedSession.set(d),
      error: () => this.snackBar.open('Failed to cast vote', 'Close', { duration: 4000 })
    });
  }

  revealVotes() {
    const session = this.selectedSession();
    if (!session) return;

    this.service.revealVotes(session.id).subscribe({
      next: d => this.selectedSession.set(d),
      error: () => this.snackBar.open('Failed to reveal votes', 'Close', { duration: 4000 })
    });
  }

  resetSession() {
    const session = this.selectedSession();
    if (!session) return;

    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Reset session?', message: 'All votes will be cleared.', danger: true }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.service.resetSession(session.id).subscribe({
        next: d => this.selectedSession.set(d),
        error: () => this.snackBar.open('Failed to reset session', 'Close', { duration: 4000 })
      });
    });
  }

  deleteSession() {
    const session = this.selectedSession();
    if (!session) return;

    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete session?', message: 'This session will be permanently removed.', danger: true }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.service.deleteSession(session.id).subscribe({
        next: () => {
          this.backToList();
          this.snackBar.open('Session deleted', 'Close', { duration: 3000 });
        },
        error: () => this.snackBar.open('Failed to delete session', 'Close', { duration: 4000 })
      });
    });
  }

  getVoteForMember(votes: ScrumPokerVote[], memberId: string): ScrumPokerVote | undefined {
    return votes.find(v => v.memberId === memberId);
  }

  getScaleValues(scale: string): string[] {
    return this.scaleValues[scale as keyof typeof this.scaleValues] || [];
  }
}
