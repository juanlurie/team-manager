export type DiscussionStatus = 'Open' | 'InProgress' | 'Resolved' | 'Deferred';
export type DiscussionPriority = 'High' | 'Medium' | 'Low';

export interface DiscussionPoint {
  id: string;
  title: string;
  notes: string | null;
  status: DiscussionStatus;
  priority: DiscussionPriority;
  startDate: string | null;
  targetDate: string | null;
  teamMemberId: string | null;
  assigneeName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiscussionPointRequest {
  title: string;
  notes: string | null;
  status: string;
  priority: string;
  startDate: string | null;
  targetDate: string | null;
  teamMemberId?: string | null;
}

export interface DiscussionTask {
  id: string;
  discussionPointId: string;
  title: string;
  description: string | null;
  teamMemberId: string | null;
  assigneeName: string | null;
  isCompleted: boolean;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CreateDiscussionTaskRequest {
  title: string;
  description: string | null;
  teamMemberId: string | null;
  dueDate: string | null;
}
