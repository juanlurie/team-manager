import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  SessionDefinition,
  CreateSessionDefinitionRequest,
  UpdateSessionDefinitionRequest,
  CreateSessionSlotsRequest,
  UpdateSessionSlotRequest,
  BookSessionSlotRequest
} from '../models/session-definition.model';
import { MeetingSession } from '../models/meeting-session.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class SessionDefinitionService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/session-definitions`;

  getAll(): Observable<SessionDefinition[]> {
    return this.http.get<SessionDefinition[]>(this.base);
  }

  getById(id: string): Observable<SessionDefinition> {
    return this.http.get<SessionDefinition>(`${this.base}/${id}`);
  }

  create(request: CreateSessionDefinitionRequest): Observable<SessionDefinition> {
    return this.http.post<SessionDefinition>(this.base, request);
  }

  update(id: string, request: UpdateSessionDefinitionRequest): Observable<SessionDefinition> {
    return this.http.put<SessionDefinition>(`${this.base}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  createSlots(id: string, request: CreateSessionSlotsRequest): Observable<SessionDefinition> {
    return this.http.post<SessionDefinition>(`${this.base}/${id}/slots`, request);
  }

  updateSlot(id: string, slotId: string, request: UpdateSessionSlotRequest): Observable<SessionDefinition> {
    return this.http.put<SessionDefinition>(`${this.base}/${id}/slots/${slotId}`, request);
  }

  deleteSlot(id: string, slotId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/slots/${slotId}`);
  }

  bookSlot(sessionId: string, slotId: string, request: BookSessionSlotRequest): Observable<SessionDefinition> {
    return this.http.post<SessionDefinition>(`${this.base}/${sessionId}/slots/${slotId}/book`, request);
  }

  unbookSlot(sessionId: string, slotId: string): Observable<SessionDefinition> {
    return this.http.delete<SessionDefinition>(`${this.base}/${sessionId}/slots/${slotId}/book`);
  }

  getConnectedMeetings(id: string): Observable<MeetingSession[]> {
    return this.http.get<MeetingSession[]>(`${this.base}/${id}/connected-meetings`);
  }
}
