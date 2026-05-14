import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WinMonth, WinMonthHistory } from '../models/win-week.model';

@Injectable({ providedIn: 'root' })
export class WinOfTheMonthService {
  private http = inject(HttpClient);
  private base = '/api/v1/win-of-the-month';

  getCurrentMonth() {
    return this.http.get<WinMonth | null>(`${this.base}/current`);
  }

  getMonthHistory(year?: number) {
    const params: any = {};
    if (year) params.year = year;
    return this.http.get<WinMonthHistory[]>(`${this.base}/history`, { params });
  }

  vote(nominationId: string) {
    return this.http.post(`${this.base}/nominations/${nominationId}/vote`, {});
  }

  removeVote(nominationId: string) {
    return this.http.delete(`${this.base}/nominations/${nominationId}/vote`);
  }

  closeMonth() {
    return this.http.post<WinMonth>(`${this.base}/close`, {});
  }

  generateFromWeeks() {
    return this.http.post<WinMonth>(`${this.base}/generate`, {});
  }
}
