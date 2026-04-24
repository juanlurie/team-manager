import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private http = inject(HttpClient);

  exportPptx(templateFile: File, sprintId: string, teamLeadId?: string): Observable<Blob> {
    const form = new FormData();
    form.append('template', templateFile);
    form.append('sprintId', sprintId);
    if (teamLeadId) form.append('teamLeadId', teamLeadId);
    return this.http.post(`${API_BASE}/export/pptx`, form, { responseType: 'blob' });
  }
}
