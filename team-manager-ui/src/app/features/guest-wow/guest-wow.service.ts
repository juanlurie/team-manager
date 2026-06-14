import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GuestWinWeek, GuestNomination, GuestCreateNominationRequest } from '../../core/models/win-week.model';

@Injectable({ providedIn: 'root' })
export class GuestWinOfTheWeekService {
  private http = inject(HttpClient);
  private base = '/api/v1/guest/wow';

  getWeek(token: string, sessionId: string) {
    return this.http.get<GuestWinWeek>(`${this.base}/${token}`, {
      params: { sessionId }
    });
  }

  getMembers(token: string) {
    return this.http.get<{ id: string; name: string }[]>(`${this.base}/${token}/members`);
  }

  createNomination(token: string, request: GuestCreateNominationRequest) {
    return this.http.post<GuestNomination>(`${this.base}/${token}/nominations`, request);
  }

  updateNomination(token: string, nominationId: string, sessionId: string, request: Omit<GuestCreateNominationRequest, 'guestSessionId' | 'guestName'>) {
    return this.http.put<GuestNomination>(`${this.base}/${token}/nominations/${nominationId}`, request, {
      params: { sessionId }
    });
  }

  deleteNomination(token: string, nominationId: string, sessionId: string) {
    return this.http.delete(`${this.base}/${token}/nominations/${nominationId}`, {
      params: { sessionId }
    });
  }

  vote(token: string, nominationId: string, sessionId: string) {
    return this.http.post<{ id: string }>(`${this.base}/${token}/nominations/${nominationId}/vote`, null, {
      params: { sessionId }
    });
  }

  removeVote(token: string, nominationId: string, sessionId: string) {
    return this.http.delete(`${this.base}/${token}/nominations/${nominationId}/vote`, {
      params: { sessionId }
    });
  }

  applyPowerUp(token: string, nominationId: string, sessionId: string, type: string) {
    return this.http.post<unknown>(`${this.base}/${token}/nominations/${nominationId}/powerup`, { type }, {
      params: { sessionId }
    });
  }

  applyChaosCard(token: string, nominationId: string, sessionId: string, type: string) {
    return this.http.post<unknown>(`${this.base}/${token}/nominations/${nominationId}/chaoscard`, { type }, {
      params: { sessionId }
    });
  }
}
