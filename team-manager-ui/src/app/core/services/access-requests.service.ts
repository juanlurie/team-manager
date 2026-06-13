import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface AccessRequest {
  id: string;
  name: string;
  email: string;
  googleSub: string | null;
  reason: string;
  status: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AccessRequestsService {
  private http = inject(HttpClient);
  private base = '/api/accessrequests';

  listPending() {
    return this.http.get<AccessRequest[]>(`${this.base}?status=Pending`);
  }

  approve(id: string) {
    return this.http.post(`${this.base}/${id}/approve`, {});
  }

  deny(id: string) {
    return this.http.post(`${this.base}/${id}/deny`, {});
  }
}
