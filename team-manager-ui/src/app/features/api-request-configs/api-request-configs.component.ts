import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { OutlookCalendarService, OutlookStatus, OutlookEvent } from './outlook-calendar.service';
import {
  ApiRequestConfigsService,
  ApiRequestConfig,
  MappingConfig,
  REQUEST_ACTIONS,
  TestRequestResult
} from './api-request-configs.service';
import { CredentialsService } from '../../core/services/credentials.service';
import { ConfigVariablesService } from '../settings/config-variables/config-variables.service';

@Component({
  selector: 'app-api-request-configs',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatInputModule, MatFormFieldModule, MatSelectModule,
    MatSlideToggleModule, MatSnackBarModule, MatDialogModule,
    MatTooltipModule
  ],
  template: `
    <div class="configs-page">
      <div class="page-header">
        <div class="header-left">
          <mat-icon class="header-icon">hub</mat-icon>
          <div>
            <h1>Integrations</h1>
            <span class="subtitle">Connected services and outbound API actions</span>
          </div>
        </div>
      </div>

      <!-- Connected Services -->
      <div class="section-header">
        <mat-icon class="section-icon">link</mat-icon>
        <span>Connected Services</span>
      </div>

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
              <div class="service-card__desc">Read your calendar events</div>
            </div>
            @if (outlookStatus()?.isConnected) {
              <span class="service-badge service-badge--on">Connected</span>
            } @else {
              <span class="service-badge service-badge--off">Not connected</span>
            }
          </div>

          @if (outlookStatus()?.isConnected) {
            <div class="service-card__account">
              <mat-icon style="font-size:14px;width:14px;height:14px;color:rgba(255,255,255,0.4)">account_circle</mat-icon>
              <span>{{ outlookStatus()!.accountEmail }}</span>
              <button class="disconnect-btn" (click)="disconnectOutlook()" [disabled]="outlookConnecting()">Disconnect</button>
            </div>

            <!-- Events -->
            @if (outlookEventsLoading()) {
              <div class="events-loading"><span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span></div>
            } @else {
              <div class="events-section">
                <div class="events-week-nav">
                  <button class="week-nav-btn" (click)="prevWeek()" matTooltip="Previous week"><mat-icon>chevron_left</mat-icon></button>
                  <span class="week-label">{{ weekLabel() }}</span>
                  <button class="week-nav-btn" (click)="nextWeek()" matTooltip="Next week"><mat-icon>chevron_right</mat-icon></button>
                </div>
                @if (groupedEvents().length === 0) {
                  <p class="events-empty">No events this week.</p>
                } @else {
                  @for (group of groupedEvents(); track group.date) {
                    <div class="event-group">
                      <div class="event-group__date">{{ group.label }}</div>
                      @for (evt of group.events; track evt.subject + evt.start) {
                        <div class="event-item" [class.event-item--allday]="evt.isAllDay" [class.event-item--oom]="evt.showAs === 'oof'">
                          <div class="event-item__time">
                            @if (evt.isAllDay) { <span>All day</span> }
                            @else { <span>{{ formatTime(evt.start) }} – {{ formatTime(evt.end) }}</span> }
                          </div>
                          <div class="event-item__subject">{{ evt.subject }}</div>
                          @if (evt.location) {
                            <div class="event-item__loc"><mat-icon style="font-size:11px;width:11px;height:11px">place</mat-icon> {{ evt.location }}</div>
                          }
                          @if (evt.isOnlineMeeting && evt.joinUrl) {
                            <a class="event-item__join" [href]="evt.joinUrl" target="_blank" rel="noopener">
                              <mat-icon style="font-size:12px;width:12px;height:12px">videocam</mat-icon> Join
                            </a>
                          }
                        </div>
                      }
                    </div>
                  }
                }
              </div>
            }
          } @else {
            <div class="service-card__connect">
              <p class="service-card__hint">
                Connect your Microsoft account to view your Outlook calendar directly here.
                Requires <code>OUTLOOK_CLIENT_ID</code> and <code>OUTLOOK_CLIENT_SECRET</code> config variables.
              </p>
              <button class="connect-btn" (click)="connectOutlook()" [disabled]="outlookConnecting()">
                @if (outlookConnecting()) { Connecting… } @else { Connect Outlook }
              </button>
            </div>
          }
        </div>
      </div>

      <!-- API Actions -->
      <div class="section-header" style="margin-top: 32px">
        <mat-icon class="section-icon">api</mat-icon>
        <span>API Actions</span>
        <div style="flex:1"></div>
        <button class="action-btn" (click)="exportConfigs()" matTooltip="Export all">
          <mat-icon>download</mat-icon>
        </button>
        <button class="action-btn" (click)="triggerImport()" matTooltip="Import from JSON">
          <mat-icon>upload</mat-icon>
        </button>
        <button class="primary-btn" (click)="openDialog()">
          <mat-icon>add</mat-icon> New
        </button>
      </div>

      @if (loading()) {
        <div class="loading"><span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span></div>
      } @else {
        @if (configs().length === 0) {
          <div class="empty-state">
            <mat-icon>api</mat-icon>
            <p>No API actions configured yet.</p>
            <button class="primary-btn" (click)="openDialog()"><mat-icon>add</mat-icon> Create your first action</button>
          </div>
        } @else {
          <div class="configs-list">
            @for (config of configs(); track config.id) {
              <div class="config-card" [class.disabled]="!config.enabled">
                <div class="card-accent" [style.background]="getAccentColor(config.action)"></div>
                <div class="card-icon-col">
                  <mat-icon class="card-icon" [style.color]="getAccentColor(config.action)">{{ getActionIcon(config.action) }}</mat-icon>
                </div>
                <div class="card-main">
                  <div class="card-top-row">
                    <span class="card-name">{{ config.name }}</span>
                    <div class="card-badges">
                      <span class="method-badge method-{{ config.method.toLowerCase() }}">{{ config.method }}</span>
                      @if (config.autoSync) {
                        <span class="badge badge-auto" matTooltip="Fires immediately on enqueue">
                          <mat-icon class="badge-icon">bolt</mat-icon>Auto
                        </span>
                      }
                      <span class="badge" [class.badge-on]="config.enabled" [class.badge-off]="!config.enabled">
                        {{ config.enabled ? 'On' : 'Off' }}
                      </span>
                    </div>
                  </div>
                  <div class="card-action-row">
                    <span class="action-label">{{ getActionLabel(config.action) }}</span>
                    @if (config.description) {
                      <span class="card-desc">{{ config.description }}</span>
                    }
                  </div>
                  <div class="card-url-row">
                    <mat-icon class="url-icon">link</mat-icon>
                    <span class="card-url">{{ config.url }}</span>
                  </div>
                </div>
                <div class="card-actions">
                  <button mat-icon-button (click)="openDialog(config)" matTooltip="Edit"><mat-icon>edit</mat-icon></button>
                  <button mat-icon-button class="delete-btn" (click)="deleteConfig(config)" matTooltip="Delete"><mat-icon>delete</mat-icon></button>
                </div>
              </div>
            }
          </div>
        }
      }

      <input type="file" #fileInput accept=".json" style="display:none" (change)="handleImport($event)" />
    </div>
  `,
  styles: [`
    .configs-page { max-width: 900px; margin: 0 auto; padding: 8px 8px 80px; overflow-x: hidden; }

    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .header-icon { font-size: 28px; width: 28px; height: 28px; color: #64b5f6; }
    h1 { font-size: 1.3rem; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 2px; }
    .subtitle { font-size: 0.8rem; color: rgba(255,255,255,0.4); }
    .header-actions { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }

    .section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 0.82rem; font-weight: 700; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.6px; }
    .section-icon { font-size: 16px; width: 16px; height: 16px; }

    .services-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; }
    .service-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; transition: border-color 0.2s; }
    .service-card--connected { border-color: rgba(0,120,212,0.4); background: rgba(0,120,212,0.05); }
    .service-card__header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .service-card__logo { flex-shrink: 0; }
    .service-card__info { flex: 1; }
    .service-card__name { font-size: 0.95rem; font-weight: 700; color: rgba(255,255,255,0.88); }
    .service-card__desc { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin-top: 2px; }
    .service-badge { padding: 3px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700; }
    .service-badge--on { background: rgba(0,120,212,0.2); color: #50E6FF; }
    .service-badge--off { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.35); }
    .service-card__account { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: rgba(255,255,255,0.55); margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.07); }
    .service-card__account span { flex: 1; }
    .service-card__connect { }
    .service-card__hint { font-size: 0.78rem; color: rgba(255,255,255,0.4); margin: 0 0 12px; line-height: 1.5; }
    .service-card__hint code { background: rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 3px; font-size: 0.75rem; }
    .connect-btn { background: rgba(0,120,212,0.15); border: 1px solid rgba(0,120,212,0.45); color: #50E6FF; padding: 7px 16px; border-radius: 6px; font-size: 0.83rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.12s; }
    .connect-btn:hover:not(:disabled) { background: rgba(0,120,212,0.28); }
    .connect-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .disconnect-btn { background: transparent; border: 1px solid rgba(239,83,80,0.35); color: rgba(239,83,80,0.7); padding: 3px 10px; border-radius: 5px; font-size: 0.75rem; cursor: pointer; font-family: inherit; transition: all 0.12s; flex-shrink: 0; }
    .disconnect-btn:hover:not(:disabled) { border-color: #ef5350; color: #ef5350; }
    .disconnect-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .events-loading { display: flex; gap: 5px; justify-content: center; padding: 16px; }
    .events-section { }
    .events-week-nav { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .week-label { flex: 1; text-align: center; font-size: 0.8rem; font-weight: 600; color: rgba(255,255,255,0.65); }
    .week-nav-btn { background: transparent; border: none; color: rgba(255,255,255,0.4); cursor: pointer; padding: 2px; display: flex; align-items: center; border-radius: 4px; }
    .week-nav-btn:hover { color: rgba(255,255,255,0.75); background: rgba(255,255,255,0.07); }
    .week-nav-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .events-empty { text-align: center; font-size: 0.8rem; color: rgba(255,255,255,0.3); padding: 12px; margin: 0; }
    .event-group { margin-bottom: 10px; }
    .event-group__date { font-size: 0.72rem; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.06); }
    .event-item { padding: 6px 8px; border-radius: 6px; background: rgba(255,255,255,0.04); margin-bottom: 3px; border-left: 2px solid rgba(0,120,212,0.5); }
    .event-item--allday { border-left-color: rgba(76,175,80,0.5); }
    .event-item--oom { border-left-color: rgba(239,83,80,0.5); background: rgba(239,83,80,0.04); }
    .event-item__time { font-size: 0.7rem; color: rgba(255,255,255,0.4); margin-bottom: 2px; }
    .event-item__subject { font-size: 0.82rem; font-weight: 600; color: rgba(255,255,255,0.85); line-height: 1.3; }
    .event-item__loc { font-size: 0.7rem; color: rgba(255,255,255,0.35); margin-top: 2px; display: flex; align-items: center; gap: 2px; }
    .event-item__join { display: inline-flex; align-items: center; gap: 3px; margin-top: 4px; font-size: 0.72rem; color: #50E6FF; text-decoration: none; }
    .event-item__join:hover { text-decoration: underline; }

    .action-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: rgba(255,255,255,0.7); font-size: 0.8rem; cursor: pointer; font-family: inherit; transition: all 0.12s; }
    .action-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .action-btn:hover { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.18); color: rgba(255,255,255,0.9); }
    .primary-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 14px; background: rgba(100,181,246,0.15); border: 1px solid rgba(100,181,246,0.4); border-radius: 6px; color: #64b5f6; font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.12s; }
    .primary-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .primary-btn:hover { background: rgba(100,181,246,0.25); border-color: #64b5f6; }

    .loading { display: flex; justify-content: center; gap: 6px; padding: 64px; }
    .loading-dot { width: 8px; height: 8px; background: rgba(100,181,246,0.5); border-radius: 50%; animation: pulse 1.2s ease-in-out infinite; }
    .loading-dot:nth-child(2) { animation-delay: 0.2s; }
    .loading-dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes pulse { 0%,80%,100% { opacity:0.3; transform:scale(0.8); } 40% { opacity:1; transform:scale(1); } }

    .empty-state { text-align: center; padding: 64px 24px; color: rgba(255,255,255,0.35); display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .empty-state mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.3; }
    .empty-state p { margin: 0; font-size: 0.95rem; }

    .configs-list { display: flex; flex-direction: column; gap: 6px; }
    .config-card { display: flex; align-items: stretch; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; overflow: hidden; transition: border-color 0.15s, background 0.15s; }
    .config-card:hover { border-color: rgba(255,255,255,0.13); background: rgba(255,255,255,0.045); }
    .config-card.disabled { opacity: 0.55; }

    .card-accent { width: 3px; flex-shrink: 0; }
    .card-icon-col { display: flex; align-items: center; justify-content: center; padding: 0 12px; }
    .card-icon { font-size: 22px; width: 22px; height: 22px; opacity: 0.85; }
    .card-main { flex: 1; min-width: 0; padding: 12px 8px 12px 0; display: flex; flex-direction: column; gap: 4px; }
    .card-top-row { display: flex; align-items: center; gap: 10px; }
    .card-name { font-size: 0.92rem; font-weight: 600; color: rgba(255,255,255,0.88); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .card-badges { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .card-action-row { display: flex; align-items: baseline; gap: 8px; }
    .action-label { font-size: 0.75rem; color: rgba(255,255,255,0.4); font-weight: 500; }
    .card-desc { font-size: 0.75rem; color: rgba(255,255,255,0.3); }
    .card-url-row { display: flex; align-items: center; gap: 4px; min-width: 0; overflow: hidden; }
    .url-icon { font-size: 12px; width: 12px; height: 12px; color: rgba(255,255,255,0.25); flex-shrink: 0; }
    .card-url { font-size: 0.72rem; font-family: monospace; color: rgba(255,255,255,0.3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
    .card-actions { display: flex; flex-direction: column; justify-content: center; padding: 0 4px; }
    .delete-btn { color: rgba(239,83,80,0.6); }
    .delete-btn:hover { color: #ef5350; }

    .badge { padding: 2px 7px; border-radius: 10px; font-size: 0.7rem; font-weight: 600; display: inline-flex; align-items: center; gap: 2px; }
    .badge-on { background: rgba(76,175,80,0.18); color: #4caf50; }
    .badge-off { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.35); }
    .badge-auto { background: rgba(255,193,7,0.15); color: #ffc107; }
    .badge-icon { font-size: 11px; width: 11px; height: 11px; }
    .method-badge { padding: 2px 6px; border-radius: 4px; font-size: 0.68rem; font-weight: 700; font-family: monospace; }
    .method-post { background: rgba(33,150,243,0.15); color: #64b5f6; }
    .method-get { background: rgba(76,175,80,0.15); color: #66bb6a; }
  `]
})
export class ApiRequestConfigsComponent implements OnInit {
  private svc = inject(ApiRequestConfigsService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private credentials = inject(CredentialsService);
  private outlookSvc = inject(OutlookCalendarService);
  private route = inject(ActivatedRoute);

  loading = signal(true);
  configs = signal<ApiRequestConfig[]>([]);

  outlookStatus = signal<OutlookStatus | null>(null);
  outlookConnecting = signal(false);
  outlookEvents = signal<OutlookEvent[]>([]);
  outlookEventsLoading = signal(false);
  calendarWeekOffset = signal(0);

  readonly weekLabel = () => {
    const start = this.weekStart();
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${fmt(start)} – ${fmt(end)}`;
  };

  private weekStart(): Date {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + this.calendarWeekOffset() * 7);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  readonly groupedEvents = () => {
    const events = this.outlookEvents();
    const groups = new Map<string, OutlookEvent[]>();
    for (const evt of events) {
      const key = evt.start.substring(0, 10);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(evt);
    }
    return Array.from(groups.entries()).map(([date, evts]) => ({
      date,
      label: this.formatDateLabel(date),
      events: evts
    }));
  };

  ngOnInit() {
    this.load();
    this.loadOutlookStatus();
    const params = this.route.snapshot.queryParamMap;
    if (params.get('outlook') === 'connected') {
      this.snackBar.open('Outlook Calendar connected!', 'Close', { duration: 4000 });
    } else if (params.get('outlook_error')) {
      this.snackBar.open('Outlook connection failed: ' + params.get('outlook_error'), 'Close', { duration: 5000 });
    }
  }

  load() {
    this.loading.set(true);
    this.svc.list().subscribe({
      next: (data) => { this.configs.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Failed to load configs', 'Close', { duration: 3000 }); }
    });
  }

  loadOutlookStatus() {
    this.outlookSvc.getStatus().subscribe({
      next: (status) => {
        this.outlookStatus.set(status);
        if (status.isConnected) this.loadOutlookEvents();
      }
    });
  }

  loadOutlookEvents() {
    this.outlookEventsLoading.set(true);
    const start = this.weekStart();
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    this.outlookSvc.getEvents(start, end).subscribe({
      next: (evts) => { this.outlookEvents.set(evts); this.outlookEventsLoading.set(false); },
      error: () => { this.outlookEventsLoading.set(false); }
    });
  }

  prevWeek() { this.calendarWeekOffset.update(v => v - 1); this.loadOutlookEvents(); }
  nextWeek() { this.calendarWeekOffset.update(v => v + 1); this.loadOutlookEvents(); }

  connectOutlook() {
    this.outlookConnecting.set(true);
    this.outlookSvc.getAuthUrl().subscribe({
      next: ({ url }) => { window.location.href = url; },
      error: (err) => {
        this.outlookConnecting.set(false);
        const msg = err.error?.error ?? 'Failed to get auth URL. Check OUTLOOK_CLIENT_ID config variable.';
        this.snackBar.open(msg, 'Close', { duration: 5000 });
      }
    });
  }

  disconnectOutlook() {
    if (!confirm('Disconnect Outlook Calendar?')) return;
    this.outlookSvc.disconnect().subscribe({
      next: () => {
        this.outlookStatus.set({ isConnected: false, accountEmail: null, connectedAt: null });
        this.outlookEvents.set([]);
        this.snackBar.open('Outlook disconnected', 'Close', { duration: 3000 });
      }
    });
  }

  formatTime(iso: string): string {
    return new Date(iso + 'Z').toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    if (d.getTime() === today.getTime()) return 'Today';
    if (d.getTime() === tomorrow.getTime()) return 'Tomorrow';
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  getActionIcon(action: string): string {
    return REQUEST_ACTIONS.find(a => a.value === action)?.icon ?? 'api';
  }

  getActionLabel(action: string): string {
    return REQUEST_ACTIONS.find(a => a.value === action)?.label ?? action;
  }

  getAccentColor(action: string): string {
    const map: Record<string, string> = {
      AddTimesheetEntry: '#42a5f5',
      EditTimesheetEntry: '#26c6da',
      DeleteTimesheetEntry: '#ef5350',
      FetchLeave: '#66bb6a',
      GetTimesheetProjects: '#ab47bc',
      AiChatWinStory: '#ffa726',
      GenerateJoke: '#ffca28',
    };
    return map[action] ?? '#78909c';
  }

  openDialog(config?: ApiRequestConfig) {
    const dialogRef = this.dialog.open(ApiRequestConfigDialogComponent, {
      width: '620px',
      maxWidth: '100vw',
      panelClass: 'dark-dialog',
      data: config ? { ...config } : this.newConfig()
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.load();
      }
    });
  }

  deleteConfig(config: ApiRequestConfig) {
    if (!config.id) return;
    if (!confirm(`Delete "${config.name}"?`)) return;

    this.svc.delete(config.id).subscribe({
      next: () => {
        this.snackBar.open('Config deleted', 'Close', { duration: 3000 });
        this.load();
      },
      error: () => this.snackBar.open('Failed to delete config', 'Close', { duration: 3000 })
    });
  }

  exportConfigs() {
    this.svc.export().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'request-configs.json';
        a.click();
        window.URL.revokeObjectURL(url);
        this.snackBar.open('Configs exported', 'Close', { duration: 3000 });
      },
      error: () => this.snackBar.open('Failed to export configs', 'Close', { duration: 3000 })
    });
  }

  triggerImport() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fileInput?.click();
  }

  handleImport(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const configs = JSON.parse(e.target?.result as string) as ApiRequestConfig[];
        this.svc.import(configs).subscribe({
          next: (result) => {
            this.snackBar.open(`Imported: ${result.created} created, ${result.updated} updated`, 'Close', { duration: 5000 });
            this.load();
          },
          error: () => this.snackBar.open('Failed to import configs', 'Close', { duration: 3000 })
        });
      } catch {
        this.snackBar.open('Invalid JSON file', 'Close', { duration: 3000 });
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  private newConfig(): ApiRequestConfig {
    return {
      action: 'FetchLeave',
      name: '',
      description: '',
      enabled: false,
      url: '',
      method: 'POST',
      isFormUrlEncoded: true,
      bodyFormat: 'urlencoded',
      headers: {},
      parameters: {},
      bodyTemplate: '',
      retryCount: 0,
      successCriteria: null,
      autoSync: false,
      mapping: {
        arrayPath: '',
        namePath: 'title',
        startPath: 'start',
        endPath: 'end',
        typePath: 'type',
        daysPath: 'totalDays',
        statusPath: 'status',
        nameTransform: 'ExtractBeforeDash',
        externalIdPath: '',
        projectsPath: '',
        projectNamePath: 'name',
        projectIdPath: 'id',
        projectCategoriesPath: 'categories',
        categoryNamePath: 'name',
        categoryIdPath: 'id',
        textResponsePath: ''
      }
    };
  }
}

@Component({
  selector: 'app-api-request-config-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatButtonModule,
    MatInputModule, MatFormFieldModule, MatSelectModule,
    MatSlideToggleModule, MatDialogModule, MatTooltipModule
  ],
  template: `
    <div class="dialog-content">
      <div class="dialog-header">
        <div class="dialog-title-row">
          <mat-icon class="dialog-title-icon">api</mat-icon>
          <h2>{{ data.id ? 'Edit Config' : 'New Config' }}</h2>
        </div>
        <button mat-icon-button (click)="dialogRef.close()" class="close-btn"><mat-icon>close</mat-icon></button>
      </div>

      <mat-dialog-content>
        <!-- cURL Import Banner -->
        @if (!showCurlImport()) {
          <button class="curl-import-btn" (click)="showCurlImport.set(true)">
            <div class="curl-import-icon-wrap"><mat-icon>terminal</mat-icon></div>
            <div class="curl-import-text">
              <span class="curl-import-label">Import from cURL</span>
              <span class="curl-import-sub">Paste a curl command to auto-fill URL, headers and body</span>
            </div>
            <mat-icon class="curl-import-arrow">chevron_right</mat-icon>
          </button>
        } @else {
          <div class="curl-import-expanded">
            <div class="curl-import-expanded-header">
              <div style="display:flex;align-items:center;gap:8px">
                <mat-icon style="color:#64b5f6;font-size:18px;width:18px;height:18px">terminal</mat-icon>
                <span style="font-size:0.85rem;font-weight:600;color:rgba(255,255,255,0.8)">Import from cURL</span>
              </div>
              <button mat-icon-button class="close-btn" (click)="showCurlImport.set(false)"><mat-icon>close</mat-icon></button>
            </div>
            <textarea class="curl-textarea" [(ngModel)]="curlInput" rows="5"
                      placeholder="curl -X POST 'https://...' -H 'Authorization: Bearer ...' -d 'key=value'"></textarea>
            <div class="curl-import-footer">
              @if (curlParseError()) {
                <span class="curl-error"><mat-icon class="err-icon">error_outline</mat-icon>{{ curlParseError() }}</span>
              } @else {
                <span></span>
              }
              <button class="parse-btn" (click)="parseCurl()" [disabled]="!curlInput.trim()">
                <mat-icon>auto_fix_high</mat-icon> Parse &amp; Fill
              </button>
            </div>
          </div>
        }

        <div class="form-grid">
          <!-- Basic Info -->
          <div class="form-section">
            <div class="section-label">Basic</div>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Action</mat-label>
              <mat-select [(ngModel)]="data.action">
                @for (action of actions; track action.value) {
                  <mat-option [value]="action.value">
                    <mat-icon class="action-option-icon">{{ action.icon }}</mat-icon>
                    {{ action.label }}
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>

            <div class="two-col">
              <mat-form-field appearance="outline">
                <mat-label>Name</mat-label>
                <input matInput [(ngModel)]="data.name" placeholder="e.g. Primary">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Description</mat-label>
                <input matInput [(ngModel)]="data.description" placeholder="Optional">
              </mat-form-field>
            </div>

            <div class="toggle-row">
              <div class="toggle-item">
                <mat-slide-toggle [checked]="data.enabled" (change)="data.enabled = $event.checked" color="primary">
                  Enabled
                </mat-slide-toggle>
              </div>
              <div class="toggle-item">
                <mat-slide-toggle [checked]="data.autoSync" (change)="data.autoSync = $event.checked" color="accent">
                  Auto Sync
                </mat-slide-toggle>
                <span class="toggle-hint">Fires immediately on enqueue</span>
              </div>
            </div>
          </div>

          <!-- Request -->
          <div class="form-section">
            <div class="section-label">Request</div>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>API URL</mat-label>
              <input matInput [(ngModel)]="data.url" placeholder="https://example.com/api">
            </mat-form-field>

            @if (configVarKeys.length > 0) {
              <div class="config-vars-hint">
                <span class="config-vars-label">Config vars:</span>
                @for (k of configVarKeys; track k) {
                  <span class="config-var-chip" (click)="insertConfigVar(k)" matTooltip="Click to copy">{{ '{' + k + '}' }}</span>
                }
              </div>
            }

            <div class="two-col">
              <mat-form-field appearance="outline">
                <mat-label>HTTP Method</mat-label>
                <mat-select [(ngModel)]="data.method">
                  <mat-option value="GET">GET</mat-option>
                  <mat-option value="POST">POST</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Body Format</mat-label>
                <mat-select [(ngModel)]="data.bodyFormat">
                  <mat-option value="raw">Raw</mat-option>
                  <mat-option value="urlencoded">URL Encoded</mat-option>
                  <mat-option value="json">JSON</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </div>

          <!-- Headers -->
          <div class="form-section">
            <div class="section-label-row">
              <span class="section-label">Headers</span>
              <button mat-icon-button color="primary" (click)="addHeader()" matTooltip="Add header" class="add-row-btn">
                <mat-icon>add</mat-icon>
              </button>
            </div>
            @for (entry of headerEntries(); track entry.key) {
              <div class="header-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Key</mat-label>
                  <input matInput [(ngModel)]="entry.key" placeholder="Authorization">
                </mat-form-field>
                @if (entry.secret && !entry.editing) {
                  <div class="secret-value-row half-width">
                    <span class="secret-placeholder">••••••••</span>
                    <button mat-button class="change-secret-btn" (click)="editSecretHeader(entry)">Change</button>
                  </div>
                } @else {
                  <mat-form-field appearance="outline" class="half-width">
                    <mat-label>Value</mat-label>
                    <input matInput [(ngModel)]="entry.value" [placeholder]="entry.secret ? 'Enter new value' : '{cookie}'">
                    @if (entry.editing) {
                      <button matSuffix mat-icon-button (click)="cancelEditSecretHeader(entry)" matTooltip="Cancel">
                        <mat-icon>close</mat-icon>
                      </button>
                    }
                  </mat-form-field>
                }
                <button mat-icon-button [color]="entry.secret ? 'accent' : ''" (click)="toggleHeaderSecret(entry)"
                        [matTooltip]="entry.secret ? 'Stored securely — click to make regular' : 'Click to store value securely'"
                        class="lock-btn">
                  <mat-icon>{{ entry.secret ? 'lock' : 'lock_open' }}</mat-icon>
                </button>
                <button mat-icon-button class="remove-btn" (click)="removeHeader(entry.key)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            }
            @if (headerEntries().length === 0) {
              <div class="empty-rows-hint">No headers — click + to add</div>
            }
          </div>

          <!-- Parameters -->
          <div class="form-section">
            <div class="section-label-row">
              <span class="section-label">Parameters</span>
              <button mat-icon-button color="primary" (click)="addParameter()" matTooltip="Add parameter" class="add-row-btn">
                <mat-icon>add</mat-icon>
              </button>
            </div>
            @for (entry of parameterEntries(); track entry.key) {
              <div class="header-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Name</mat-label>
                  <input matInput [(ngModel)]="entry.key" placeholder="employeeId">
                </mat-form-field>
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Value</mat-label>
                  <input matInput [(ngModel)]="entry.value" placeholder="2588">
                </mat-form-field>
                <button mat-icon-button class="remove-btn" (click)="removeParameter(entry.key)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            }
            @if (parameterEntries().length === 0) {
              <div class="empty-rows-hint">No parameters — click + to add</div>
            }
          </div>

          <!-- Body -->
          <div class="form-section">
            <div class="section-label">Body Template</div>
            <mat-form-field appearance="outline" class="full-width">
              <textarea matInput [(ngModel)]="data.bodyTemplate" rows="3"
                        placeholder="teamId=&#123;teamIds&#125;&amp;start=&#123;start&#125;"></textarea>
              @if (data.action === 'AddTimesheetEntry') {
                <mat-hint>Cookies: {{ cookieVarHint }} · Variables: &#123;id&#125;, &#123;date&#125;, &#123;project&#125;, &#123;category&#125;, &#123;hours&#125;, &#123;minutes&#125;, &#123;billable&#125;, &#123;workedFrom&#125;, &#123;sentiment&#125;, &#123;description&#125;, &#123;ticketNumber&#125; + params</mat-hint>
              } @else if (data.action === 'GenerateJoke') {
                <mat-hint>Variables: &#123;jokeType&#125; (required), &#123;seed&#125; + any parameter names</mat-hint>
              } @else if (data.action === 'AiChatWinStory') {
                <mat-hint>Variables: &#123;nominee&#125;, &#123;title&#125;, &#123;description&#125; + any parameter names</mat-hint>
              } @else {
                <mat-hint>Cookies: {{ cookieVarHint }} · Variables: &#123;start&#125;, &#123;end&#125;, &#123;teamIds&#125; + any parameter names</mat-hint>
              }
            </mat-form-field>
          </div>

          <!-- Success & Retry -->
          <div class="form-section">
            <div class="section-label">Success &amp; Retry</div>
            <div class="two-col">
              <mat-form-field appearance="outline">
                <mat-label>Required Status</mat-label>
                <input matInput type="number" placeholder="200"
                  [ngModel]="data.successCriteria?.requiredStatus ?? null"
                  (ngModelChange)="setCriteriaStatus($event)">
                <mat-hint>e.g. 200</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Retries on failure</mat-label>
                <input matInput type="number" min="0" max="5" placeholder="0"
                  [ngModel]="data.retryCount ?? 0"
                  (ngModelChange)="data.retryCount = +$event">
              </mat-form-field>
            </div>
            <div class="two-col">
              <mat-form-field appearance="outline">
                <mat-label>Success JSON Path</mat-label>
                <input matInput placeholder="data.result"
                  [ngModel]="data.successCriteria?.jsonPath ?? ''"
                  (ngModelChange)="setCriteriaPath($event)">
                <mat-hint>Leave empty to check status only</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Expected Value</mat-label>
                <input matInput placeholder="true"
                  [ngModel]="data.successCriteria?.jsonValue ?? ''"
                  (ngModelChange)="setCriteriaValue($event)">
                <mat-hint>Blank = path just needs to exist</mat-hint>
              </mat-form-field>
            </div>
          </div>

          <!-- Response Mapping -->
          @if (data.action === 'AddTimesheetEntry') {
            <div class="form-section">
              <div class="section-label">Response Mapping</div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Response ID Path</mat-label>
                <input matInput [(ngModel)]="data.mapping.externalIdPath" placeholder="entryId">
                <mat-hint>Path to the external ID in the response — saved back to the timesheet entry</mat-hint>
              </mat-form-field>
            </div>
          }

          @if (data.action === 'GetTimesheetProjects') {
            <div class="form-section">
              <div class="section-label">Response Mapping</div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Projects Path</mat-label>
                <input matInput [(ngModel)]="data.mapping.projectsPath" placeholder="data.projects">
                <mat-hint>Path to the projects array — leave empty if the root is the array</mat-hint>
              </mat-form-field>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Project Name Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.projectNamePath" placeholder="name">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Project ID Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.projectIdPath" placeholder="id">
                  <mat-hint>Saved as correlation ID</mat-hint>
                </mat-form-field>
              </div>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Categories Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.projectCategoriesPath" placeholder="categories">
                  <mat-hint>Within each project object</mat-hint>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Category Name Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.categoryNamePath" placeholder="name">
                </mat-form-field>
              </div>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Category ID Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.categoryIdPath" placeholder="id">
                  <mat-hint>Saved as correlation ID</mat-hint>
                </mat-form-field>
              </div>
            </div>
          }

          @if (data.action === 'FetchLeave') {
            <div class="form-section">
              <div class="section-label-row">
                <span class="section-label">Response Mapping</span>
                <button mat-button color="primary" (click)="showPathPicker.set(!showPathPicker())" style="font-size:0.78rem">
                  <mat-icon style="font-size:15px;width:15px;height:15px">search</mat-icon> Path Picker
                </button>
              </div>

              @if (showPathPicker()) {
                <div class="path-picker">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Paste sample JSON response</mat-label>
                    <textarea matInput [(ngModel)]="sampleJson" rows="6"
                              placeholder='[{"title":"Leave","start":"2026-01-01"}]'></textarea>
                  </mat-form-field>
                  <div class="path-picker-actions">
                    <button mat-button (click)="discoverPaths()" [disabled]="!sampleJson().trim() || discoveringPaths()">
                      {{ discoveringPaths() ? 'Discovering...' : 'Discover Paths' }}
                    </button>
                  </div>
                  @if (availablePaths().length > 0) {
                    <div class="path-picker-results">
                      <div class="path-picker-info">
                        <span class="path-count">{{ availablePaths().length }} paths found</span>
                        @if (arrayLength() > 0) {
                          <span class="array-info">{{ arrayLength() }} items in array</span>
                        }
                      </div>
                      <div class="path-list">
                        @for (path of availablePaths(); track path) {
                          <button class="path-chip" (click)="copyPath(path)" matTooltip="Click to copy">{{ path }}</button>
                        }
                      </div>
                    </div>
                  }
                  @if (hasTestResults) {
                    <div class="test-results">
                      <h4>Test Results</h4>
                      @for (entry of testResults() | keyvalue; track entry.key) {
                        @if (entry.value !== null) {
                          <div class="test-result-row">
                            <span class="test-label">{{ entry.key }}</span>
                            <span class="test-value">{{ entry.value }}</span>
                          </div>
                        }
                      }
                    </div>
                  }
                </div>
              }

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Array Path (optional)</mat-label>
                <input matInput [(ngModel)]="data.mapping.arrayPath" placeholder="e.g. data.items or results[0].leaves">
                <mat-hint>Leave empty if response is a top-level array</mat-hint>
              </mat-form-field>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Name Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.namePath" placeholder="title">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Type Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.typePath" placeholder="type">
                </mat-form-field>
              </div>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Start Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.startPath" placeholder="start">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>End Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.endPath" placeholder="end">
                </mat-form-field>
              </div>
              <div class="two-col">
                <mat-form-field appearance="outline">
                  <mat-label>Days Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.daysPath" placeholder="totalDays">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Status Path</mat-label>
                  <input matInput [(ngModel)]="data.mapping.statusPath" placeholder="status">
                </mat-form-field>
              </div>
              <mat-form-field appearance="outline">
                <mat-label>Name Transform</mat-label>
                <mat-select [(ngModel)]="data.mapping.nameTransform">
                  <mat-option value="ExtractBeforeDash">Extract Before Dash</mat-option>
                  <mat-option value="None">None</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          }

          @if (data.action === 'AiChatWinStory' || data.action === 'GenerateJoke') {
            <div class="form-section">
              <div class="section-label">Response Mapping</div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Text Response Path</mat-label>
                <input matInput [(ngModel)]="data.mapping.textResponsePath"
                       placeholder="choices[0].message.content">
                <mat-hint>Dot-separated path to the text string in the response (e.g. <code>choices[0].message.content</code> for OpenAI)</mat-hint>
              </mat-form-field>
            </div>
          }
        </div>

        @if (showTestVars() && unresolvedVars().length > 0) {
          <div class="test-vars-panel">
            <div class="test-vars-header">Test values <span class="test-vars-hint">— filled in for this test only</span></div>
            <div class="test-vars-grid">
              @for (v of unresolvedVars(); track v) {
                <mat-form-field appearance="outline" class="test-var-field">
                  <mat-label>{{ '{' + v + '}' }}</mat-label>
                  <input matInput [(ngModel)]="testVars[v]" [placeholder]="testVarPlaceholder(v)">
                </mat-form-field>
              }
            </div>
          </div>
        }

        @if (curlPreview()) {
          <div class="curl-preview">
            <div class="curl-preview-header">
              <span class="curl-preview-label"><mat-icon class="preview-icon">terminal</mat-icon> cURL Preview</span>
              <div class="curl-preview-actions">
                <button mat-icon-button (click)="copyCurl()" matTooltip="Copy"><mat-icon>content_copy</mat-icon></button>
                <button mat-icon-button (click)="curlPreview.set('')" class="close-test-btn"><mat-icon>close</mat-icon></button>
              </div>
            </div>
            <pre class="curl-preview-body">{{ curlPreview() }}</pre>
          </div>
        }

        @if (testResult()) {
          <div class="test-response" [class.test-success]="testResult()!.success" [class.test-failure]="!testResult()!.success">
            <div class="test-response-header">
              <span class="test-status-code" [class.success]="testResult()!.success" [class.failure]="!testResult()!.success">
                {{ testResult()!.statusCode || 'ERR' }} {{ testResult()!.success ? 'OK' : 'Failed' }}
              </span>
              <button mat-icon-button (click)="testResult.set(null)" class="close-test-btn"><mat-icon>close</mat-icon></button>
            </div>
            <pre class="test-response-body">{{ formatTestBody(testResult()!.body) }}</pre>
          </div>
        }
      </mat-dialog-content>

      <mat-dialog-actions>
        <div class="dialog-footer">
          <div class="footer-left">
            <button class="footer-tool-btn" (click)="buildCurlPreview()" [disabled]="!data.url.trim()" matTooltip="Preview cURL">
              <mat-icon>terminal</mat-icon>
            </button>
            <button class="footer-tool-btn" (click)="toggleTest()" [disabled]="!data.url.trim() || testing()" matTooltip="Test request">
              <mat-icon>{{ testing() ? 'hourglass_empty' : 'play_arrow' }}</mat-icon>
            </button>
          </div>
          <div class="footer-right">
            <button class="footer-cancel-btn" (click)="dialogRef.close()">Cancel</button>
            <button class="footer-save-btn" (click)="save()" [disabled]="!data.name.trim() || saving()">
              {{ saving() ? 'Saving…' : 'Save' }}
            </button>
          </div>
        </div>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-content { width: min(600px, 96vw); box-sizing: border-box; }

    .dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px 0; }
    .dialog-title-row { display: flex; align-items: center; gap: 10px; }
    .dialog-title-icon { color: #64b5f6; font-size: 20px; width: 20px; height: 20px; }
    .dialog-header h2 { font-size: 1.05rem; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0; }
    .close-btn { color: rgba(255,255,255,0.4); width: 32px; height: 32px; line-height: 32px; }
    .close-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* cURL import */
    .curl-import-btn { width: 100%; display: flex; align-items: center; gap: 12px; background: rgba(100,181,246,0.06); border: 1px dashed rgba(100,181,246,0.3); border-radius: 8px; padding: 10px 14px; cursor: pointer; margin-bottom: 16px; transition: all 0.15s; font-family: inherit; text-align: left; }
    .curl-import-btn:hover { background: rgba(100,181,246,0.11); border-color: rgba(100,181,246,0.5); }
    .curl-import-icon-wrap { width: 32px; height: 32px; border-radius: 8px; background: rgba(100,181,246,0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .curl-import-icon-wrap mat-icon { color: #64b5f6; font-size: 17px; width: 17px; height: 17px; }
    .curl-import-text { flex: 1; min-width: 0; }
    .curl-import-label { display: block; font-size: 0.85rem; font-weight: 600; color: #64b5f6; }
    .curl-import-sub { display: block; font-size: 0.73rem; color: rgba(255,255,255,0.35); margin-top: 1px; }
    .curl-import-arrow { color: rgba(100,181,246,0.5); font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }

    .curl-import-expanded { background: rgba(100,181,246,0.05); border: 1px solid rgba(100,181,246,0.25); border-radius: 8px; padding: 12px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 8px; }
    .curl-import-expanded-header { display: flex; align-items: center; justify-content: space-between; }
    .curl-textarea { width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: rgba(255,255,255,0.8); font-family: monospace; font-size: 0.75rem; padding: 8px 10px; resize: vertical; outline: none; }
    .curl-textarea:focus { border-color: rgba(100,181,246,0.4); }
    .curl-import-footer { display: flex; align-items: center; justify-content: space-between; }
    .curl-error { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: #ef5350; }
    .err-icon { font-size: 14px; width: 14px; height: 14px; }
    .parse-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 14px; background: rgba(100,181,246,0.15); border: 1px solid rgba(100,181,246,0.4); border-radius: 6px; color: #64b5f6; font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.12s; }
    .parse-btn mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .parse-btn:hover:not(:disabled) { background: rgba(100,181,246,0.25); }
    .parse-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Form sections */
    .form-grid { display: flex; flex-direction: column; gap: 0; }
    .form-section { padding: 16px 0 4px; border-top: 1px solid rgba(255,255,255,0.06); }
    .form-section:first-child { border-top: none; padding-top: 4px; }
    .section-label { font-size: 0.72rem; font-weight: 700; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; display: block; }
    .section-label-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .section-label-row .section-label { margin-bottom: 0; }
    .add-row-btn { width: 28px; height: 28px; line-height: 28px; color: #64b5f6; }
    .add-row-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .full-width { width: 100%; }
    .half-width { flex: 1; min-width: 80px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 4px; }
    @media (max-width: 500px) { .two-col { grid-template-columns: 1fr; } }

    .toggle-row { display: flex; gap: 20px; flex-wrap: wrap; padding: 4px 0 8px; }
    .toggle-item { display: flex; align-items: center; gap: 8px; }
    .toggle-hint { font-size: 0.72rem; color: rgba(255,255,255,0.3); }

    .header-row { display: flex; align-items: flex-start; gap: 6px; margin-bottom: 4px; flex-wrap: nowrap; }
    @media (max-width: 400px) { .header-row { flex-wrap: wrap; } }
    .remove-btn { margin-top: 4px; flex-shrink: 0; color: rgba(239,83,80,0.5); }
    .remove-btn:hover { color: #ef5350; }
    .lock-btn { margin-top: 4px; flex-shrink: 0; }
    .secret-value-row { display: flex; align-items: center; gap: 8px; min-height: 56px; padding: 0 4px; }
    .secret-placeholder { font-family: monospace; font-size: 1.1rem; color: rgba(255,255,255,0.3); letter-spacing: 3px; flex: 1; }
    .change-secret-btn { font-size: 0.78rem; color: #64b5f6; }
    .empty-rows-hint { font-size: 0.75rem; color: rgba(255,255,255,0.25); padding: 4px 0 8px; }

    .config-vars-hint { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 2px 0 10px; }
    .config-vars-label { font-size: 0.72rem; color: rgba(255,255,255,0.3); flex-shrink: 0; }
    .config-var-chip { background: rgba(100,181,246,0.1); color: #64b5f6; border: 1px solid rgba(100,181,246,0.2); padding: 1px 7px; border-radius: 10px; font-size: 0.7rem; font-family: monospace; cursor: pointer; transition: background 0.12s; }
    .config-var-chip:hover { background: rgba(100,181,246,0.2); }

    .path-picker { padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; margin-bottom: 8px; }
    .path-picker-actions { display: flex; justify-content: flex-end; margin-bottom: 8px; }
    .path-picker-results { margin-top: 8px; }
    .path-picker-info { display: flex; gap: 12px; margin-bottom: 8px; }
    .path-count { font-size: 0.8rem; color: #4caf50; font-weight: 600; }
    .array-info { font-size: 0.8rem; color: rgba(255,255,255,0.4); }
    .path-list { display: flex; flex-wrap: wrap; gap: 4px; max-height: 150px; overflow-y: auto; }
    .path-chip { background: rgba(33,150,243,0.12); color: #64b5f6; border: 1px solid rgba(33,150,243,0.25); padding: 2px 8px; border-radius: 12px; font-size: 0.72rem; cursor: pointer; font-family: monospace; }
    .path-chip:hover { background: rgba(33,150,243,0.22); }
    .action-option-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 8px; vertical-align: middle; }
    .test-results { margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); }
    .test-results h4 { font-size: 0.8rem; color: rgba(255,255,255,0.4); margin: 0 0 8px 0; }
    .test-result-row { display: flex; gap: 8px; font-size: 0.75rem; margin-bottom: 4px; }
    .test-label { color: rgba(255,255,255,0.4); min-width: 60px; }
    .test-value { color: #4caf50; font-family: monospace; }

    .test-vars-panel { margin: 8px 0 0; padding: 10px 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; }
    .test-vars-header { font-size: 0.8rem; font-weight: 600; color: rgba(255,255,255,0.6); margin-bottom: 8px; }
    .test-vars-hint { font-weight: 400; font-size: 0.75rem; color: rgba(255,255,255,0.35); }
    .test-vars-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .test-var-field { min-width: 140px; flex: 1; }

    .curl-preview { margin: 8px 0 0; border-radius: 8px; overflow: hidden; border: 1px solid rgba(100,181,246,0.3); background: rgba(0,0,0,0.2); }
    .curl-preview-header { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; border-bottom: 1px solid rgba(100,181,246,0.15); }
    .curl-preview-label { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; font-weight: 600; color: #64b5f6; }
    .preview-icon { font-size: 15px; width: 15px; height: 15px; }
    .curl-preview-actions { display: flex; gap: 2px; }
    .curl-preview-body { margin: 0; padding: 10px 12px 12px; font-size: 0.72rem; font-family: monospace; color: rgba(255,255,255,0.75); white-space: pre-wrap; word-break: break-all; max-height: 220px; overflow-y: auto; }

    .test-response { margin: 8px 0 0; border-radius: 8px; overflow: hidden; border: 1px solid; }
    .test-response.test-success { border-color: rgba(76,175,80,0.35); background: rgba(76,175,80,0.04); }
    .test-response.test-failure { border-color: rgba(239,83,80,0.35); background: rgba(239,83,80,0.04); }
    .test-response-header { display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; }
    .test-status-code { font-size: 0.8rem; font-weight: 700; font-family: monospace; }
    .test-status-code.success { color: #4caf50; }
    .test-status-code.failure { color: #ef5350; }
    .close-test-btn { width: 28px; height: 28px; line-height: 28px; }
    .close-test-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .test-response-body { margin: 0; padding: 8px 12px 12px; font-size: 0.72rem; font-family: monospace; color: rgba(255,255,255,0.65); white-space: pre-wrap; word-break: break-all; max-height: 200px; overflow-y: auto; }

    /* Footer */
    .dialog-footer { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0 4px; }
    .footer-left { display: flex; gap: 4px; }
    .footer-right { display: flex; gap: 8px; align-items: center; }
    .footer-tool-btn { width: 36px; height: 36px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.5); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.12s; }
    .footer-tool-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .footer-tool-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); border-color: rgba(255,255,255,0.2); }
    .footer-tool-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .footer-cancel-btn { padding: 6px 14px; background: none; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; color: rgba(255,255,255,0.5); font-size: 0.85rem; cursor: pointer; font-family: inherit; transition: all 0.12s; }
    .footer-cancel-btn:hover { border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.75); }
    .footer-save-btn { padding: 6px 20px; background: rgba(100,181,246,0.15); border: 1px solid rgba(100,181,246,0.45); border-radius: 6px; color: #64b5f6; font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.12s; }
    .footer-save-btn:hover:not(:disabled) { background: rgba(100,181,246,0.25); border-color: #64b5f6; }
    .footer-save-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  `]
})
export class ApiRequestConfigDialogComponent implements OnInit {
  private svc = inject(ApiRequestConfigsService);
  private snackBar = inject(MatSnackBar);
  private credentials = inject(CredentialsService);
  private configVarsSvc = inject(ConfigVariablesService);
  dialogRef = inject(MatDialogRef<ApiRequestConfigDialogComponent>);
  data = inject<any>(MAT_DIALOG_DATA);
  saving = signal(false);
  headerEntries = signal<{key: string, value: string, secret: boolean, editing: boolean}[]>([]);
  parameterEntries = signal<{key: string, value: string}[]>([]);
  actions = REQUEST_ACTIONS;
  configVars = signal<{key: string, value: string, isSecret: boolean}[]>([]);
  get configVarKeys() { return this.configVars().map(v => v.key); }

  showCurlImport = signal(false);
  curlInput = '';
  curlParseError = signal('');
  testing = signal(false);
  testResult = signal<TestRequestResult | null>(null);
  curlPreview = signal('');
  showTestVars = signal(false);
  testVars: Record<string, string> = {};

  showPathPicker = signal(false);
  sampleJson = signal('');
  availablePaths = signal<string[]>([]);
  testResults = signal<Record<string, string | null>>({});
  discoveringPaths = signal(false);
  arrayLength = signal(0);

  get hasTestResults(): boolean {
    return Object.values(this.testResults()).some(v => v !== null);
  }

  cookieVarNames(): string[] {
    const entries = this.credentials.entries();
    const names = entries.map(e => e.keyName);
    if (!names.includes('cookie')) names.unshift('cookie');
    return names;
  }

  get cookieVarHint(): string {
    return this.cookieVarNames().map(n => `{${n}}`).join(', ');
  }

  insertConfigVar(key: string) {
    navigator.clipboard.writeText(`{${key}}`).catch(() => {});
    this.snackBar.open(`Copied {${key}} to clipboard`, 'Close', { duration: 2000 });
  }

  unresolvedVars() {
    const knownParams = new Set([
      ...this.parameterEntries().map(e => e.key.trim()).filter(Boolean),
      ...this.cookieVarNames(),
      ...this.configVarKeys,
      'start', 'end', 'teamIds', 'nominee', 'title', 'description'
    ]);
    const regularHeaderValues = this.headerEntries().filter(e => !e.secret).map(e => e.value).join(' ');
    const template = (this.data.bodyTemplate ?? '') + regularHeaderValues;
    const matches = [...template.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
    return [...new Set(matches)].filter(v => !knownParams.has(v));
  }

  testVarPlaceholder(v: string): string {
    const today = new Date().toISOString().split('T')[0];
    const defaults: Record<string, string> = {
      date: today, hours: '1', minutes: '0', billable: 'true',
      workedFrom: '', sentiment: '', description: 'Test', ticketNumber: '', category: '', project: '', id: ''
    };
    return defaults[v] ?? '';
  }

  toggleTest() {
    const vars = this.unresolvedVars();
    if (vars.length > 0 && !this.showTestVars()) {
      for (const v of vars) {
        if (!this.testVars[v]) this.testVars[v] = this.testVarPlaceholder(v);
      }
      this.showTestVars.set(true);
    } else {
      this.runTest();
    }
  }

  ngOnInit() {
    const secretHeaders: Record<string, string> = this.data.secretHeaders ?? {};
    const regularHeaders = Object.entries(this.data.headers || {}).map(([k, v]) => ({ key: k, value: v as string, secret: false, editing: false }));
    const secretEntries = Object.entries(secretHeaders).map(([k, v]) => ({ key: k, value: v as string, secret: true, editing: false }));
    this.headerEntries.set([...regularHeaders, ...secretEntries]);
    this.parameterEntries.set(Object.entries(this.data.parameters || {}).map(([k, v]) => ({ key: k, value: v as string })));
    this.configVarsSvc.list().subscribe({ next: (vars) => this.configVars.set(vars.map(v => ({ key: v.key, value: v.value, isSecret: v.isSecret }))), error: () => {} });
  }

  setCriteriaStatus(v: any) {
    const n = v === '' || v === null ? null : +v;
    this.data = { ...this.data, successCriteria: { ...(this.data.successCriteria ?? {}), requiredStatus: n } };
  }
  setCriteriaPath(v: string) {
    this.data = { ...this.data, successCriteria: { ...(this.data.successCriteria ?? {}), jsonPath: v || null } };
  }
  setCriteriaValue(v: string) {
    this.data = { ...this.data, successCriteria: { ...(this.data.successCriteria ?? {}), jsonValue: v || null } };
  }

  addHeader() {
    this.headerEntries.set([...this.headerEntries(), { key: '', value: '', secret: false, editing: false }]);
  }

  removeHeader(key: string) {
    this.headerEntries.set(this.headerEntries().filter(e => e.key !== key));
  }

  toggleHeaderSecret(entry: {key: string, value: string, secret: boolean, editing: boolean}) {
    entry.secret = !entry.secret;
    if (!entry.secret) {
      if (entry.value === '**SECRET**') entry.value = '';
      entry.editing = false;
    }
    this.headerEntries.set([...this.headerEntries()]);
  }

  editSecretHeader(entry: {key: string, value: string, secret: boolean, editing: boolean}) {
    entry.editing = true;
    entry.value = '';
    this.headerEntries.set([...this.headerEntries()]);
  }

  cancelEditSecretHeader(entry: {key: string, value: string, secret: boolean, editing: boolean}) {
    entry.editing = false;
    entry.value = '**SECRET**';
    this.headerEntries.set([...this.headerEntries()]);
  }

  addParameter() {
    this.parameterEntries.set([...this.parameterEntries(), { key: '', value: '' }]);
  }

  removeParameter(key: string) {
    this.parameterEntries.set(this.parameterEntries().filter(e => e.key !== key));
  }

  discoverPaths() {
    const raw = this.sampleJson().trim();
    if (!raw) return;

    this.discoveringPaths.set(true);
    const fields: Record<string, string> = {
      Name: this.data.mapping.namePath,
      Start: this.data.mapping.startPath,
      End: this.data.mapping.endPath,
      Type: this.data.mapping.typePath,
      Days: this.data.mapping.daysPath,
      Status: this.data.mapping.statusPath
    };

    this.svc.testMapping(raw, this.data.mapping.arrayPath || '', fields).subscribe({
      next: (result) => {
        this.availablePaths.set(result.availablePaths);
        this.testResults.set(result.testResults);
        this.arrayLength.set(result.arrayLength);
        this.discoveringPaths.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to parse JSON', 'Close', { duration: 3000 });
        this.discoveringPaths.set(false);
      }
    });
  }

  copyPath(path: string) {
    navigator.clipboard.writeText(path);
    this.snackBar.open(`Copied: ${path}`, 'Close', { duration: 2000 });
  }

  buildCurlPreview() {
    const params: Record<string, string> = {};
    for (const e of this.parameterEntries()) {
      if (e.key.trim()) params[e.key.trim()] = e.value;
    }
    const cookieVars = this.getCookieVariables();

    const resolve = (t: string) => {
      let s = t;
      for (const cv of this.configVars()) if (!cv.isSecret) s = s.replaceAll(`{${cv.key}}`, cv.value);
      for (const [k, v] of Object.entries(cookieVars)) s = s.replaceAll(`{${k}}`, v || `{${k}}`);
      for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, v);
      return s;
    };

    const lines: string[] = [`curl -X ${this.data.method} '${resolve(this.data.url)}'`];

    const fmt = this.data.bodyFormat ?? (this.data.isFormUrlEncoded ? 'urlencoded' : 'json');
    const hasExplicitContentType = this.headerEntries().some(e => e.key.trim().toLowerCase() === 'content-type');
    if (!hasExplicitContentType && fmt !== 'raw') {
      const contentType = fmt === 'urlencoded' ? 'application/x-www-form-urlencoded' : 'application/json';
      lines.push(`  -H 'Content-Type: ${contentType}'`);
    }

    for (const e of this.headerEntries()) {
      if (!e.key.trim()) continue;
      const displayValue = e.secret ? '***' : resolve(e.value);
      lines.push(`  -H '${e.key.trim()}: ${displayValue}'`);
    }

    if (this.data.method === 'POST' && this.data.bodyTemplate?.trim()) {
      const dataFlag = fmt === 'urlencoded' ? '--data-urlencode' : fmt === 'raw' ? '--data-raw' : '--data';
      lines.push(`  ${dataFlag} '${resolve(this.data.bodyTemplate)}'`);
    }

    this.curlPreview.set(lines.join(' \\\n'));
  }

  copyCurl() {
    navigator.clipboard.writeText(this.curlPreview());
    this.snackBar.open('Copied', 'Close', { duration: 2000 });
  }

  runTest() {
    this.testing.set(true);
    this.testResult.set(null);
    this.showTestVars.set(false);

    const headers: Record<string, string> = {};
    const secretHeaders: Record<string, string> = {};
    for (const entry of this.headerEntries()) {
      if (!entry.key.trim()) continue;
      if (entry.secret) {
        secretHeaders[entry.key.trim()] = entry.editing ? entry.value : (entry.value || '**SECRET**');
      } else {
        headers[entry.key.trim()] = entry.value;
      }
    }
    const config: ApiRequestConfig = { ...this.data, headers, secretHeaders };
    const variables: Record<string, string> = { ...this.getCookieVariables(), ...this.testVars };

    this.svc.testRequest(config, variables).subscribe({
      next: (result) => { this.testResult.set(result); this.testing.set(false); },
      error: () => { this.testing.set(false); this.snackBar.open('Test request failed', 'Close', { duration: 3000 }); }
    });
  }

  private getCookieVariables(): Record<string, string> {
    const vars: Record<string, string> = {};
    for (const entry of this.credentials.entries()) {
      vars[entry.keyName] = this.credentials.getValueFor(entry);
    }
    const first = this.credentials.entries()[0];
    if (first) vars['cookie'] = vars[first.keyName] ?? '';
    return vars;
  }

  private getCookie(): string {
    return this.getCookieVariables()['cookie'] ?? '';
  }

  formatTestBody(body: string): string {
    try { return JSON.stringify(JSON.parse(body), null, 2); } catch { return body; }
  }

  parseCurl() {
    this.curlParseError.set('');
    try {
      const normalized = this.curlInput.replace(/\\\n/g, ' ').replace(/\s+/g, ' ').trim();
      const tokens = this.tokenizeCurl(normalized);

      if (!tokens.length || tokens[0].toLowerCase() !== 'curl') {
        this.curlParseError.set('Does not look like a curl command');
        return;
      }

      let method = '';
      const headers: Record<string, string> = {};
      let body = '';
      let url = '';
      let bodyFormat = '';

      for (let i = 1; i < tokens.length; i++) {
        const t = tokens[i];
        if (t === '-X' || t === '--request') {
          method = tokens[++i] ?? '';
        } else if (t === '-H' || t === '--header') {
          const h = tokens[++i] ?? '';
          const idx = h.indexOf(':');
          if (idx > 0) headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
        } else if (t === '-b' || t === '--cookie') {
          headers['Cookie'] = tokens[++i] ?? '';
        } else if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary') {
          body = tokens[++i] ?? '';
          if (!method) method = 'POST';
          if (!bodyFormat) bodyFormat = 'raw';
        } else if (t === '--data-urlencode') {
          body = tokens[++i] ?? '';
          if (!method) method = 'POST';
          bodyFormat = 'urlencoded';
        } else if (!t.startsWith('-') && !url) {
          url = t.replace(/^['"]|['"]$/g, '');
        }
      }

      const ct = headers['Content-Type'] ?? headers['content-type'] ?? '';
      if (ct.toLowerCase().includes('application/x-www-form-urlencoded')) {
        bodyFormat = 'urlencoded';
        delete headers['Content-Type'];
        delete headers['content-type'];
      } else if (ct.toLowerCase().includes('application/json')) {
        bodyFormat = 'json';
        delete headers['Content-Type'];
        delete headers['content-type'];
      }

      if (!url) { this.curlParseError.set('Could not find URL in curl command'); return; }

      this.data.url = url;
      if (method) this.data.method = method.toUpperCase();
      if (bodyFormat) {
        this.data.bodyFormat = bodyFormat;
        this.data.isFormUrlEncoded = bodyFormat === 'urlencoded';
      }
      if (body) this.data.bodyTemplate = body;

      const merged = { ...(this.data.headers || {}), ...headers };
      const existingSecrets = this.headerEntries().filter(e => e.secret);
      const newRegular = Object.entries(merged).map(([k, v]) => ({ key: k, value: v as string, secret: false, editing: false }));
      this.headerEntries.set([...newRegular, ...existingSecrets]);

      this.showCurlImport.set(false);
      this.snackBar.open('curl parsed — review the fields below', 'Close', { duration: 3000 });
    } catch {
      this.curlParseError.set('Failed to parse curl command');
    }
  }

  private tokenizeCurl(input: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    while (i < input.length) {
      while (i < input.length && input[i] === ' ') i++;
      if (i >= input.length) break;
      const ch = input[i];
      if (ch === "'" || ch === '"') {
        const end = input.indexOf(ch, i + 1);
        tokens.push(end < 0 ? input.slice(i + 1) : input.slice(i + 1, end));
        i = end < 0 ? input.length : end + 1;
      } else {
        const start = i;
        while (i < input.length && input[i] !== ' ') i++;
        tokens.push(input.slice(start, i));
      }
    }
    return tokens;
  }

  save() {
    const headers: Record<string, string> = {};
    const secretHeaders: Record<string, string> = {};
    for (const entry of this.headerEntries()) {
      if (!entry.key.trim()) continue;
      if (entry.secret) {
        secretHeaders[entry.key.trim()] = entry.editing ? entry.value : (entry.value || '**SECRET**');
      } else {
        headers[entry.key.trim()] = entry.value;
      }
    }
    this.data.headers = headers;
    this.data.secretHeaders = secretHeaders;

    const parameters: Record<string, string> = {};
    for (const entry of this.parameterEntries()) {
      if (entry.key.trim()) parameters[entry.key.trim()] = entry.value;
    }
    this.data.parameters = parameters;

    this.saving.set(true);
    const save$ = this.data.id
      ? this.svc.update(this.data.id, this.data)
      : this.svc.create(this.data);

    save$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Failed to save config', 'Close', { duration: 3000 });
      }
    });
  }
}
