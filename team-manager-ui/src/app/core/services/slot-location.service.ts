import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SlotLocation, CreateSlotLocationRequest, UpdateSlotLocationRequest } from '../models/slot-location.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class SlotLocationService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/slot-locations`;

  getAll(activeOnly?: boolean): Observable<SlotLocation[]> {
    const params = activeOnly ? `?activeOnly=true` : '';
    return this.http.get<SlotLocation[]>(`${this.base}${params}`);
  }

  getById(id: string): Observable<SlotLocation> {
    return this.http.get<SlotLocation>(`${this.base}/${id}`);
  }

  create(request: CreateSlotLocationRequest): Observable<SlotLocation> {
    return this.http.post<SlotLocation>(this.base, request);
  }

  update(id: string, request: UpdateSlotLocationRequest): Observable<SlotLocation> {
    return this.http.put<SlotLocation>(`${this.base}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
