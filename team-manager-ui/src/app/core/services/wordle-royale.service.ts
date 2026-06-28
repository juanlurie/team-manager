import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RoyaleStanding, WeeklyRoyale } from '../models/wordle-royale.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class WordleRoyaleService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/wordle/royale`;

  getStandings(): Observable<RoyaleStanding[]> {
    return this.http.get<RoyaleStanding[]>(`${this.base}/standings`);
  }

  getWeeklyMatches(week?: number, year?: number): Observable<WeeklyRoyale> {
    const params: Record<string, string> = {};
    if (week !== undefined) params['week'] = String(week);
    if (year !== undefined) params['year'] = String(year);
    return this.http.get<WeeklyRoyale>(`${this.base}/week`, { params });
  }
}
