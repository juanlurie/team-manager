import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ConfigVariable {
  id?: string;
  key: string;
  value: string;
  description?: string;
  isSecret: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfigVariablesService {
  private http = inject(HttpClient);
  private base = '/api/v1/config-variables';

  list(): Observable<ConfigVariable[]> {
    return this.http.get<ConfigVariable[]>(this.base);
  }

  keys(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/keys`);
  }

  create(v: ConfigVariable): Observable<ConfigVariable> {
    return this.http.post<ConfigVariable>(this.base, v);
  }

  update(id: string, v: ConfigVariable): Observable<ConfigVariable> {
    return this.http.put<ConfigVariable>(`${this.base}/${id}`, v);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
