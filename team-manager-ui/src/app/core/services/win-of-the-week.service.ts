import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WinWeek, WinNomination, WinVote, CreateNominationRequest, CloseWeekRequest, StartSuddenDeathRequest, WinWeekHistory, WinWeekDetail, ApplyWowCardRequest, WowTimerRequest } from '../models/win-week.model';

@Injectable({ providedIn: 'root' })
export class WinOfTheWeekService {
  private http = inject(HttpClient);
  private base = '/api/v1/win-of-the-week';

  getCurrentWeek(seriesId?: string) {
    const params: any = {};
    if (seriesId) params.seriesId = seriesId;
    return this.http.get<WinWeek | null>(`${this.base}/current`, { params });
  }

  createNomination(request: CreateNominationRequest, seriesId?: string) {
    const params: any = {};
    if (seriesId) params.seriesId = seriesId;
    return this.http.post<WinNomination>(`${this.base}/nominations`, request, { params });
  }

  updateNomination(nominationId: string, request: CreateNominationRequest) {
    return this.http.put<WinNomination>(`${this.base}/nominations/${nominationId}`, request);
  }

  deleteNomination(nominationId: string) {
    return this.http.delete(`${this.base}/nominations/${nominationId}`);
  }

  vote(nominationId: string) {
    return this.http.post<WinVote>(`${this.base}/nominations/${nominationId}/vote`, {});
  }

  removeVote(nominationId: string) {
    return this.http.delete(`${this.base}/nominations/${nominationId}/vote`);
  }

  closeWeek(request: CloseWeekRequest, seriesId?: string) {
    const params: any = {};
    if (seriesId) params.seriesId = seriesId;
    return this.http.post<WinWeek>(`${this.base}/close`, request, { params });
  }

  openNextWeek(seriesId?: string) {
    const params: any = {};
    if (seriesId) params.seriesId = seriesId;
    return this.http.post<WinWeek>(`${this.base}/open-next`, {}, { params });
  }

  openVoting(seriesId?: string) {
    const params: any = {};
    if (seriesId) params.seriesId = seriesId;
    return this.http.post<WinWeek>(`${this.base}/open-voting`, {}, { params });
  }

  reopenNominations(seriesId?: string) {
    const params: any = {};
    if (seriesId) params.seriesId = seriesId;
    return this.http.post<WinWeek>(`${this.base}/reopen-nominations`, {}, { params });
  }

  startSuddenDeath(request: StartSuddenDeathRequest, seriesId?: string) {
    const params: any = {};
    if (seriesId) params.seriesId = seriesId;
    return this.http.post<WinWeek>(`${this.base}/sudden-death`, request, { params });
  }

  getHistory(seriesId?: string, year?: number) {
    const params: any = {};
    if (seriesId) params.seriesId = seriesId;
    if (year) params.year = year;
    return this.http.get<WinWeekHistory[]>(`${this.base}/history`, { params });
  }

  getWeekDetail(weekId: string) {
    return this.http.get<WinWeekDetail>(`${this.base}/weeks/${weekId}`);
  }

  generateGuestToken(weekId: string) {
    return this.http.post<{ token: string; guestUrl: string }>(`${this.base}/${weekId}/guest-token`, {});
  }

  getTokenBalance(seriesId?: string) {
    const params: any = {};
    if (seriesId) params.seriesId = seriesId;
    return this.http.get<{ balance: number }>(`${this.base}/tokens`, { params });
  }

  applyPowerUp(nominationId: string, request: ApplyWowCardRequest) {
    return this.http.post<WinNomination>(`${this.base}/nominations/${nominationId}/powerup`, request);
  }

  applyChaosCard(nominationId: string, request: ApplyWowCardRequest) {
    return this.http.post<WinNomination>(`${this.base}/nominations/${nominationId}/chaoscard`, request);
  }

  incrementHypeMeter(nominationId: string) {
    return this.http.post<{ count: number }>(`${this.base}/nominations/${nominationId}/hype`, {});
  }

  sendReaction(nominationId: string, emoji: string) {
    return this.http.post<void>(`${this.base}/nominations/react`, { nominationId, emoji });
  }

  startTimer(request: WowTimerRequest, seriesId?: string) {
    const params: any = {};
    if (seriesId) params.seriesId = seriesId;
    return this.http.post<{ endsAt: string }>(`${this.base}/timer/start`, request, { params });
  }

  stopTimer(seriesId?: string) {
    const params: any = {};
    if (seriesId) params.seriesId = seriesId;
    return this.http.post<void>(`${this.base}/timer/stop`, {}, { params });
  }

  startHypeBattle(request: WowTimerRequest, seriesId?: string) {
    const params: any = {};
    if (seriesId) params.seriesId = seriesId;
    return this.http.post<{ endsAt: string }>(`${this.base}/hype-battle/start`, request, { params });
  }

  endHypeBattle(seriesId?: string) {
    const params: any = {};
    if (seriesId) params.seriesId = seriesId;
    return this.http.post<void>(`${this.base}/hype-battle/end`, {}, { params });
  }

  isQuizEligible(seriesId?: string) {
    const params: any = {};
    if (seriesId) params.seriesId = seriesId;
    return this.http.get<{ eligible: boolean }>(`${this.base}/quiz/eligible`, { params });
  }

  startQuiz(seriesId?: string) {
    const params: any = {};
    if (seriesId) params.seriesId = seriesId;
    return this.http.post<WinWeek>(`${this.base}/quiz/start`, {}, { params });
  }

  submitQuizAnswer(selectedIndex: number, seriesId?: string) {
    const params: any = {};
    if (seriesId) params.seriesId = seriesId;
    return this.http.post<{ isCorrect: boolean }>(`${this.base}/quiz/answer`, { selectedIndex }, { params });
  }
}
