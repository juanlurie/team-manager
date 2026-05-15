import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from '../../core/services/api.config';

export interface LeaveFetchConfig {
  id?: string;
  enabled: boolean;
  url: string;
  method: string;
  isFormUrlEncoded: boolean;
  headers: Record<string, string>;
  bodyTemplate: string;
  mapping: MappingConfig;
}

export interface MappingConfig {
  namePath: string;
  startPath: string;
  endPath: string;
  typePath: string;
  daysPath: string;
  statusPath: string;
  nameTransform: string;
}

@Injectable({ providedIn: 'root' })
export class LeaveFetchConfigService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/leave-fetch-config`;

  get(): Observable<LeaveFetchConfig> {
    return this.http.get<LeaveFetchConfig>(this.base);
  }

  save(config: LeaveFetchConfig): Observable<void> {
    return this.http.put<void>(this.base, config);
  }
}
