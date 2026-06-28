import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  MeetingSession,
  CreateSessionRequest,
  UpdateSessionRequest,
  BookSlotRequest,
  UpdateStatusRequest
} from '../models/meeting-session.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class MeetingSessionService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/meeting-sessions`;

  getAll(): Observable<MeetingSession[]> {
    return this.http.get<MeetingSession[]>(this.base);
  }

  getById(id: string): Observable<MeetingSession> {
    return this.http.get<MeetingSession>(`${this.base}/${id}`);
  }

  create(request: CreateSessionRequest): Observable<MeetingSession> {
    return this.http.post<MeetingSession>(this.base, request);
  }

  update(id: string, request: UpdateSessionRequest): Observable<MeetingSession> {
    return this.http.put<MeetingSession>(`${this.base}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  updateStatus(id: string, request: UpdateStatusRequest): Observable<MeetingSession> {
    return this.http.patch<MeetingSession>(`${this.base}/${id}/status`, request);
  }

  bookSlot(sessionId: string, slotId: string, request: BookSlotRequest): Observable<MeetingSession> {
    return this.http.post<MeetingSession>(`${this.base}/${sessionId}/slots/${slotId}/book`, request);
  }

  unbookSlot(sessionId: string, slotId: string): Observable<MeetingSession> {
    return this.http.delete<MeetingSession>(`${this.base}/${sessionId}/slots/${slotId}/book`);
  }
}
