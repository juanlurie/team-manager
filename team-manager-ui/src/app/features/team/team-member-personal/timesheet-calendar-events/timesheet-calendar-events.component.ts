import { Component, input, output, inject, signal, effect, ChangeDetectionStrategy } from '@angular/core';

import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { OutlookCalendarService, OutlookEvent } from '../../../api-request-configs/outlook-calendar.service';
import { GoogleCalendarService } from '../../../api-request-configs/google-calendar.service';

interface CalEvent {
  source: 'outlook' | 'google';
  subject: string;
  start: string;
  end: string;
  durationMins: number;
  isAllDay: boolean;
  isOnlineMeeting: boolean;
}

@Component({
  selector: 'app-timesheet-calendar-events',
  standalone: true,
  imports: [],
  styles: [`
    .cal-panel { border-bottom: 1px solid rgba(100,181,246,0.15); padding: 8px 16px 10px; }
    .cal-hdr { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; margin-bottom: 0; }
    .cal-hdr:hover .cal-title { color: rgba(255,255,255,0.9); }
    .cal-icon { display: flex; align-items: center; opacity: 0.5; }
    .cal-title { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.45); letter-spacing: 0.06em; text-transform: uppercase; flex: 1; }
    .cal-chevron { font-size: 10px; color: rgba(255,255,255,0.3); transition: transform 0.15s; }
    .cal-chevron.open { transform: rotate(180deg); }
    .cal-list { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 7px; }
    .cal-event { display: flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); cursor: pointer; transition: all 0.12s; max-width: 100%; }
    .cal-event:hover { border-color: rgba(100,181,246,0.5); background: rgba(100,181,246,0.07); }
    .cal-event--google { border-color: rgba(66,133,244,0.25); }
    .cal-event--google:hover { border-color: rgba(66,133,244,0.55); background: rgba(66,133,244,0.08); }
    .cal-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .cal-dot--outlook { background: #0078d4; }
    .cal-dot--google { background: #4285f4; }
    .cal-evname { font-size: 12px; color: rgba(255,255,255,0.8); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
    .cal-evtime { font-size: 11px; color: rgba(255,255,255,0.35); white-space: nowrap; flex-shrink: 0; }
    .cal-evdur { font-size: 11px; font-weight: 600; color: rgba(100,181,246,0.7); flex-shrink: 0; white-space: nowrap; }
    .cal-meet { display: flex; align-items: center; opacity: 0.5; }
    .cal-empty { font-size: 12px; color: rgba(255,255,255,0.25); padding: 4px 0; }
    .cal-loading { font-size: 12px; color: rgba(255,255,255,0.25); padding: 4px 0; }
  `],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (hasAnyConnected()) {
      <div class="cal-panel">
        <div class="cal-hdr" (click)="expanded.set(!expanded())">
          <span class="cal-icon">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </span>
          <span class="cal-title">Calendar Events</span>
          <span class="cal-chevron" [class.open]="expanded()">▲</span>
        </div>
        @if (expanded()) {
          <div class="cal-list">
            @if (loading()) {
              <span class="cal-loading">Loading…</span>
            } @else if (events().length === 0) {
              <span class="cal-empty">No events on this day</span>
            } @else {
              @for (ev of events(); track ev.source + ev.start + ev.subject) {
                <div class="cal-event" [class.cal-event--google]="ev.source==='google'" (click)="useEvent(ev)" [title]="'Click to pre-fill: ' + ev.subject">
                  <span class="cal-dot" [class.cal-dot--outlook]="ev.source==='outlook'" [class.cal-dot--google]="ev.source==='google'"></span>
                  <span class="cal-evname">{{ ev.subject }}</span>
                  @if (!ev.isAllDay) {
                    <span class="cal-evtime">{{ fmtTime(ev.start) }}–{{ fmtTime(ev.end) }}</span>
                    <span class="cal-evdur">{{ fmtDur(roundTo15(ev.durationMins)) }}</span>
                  } @else {
                    <span class="cal-evtime">All day</span>
                  }
                  @if (ev.isOnlineMeeting) {
                    <span class="cal-meet">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                    </span>
                  }
                </div>
              }
            }
          </div>
        }
      </div>
    }
  `
})
export class TimesheetCalendarEventsComponent {
  date = input.required<string>();
  defaultProject = input<string | null | undefined>(null);
  defaultCategory = input<string | null | undefined>(null);
  use = output<{ note: string; durationMins: number; project?: string; category?: string }>();

  private outlook = inject(OutlookCalendarService);
  private google = inject(GoogleCalendarService);
  private http = inject(HttpClient);

  events = signal<CalEvent[]>([]);
  loading = signal(false);
  expanded = signal(true);
  hasAnyConnected = signal(false);

  constructor() {
    effect(() => {
      const d = this.date();
      this.loadEvents(d);
    });
  }

  private loadEvents(dateStr: string) {
    this.loading.set(true);
    this.events.set([]);

    const dayStart = new Date(dateStr + 'T00:00:00');
    const dayEnd = new Date(dateStr + 'T23:59:59');
    const startStr = encodeURIComponent(dateStr + 'T00:00:00');
    const endStr = encodeURIComponent(dateStr + 'T23:59:59');

    forkJoin({
      outlookStatus: this.outlook.getStatus().pipe(catchError(() => of({ isConnected: false, accounts: [] }))),
      googleStatus: this.google.getStatus().pipe(catchError(() => of({ isConnected: false, accounts: [] }))),
      configurableEvents: this.http
        .get<OutlookEvent[]>(`/api/v1/integrations/calendar-events?start=${startStr}&end=${endStr}`)
        .pipe(catchError(() => of([] as OutlookEvent[]))),
    }).pipe(
      switchMap(({ outlookStatus, googleStatus, configurableEvents }) => {
        const any = outlookStatus.isConnected || googleStatus.isConnected || configurableEvents.length > 0;
        this.hasAnyConnected.set(any);
        if (!any) return of({ outlookEvents: [] as OutlookEvent[], googleEvents: [] as OutlookEvent[], configurableEvents });

        const outlookEvents$ = outlookStatus.isConnected
          ? this.outlook.getEvents(dayStart, dayEnd).pipe(catchError(() => of([] as OutlookEvent[])))
          : of([] as OutlookEvent[]);
        const googleEvents$ = googleStatus.isConnected
          ? this.google.getEvents(dayStart, dayEnd).pipe(catchError(() => of([] as OutlookEvent[])))
          : of([] as OutlookEvent[]);

        return forkJoin({ outlookEvents: outlookEvents$, googleEvents: googleEvents$ }).pipe(
          switchMap(({ outlookEvents, googleEvents }) => of({ outlookEvents, googleEvents, configurableEvents }))
        );
      })
    ).subscribe({
      next: ({ outlookEvents, googleEvents, configurableEvents }) => {
        const mapped: CalEvent[] = [
          ...outlookEvents.map(e => this.mapEvent(e, 'outlook')),
          ...googleEvents.map(e => this.mapEvent(e, 'google')),
          ...configurableEvents.map(e => this.mapEvent(e, 'outlook')),
        ].sort((a, b) => a.start.localeCompare(b.start));
        this.events.set(mapped);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private mapEvent(e: OutlookEvent, source: 'outlook' | 'google'): CalEvent {
    const startMs = new Date(e.start).getTime();
    const endMs = new Date(e.end).getTime();
    const durationMins = Math.max(0, Math.round((endMs - startMs) / 60000));
    return {
      source,
      subject: e.subject || '(No title)',
      start: e.start,
      end: e.end,
      durationMins,
      isAllDay: e.isAllDay,
      isOnlineMeeting: e.isOnlineMeeting,
    };
  }

  useEvent(ev: CalEvent) {
    const project = this.defaultProject() ?? undefined;
    const category = this.defaultCategory() ?? undefined;
    if (ev.isAllDay) {
      this.use.emit({ note: ev.subject, durationMins: 480, project, category });
    } else {
      this.use.emit({ note: ev.subject, durationMins: Math.max(15, this.roundTo15(ev.durationMins)), project, category });
    }
  }

  roundTo15(mins: number): number {
    return Math.round(mins / 15) * 15 || 15;
  }

  fmtTime(iso: string): string {
    const hasOffset = iso.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(iso);
    const d = new Date(hasOffset ? iso : iso + 'Z');
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  fmtDur(mins: number): string {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
}
