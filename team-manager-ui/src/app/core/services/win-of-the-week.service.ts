import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WinWeek, WinNomination, WinVote, CreateNominationRequest, CloseWeekRequest } from '../models/win-week.model';

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
}
