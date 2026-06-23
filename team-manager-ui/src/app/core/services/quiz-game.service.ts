import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { QuizGameSession, QuizGameSessionSummary, CreateQuizGameSessionRequest } from '../models/quiz-game.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class QuizGameService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/quiz-game`;

  getOpenSessions(): Observable<QuizGameSessionSummary[]> {
    return this.http.get<QuizGameSessionSummary[]>(`${this.base}/sessions`);
  }

  getSession(sessionId: string): Observable<QuizGameSession> {
    return this.http.get<QuizGameSession>(`${this.base}/sessions/${sessionId}`);
  }

  createSession(req: CreateQuizGameSessionRequest): Observable<QuizGameSession> {
    return this.http.post<QuizGameSession>(`${this.base}/sessions`, req);
  }

  joinSession(sessionId: string): Observable<QuizGameSession> {
    return this.http.post<QuizGameSession>(`${this.base}/sessions/${sessionId}/join`, {});
  }

  startSession(sessionId: string): Observable<QuizGameSession> {
    return this.http.post<QuizGameSession>(`${this.base}/sessions/${sessionId}/start`, {});
  }

  submitAnswer(sessionId: string, selectedIndex: number): Observable<{ isCorrect: boolean }> {
    return this.http.post<{ isCorrect: boolean }>(`${this.base}/sessions/${sessionId}/answer`, { selectedIndex });
  }

  startMillionaireRun(sessionId: string): Observable<QuizGameSession> {
    return this.http.post<QuizGameSession>(`${this.base}/sessions/${sessionId}/millionaire/start`, {});
  }

  submitMillionaireAnswer(sessionId: string, selectedIndex: number): Observable<QuizGameSession> {
    return this.http.post<QuizGameSession>(`${this.base}/sessions/${sessionId}/millionaire/answer`, { selectedIndex });
  }

  walkAway(sessionId: string): Observable<QuizGameSession> {
    return this.http.post<QuizGameSession>(`${this.base}/sessions/${sessionId}/millionaire/walk-away`, {});
  }
}
