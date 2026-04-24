import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WorkItem, CreateWorkItemRequest } from '../models/work-item.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class WorkItemService {
  private http = inject(HttpClient);

  getBySprintMember(sprintMemberId: string): Observable<WorkItem[]> {
    return this.http.get<WorkItem[]>(`${API_BASE}/sprint-members/${sprintMemberId}/work-items`);
  }

  getById(id: string): Observable<WorkItem> {
    return this.http.get<WorkItem>(`${API_BASE}/work-items/${id}`);
  }

  create(sprintMemberId: string, request: CreateWorkItemRequest): Observable<WorkItem> {
    return this.http.post<WorkItem>(`${API_BASE}/sprint-members/${sprintMemberId}/work-items`, request);
  }

  update(id: string, request: CreateWorkItemRequest): Observable<WorkItem> {
    return this.http.put<WorkItem>(`${API_BASE}/work-items/${id}`, request);
  }

  updateStatus(id: string, status: string): Observable<WorkItem> {
    return this.http.patch<WorkItem>(`${API_BASE}/work-items/${id}/status`, { status });
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/work-items/${id}`);
  }
}
