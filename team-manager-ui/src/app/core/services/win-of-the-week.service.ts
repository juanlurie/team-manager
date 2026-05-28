import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WinWeek, WinNomination, WinVote, CreateNominationRequest, CloseWeekRequest, WinWeekHistory, WinWeekDetail } from '../models/win-week.model';

@Injectable({ providedIn: 'root' })
export class WinOfTheWeekService {
  private http = inject(HttpClient);
  private base = '/api/v1/win-of-the-week';

  getCurrentWeek() {
    return this.http.get<WinWeek>(`${this.base}/current`);
  }

  createNomination(request: CreateNominationRequest) {
    return this.http.post<WinNomination>(`${this.base}/nominations`, request);
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

  closeWeek(request: CloseWeekRequest) {
    return this.http.post<WinWeek>(`${this.base}/close`, request);
  }

  openNextWeek() {
    return this.http.post<WinWeek>(`${this.base}/open-next`, {});
  }

  openVoting() {
    return this.http.post<WinWeek>(`${this.base}/open-voting`, {});
  }

  getHistory(year?: number) {
    const params: any = {};
    if (year) params.year = year;
    return this.http.get<WinWeekHistory[]>(`${this.base}/history`, { params });
  }

  getWeekDetail(weekId: string) {
    return this.http.get<WinWeekDetail>(`${this.base}/weeks/${weekId}`);
  }
}
