import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GameConnectionsSession, GameConnectionsSessionSummary } from '../models/game-connections.model';

@Injectable({ providedIn: 'root' })
export class GameConnectionsService {
  private http = inject(HttpClient);
  private base = '/api/v1/game-connections';

  getSessions(): Observable<GameConnectionsSessionSummary[]> {
    return this.http.get<GameConnectionsSessionSummary[]>(this.base);
  }

  getSession(id: string): Observable<GameConnectionsSession> {
    return this.http.get<GameConnectionsSession>(`${this.base}/${id}`);
  }

  createSession(req: { title?: string }): Observable<GameConnectionsSession> {
    return this.http.post<GameConnectionsSession>(this.base, req);
  }

  joinSession(sessionId: string): Observable<GameConnectionsSession> {
    return this.http.post<GameConnectionsSession>(`${this.base}/${sessionId}/join`, {});
  }

  startSession(sessionId: string): Observable<GameConnectionsSession> {
    return this.http.post<GameConnectionsSession>(`${this.base}/${sessionId}/start`, {});
  }

  submitGuess(sessionId: string, wordIndices: number[]): Observable<GameConnectionsSession> {
    return this.http.post<GameConnectionsSession>(`${this.base}/${sessionId}/move`, { wordIndices });
  }
}
