import { Injectable, inject, signal } from '@angular/core';
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

  pendingCount = signal(0);

  listPending() {
    return this.http.get<AccessRequest[]>(`${this.base}?status=Pending`);
  }

  refreshCount() {
    this.listPending().subscribe({
      next: (reqs) => this.pendingCount.set(reqs.length),
      error: () => {},
    });
  }

  approve(id: string, teamMemberId?: string | null) {
    return this.http.post(`${this.base}/${id}/approve`, teamMemberId ? { teamMemberId } : {});
  }

  deny(id: string) {
    return this.http.post(`${this.base}/${id}/deny`, {});
  }
}
