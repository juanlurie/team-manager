import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProgressPI } from '../models/progress.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class ProgressService {
  private http = inject(HttpClient);

  getAll(): Observable<ProgressPI[]> {
    return this.http.get<ProgressPI[]>(`${API_BASE}/progress`);
  }
}
