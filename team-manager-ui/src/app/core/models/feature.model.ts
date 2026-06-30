export type FeatureStatus = 'Planned' | 'InProgress' | 'Completed' | 'ReadyForRelease' | 'Released';

export interface FeatureTask {
  id: string;
  title: string;
  type: string;
  status: string;
  assignee: string;
}

export interface Feature {
  id: string;
  sprintId: string;
  title: string;
  description: string | null;
  externalTicketRef: string | null;
  status: FeatureStatus;
  isActive: boolean;
  estimatedDays: number | null;
  isUnplanned: boolean;
  startDate: string | null;
  sprintName?: string | null;
  piName?: string | null;
  tasks?: FeatureTask[];
}

export interface CreateFeatureRequest {
  title: string;
  description: string | null;
  externalTicketRef: string | null;
  status: string;
  estimatedDays: number | null;
  isUnplanned: boolean;
  startDate: string | null;
}
