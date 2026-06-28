import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiKey, CreateApiKeyRequest, CreatedApiKeyResult } from '../models/api-key.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class ApiKeyService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/api-keys`;

  getAll(): Observable<ApiKey[]> {
    return this.http.get<ApiKey[]>(this.base);
  }

  create(request: CreateApiKeyRequest): Observable<CreatedApiKeyResult> {
    return this.http.post<CreatedApiKeyResult>(this.base, request);
  }

  revoke(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
