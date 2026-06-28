export interface ProgressFeature {
  id: string;
  title: string;
  externalTicketRef: string | null;
  status: string;
  estimatedDays: number | null;
  isUnplanned: boolean;
  startDate: string | null;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
}

export interface ProgressSprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  sprintNumber: number | null;
  isInnovationSprint: boolean;
  features: ProgressFeature[];
}

export interface ProgressPI {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  sprints: ProgressSprint[];
}
