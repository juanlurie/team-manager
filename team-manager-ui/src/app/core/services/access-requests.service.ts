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

  /**
   * squadId is optional throughout: approving without placing someone in a squad is a normal
   * outcome, not a missing value. The team is derived server-side from the squad.
   */
  approve(id: string, teamMemberId?: string | null, squadId?: string | null) {
    return this.http.post(`${this.base}/${id}/approve`, {
      ...(teamMemberId ? { teamMemberId } : {}),
      ...(squadId ? { squadId } : {})
    });
  }

  deny(id: string) {
    return this.http.post(`${this.base}/${id}/deny`, {});
  }
}
