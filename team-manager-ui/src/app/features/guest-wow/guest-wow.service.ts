import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GuestWinWeek, GuestNomination, GuestCreateNominationRequest } from '../../core/models/win-week.model';

@Injectable({ providedIn: 'root' })
export class GuestWinOfTheWeekService {
  private http = inject(HttpClient);
  private base = '/api/v1/guest/wow';

  // The guest session id is no longer sent from here — the server issues it in a signed httpOnly
  // cookie (GuestSessionManager) that rides along automatically on these same-origin requests.

  getWeek(token: string) {
    return this.http.get<GuestWinWeek>(`${this.base}/${token}`);
  }

  getMembers(token: string) {
    return this.http.get<{ id: string; name: string }[]>(`${this.base}/${token}/members`);
  }

  createNomination(token: string, request: GuestCreateNominationRequest) {
    return this.http.post<GuestNomination>(`${this.base}/${token}/nominations`, request);
  }

  updateNomination(token: string, nominationId: string, request: Omit<GuestCreateNominationRequest, 'guestName'>) {
    return this.http.put<GuestNomination>(`${this.base}/${token}/nominations/${nominationId}`, request);
  }

  deleteNomination(token: string, nominationId: string) {
    return this.http.delete(`${this.base}/${token}/nominations/${nominationId}`);
  }

  vote(token: string, nominationId: string) {
    return this.http.post<{ id: string }>(`${this.base}/${token}/nominations/${nominationId}/vote`, null);
  }

  removeVote(token: string, nominationId: string) {
    return this.http.delete(`${this.base}/${token}/nominations/${nominationId}/vote`);
  }

  applyPowerUp(token: string, nominationId: string, type: string) {
    return this.http.post<unknown>(`${this.base}/${token}/nominations/${nominationId}/powerup`, { type });
  }

  applyChaosCard(token: string, nominationId: string, type: string) {
    return this.http.post<unknown>(`${this.base}/${token}/nominations/${nominationId}/chaoscard`, { type });
  }

  incrementHype(token: string, nominationId: string) {
    return this.http.post<{ count: number }>(`${this.base}/${token}/nominations/${nominationId}/hype`, null);
  }

  sendReaction(nominationId: string, emoji: string) {
    // Shared anonymous-allowed endpoint -- same one members use, no token/session needed.
    return this.http.post<void>('/api/v1/win-of-the-week/nominations/react', { nominationId, emoji });
  }
}
