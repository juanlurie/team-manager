import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WinSeries } from '../models/win-week.model';

@Injectable({ providedIn: 'root' })
export class WinSeriesService {
  private http = inject(HttpClient);
  private base = '/api/v1/win-series';

  getAll() {
    return this.http.get<WinSeries[]>(this.base);
  }

  create(name: string) {
    return this.http.post<WinSeries>(this.base, { name });
  }

  togglePowerUps(seriesId: string) {
    return this.http.patch<WinSeries>(`${this.base}/${seriesId}/power-ups`, {});
  }

  toggleHideVoteCounts(seriesId: string) {
    return this.http.patch<WinSeries>(`${this.base}/${seriesId}/hide-vote-counts`, {});
  }
}
