export type MilestoneStatus = 'Upcoming' | 'InProgress' | 'Done';

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

export interface CreateMilestoneRequest {
  title: string;
  description: string | null;
  targetDate: string | null;
  status?: MilestoneStatus;
  position?: number;
}

export interface UpdateMilestoneRequest {
  title?: string;
  description?: string | null;
  targetDate?: string | null;
  status?: MilestoneStatus;
  position?: number;
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
