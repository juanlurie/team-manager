import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Achievement, MemberAchievement } from '../models/achievement.model';

@Injectable({ providedIn: 'root' })
export class AchievementService {
  private http = inject(HttpClient);
  private base = '/api/v1/achievements';

  getAll() { return this.http.get<Achievement[]>(this.base); }

  getForMember(memberId: string) {
    return this.http.get<MemberAchievement[]>(`${this.base}/member/${memberId}`);
  }

  award(teamMemberId: string, achievementId: string, note?: string) {
    return this.http.post<MemberAchievement>(`${this.base}/award`, { teamMemberId, achievementId, note });
  }

  revoke(id: string) {
    return this.http.delete(`${this.base}/${id}`);
  }
}
