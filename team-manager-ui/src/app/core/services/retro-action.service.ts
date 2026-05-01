import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RetroAction, CreateRetroActionRequest } from '../models/retro-action.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class RetroActionService {
  private http = inject(HttpClient);

  getBySprintId(sprintId: string): Observable<RetroAction[]> {
    return this.http.get<RetroAction[]>(`${API_BASE}/retro-actions?sprintId=${sprintId}`);
  }

  create(request: CreateRetroActionRequest): Observable<RetroAction> {
    return this.http.post<RetroAction>(`${API_BASE}/retro-actions`, request);
  }

  update(id: string, request: CreateRetroActionRequest): Observable<RetroAction> {
    return this.http.put<RetroAction>(`${API_BASE}/retro-actions/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/retro-actions/${id}`);
  }
}
