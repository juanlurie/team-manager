import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CalendarAccount, OutlookEvent } from './outlook-calendar.service';

export interface GoogleCalendarStatus {
  isConnected: boolean;
  accounts: CalendarAccount[];
}

export type GoogleCalendarEvent = OutlookEvent;

@Injectable({ providedIn: 'root' })
export class GoogleCalendarService {
  private http = inject(HttpClient);
  private base = '/api/v1/integrations/google-calendar';

  getStatus(): Observable<GoogleCalendarStatus> {
    return this.http.get<GoogleCalendarStatus>(`${this.base}/status`);
  }

  getAuthUrl(): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.base}/auth-url`);
  }

  getEvents(start: Date, end: Date): Observable<GoogleCalendarEvent[]> {
    const s = start.toISOString();
    const e = end.toISOString();
    return this.http.get<GoogleCalendarEvent[]>(`${this.base}/events?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}`);
  }

  disconnect(tokenId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${tokenId}`);
  }
}
