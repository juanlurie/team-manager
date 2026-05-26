import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

interface AccessRequest {
  id: string;
  email: string;
  name: string;
  googleSub: string | null;
  reason: string;
  status: string;
  createdAt: string;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

@Component({
  selector: 'app-access-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSnackBarModule, MatDialogModule],
  template: `
    <div style="max-width:900px;margin:0 auto;padding:0 8px 80px">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap">
        <h2 style="margin:0;font-size:1.2rem;font-weight:600">Access Requests</h2>
        <div style="flex:1"></div>
        <div style="display:flex;gap:4px">
          @for (tab of tabs; track tab) {
            <button mat-button [color]="filter() === tab ? 'primary' : ''"
                    (click)="filter.set(tab); loadRequests()"
                    style="font-size:0.78rem">{{ tab }}</button>
          }
        </div>
      </div>

      @if (loading()) {
        <div style="text-align:center;padding:60px;opacity:0.3">Loading...</div>
      } @else if (requests().length === 0) {
        <div style="text-align:center;padding:60px;opacity:0.35">
          <mat-icon style="font-size:48px;width:48px;height:48px;opacity:0.3;margin-bottom:12px">person_add</mat-icon>
          <div style="font-weight:600">No access requests</div>
          <div style="font-size:0.8rem;margin-top:4px">
            {{ filter() === 'Pending' ? 'No pending requests' : 'No requests with this status' }}
          </div>
        </div>
      } @else {
        <div style="display:flex;flex-direction:column;gap:8px">
          @for (req of requests(); track req.id) {
            <div style="padding:14px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.02)">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                    <span style="font-weight:600;font-size:0.95rem">{{ req.name }}</span>
                    <span [class]="statusClass(req.status)">{{ req.status }}</span>
                  </div>
                  <div style="font-size:0.8rem;opacity:0.5;margin-bottom:4px">{{ req.email }}</div>
                  @if (req.reason) {
                    <div style="font-size:0.82rem;opacity:0.6;margin-bottom:6px;line-height:1.4">{{ req.reason }}</div>
                  }
                  <div style="font-size:0.7rem;opacity:0.35">
                    Requested {{ req.createdAt | date:'short' }}
                    @if (req.reviewedByName) {
                      · {{ req.status === 'Approved' ? 'Approved' : 'Denied' }} by {{ req.reviewedByName }} {{ req.reviewedAt | date:'short' }}
                      @if (req.reviewNotes) { — {{ req.reviewNotes }} }
                    }
                  </div>
                </div>

                @if (req.status === 'Pending') {
                  <div style="display:flex;gap:6px;flex-shrink:0">
                    <button mat-stroked-button color="primary" (click)="approve(req)"
                            style="font-size:0.75rem;height:32px">
                      <mat-icon style="font-size:16px;height:16px;width:16px;margin-right:2px">check</mat-icon>
                      Approve
                    </button>
                    <button mat-stroked-button color="warn" (click)="deny(req)"
                            style="font-size:0.75rem;height:32px">
                      <mat-icon style="font-size:16px;height:16px;width:16px;margin-right:2px">close</mat-icon>
                      Deny
                    </button>
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .status-badge { font-size:0.68rem;font-weight:600;padding:2px 8px;border-radius:10px;text-transform:uppercase;letter-spacing:0.04em; }
    .status-pending { background:rgba(255,152,0,0.15);color:#ffb74d;border:1px solid rgba(255,152,0,0.25); }
    .status-approved { background:rgba(76,175,80,0.15);color:#81c784;border:1px solid rgba(76,175,80,0.25); }
    .status-denied { background:rgba(239,83,80,0.15);color:#ef9a9a;border:1px solid rgba(239,83,80,0.25); }
  `]
})
export class AccessRequestsComponent {
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  requests = signal<AccessRequest[]>([]);
  loading = signal(true);
  filter = signal('Pending');
  tabs = ['Pending', 'Approved', 'Denied', 'All'];

  ngOnInit() {
    this.loadRequests();
  }

  loadRequests() {
    this.loading.set(true);
    const status = this.filter() === 'All' ? undefined : this.filter();
    const params = status ? `?status=${status}` : '';
    this.http.get<AccessRequest[]>(`/api/accessrequests${params}`).subscribe({
      next: (data) => {
        this.requests.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load access requests', 'Close', { duration: 3000 });
      }
    });
  }

  statusClass(status: string): string {
    return `status-badge status-${status.toLowerCase()}`;
  }

  approve(req: AccessRequest) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        title: 'Approve access?',
        message: `Grant access to ${req.name} (${req.email})?`,
        confirmLabel: 'Approve',
        danger: false
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.http.post(`/api/accessrequests/${req.id}/approve`, {}).subscribe({
        next: () => {
          this.snackBar.open(`${req.name} approved and granted access`, 'Close', { duration: 3000 });
          this.loadRequests();
        },
        error: () => this.snackBar.open('Failed to approve', 'Close', { duration: 3000 })
      });
    });
  }

  deny(req: AccessRequest) {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        title: 'Deny access?',
        message: `Deny access request from ${req.name}?`,
        confirmLabel: 'Deny',
        danger: true
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.http.post(`/api/accessrequests/${req.id}/deny`, {}).subscribe({
        next: () => {
          this.snackBar.open(`Request from ${req.name} denied`, 'Close', { duration: 3000 });
          this.loadRequests();
        },
        error: () => this.snackBar.open('Failed to deny', 'Close', { duration: 3000 })
      });
    });
  }
}
