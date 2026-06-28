export type WorkItemType = 'Task' | 'Analysis' | 'Design' | 'Dev' | 'QA' | 'Bug' | 'Release';
export type WorkItemStatus = 'Planned' | 'InProgress' | 'Blocked' | 'Completed' | 'ReadyForRelease' | 'Released';

export interface WorkItem {
  id: string;
  title: string;
  description: string | null;
  type: WorkItemType;
  status: WorkItemStatus;
  sprintMemberId: string;
  featureId: string | null;
  featureTitle: string | null;
  milestoneId: string | null;
  milestoneTitle: string | null;
  externalTicketRef: string | null;
  estimatedPoints: number | null;
  actualPoints: number | null;
  completedDate: string | null;
  blockedAt: string | null;
  blockedReason: string | null;
  commentCount: number;
}

export interface CreateWorkItemRequest {
  title: string;
  description: string | null;
  type: string;
  status: string;
  featureId: string | null;
  milestoneId: string | null;
  externalTicketRef: string | null;
  estimatedPoints: number | null;
  actualPoints: number | null;
  completedDate: string | null;
  blockedReason: string | null;
}
