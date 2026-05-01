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
}
