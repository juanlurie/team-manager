import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DotsAndBoxesSession, DotsAndBoxesSessionSummary } from '../models/dots-and-boxes.model';

@Injectable({ providedIn: 'root' })
export class DotsAndBoxesService {
  private http = inject(HttpClient);
  private base = '/api/v1/dots-and-boxes';

  getSessions(): Observable<DotsAndBoxesSessionSummary[]> {
    return this.http.get<DotsAndBoxesSessionSummary[]>(this.base);
  }

  getSession(id: string): Observable<DotsAndBoxesSession> {
    return this.http.get<DotsAndBoxesSession>(`${this.base}/${id}`);
  }

  createSession(req: { title?: string; gridSize: number; withAi?: boolean }): Observable<DotsAndBoxesSession> {
    return this.http.post<DotsAndBoxesSession>(this.base, req);
  }

  joinSession(sessionId: string): Observable<DotsAndBoxesSession> {
    return this.http.post<DotsAndBoxesSession>(`${this.base}/${sessionId}/join`, {});
  }

  startSession(sessionId: string): Observable<DotsAndBoxesSession> {
    return this.http.post<DotsAndBoxesSession>(`${this.base}/${sessionId}/start`, {});
  }

  makeMove(sessionId: string, t: 'H' | 'V', r: number, c: number): Observable<DotsAndBoxesSession> {
    return this.http.post<DotsAndBoxesSession>(`${this.base}/${sessionId}/move`, { t, r, c });
  }
}
