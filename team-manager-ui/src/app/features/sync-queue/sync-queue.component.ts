import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import { TimesheetDefaultsService } from '../../core/services/timesheet-defaults.service';
import { CredentialsService } from '../../core/services/credentials.service';

interface SyncEvent {
  id: string;
  action: string;
  configName: string;
  label: string;
  sourceId?: string;
  sourceType?: string;
  status: 'pending' | 'sent' | 'failed';
  httpMethod: string;
  resolvedUrl: string;
  resolvedHeaders: Record<string, string>;
  resolvedBody: string;
  bodyFormat: string;
  externalId?: string;
  responseStatus?: number;
  responseBody?: string;
  createdAt: string;
  sentAt?: string;
}

@Component({
  selector: 'app-sync-queue',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule,
            MatSnackBarModule, MatTooltipModule, MatProgressSpinnerModule, MatSelectModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div class="header-left">
          <mat-icon class="header-icon">sync</mat-icon>
          <div>
            <h1>Sync Queue</h1>
            <span class="subtitle">Review and manually fire queued API requests</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          @if (pendingCount() > 0) {
            <button class="sync-all-btn" [disabled]="!!sending() || sendingAll()" (click)="sendAll()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
              {{ sendingAll() ? 'Syncing ' + syncAllProgress() + '…' : 'Sync All (' + pendingCount() + ')' }}
            </button>
          }
          <button mat-stroked-button (click)="load()"><mat-icon>refresh</mat-icon> Refresh</button>
        </div>
      </div>

      <div class="toolbar">
        <div class="filter-bar">
          @for (f of statusFilters; track f.value) {
            <button class="filter-btn" [class.active]="statusFilter() === f.value" (click)="statusFilter.set(f.value)">
              {{ f.label }}
              @if (countByStatus(f.value) > 0) {
                <span class="filter-count">{{ countByStatus(f.value) }}</span>
              }
            </button>
          }
        </div>
        @if (actions().length > 1) {
          <div class="action-filter">
            <select class="action-select" [ngModel]="actionFilter()" (ngModelChange)="actionFilter.set($event)">
              <option value="">All actions</option>
              @for (a of actions(); track a) {
                <option [value]="a">{{ a }}</option>
              }
            </select>
          </div>
        }
      </div>

      @if (loading()) {
        <div class="loading"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (filtered().length === 0) {
        <div class="empty">
          <mat-icon>inbox</mat-icon>
          <p>No {{ statusFilter() }} events</p>
        </div>
      } @else {
        <div class="events-list">
          @for (evt of filtered(); track evt.id) {
            <div class="event-card" [class.sent]="evt.status === 'sent'" [class.failed]="evt.status === 'failed'">
              <div class="event-header">
                <div class="event-meta">
                  <span class="action-chip">{{ evt.configName || evt.action }}</span>
                  <span class="event-label">{{ evt.label }}</span>
                </div>
                <div class="event-status-group">
                  <span class="status-badge" [class]="'status-' + evt.status">{{ evt.status }}</span>
                  @if (evt.externalId) {
                    <span class="external-id" matTooltip="External ID">#{{ evt.externalId }}</span>
                  }
                </div>
              </div>

              <div class="event-body">
                <div class="request-preview">
                  <span class="method-badge" [class.get]="evt.httpMethod === 'GET'">{{ evt.httpMethod || 'POST' }}</span>
                  <span class="url-text">{{ evt.resolvedUrl }}</span>
                </div>
                <button class="body-toggle" (click)="toggleExpand(evt.id)">
                  <mat-icon>{{ expandedId() === evt.id ? 'expand_less' : 'expand_more' }}</mat-icon>
                  {{ expandedId() === evt.id ? 'Hide' : 'Show' }} request detail
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
                        <div class="detail-label">
                          Response
                          <span class="format-tag" [class.ok]="(evt.responseStatus ?? 0) < 300">
                            {{ evt.responseStatus }}
                          </span>
                        </div>
                        <pre class="detail-pre response-pre">{{ tryPrettyJson(evt.responseBody) }}</pre>
                      </div>
                    }
                  </div>
                }
              </div>

              @if (curlPreviewId() === evt.id) {
                <div class="curl-preview">
                  <div class="curl-preview-header">
                    <span class="curl-preview-label">cURL</span>
                    <div class="curl-preview-actions">
                      <button mat-icon-button (click)="copyCurl()" matTooltip="Copy">
                        <mat-icon>content_copy</mat-icon>
                      </button>
                      <button mat-icon-button (click)="curlPreviewId.set(null)" class="close-curl-btn">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  </div>
                  <pre class="curl-preview-body">{{ curlPreviewText() }}</pre>
                </div>
              }

              <div class="event-footer">
                <span class="event-time">{{ evt.createdAt | date:'dd MMM HH:mm' }}</span>
                <div class="action-btns">
                  <button mat-icon-button (click)="toggleCurl(evt)" matTooltip="cURL">
                    <mat-icon>terminal</mat-icon>
                  </button>
                  @if (evt.status === 'pending' || evt.status === 'failed') {
                    <button mat-stroked-button color="primary" (click)="send(evt)" [disabled]="sending() === evt.id">
                      <mat-icon>send</mat-icon>
                      {{ sending() === evt.id ? 'Sending...' : evt.status === 'failed' ? 'Retry' : 'Send' }}
                    </button>
                  }
                  <button mat-icon-button (click)="dismiss(evt)" matTooltip="Delete">
                    <mat-icon>close</mat-icon>
                  </button>
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
    .sync-all-btn { display:inline-flex; align-items:center; gap:6px; padding:6px 14px; background:rgba(255,167,38,0.1); border:1px solid rgba(255,167,38,0.4); border-radius:6px; color:#ffa726; font-size:0.8rem; font-weight:600; cursor:pointer; font-family:inherit; transition:all 0.12s; white-space:nowrap; }
    .sync-all-btn:hover:not(:disabled) { background:rgba(255,167,38,0.2); border-color:#ffa726; }
    .sync-all-btn:disabled { opacity:0.5; cursor:not-allowed; }
    .loading { display: flex; justify-content: center; padding: 64px; }
    .empty { text-align: center; padding: 64px 24px; color: rgba(255,255,255,0.4); }
    .empty mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; display: block; }

    .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; gap: 12px; flex-wrap: wrap; }
    .filter-bar { display: flex; gap: 4px; }
    .filter-btn { background: none; border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); padding: 4px 14px; border-radius: 20px; cursor: pointer; font-size: 0.8rem; display: flex; align-items: center; gap: 6px; }
    .filter-btn.active { border-color: #64b5f6; color: #64b5f6; background: rgba(100,181,246,0.1); }
    .filter-count { background: rgba(255,255,255,0.15); border-radius: 10px; padding: 0 6px; font-size: 0.7rem; }
    .action-select { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.7); padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; cursor: pointer; }
    .action-select option { background: #1e1e1e; }

    .events-list { display: flex; flex-direction: column; gap: 8px; }
    .event-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; overflow: hidden; }
    .event-card.sent { border-color: rgba(76,175,80,0.25); }
    .event-card.failed { border-color: rgba(239,83,80,0.25); }

    .event-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 12px 16px 8px; gap: 12px; }
    .event-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
    .action-chip { background: rgba(100,181,246,0.15); color: #64b5f6; font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; font-family: monospace; }
    .event-label { font-weight: 600; color: rgba(255,255,255,0.85); font-size: 0.88rem; }
    .config-name { font-size: 0.75rem; color: rgba(255,255,255,0.35); }
    .event-status-group { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .status-badge { font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-radius: 10px; text-transform: uppercase; }
    .status-pending { background: rgba(255,167,38,0.2); color: #ffa726; }
    .status-sent { background: rgba(76,175,80,0.2); color: #4caf50; }
    .status-failed { background: rgba(239,83,80,0.2); color: #ef5350; }

    .external-id { font-size: 0.75rem; font-family: monospace; color: #4caf50; }

    .event-body { padding: 0 16px 8px; }
    .request-preview { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .method-badge { background: rgba(33,150,243,0.2); color: #2196f3; font-size: 0.7rem; font-weight: 700; padding: 1px 6px; border-radius: 4px; }
    .method-badge.get { background: rgba(76,175,80,0.2); color: #4caf50; }
    .url-text { font-size: 0.78rem; font-family: monospace; color: rgba(255,255,255,0.45); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 580px; }
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

    .event-footer { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px 12px; }
    .event-time { font-size: 0.75rem; color: rgba(255,255,255,0.3); }
    .action-btns { display: flex; align-items: center; gap: 4px; }

    .curl-preview { margin: 0 16px 4px; border-radius: 8px; overflow: hidden; border: 1px solid rgba(100,181,246,0.4); background: rgba(100,181,246,0.05); }
    .curl-preview-header { display: flex; align-items: center; justify-content: space-between; padding: 4px 12px; }
    .curl-preview-label { font-size: 0.78rem; font-weight: 600; color: #64b5f6; }
    .curl-preview-actions { display: flex; gap: 2px; }
    .curl-preview-body { margin: 0; padding: 6px 12px 10px; font-size: 0.72rem; font-family: monospace; color: rgba(255,255,255,0.8); white-space: pre-wrap; word-break: break-all; max-height: 200px; overflow-y: auto; }
    .close-curl-btn { width: 28px; height: 28px; line-height: 28px; }
    .close-curl-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
  `]
})
export class SyncQueueComponent implements OnInit {
  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private tsd = inject(TimesheetDefaultsService);
  private credentials = inject(CredentialsService);

  loading = signal(true);
  events = signal<SyncEvent[]>([]);
  statusFilter = signal('pending');
  actionFilter = signal('');
  expandedId = signal<string | null>(null);
  sending = signal<string | null>(null);
  sendingAll = signal(false);
  syncAllProgress = signal('');
  curlPreviewId = signal<string | null>(null);
  curlPreviewText = signal('');

  statusFilters = [
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' },
    { value: 'sent', label: 'Sent' },
  ];

  actions = computed(() => [...new Set(this.events().map(e => e.action))]);

  pendingCount = computed(() =>
    this.events().filter(e => e.status === 'pending' || e.status === 'failed').length
  );

  filtered = computed(() => {
    let list = this.events().filter(e => e.status === this.statusFilter());
    if (this.actionFilter()) list = list.filter(e => e.action === this.actionFilter());
    return list;
  });

  countByStatus(status: string) {
    const list = this.actionFilter() ? this.events().filter(e => e.action === this.actionFilter()) : this.events();
    return list.filter(e => e.status === status).length;
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.http.get<SyncEvent[]>('/api/v1/sync-queue').subscribe({
      next: (data) => { this.events.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Failed to load sync queue', 'Close', { duration: 3000 }); }
    });
  }

  private getCredentials(): { cookie: string; credentials: Record<string, string> } {
    const creds: Record<string, string> = {};
    for (const entry of this.credentials.getAll()) {
      creds[entry.keyName] = this.credentials.getValueFor(entry);
    }
    const cookie = this.credentials.getValue();
    return { cookie, credentials: creds };
  }

  sendAll() {
    const { cookie, credentials } = this.getCredentials();
    if (!cookie) {
      this.snackBar.open('No cookie found — set one in Settings → Credentials', 'Close', { duration: 4000 });
    }
    const total = this.pendingCount();
    this.sendingAll.set(true);
    this.syncAllProgress.set(`0/${total}`);
    this.http.post<{ sent: number; failed: number; total: number }>('/api/v1/sync-queue/send-all', { cookie, credentials }).subscribe({
      next: (result) => {
        this.sendingAll.set(false);
        this.tsd.reload();
        this.snackBar.open(`Sent ${result.sent} / ${result.total} — ${result.failed} failed`, 'Close', { duration: 5000 });
        this.load();
      },
      error: () => { this.sendingAll.set(false); this.snackBar.open('Sync all failed', 'Close', { duration: 3000 }); }
    });
  }

  toggleExpand(id: string) {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  send(evt: SyncEvent) {
    const { cookie, credentials } = this.getCredentials();
    if (!cookie) {
      this.snackBar.open('No cookie found — set one in Settings → Credentials', 'Close', { duration: 4000 });
    }
    this.sending.set(evt.id);
    this.http.post<any>(`/api/v1/sync-queue/${evt.id}/send`, { cookie, credentials }).subscribe({
      next: (result) => {
        this.sending.set(null);
        this.events.update(list => list.map(e => e.id === evt.id
          ? { ...e, status: result.status, responseStatus: result.responseStatus, responseBody: result.responseBody, externalId: result.externalId, sentAt: new Date().toISOString() }
          : e
        ));
        this.expandedId.set(evt.id);
        if (result.status === 'sent') this.tsd.reload();
        this.snackBar.open(result.status === 'sent' ? 'Sent successfully' : 'Send failed — see response below', 'Close', { duration: 4000 });
      },
      error: () => { this.sending.set(null); this.snackBar.open('Request error', 'Close', { duration: 3000 }); }
    });
  }

  toggleCurl(evt: SyncEvent) {
    if (this.curlPreviewId() === evt.id) {
      this.curlPreviewId.set(null);
      return;
    }
    this.curlPreviewId.set(evt.id);
    this.curlPreviewText.set(this.buildCurl(evt));
  }

  copyCurl() {
    navigator.clipboard.writeText(this.curlPreviewText());
    this.snackBar.open('Copied', 'Close', { duration: 2000 });
  }

  private buildCurl(evt: SyncEvent): string {
    const lines: string[] = [`curl -X ${evt.httpMethod || 'POST'} '${evt.resolvedUrl}'`];
    for (const [k, v] of Object.entries(evt.resolvedHeaders ?? {})) {
      lines.push(`  -H '${k}: ${v}'`);
    }
    if (evt.resolvedBody?.trim()) {
      const fmt = evt.bodyFormat ?? 'raw';
      const dataFlag = fmt === 'urlencoded' ? '--data-urlencode' : fmt === 'raw' ? '--data-raw' : '--data';
      lines.push(`  ${dataFlag} '${evt.resolvedBody}'`);
    }
    return lines.join(' \\\n');
  }

  dismiss(evt: SyncEvent) {
    this.http.delete(`/api/v1/sync-queue/${evt.id}`).subscribe({
      next: () => this.events.update(list => list.filter(e => e.id !== evt.id))
    });
  }

  formatHeaders(headers: Record<string, string>) {
    return Object.entries(headers ?? {}).map(([k, v]) => `${k}: ${v}`).join('\n');
  }

  formatBody(body: string) {
    try { return decodeURIComponent(body.replace(/\+/g, ' ')); } catch { return body; }
  }

  tryPrettyJson(s: string) {
    try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
  }
}
