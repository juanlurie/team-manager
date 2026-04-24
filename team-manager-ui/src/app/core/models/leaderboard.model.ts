export interface PointBreakdownItem {
  source: string;
  label: string;
  points: number;
  count: number;
}

export interface LeaderboardEntry {
  position: number;
  memberId: string;
  firstName: string;
  lastName: string;
  role: string;
  totalPoints: number;
  badgePoints: number;
  sprintPoints: number;
  bonusPoints: number;
  breakdown: PointBreakdownItem[];
}
