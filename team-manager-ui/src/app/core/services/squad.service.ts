import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Squad, CreateSquadRequest } from '../models/squad.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class SquadService {
  private http = inject(HttpClient);

  getAll(): Observable<Squad[]> {
    return this.http.get<Squad[]>(`${API_BASE}/squads`);
  }

  create(request: CreateSquadRequest): Observable<Squad> {
    return this.http.post<Squad>(`${API_BASE}/squads`, request);
  }

  update(id: string, request: CreateSquadRequest): Observable<Squad> {
    return this.http.put<Squad>(`${API_BASE}/squads/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/squads/${id}`);
  }

  setMembers(squadId: string, memberIds: string[]): Observable<Squad> {
    return this.http.put<Squad>(`${API_BASE}/squads/${squadId}/members`, { memberIds });
  }

  setMemberSquads(memberId: string, squadIds: string[]): Observable<void> {
    return this.http.put<void>(`${API_BASE}/team-members/${memberId}/squads`, { squadIds });
  }
}
