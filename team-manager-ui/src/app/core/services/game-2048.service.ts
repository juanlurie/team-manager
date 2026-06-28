import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Game2048Session, Game2048SessionSummary } from '../models/game-2048.model';

@Injectable({ providedIn: 'root' })
export class Game2048Service {
  private http = inject(HttpClient);
  private base = '/api/v1/game-2048';

  getSessions(): Observable<Game2048SessionSummary[]> {
    return this.http.get<Game2048SessionSummary[]>(this.base);
  }

  getSession(id: string): Observable<Game2048Session> {
    return this.http.get<Game2048Session>(`${this.base}/${id}`);
  }

  createSession(req: { title?: string }): Observable<Game2048Session> {
    return this.http.post<Game2048Session>(this.base, req);
  }

  joinSession(sessionId: string): Observable<Game2048Session> {
    return this.http.post<Game2048Session>(`${this.base}/${sessionId}/join`, {});
  }

  startSession(sessionId: string): Observable<Game2048Session> {
    return this.http.post<Game2048Session>(`${this.base}/${sessionId}/start`, {});
  }

  makeMove(sessionId: string, direction: 'left' | 'right' | 'up' | 'down'): Observable<Game2048Session> {
    return this.http.post<Game2048Session>(`${this.base}/${sessionId}/move`, { direction });
  }
}
