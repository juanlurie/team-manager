import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Feature, CreateFeatureRequest } from '../models/feature.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class FeatureService {
  private http = inject(HttpClient);

  getAllAcrossSprints(opts?: { status?: string; piId?: string }): Observable<Feature[]> {
    let params = new HttpParams();
    if (opts?.status) params = params.set('status', opts.status);
    if (opts?.piId)   params = params.set('piId', opts.piId);
    return this.http.get<Feature[]>(`${API_BASE}/features`, { params });
  }

  getAll(sprintId: string): Observable<Feature[]> {
    return this.http.get<Feature[]>(`${API_BASE}/sprints/${sprintId}/features`);
  }

  create(sprintId: string, request: CreateFeatureRequest): Observable<Feature> {
    return this.http.post<Feature>(`${API_BASE}/sprints/${sprintId}/features`, request);
  }

  update(sprintId: string, id: string, request: CreateFeatureRequest): Observable<Feature> {
    return this.http.put<Feature>(`${API_BASE}/sprints/${sprintId}/features/${id}`, request);
  }

  delete(sprintId: string, id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/sprints/${sprintId}/features/${id}`);
  }

  toggleActive(sprintId: string, id: string): Observable<Feature> {
    return this.http.patch<Feature>(`${API_BASE}/sprints/${sprintId}/features/${id}/toggle-active`, {});
  }

  setStatus(id: string, status: string): Observable<Feature> {
    return this.http.patch<Feature>(`${API_BASE}/features/${id}/status`, { status });
  }
}
