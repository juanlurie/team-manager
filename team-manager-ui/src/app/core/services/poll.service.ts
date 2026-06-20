import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PollDetail, PollSummary, CreatePollRequest } from '../models/poll.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class PollService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/polls`;

  getOpenPolls(): Observable<PollSummary[]> {
    return this.http.get<PollSummary[]>(this.base);
  }

  getDetail(pollId: string): Observable<PollDetail> {
    return this.http.get<PollDetail>(`${this.base}/${pollId}`);
  }

  create(req: CreatePollRequest): Observable<PollDetail> {
    return this.http.post<PollDetail>(this.base, req);
  }

  vote(pollId: string, optionId: string): Observable<PollDetail> {
    return this.http.post<PollDetail>(`${this.base}/${pollId}/vote`, { optionId });
  }

  close(pollId: string): Observable<PollDetail> {
    return this.http.post<PollDetail>(`${this.base}/${pollId}/close`, {});
  }

  delete(pollId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${pollId}`);
  }
}
