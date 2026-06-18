import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AccessRequestsService, AccessRequest } from '../../../core/services/access-requests.service';

@Component({
  selector: 'app-pending-approvals-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, MatButtonModule, MatSnackBarModule],
  template: `
    <div class="dialog-header">
      <mat-icon class="header-icon">person_add</mat-icon>
      <h2>Pending Access Requests</h2>
      <button mat-icon-button (click)="dialogRef.close()"><mat-icon>close</mat-icon></button>
    </div>

    <div class="dialog-body">
      @if (loading()) {
        <div class="empty-state">Loading...</div>
      } @else if (requests().length === 0) {
        <div class="empty-state">
          <mat-icon style="font-size:40px;width:40px;height:40px;opacity:0.3">check_circle</mat-icon>
          <div>All caught up — no pending requests.</div>
        </div>
      } @else {
        @for (req of requests(); track req.id) {
          <div class="req-card">
            <div class="req-info">
              <div class="req-name">{{ req.name }}</div>
              <div class="req-email">{{ req.email }}</div>
              @if (req.reason) { <div class="req-reason">{{ req.reason }}</div> }
            </div>
            <div class="req-actions">
              <button mat-stroked-button color="primary" [disabled]="busyId() === req.id" (click)="approve(req)">
                <mat-icon style="font-size:16px;height:16px;width:16px;margin-right:2px">check</mat-icon>
                Approve
              </button>
              <button mat-stroked-button color="warn" [disabled]="busyId() === req.id" (click)="deny(req)">
                <mat-icon style="font-size:16px;height:16px;width:16px;margin-right:2px">close</mat-icon>
                Deny
              </button>
            </div>
          </div>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .dialog-header { display:flex; align-items:center; gap:10px; padding:16px 16px 12px; border-bottom:1px solid rgba(255,255,255,0.07); }
    .header-icon { color:#64b5f6; }
    .dialog-header h2 { margin:0; font-size:1.05rem; font-weight:600; flex:1; }
    .dialog-body { padding:14px 16px 18px; max-height:60vh; overflow-y:auto; min-width:min(340px,80vw); display:flex; flex-direction:column; gap:8px; }
    .empty-state { text-align:center; padding:30px 10px; opacity:0.45; display:flex; flex-direction:column; align-items:center; gap:8px; }
    .req-card { padding:12px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.07); background:rgba(255,255,255,0.02); display:flex; flex-direction:column; gap:10px; }
    .req-name { font-weight:600; font-size:0.92rem; }
    .req-email { font-size:0.78rem; opacity:0.5; }
    .req-reason { font-size:0.8rem; opacity:0.65; margin-top:4px; line-height:1.4; }
    .req-actions { display:flex; gap:8px; }
    .req-actions button { flex:1; font-size:0.75rem; height:32px; }
  `]
})
export class PendingApprovalsDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<PendingApprovalsDialogComponent>);
  private svc = inject(AccessRequestsService);
  private snackBar = inject(MatSnackBar);

  requests = signal<AccessRequest[]>([]);
  loading = signal(true);
  busyId = signal<string | null>(null);

  ngOnInit() {
    this.load();
  }

  private load() {
    this.loading.set(true);
    this.svc.listPending().subscribe({
      next: (reqs) => {
        this.requests.set(reqs);
        this.loading.set(false);
        this.svc.pendingCount.set(reqs.length);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load access requests', 'Close', { duration: 3000 });
      }
    });
  }

  approve(req: AccessRequest) {
    this.busyId.set(req.id);
    this.svc.approve(req.id).subscribe({
      next: () => {
        this.snackBar.open(`${req.name} approved and granted access`, 'Close', { duration: 3000 });
        this.busyId.set(null);
        this.load();
      },
      error: () => {
        this.busyId.set(null);
        this.snackBar.open('Failed to approve', 'Close', { duration: 3000 });
      }
    });
  }

  deny(req: AccessRequest) {
    this.busyId.set(req.id);
    this.svc.deny(req.id).subscribe({
      next: () => {
        this.snackBar.open(`Request from ${req.name} denied`, 'Close', { duration: 3000 });
        this.busyId.set(null);
        this.load();
      },
      error: () => {
        this.busyId.set(null);
        this.snackBar.open('Failed to deny', 'Close', { duration: 3000 });
      }
    });
  }
}
