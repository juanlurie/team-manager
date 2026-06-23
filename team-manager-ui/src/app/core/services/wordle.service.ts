import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WordleSession, WordleSessionSummary, CreateWordleSessionRequest } from '../models/wordle.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class WordleService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/wordle`;

  getOpenSessions(): Observable<WordleSessionSummary[]> {
    return this.http.get<WordleSessionSummary[]>(`${this.base}/sessions`);
  }

  getSession(sessionId: string): Observable<WordleSession> {
    return this.http.get<WordleSession>(`${this.base}/sessions/${sessionId}`);
  }

  createSession(req: CreateWordleSessionRequest): Observable<WordleSession> {
    return this.http.post<WordleSession>(`${this.base}/sessions`, req);
  }

  joinSession(sessionId: string): Observable<WordleSession> {
    return this.http.post<WordleSession>(`${this.base}/sessions/${sessionId}/join`, {});
  }

  startSession(sessionId: string): Observable<WordleSession> {
    return this.http.post<WordleSession>(`${this.base}/sessions/${sessionId}/start`, {});
  }

  submitGuess(sessionId: string, word: string): Observable<WordleSession> {
    return this.http.post<WordleSession>(`${this.base}/sessions/${sessionId}/guess`, { word });
  }
}
