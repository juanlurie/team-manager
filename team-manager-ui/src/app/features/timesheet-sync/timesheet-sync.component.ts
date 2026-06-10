import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PortalCookieService } from '../../core/services/portal-cookie.service';

interface SyncEvent {
  id: string;
  timesheetEntryId: string;
  configName: string;
  status: 'pending' | 'sent' | 'failed' | 'dismissed';
  resolvedUrl: string;
  resolvedHeaders: Record<string, string>;
  resolvedBody: string;
  bodyFormat: string;
  externalId?: string;
  responseStatus?: number;
  responseBody?: string;
  createdAt: string;
  sentAt?: string;
  entry: {
    date: string;
    project: string;
    category: string;
    hours: number;
    minutes: number;
    description?: string;
    externalId?: string;
  };
}

@Component({
  selector: 'app-timesheet-sync',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatChipsModule,
            MatSnackBarModule, MatTooltipModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div class="header-left">
          <mat-icon class="header-icon">sync</mat-icon>
          <div>
            <h1>Timesheet Sync Queue</h1>
            <span class="subtitle">Review and manually send timesheet entries to external system</span>
          </div>
        </div>
        <div class="header-actions">
          <button mat-stroked-button (click)="load()"><mat-icon>refresh</mat-icon> Refresh</button>
        </div>
      </div>

      <div class="filter-bar">
        @for (f of filters; track f.value) {
          <button class="filter-btn" [class.active]="activeFilter() === f.value" (click)="setFilter(f.value)">
            {{ f.label }}
            @if (countByStatus(f.value) > 0) { <span class="filter-count">{{ countByStatus(f.value) }}</span> }
          </button>
        }
      </div>

      @if (loading()) {
        <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (filtered().length === 0) {
        <div class="empty">
          <mat-icon>inbox</mat-icon>
          <p>No {{ activeFilter() === 'all' ? '' : activeFilter() + ' ' }}events</p>
        </div>
      } @else {
        <div class="events-list">
          @for (evt of filtered(); track evt.id) {
            <div class="event-card" [class.sent]="evt.status === 'sent'" [class.failed]="evt.status === 'failed'">
              <div class="event-header">
                <div class="event-meta">
                  <span class="event-date">{{ evt.entry.date }}</span>
                  <span class="event-project">{{ evt.entry.project }}</span>
                  <span class="event-hours">{{ evt.entry.hours }}h {{ evt.entry.minutes > 0 ? evt.entry.minutes + 'm' : '' }}</span>
                  @if (evt.entry.description) {
                    <span class="event-desc">{{ evt.entry.description }}</span>
                  }
                </div>
                <div class="event-status">
                  <span class="status-badge" [class]="'status-' + evt.status">{{ evt.status }}</span>
                  @if (evt.externalId) {
                    <span class="external-id" matTooltip="External ID">#{{ evt.externalId }}</span>
                  }
                </div>
              </div>

              <div class="event-body">
                <div class="request-preview">
                  <span class="method-badge">POST</span>
                  <span class="url-text">{{ evt.resolvedUrl }}</span>
                </div>
                <button class="body-toggle" (click)="toggleBody(evt.id)">
                  <mat-icon>{{ expandedId() === evt.id ? 'expand_less' : 'expand_more' }}</mat-icon>
                  {{ expandedId() === evt.id ? 'Hide' : 'Show' }} request body
                </button>
                @if (expandedId() === evt.id) {
                  <div class="request-detail">
                    <div class="detail-section">
                      <div class="detail-label">Headers</div>
                      <pre class="detail-pre">{{ formatHeaders(evt.resolvedHeaders) }}</pre>
                    </div>
                    <div class="detail-section">
                      <div class="detail-label">Body <span class="format-tag">{{ evt.bodyFormat }}</span></div>
                      <pre class="detail-pre">{{ formatBody(evt.resolvedBody) }}</pre>
                    </div>
                    @if (evt.responseBody) {
                      <div class="detail-section">
                        <div class="detail-label">Response <span class="format-tag" [class.ok]="(evt.responseStatus ?? 0) < 300">{{ evt.responseStatus }}</span></div>
                        <pre class="detail-pre response-pre">{{ tryPrettyJson(evt.responseBody) }}</pre>
                      </div>
                    }
                  </div>
                }
              </div>

              <div class="event-actions">
                <span class="event-time">{{ evt.createdAt | date:'dd MMM HH:mm' }}</span>
                <div class="action-btns">
                  @if (evt.status === 'pending' || evt.status === 'failed') {
                    <button mat-stroked-button color="primary" (click)="send(evt)" [disabled]="sending() === evt.id">
                      <mat-icon>send</mat-icon>
                      {{ sending() === evt.id ? 'Sending...' : evt.status === 'failed' ? 'Retry' : 'Send' }}
                    </button>
                  }
                  @if (evt.status !== 'dismissed') {
                    <button mat-icon-button (click)="dismiss(evt)" matTooltip="Dismiss">
                      <mat-icon>close</mat-icon>
                    </button>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 900px; margin: 0 auto; padding: 8px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .header-icon { font-size: 28px; width: 28px; height: 28px; color: #64b5f6; }
    h1 { font-size: 1.3rem; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 2px; }
    .subtitle { font-size: 0.8rem; color: rgba(255,255,255,0.4); }
    .loading { display: flex; justify-content: center; padding: 64px; }
    .empty { text-align: center; padding: 64px 24px; color: rgba(255,255,255,0.4); }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; display: block; }

    .filter-bar { display: flex; gap: 4px; margin-bottom: 16px; }
    .filter-btn { background: none; border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); padding: 4px 14px; border-radius: 20px; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; gap: 6px; }
    .filter-btn.active { border-color: #64b5f6; color: #64b5f6; background: rgba(100,181,246,0.1); }
    .filter-count { background: rgba(255,255,255,0.15); border-radius: 10px; padding: 0 6px; font-size: 0.7rem; }

    .events-list { display: flex; flex-direction: column; gap: 8px; }
    .event-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; overflow: hidden; }
    .event-card.sent { border-color: rgba(76,175,80,0.25); }
    .event-card.failed { border-color: rgba(239,83,80,0.25); }

    .event-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 16px 8px; gap: 12px; }
    .event-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
    .event-date { font-weight: 600; color: rgba(255,255,255,0.85); font-size: 0.9rem; }
    .event-project { color: #64b5f6; font-size: 0.85rem; font-weight: 600; }
    .event-hours { background: rgba(255,255,255,0.08); border-radius: 4px; padding: 1px 7px; font-size: 0.78rem; color: rgba(255,255,255,0.6); }
    .event-desc { font-size: 0.8rem; color: rgba(255,255,255,0.45); font-style: italic; }
    .event-status { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .status-badge { font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; }
    .status-pending { background: rgba(255,167,38,0.2); color: #ffa726; }
    .status-sent { background: rgba(76,175,80,0.2); color: #4caf50; }
    .status-failed { background: rgba(239,83,80,0.2); color: #ef5350; }
    .status-dismissed { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.3); }
    .external-id { font-size: 0.75rem; font-family: monospace; color: #4caf50; }

    .event-body { padding: 0 16px 8px; }
    .request-preview { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .method-badge { background: rgba(33,150,243,0.2); color: #2196f3; font-size: 0.7rem; font-weight: 700; padding: 1px 6px; border-radius: 4px; }
    .url-text { font-size: 0.78rem; font-family: monospace; color: rgba(255,255,255,0.5); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 600px; }
    .body-toggle { background: none; border: none; color: rgba(255,255,255,0.35); cursor: pointer; font-size: 0.75rem; display: flex; align-items: center; gap: 2px; padding: 2px 0; }
    .body-toggle:hover { color: rgba(255,255,255,0.6); }
    .body-toggle mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .request-detail { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
    .detail-section { background: rgba(0,0,0,0.2); border-radius: 6px; overflow: hidden; }
    .detail-label { font-size: 0.7rem; font-weight: 600; color: rgba(255,255,255,0.4); padding: 4px 10px; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .format-tag { font-size: 0.65rem; background: rgba(255,255,255,0.1); padding: 1px 5px; border-radius: 4px; }
    .format-tag.ok { background: rgba(76,175,80,0.2); color: #4caf50; }
    .detail-pre { margin: 0; padding: 8px 10px; font-size: 0.72rem; font-family: monospace; color: rgba(255,255,255,0.7); white-space: pre-wrap; word-break: break-all; max-height: 180px; overflow-y: auto; }
    .response-pre { color: rgba(255,255,255,0.6); }

    .event-actions { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px 12px; }
    .event-time { font-size: 0.75rem; color: rgba(255,255,255,0.3); }
    .action-btns { display: flex; align-items: center; gap: 4px; }
  `]
})
export class TimesheetSyncComponent implements OnInit {
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private portalCookie = inject(PortalCookieService);

  loading = signal(true);
  events = signal<SyncEvent[]>([]);
  activeFilter = signal<string>('pending');
  expandedId = signal<string | null>(null);
  sending = signal<string | null>(null);

  filters = [
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' },
    { value: 'sent', label: 'Sent' },
    { value: 'all', label: 'All' },
  ];

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.http.get<SyncEvent[]>('/api/v1/timesheet-sync').subscribe({
      next: (data) => { this.events.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Failed to load sync events', 'Close', { duration: 3000 }); }
    });
  }

  setFilter(f: string) { this.activeFilter.set(f); }

  filtered() {
    const f = this.activeFilter();
    if (f === 'all') return this.events();
    return this.events().filter(e => e.status === f);
  }

  countByStatus(status: string) {
    if (status === 'all') return this.events().length;
    return this.events().filter(e => e.status === status).length;
  }

  toggleBody(id: string) {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  send(evt: SyncEvent) {
    const cookie = this.portalCookie.getValue();
    if (!cookie) {
      this.snackBar.open('No cookie found — set one in Settings → Portal Credentials', 'Close', { duration: 5000 });
      return;
    }
    this.sending.set(evt.id);
    this.http.post<any>(`/api/v1/timesheet-sync/${evt.id}/send`, { cookie }).subscribe({
      next: (result) => {
        this.sending.set(null);
        const updated = { ...evt, status: result.status, responseStatus: result.responseStatus, responseBody: result.responseBody, externalId: result.externalId, sentAt: new Date().toISOString() };
        this.events.set(this.events().map(e => e.id === evt.id ? updated as SyncEvent : e));
        this.expandedId.set(evt.id);
        this.snackBar.open(result.status === 'sent' ? 'Sent successfully' : 'Send failed — see response', 'Close', { duration: 4000 });
      },
      error: () => { this.sending.set(null); this.snackBar.open('Request error', 'Close', { duration: 3000 }); }
    });
  }

  dismiss(evt: SyncEvent) {
    this.http.delete(`/api/v1/timesheet-sync/${evt.id}`).subscribe({
      next: () => {
        this.events.set(this.events().map(e => e.id === evt.id ? { ...e, status: 'dismissed' } as SyncEvent : e));
      }
    });
  }

  formatHeaders(headers: Record<string, string>) {
    return Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n');
  }

  formatBody(body: string) {
    return decodeURIComponent(body.replace(/\+/g, ' '));
  }

  tryPrettyJson(s: string) {
    try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
  }
}
