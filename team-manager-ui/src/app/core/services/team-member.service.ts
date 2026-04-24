import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TeamMember, CreateTeamMemberRequest, UpdateTeamMemberRequest } from '../models/team-member.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class TeamMemberService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/team-members`;

  getAll(filters?: { role?: string; teamLeadId?: string; isActive?: boolean }): Observable<TeamMember[]> {
    let params = new HttpParams();
    if (filters?.role) params = params.set('role', filters.role);
    if (filters?.teamLeadId) params = params.set('teamLeadId', filters.teamLeadId);
    if (filters?.isActive !== undefined) params = params.set('isActive', String(filters.isActive));
    return this.http.get<TeamMember[]>(this.base, { params });
  }

  getById(id: string): Observable<TeamMember> {
    return this.http.get<TeamMember>(`${this.base}/${id}`);
  }

  create(request: CreateTeamMemberRequest): Observable<TeamMember> {
    return this.http.post<TeamMember>(this.base, request);
  }

  update(id: string, request: UpdateTeamMemberRequest): Observable<TeamMember> {
    return this.http.put<TeamMember>(`${this.base}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
