import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GameThreesSession, GameThreesSessionSummary } from '../models/game-threes.model';

@Injectable({ providedIn: 'root' })
export class GameThreesService {
  private http = inject(HttpClient);
  private base = '/api/v1/game-threes';

  getSessions() { return this.http.get<GameThreesSessionSummary[]>(`${this.base}/sessions`); }
  getSession(id: string) { return this.http.get<GameThreesSession>(`${this.base}/sessions/${id}`); }
  createSession(body: { title?: string }) { return this.http.post<GameThreesSession>(`${this.base}/sessions`, body); }
  joinSession(id: string) { return this.http.post<GameThreesSession>(`${this.base}/sessions/${id}/join`, {}); }
  makeMove(id: string, direction: string) { return this.http.post<GameThreesSession>(`${this.base}/sessions/${id}/move`, { direction }); }
}
