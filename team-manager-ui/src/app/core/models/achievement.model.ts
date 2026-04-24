export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
}

export interface MemberAchievement {
  id: string;
  teamMemberId: string;
  memberName: string;
  achievementId: string;
  achievementKey: string;
  achievementName: string;
  achievementIcon: string;
  achievementCategory: string;
  note?: string;
  awardedAt: string;
}
