import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ScrumPokerSession, ScrumPokerSessionDetail, CreateScrumPokerSessionRequest, CastScrumPokerVoteRequest } from '../models/scrum-poker.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class ScrumPokerService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/scrum-poker`;

  getActiveSessions(): Observable<{ items: ScrumPokerSession[] }> {
    return this.http.get<{ items: ScrumPokerSession[] }>(`${this.base}/sessions`);
  }

  getSession(sessionId: string): Observable<ScrumPokerSessionDetail> {
    return this.http.get<ScrumPokerSessionDetail>(`${this.base}/sessions/${sessionId}`);
  }

  createSession(req: CreateScrumPokerSessionRequest): Observable<ScrumPokerSessionDetail> {
    return this.http.post<ScrumPokerSessionDetail>(`${this.base}/sessions`, req);
  }

  castVote(sessionId: string, req: CastScrumPokerVoteRequest): Observable<ScrumPokerSessionDetail> {
    return this.http.post<ScrumPokerSessionDetail>(`${this.base}/sessions/${sessionId}/vote`, req);
  }

  revealVotes(sessionId: string): Observable<ScrumPokerSessionDetail> {
    return this.http.post<ScrumPokerSessionDetail>(`${this.base}/sessions/${sessionId}/reveal`, {});
  }

  resetSession(sessionId: string): Observable<ScrumPokerSessionDetail> {
    return this.http.post<ScrumPokerSessionDetail>(`${this.base}/sessions/${sessionId}/reset`, {});
  }

  deleteSession(sessionId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/sessions/${sessionId}`);
  }
}
