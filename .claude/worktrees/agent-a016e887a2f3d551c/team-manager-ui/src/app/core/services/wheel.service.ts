import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Wheel } from '../models/wheel.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class WheelService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/wheels`;

  getAll(): Observable<Wheel[]> { return this.http.get<Wheel[]>(this.base); }
  create(name: string): Observable<Wheel> { return this.http.post<Wheel>(this.base, { name }); }
  delete(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
  addParticipant(wheelId: string, memberId: string): Observable<Wheel> {
    return this.http.post<Wheel>(`${this.base}/${wheelId}/participants/${memberId}`, {});
  }
  removeParticipant(wheelId: string, memberId: string): Observable<Wheel> {
    return this.http.delete<Wheel>(`${this.base}/${wheelId}/participants/${memberId}`);
  }
}
