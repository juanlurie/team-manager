import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GameUltimateTttSession, GameUltimateTttSessionSummary } from '../models/game-ultimate-ttt.model';

@Injectable({ providedIn: 'root' })
export class GameUltimateTttService {
  private http = inject(HttpClient);
  private base = '/api/v1/game-ultimate-ttt';

  getSessions() { return this.http.get<GameUltimateTttSessionSummary[]>(`${this.base}/sessions`); }
  getSession(id: string) { return this.http.get<GameUltimateTttSession>(`${this.base}/sessions/${id}`); }
  createSession(body: { title?: string; vsAi?: boolean }) { return this.http.post<GameUltimateTttSession>(`${this.base}/sessions`, body); }
  joinSession(id: string) { return this.http.post<GameUltimateTttSession>(`${this.base}/sessions/${id}/join`, {}); }
  makeMove(id: string, position: number) { return this.http.post<GameUltimateTttSession>(`${this.base}/sessions/${id}/move`, { position }); }
}
