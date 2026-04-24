import { Sprint } from './sprint.model';
import { WorkItem } from './work-item.model';
import { LeaveRecord } from './leave-record.model';
import { Feature } from './feature.model';

export interface MemberSprintCard {
  sprintMemberId: string;
  teamMemberId: string;
  fullName: string;
  role: string;
  teamLeadName: string | null;
  crafts: string[];
  notes: string | null;
  workItems: WorkItem[];
  leaveRecords: LeaveRecord[];
}

export interface SprintDashboard {
  sprint: Sprint;
  features: Feature[];
  members: MemberSprintCard[];
}

export interface SprintSummary {
  totalMembers: number;
  plannedCount: number;
  inProgressCount: number;
  blockedCount: number;
  completedCount: number;
  totalLeaveDays: number;
}

export interface Blocker {
  workItemId: string;
  title: string;
  featureTitle: string | null;
  externalTicketRef: string | null;
  memberId: string;
  memberName: string;
  blockedAt: string;
  daysBlocked: number;
}
