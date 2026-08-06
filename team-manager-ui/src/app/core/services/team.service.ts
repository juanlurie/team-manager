import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Team, CreateTeamRequest } from '../models/team.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class TeamService {
  private http = inject(HttpClient);

  getAll(): Observable<Team[]> {
    return this.http.get<Team[]>(`${API_BASE}/teams`);
  }

  create(request: CreateTeamRequest): Observable<Team> {
    return this.http.post<Team>(`${API_BASE}/teams`, request);
  }

  update(id: string, request: CreateTeamRequest): Observable<Team> {
    return this.http.put<Team>(`${API_BASE}/teams/${id}`, request);
  }

  /** Detaches the team's squads rather than deleting them (Squad.TeamId is SetNull). */
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/teams/${id}`);
  }
}
