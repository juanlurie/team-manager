import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SprintDashboard, SprintSummary, Blocker, DashboardLeaveSummary, SprintVotesResponse, SprintVoteDto } from '../models/dashboard.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);

  getSprintDashboard(sprintId: string, teamLeadId?: string): Observable<SprintDashboard> {
    let params = new HttpParams();
    if (teamLeadId) params = params.set('teamLeadId', teamLeadId);
    return this.http.get<SprintDashboard>(`${API_BASE}/dashboard/sprint/${sprintId}`, { params });
  }

  getSprintSummary(sprintId: string): Observable<SprintSummary> {
    return this.http.get<SprintSummary>(`${API_BASE}/dashboard/sprint/${sprintId}/summary`);
  }

  getLeaveSummary(sprintId: string): Observable<DashboardLeaveSummary> {
    return this.http.get<DashboardLeaveSummary>(`${API_BASE}/dashboard/sprint/${sprintId}/leave-summary`);
  }

  getBlockers(sprintId: string): Observable<Blocker[]> {
    return this.http.get<Blocker[]>(`${API_BASE}/dashboard/sprint/${sprintId}/blockers`);
  }

  updateNotes(sprintMemberId: string, notes: string | null): Observable<void> {
    return this.http.patch<void>(`${API_BASE}/sprint-members/${sprintMemberId}/notes`, { notes });
  }

  updateCapacity(sprintMemberId: string, capacity: number | null): Observable<void> {
    return this.http.patch<void>(`${API_BASE}/sprint-members/${sprintMemberId}/capacity`, { capacity });
  }

  getVotes(sprintId: string): Observable<SprintVotesResponse> {
    return this.http.get<SprintVotesResponse>(`${API_BASE}/sprints/${sprintId}/votes`);
  }

  castVote(sprintId: string, voterSprintMemberId: string, nomineeSprintMemberId: string): Observable<SprintVoteDto> {
    return this.http.post<SprintVoteDto>(`${API_BASE}/sprints/${sprintId}/votes`, { voterSprintMemberId, nomineeSprintMemberId });
  }

  awardMvp(sprintId: string): Observable<any> {
    return this.http.post<any>(`${API_BASE}/sprints/${sprintId}/votes/award-mvp`, {});
  }
}
