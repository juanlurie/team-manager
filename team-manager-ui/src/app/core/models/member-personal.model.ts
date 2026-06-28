export interface MemberPersonal { personalMap: string | null; updatedAt: string | null; }
export interface MemberSkillRating { id: string; rating: number; notes: string | null; ratedAt: string; }
export interface MemberSkill { id: string; name: string; category: string | null; ratings: MemberSkillRating[]; }
export interface MemberNote { id: string; text: string; createdAt: string; }
export interface MemberTask { id: string; title: string; isCompleted: boolean; createdAt: string; dueDate: string | null; completedAt: string | null; }
