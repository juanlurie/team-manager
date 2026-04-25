import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LeaveRecord, CreateLeaveRecordRequest } from '../models/leave-record.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/leave-records`;

  getAll(filters?: { teamMemberId?: string; sprintId?: string; from?: string; to?: string }): Observable<LeaveRecord[]> {
    let params = new HttpParams();
    if (filters?.teamMemberId) params = params.set('teamMemberId', filters.teamMemberId);
    if (filters?.sprintId)     params = params.set('sprintId', filters.sprintId);
    if (filters?.from)         params = params.set('from', filters.from);
    if (filters?.to)           params = params.set('to', filters.to);
    return this.http.get<LeaveRecord[]>(this.base, { params });
  }

  create(request: CreateLeaveRecordRequest): Observable<LeaveRecord> {
    return this.http.post<LeaveRecord>(this.base, request);
  }

  update(id: string, request: CreateLeaveRecordRequest): Observable<LeaveRecord> {
    return this.http.put<LeaveRecord>(`${this.base}/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  import(records: any[], override = false): Observable<{ imported: number; overridden: number; duplicates: number; unknownMembers: string[] }> {
    return this.http.post<any>(`${this.base}/import`, { records, override });
  }

  fetchPreview(cookie: string, teamIds: number[], start: string, end: string, context?: HttpContext): Observable<any[]> {
    return this.http.post<any[]>(`${this.base}/fetch-preview`, { cookie, teamIds, start, end }, { context });
  }

  fetchAndImport(cookie: string, teamIds: number[], start: string, end: string): Observable<{ imported: number; overridden: number; duplicates: number; unknownMembers: string[] }> {
    return this.http.post<any>(`${this.base}/fetch`, { cookie, teamIds, start, end });
  }
}
