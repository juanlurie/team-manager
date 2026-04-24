import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DiscussionPoint, CreateDiscussionPointRequest } from '../models/discussion-point.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class DiscussionPointService {
  private http = inject(HttpClient);

  getAll(sprintId?: string): Observable<DiscussionPoint[]> {
    let params = new HttpParams();
    if (sprintId) params = params.set('sprintId', sprintId);
    return this.http.get<DiscussionPoint[]>(`${API_BASE}/discussion-points`, { params });
  }

  create(request: CreateDiscussionPointRequest): Observable<DiscussionPoint> {
    return this.http.post<DiscussionPoint>(`${API_BASE}/discussion-points`, request);
  }

  update(id: string, request: CreateDiscussionPointRequest): Observable<DiscussionPoint> {
    return this.http.put<DiscussionPoint>(`${API_BASE}/discussion-points/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/discussion-points/${id}`);
  }
}
