import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SessionType, CreateSessionTypeRequest, UpdateSessionTypeRequest } from '../models/session-type.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class SessionTypeService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/session-types`;

  getAll(activeOnly?: boolean): Observable<SessionType[]> {
    const params = activeOnly ? `?activeOnly=true` : '';
    return this.http.get<SessionType[]>(`${this.base}${params}`);
  }

  getById(id: string): Observable<SessionType> {
    return this.http.get<SessionType>(`${this.base}/${id}`);
  }

  create(request: CreateSessionTypeRequest): Observable<SessionType> {
    return this.http.post<SessionType>(this.base, request);
  }

  update(id: string, request: UpdateSessionTypeRequest): Observable<SessionType> {
    return this.http.put<SessionType>(`${this.base}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
