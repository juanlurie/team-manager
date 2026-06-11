import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface OutlookStatus {
  isConnected: boolean;
  accountEmail: string | null;
  connectedAt: string | null;
}

export interface OutlookEvent {
  subject: string;
  start: string;
  end: string;
  isAllDay: boolean;
  location: string | null;
  isOnlineMeeting: boolean;
  joinUrl: string | null;
  showAs: string | null;
}

@Injectable({ providedIn: 'root' })
export class OutlookCalendarService {
  private http = inject(HttpClient);
  private base = '/api/v1/integrations/outlook';

  getStatus(): Observable<OutlookStatus> {
    return this.http.get<OutlookStatus>(`${this.base}/status`);
  }

  getAuthUrl(): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.base}/auth-url`);
  }

  getEvents(start: Date, end: Date): Observable<OutlookEvent[]> {
    const s = start.toISOString();
    const e = end.toISOString();
    return this.http.get<OutlookEvent[]>(`${this.base}/events?start=${encodeURIComponent(s)}&end=${encodeURIComponent(e)}`);
  }

  disconnect(): Observable<void> {
    return this.http.delete<void>(this.base);
  }
}
