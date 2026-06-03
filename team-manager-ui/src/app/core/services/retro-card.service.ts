import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from './api.config';
import { RetroCard, CreateRetroCardRequest, ToggleVoteResponse } from '../models/retro-card.model';
import { Sprint } from '../models/sprint.model';

@Injectable({ providedIn: 'root' })
export class RetroCardService {
  private http = inject(HttpClient);

  getBySprintId(sprintId: string): Observable<RetroCard[]> {
    return this.http.get<RetroCard[]>(`${API_BASE}/retro-cards?sprintId=${sprintId}`);
  }

  create(request: CreateRetroCardRequest): Observable<RetroCard> {
    return this.http.post<RetroCard>(`${API_BASE}/retro-cards`, request);
  }

  delete(id: string, sprintId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/retro-cards/${id}?sprintId=${sprintId}`);
  }

  toggleVote(cardId: string, sprintId: string): Observable<ToggleVoteResponse> {
    return this.http.post<ToggleVoteResponse>(`${API_BASE}/retro-cards/${cardId}/vote`, { sprintId });
  }

  updatePhase(sprintId: string, phase: string | null): Observable<Sprint> {
    return this.http.patch<Sprint>(`${API_BASE}/sprints/${sprintId}/retro-phase`, { phase });
  }
}
