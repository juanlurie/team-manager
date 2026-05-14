import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LeaderboardEntry } from '../models/leaderboard.model';

export interface PointHistoryEntry {
  id: string;
  source: string;
  label: string;
  points: number;
  reason: string;
  awardedAt: string;
}

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private http = inject(HttpClient);
  private base = '/api/v1/leaderboard';

  getLeaderboard() { return this.http.get<LeaderboardEntry[]>(this.base); }

  getMemberStats(memberId: string) {
    return this.http.get<LeaderboardEntry>(`${this.base}/member/${memberId}`);
  }

  getMemberHistory(memberId: string) {
    return this.http.get<PointHistoryEntry[]>(`${this.base}/member/${memberId}/history`);
  }

  awardPoints(teamMemberId: string, points: number, reason: string) {
    return this.http.post(`${this.base}/award`, { teamMemberId, points, reason });
  }

  revokeAward(id: string) {
    return this.http.delete(`${this.base}/award/${id}`);
  }
}
