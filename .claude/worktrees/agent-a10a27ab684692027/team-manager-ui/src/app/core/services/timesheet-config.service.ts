import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from './api.config';
import { TimesheetConfig } from '../models/timesheet-config.model';

@Injectable({ providedIn: 'root' })
export class TimesheetConfigService {
  private http = inject(HttpClient);

  get(memberId: string): Observable<TimesheetConfig> {
    return this.http.get<TimesheetConfig>(`${API_BASE}/team-members/${memberId}/timesheet-config`);
  }

  upsert(memberId: string, config: Partial<TimesheetConfig>): Observable<TimesheetConfig> {
    return this.http.put<TimesheetConfig>(`${API_BASE}/team-members/${memberId}/timesheet-config`, config);
  }
}
