export interface HiScoreEntry {
  rank: number;
  memberId: string;
  displayName: string;
  score: number;
  achievedAt: string | null;
  avatarSeed: string | null;
}

export interface HiScoreGame {
  key: string;
  label: string;
  unit: string;
  higherIsBetter: boolean;
  entries: HiScoreEntry[];
}

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
  avatarSeed: string | null;
  totalPoints: number;
  badgePoints: number;
  sprintPoints: number;
  bonusPoints: number;
  breakdown: PointBreakdownItem[];
}
