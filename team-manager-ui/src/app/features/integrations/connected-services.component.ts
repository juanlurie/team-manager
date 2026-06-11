import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OutlookCalendarService, OutlookStatus } from '../api-request-configs/outlook-calendar.service';
import { GoogleCalendarService, GoogleCalendarStatus } from '../api-request-configs/google-calendar.service';

@Component({
  selector: 'app-connected-services',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="services-page">
      <div class="services-grid">

        <!-- Outlook Calendar -->
        <div class="service-card" [class.service-card--connected]="outlookStatus()?.isConnected">
          <div class="service-card__header">
            <div class="service-card__logo">
              <svg viewBox="0 0 24 24" fill="none" width="32" height="32">
                <rect width="24" height="24" rx="4" fill="#0078D4"/>
                <path d="M4 7h10v10H4z" fill="#fff" opacity=".9"/>
                <path d="M14 7h6v4h-6z" fill="#50E6FF" opacity=".9"/>
                <path d="M14 11h6v3h-6z" fill="#fff" opacity=".7"/>
                <path d="M14 14h6v3h-6z" fill="#50E6FF" opacity=".6"/>
                <path d="M6 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" fill="#0078D4"/>
              </svg>
            </div>
            <div class="service-card__info">
              <div class="service-card__name">Microsoft Outlook</div>
              <div class="service-card__desc">Read calendar events in your timesheet</div>
            </div>
            @if (outlookStatus()?.isConnected) {
              <span class="service-badge service-badge--on">
                <span class="status-dot status-dot--on"></span>
                {{ outlookStatus()!.accounts.length }} account{{ outlookStatus()!.accounts.length !== 1 ? 's' : '' }}
              </span>
            } @else {
              <span class="service-badge service-badge--off">
                <span class="status-dot"></span>
                Not connected
              </span>
            }
          </div>

          @if ((outlookStatus()?.accounts?.length ?? 0) > 0) {
            <div class="accounts-list">
              @for (acc of outlookStatus()!.accounts; track acc.id) {
                <div class="account-row">
                  <mat-icon class="account-icon">account_circle</mat-icon>
                  <span class="account-email">{{ acc.accountEmail }}</span>
                  <span class="account-since">since {{ formatDate(acc.connectedAt) }}</span>
                  <button class="remove-btn" (click)="disconnectOutlook(acc.id)" [disabled]="outlookConnecting()">Remove</button>
                </div>
              }
            </div>
          } @else {
            <p class="service-hint">
              Requires <code>OUTLOOK_CLIENT_ID</code> and <code>OUTLOOK_CLIENT_SECRET</code> config variables.
            </p>
          }

          <button class="connect-btn" (click)="connectOutlook()" [disabled]="outlookConnecting()">
            <mat-icon style="font-size:15px;width:15px;height:15px">add</mat-icon>
            @if (outlookConnecting()) { Connecting… }
            @else if (outlookStatus()?.isConnected) { Add account }
            @else { Connect Outlook }
          </button>
        </div>

        <!-- Google Calendar -->
        <div class="service-card service-card--google" [class.service-card--connected]="googleStatus()?.isConnected">
          <div class="service-card__header">
            <div class="service-card__logo">
              <svg viewBox="0 0 24 24" width="32" height="32">
                <rect width="24" height="24" rx="4" fill="#fff"/>
                <path d="M17 3h-1V1h-2v2H10V1H8v2H7C5.9 3 5 3.9 5 5v14c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H7V9h10v10z" fill="#4285F4"/>
                <path d="M9 11h2v2H9zm4 0h2v2h-2zm-4 3h2v2H9zm4 0h2v2h-2z" fill="#4285F4"/>
              </svg>
            </div>
            <div class="service-card__info">
              <div class="service-card__name">Google Calendar</div>
              <div class="service-card__desc">Read calendar events in your timesheet</div>
            </div>
            @if (googleStatus()?.isConnected) {
              <span class="service-badge service-badge--google">
                <span class="status-dot status-dot--google"></span>
                {{ googleStatus()!.accounts.length }} account{{ googleStatus()!.accounts.length !== 1 ? 's' : '' }}
              </span>
            } @else {
              <span class="service-badge service-badge--off">
                <span class="status-dot"></span>
                Not connected
              </span>
            }
          </div>

          @if ((googleStatus()?.accounts?.length ?? 0) > 0) {
            <div class="accounts-list">
              @for (acc of googleStatus()!.accounts; track acc.id) {
                <div class="account-row">
                  <mat-icon class="account-icon">account_circle</mat-icon>
                  <span class="account-email">{{ acc.accountEmail }}</span>
                  <span class="account-since">since {{ formatDate(acc.connectedAt) }}</span>
                  <button class="remove-btn" (click)="disconnectGoogle(acc.id)" [disabled]="googleConnecting()">Remove</button>
                </div>
              }
            </div>
          } @else {
            <p class="service-hint">
              Requires <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> config variables.<br>
              Includes all Google Calendars in your account (primary + "Other calendars").
            </p>
          }

          <button class="connect-btn connect-btn--google" (click)="connectGoogle()" [disabled]="googleConnecting()">
            <mat-icon style="font-size:15px;width:15px;height:15px">add</mat-icon>
            @if (googleConnecting()) { Connecting… }
            @else if (googleStatus()?.isConnected) { Add account }
            @else { Connect Google }
          </button>
        </div>

      </div>

      <div class="services-hint">
        <mat-icon class="hint-icon">info_outline</mat-icon>
        <span>Connected calendars appear in your timesheet. Click any event to pre-fill a time entry, or use <strong>Import</strong> to bulk-log a day or week at once.</span>
      </div>
    </div>
  `,
  styles: [`
    .services-page { max-width: 900px; margin: 0 auto; padding: 8px 8px 80px; }

    .services-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; }

    .service-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    .service-card--connected { border-color: rgba(0,120,212,0.4); background: rgba(0,120,212,0.04); }
    .service-card--google.service-card--connected { border-color: rgba(66,133,244,0.4); background: rgba(66,133,244,0.04); }

    .service-card__header { display: flex; align-items: center; gap: 12px; }
    .service-card__logo { flex-shrink: 0; }
    .service-card__info { flex: 1; }
    .service-card__name { font-size: 0.95rem; font-weight: 700; color: rgba(255,255,255,0.88); }
    .service-card__desc { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin-top: 2px; }

    .service-badge { display: flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 600; white-space: nowrap; }
    .service-badge--on { background: rgba(0,120,212,0.18); color: #50E6FF; }
    .service-badge--off { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.35); }
    .service-badge--google { background: rgba(66,133,244,0.18); color: #7baaf7; }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.2); flex-shrink: 0; }
    .status-dot--on { background: #50E6FF; box-shadow: 0 0 4px rgba(80,230,255,0.5); }
    .status-dot--google { background: #7baaf7; box-shadow: 0 0 4px rgba(123,170,247,0.5); }

    .accounts-list { display: flex; flex-direction: column; gap: 5px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .account-row { display: flex; align-items: center; gap: 7px; font-size: 0.78rem; color: rgba(255,255,255,0.55); }
    .account-icon { font-size: 15px; width: 15px; height: 15px; color: rgba(255,255,255,0.35); flex-shrink: 0; }
    .account-email { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .account-since { font-size: 0.7rem; color: rgba(255,255,255,0.25); white-space: nowrap; flex-shrink: 0; }
    .remove-btn { background: transparent; border: 1px solid rgba(239,83,80,0.3); color: rgba(239,83,80,0.6); padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; cursor: pointer; font-family: inherit; transition: all 0.12s; flex-shrink: 0; }
    .remove-btn:hover:not(:disabled) { border-color: #ef5350; color: #ef5350; }
    .remove-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .service-hint { font-size: 0.75rem; color: rgba(255,255,255,0.35); margin: 0; line-height: 1.6; }
    .service-hint code { background: rgba(255,255,255,0.08); padding: 1px 4px; border-radius: 3px; font-size: 0.72rem; }

    .connect-btn { background: rgba(0,120,212,0.12); border: 1px solid rgba(0,120,212,0.4); color: #50E6FF; padding: 7px 14px; border-radius: 6px; font-size: 0.82rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.12s; display: flex; align-items: center; gap: 5px; align-self: flex-start; }
    .connect-btn:hover:not(:disabled) { background: rgba(0,120,212,0.25); }
    .connect-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .connect-btn--google { background: rgba(66,133,244,0.12); border-color: rgba(66,133,244,0.4); color: #7baaf7; }
    .connect-btn--google:hover:not(:disabled) { background: rgba(66,133,244,0.25); }

    .services-hint { display: flex; align-items: flex-start; gap: 8px; margin-top: 16px; padding: 10px 14px; background: rgba(100,181,246,0.05); border: 1px solid rgba(100,181,246,0.12); border-radius: 8px; font-size: 0.78rem; color: rgba(255,255,255,0.4); line-height: 1.5; }
    .hint-icon { font-size: 16px; width: 16px; height: 16px; color: rgba(100,181,246,0.45); flex-shrink: 0; margin-top: 1px; }
    .services-hint strong { color: rgba(255,255,255,0.6); }
  `]
})
export class ConnectedServicesComponent implements OnInit {
  private outlookSvc = inject(OutlookCalendarService);
  private googleSvc = inject(GoogleCalendarService);
  private snackBar = inject(MatSnackBar);

  outlookStatus = signal<OutlookStatus | null>(null);
  outlookConnecting = signal(false);
  googleStatus = signal<GoogleCalendarStatus | null>(null);
  googleConnecting = signal(false);

  ngOnInit() {
    this.outlookSvc.getStatus().subscribe({ next: s => this.outlookStatus.set(s) });
    this.googleSvc.getStatus().subscribe({ next: s => this.googleStatus.set(s) });
  }

  connectOutlook() {
    this.outlookConnecting.set(true);
    this.outlookSvc.getAuthUrl().subscribe({
      next: ({ url }) => { window.location.href = url; },
      error: (err) => {
        this.outlookConnecting.set(false);
        this.snackBar.open(err.error?.error ?? 'Failed to get auth URL. Check OUTLOOK_CLIENT_ID config variable.', 'Close', { duration: 5000 });
      }
    });
  }

  disconnectOutlook(tokenId: string) {
    if (!confirm('Remove this Outlook account?')) return;
    this.outlookSvc.disconnect(tokenId).subscribe({
      next: () => {
        this.snackBar.open('Outlook account removed', 'Close', { duration: 3000 });
        this.outlookSvc.getStatus().subscribe({ next: s => this.outlookStatus.set(s) });
      }
    });
  }

  connectGoogle() {
    this.googleConnecting.set(true);
    this.googleSvc.getAuthUrl().subscribe({
      next: ({ url }) => { window.location.href = url; },
      error: (err) => {
        this.googleConnecting.set(false);
        this.snackBar.open(err.error?.error ?? 'Failed to get auth URL. Check GOOGLE_CLIENT_ID config variable.', 'Close', { duration: 5000 });
      }
    });
  }

  disconnectGoogle(tokenId: string) {
    if (!confirm('Remove this Google Calendar account?')) return;
    this.googleSvc.disconnect(tokenId).subscribe({
      next: () => {
        this.snackBar.open('Google Calendar account removed', 'Close', { duration: 3000 });
        this.googleSvc.getStatus().subscribe({ next: s => this.googleStatus.set(s) });
      }
    });
  }

  formatDate(iso: string | null): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}
