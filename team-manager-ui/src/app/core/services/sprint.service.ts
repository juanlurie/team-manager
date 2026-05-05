import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Sprint, PI, CreateSprintRequest, VelocityEntry } from '../models/sprint.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class SprintService {
  private http = inject(HttpClient);
  private sprintBase = `${API_BASE}/sprints`;
  private piBase = `${API_BASE}/pis`;

  getSprints(filters?: { piId?: string; from?: string; to?: string }): Observable<Sprint[]> {
    let params = new HttpParams();
    if (filters?.piId) params = params.set('piId', filters.piId);
    if (filters?.from) params = params.set('from', filters.from);
    if (filters?.to) params = params.set('to', filters.to);
    return this.http.get<Sprint[]>(this.sprintBase, { params });
  }

  getSprintById(id: string): Observable<Sprint> {
    return this.http.get<Sprint>(`${this.sprintBase}/${id}`);
  }

  createSprint(request: CreateSprintRequest): Observable<Sprint> {
    return this.http.post<Sprint>(this.sprintBase, request);
  }

  updateSprint(id: string, request: CreateSprintRequest): Observable<Sprint> {
    return this.http.put<Sprint>(`${this.sprintBase}/${id}`, request);
  }

  deleteSprint(id: string): Observable<void> {
    return this.http.delete<void>(`${this.sprintBase}/${id}`);
  }

  closeSprint(id: string): Observable<Sprint> {
    return this.http.patch<Sprint>(`${this.sprintBase}/${id}/close`, {});
  }

  cloneSprint(id: string, request: { name: string; startDate: string; endDate: string; copyMembers: boolean }): Observable<Sprint> {
    return this.http.post<Sprint>(`${this.sprintBase}/${id}/clone`, request);
  }

  getVelocity(piId?: string | null): Observable<VelocityEntry[]> {
    let params = new HttpParams();
    if (piId) params = params.set('piId', piId);
    return this.http.get<VelocityEntry[]>(`${this.sprintBase}/velocity`, { params });
  }

  initializeMembers(sprintId: string): Observable<{ addedCount: number }> {
    return this.http.post<{ addedCount: number }>(`${this.sprintBase}/${sprintId}/initialize-members`, {});
  }

  updateRetro(id: string, req: { wentWell: string | null; didntGoWell: string | null; actionItems: string | null }): Observable<Sprint> {
    return this.http.patch<Sprint>(`${this.sprintBase}/${id}/retro`, req);
  }

  getPIs(): Observable<PI[]> {
    return this.http.get<PI[]>(this.piBase);
  }

  createPI(request: { name: string; startDate: string; endDate: string; description: string | null }): Observable<PI> {
    return this.http.post<PI>(this.piBase, request);
  }

  updatePI(id: string, request: { name: string; startDate: string; endDate: string; description: string | null }): Observable<PI> {
    return this.http.put<PI>(`${this.piBase}/${id}`, request);
  }

  deletePI(id: string): Observable<void> {
    return this.http.delete<void>(`${this.piBase}/${id}`);
  }
}
