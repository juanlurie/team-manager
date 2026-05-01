import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DiscussionPoint, CreateDiscussionPointRequest } from '../models/discussion-point.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class DiscussionPointService {
  private http = inject(HttpClient);

  getAll(): Observable<DiscussionPoint[]> {
    return this.http.get<DiscussionPoint[]>(`${API_BASE}/discussion-points`);
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
