import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TimesheetEntry, CreateTimesheetEntryRequest } from '../models/timesheet.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class TimesheetService {
  private http = inject(HttpClient);
  private base(id: string) { return `${API_BASE}/team-members/${id}/timesheets`; }

  getByMonth(memberId: string, year: number, month: number): Observable<TimesheetEntry[]> {
    return this.http.get<TimesheetEntry[]>(this.base(memberId), { params: { year, month } });
  }

  create(memberId: string, req: CreateTimesheetEntryRequest): Observable<TimesheetEntry> {
    return this.http.post<TimesheetEntry>(this.base(memberId), req);
  }

  update(memberId: string, entryId: string, req: CreateTimesheetEntryRequest): Observable<TimesheetEntry> {
    return this.http.put<TimesheetEntry>(`${this.base(memberId)}/${entryId}`, req);
  }

  delete(memberId: string, entryId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(memberId)}/${entryId}`);
  }

  exportMonth(memberId: string, year: number, month: number): Observable<Blob> {
    return this.http.get(`${this.base(memberId)}/export`, {
      params: { year, month },
      responseType: 'blob'
    });
  }

  analyzeQuality(memberId: string, lookbackDays = 90): Observable<TimesheetQualityAnalysis> {
    return this.http.post<TimesheetQualityAnalysis>(`${this.base(memberId)}/analyze-quality`, { lookbackDays });
  }
}

export interface TimesheetQualityAnalysis {
  configured: boolean;
  analysis: string | null;
  status: string;
}
