import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FunRetroAnalysis, FunRetroSession, FunRetroSessionSummary, RetroColumn, RetroTheme, RetroCanvasLayout, FunRetroCardComment, FunRetroToken, FunRetroTokenSize } from '../models/fun-retro.model';

@Injectable({ providedIn: 'root' })
export class FunRetroService {
  private http = inject(HttpClient);
  private base = '/api/v1/fun-retro';

  getSessions(): Observable<FunRetroSessionSummary[]> {
    return this.http.get<FunRetroSessionSummary[]>(this.base);
  }

  getSession(id: string): Observable<FunRetroSession> {
    return this.http.get<FunRetroSession>(`${this.base}/${id}`);
  }

  createSession(req: { title?: string; sprintId?: string; columns?: RetroColumn[]; icebreakerQuestion?: string; theme?: RetroTheme; canvasLayout?: RetroCanvasLayout }): Observable<FunRetroSession> {
    return this.http.post<FunRetroSession>(this.base, req);
  }

  deleteSession(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  addCard(sessionId: string, column: string, text: string, color?: string | null, positionX?: number, positionY?: number): Observable<FunRetroSession> {
    return this.http.post<FunRetroSession>(`${this.base}/${sessionId}/cards`, { column, text, color, positionX, positionY });
  }

  deleteCard(sessionId: string, cardId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${sessionId}/cards/${cardId}`);
  }

  setPhase(sessionId: string, phase: string): Observable<FunRetroSession> {
    return this.http.put<FunRetroSession>(`${this.base}/${sessionId}/phase`, { phase });
  }

  toggleVote(sessionId: string, cardId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${sessionId}/cards/${cardId}/vote`, {});
  }

  toggleReaction(sessionId: string, cardId: string, emoji: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${sessionId}/cards/${cardId}/react`, { emoji });
  }

  updateCardPosition(sessionId: string, cardId: string, x: number, y: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/${sessionId}/cards/${cardId}/position`, { x, y });
  }

  updateCardColor(sessionId: string, cardId: string, color: string | null): Observable<void> {
    return this.http.patch<void>(`${this.base}/${sessionId}/cards/${cardId}/color`, { color });
  }

  setCardGroup(sessionId: string, cardId: string, groupId: string | null): Observable<void> {
    return this.http.patch<void>(`${this.base}/${sessionId}/cards/${cardId}/group`, { groupId });
  }

  updateCardText(sessionId: string, cardId: string, text: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${sessionId}/cards/${cardId}/text`, { text });
  }

  getCardComments(sessionId: string, cardId: string): Observable<FunRetroCardComment[]> {
    return this.http.get<FunRetroCardComment[]>(`${this.base}/${sessionId}/cards/${cardId}/comments`);
  }

  addCardComment(sessionId: string, cardId: string, text: string): Observable<FunRetroCardComment> {
    return this.http.post<FunRetroCardComment>(`${this.base}/${sessionId}/cards/${cardId}/comments`, { text });
  }

  deleteCardComment(sessionId: string, cardId: string, commentId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${sessionId}/cards/${cardId}/comments/${commentId}`);
  }

  addToken(sessionId: string, column: string, emoji: string, x: number, y: number, size: FunRetroTokenSize = 'medium'): Observable<FunRetroToken> {
    return this.http.post<FunRetroToken>(`${this.base}/${sessionId}/tokens`, { column, emoji, size, positionX: x, positionY: y });
  }

  updateTokenPosition(sessionId: string, tokenId: string, x: number, y: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/${sessionId}/tokens/${tokenId}/position`, { positionX: x, positionY: y });
  }

  updateTokenSize(sessionId: string, tokenId: string, size: FunRetroTokenSize): Observable<void> {
    return this.http.patch<void>(`${this.base}/${sessionId}/tokens/${tokenId}/size`, { size });
  }

  deleteToken(sessionId: string, tokenId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${sessionId}/tokens/${tokenId}`);
  }

  updateSettings(sessionId: string, settings: { participationTracking: boolean; theme: RetroTheme }): Observable<void> {
    return this.http.patch<void>(`${this.base}/${sessionId}/settings`, settings);
  }

  analyse(sessionId: string): Observable<FunRetroAnalysis> {
    return this.http.post<FunRetroAnalysis>(`${this.base}/${sessionId}/analyse`, {});
  }

  setTimer(sessionId: string, timer: { totalSeconds: number; startedAt: string | null; pausedAt: string | null; elapsedBeforePause: number }): Observable<{ timerJson: string }> {
    return this.http.post<{ timerJson: string }>(`${this.base}/${sessionId}/timer`, timer);
  }

  clearTimer(sessionId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${sessionId}/timer`);
  }

  setTimerPosition(sessionId: string, x: number, y: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${sessionId}/timer/position`, { x, y });
  }

  getPreviousActions(sessionId: string): Observable<{ id: string; text: string; authorName: string | null }[]> {
    return this.http.get<{ id: string; text: string; authorName: string | null }[]>(`${this.base}/${sessionId}/previous-actions`);
  }

  submitIcebreakerAnswer(sessionId: string, answer: string): Observable<{ memberId: string; memberName: string; answer: string }[]> {
    return this.http.post<{ memberId: string; memberName: string; answer: string }[]>(`${this.base}/${sessionId}/icebreaker-answer`, { answer });
  }
}
