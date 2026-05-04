import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DiscussionPoint, CreateDiscussionPointRequest, DiscussionTask, CreateDiscussionTaskRequest } from '../models/discussion-point.model';
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

  // Task methods
  getTasks(discussionPointId: string): Observable<DiscussionTask[]> {
    return this.http.get<DiscussionTask[]>(`${API_BASE}/discussion-points/${discussionPointId}/tasks`);
  }

  createTask(discussionPointId: string, request: CreateDiscussionTaskRequest): Observable<DiscussionTask> {
    return this.http.post<DiscussionTask>(`${API_BASE}/discussion-points/${discussionPointId}/tasks`, request);
  }

  updateTask(discussionPointId: string, taskId: string, request: CreateDiscussionTaskRequest): Observable<DiscussionTask> {
    return this.http.put<DiscussionTask>(`${API_BASE}/discussion-points/${discussionPointId}/tasks/${taskId}`, request);
  }

  deleteTask(discussionPointId: string, taskId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/discussion-points/${discussionPointId}/tasks/${taskId}`);
  }

  toggleTask(discussionPointId: string, taskId: string): Observable<DiscussionTask> {
    return this.http.post<DiscussionTask>(`${API_BASE}/discussion-points/${discussionPointId}/tasks/${taskId}/toggle`, {});
  }
}
