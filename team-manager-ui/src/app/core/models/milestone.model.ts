export type MilestoneStatus = 'Upcoming' | 'InProgress' | 'Done';
export type MilestoneScope = 'Global' | 'Squad';

export interface MilestoneCriterion {
  id: string;
  milestoneId: string;
  label: string;
  completed: boolean;
  position: number;
}

export interface Milestone {
  id: string;
  piId: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: MilestoneStatus;
  scope: MilestoneScope;
  squadId: string | null;
  squadName: string | null;
  squadColor: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  completedTaskCount: number;
  progressPercent: number;
  criteriaCount: number;
  completedCriteriaCount: number;
}

export interface MilestoneDetail extends Milestone {
  criteria: MilestoneCriterion[];
  tasks: MilestoneWorkItem[];
  sprints: MilestoneSprint[];
}

export interface MilestoneWorkItem {
  id: string;
  title: string;
  status: string;
  type: string;
  assignee: string;
  sprintMemberId: string;
  sprintName: string;
  sprintId: string;
}

export interface MilestoneSprint {
  id: string;
  name: string;
}

export interface MilestoneRoadmap {
  piId: string;
  piName: string;
  totalMilestones: number;
  completedMilestones: number;
  inProgressMilestones: number;
  upcomingMilestones: number;
  overallProgressPercent: number;
  milestones: MilestoneRoadmapItem[];
}

export interface MilestoneRoadmapItem {
  id: string;
  title: string;
  scope: MilestoneScope;
  squadName: string | null;
  squadColor: string | null;
  status: MilestoneStatus;
  targetDate: string | null;
  progressPercent: number;
  daysUntilTarget: number;
  criteriaTotal: number;
  criteriaCompleted: number;
}

export interface CreateMilestoneRequest {
  title: string;
  description: string | null;
  targetDate: string | null;
  status?: MilestoneStatus;
  position?: number;
  scope?: MilestoneScope;
  squadId?: string | null;
}

export interface UpdateMilestoneRequest {
  title?: string;
  description?: string | null;
  targetDate?: string | null;
  status?: MilestoneStatus;
  position?: number;
  scope?: MilestoneScope;
  squadId?: string | null;
}

export interface CreateMilestoneCriterionRequest {
  label: string;
  completed?: boolean;
  position?: number;
}

export interface UpdateMilestoneCriterionRequest {
  label?: string;
  completed?: boolean;
  position?: number;
}
