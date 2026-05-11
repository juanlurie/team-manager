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
  capacity: number | null;
  workItems: WorkItem[];
  leaveRecords: LeaveRecord[];
  squadNames: string[];
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

export interface SprintVoteDto {
  id: string;
  voterSprintMemberId: string;
  voterName: string;
  nomineeSprintMemberId: string;
  nomineeName: string;
}

export interface VoteTallyDto {
  sprintMemberId: string;
  memberName: string;
  votes: number;
  isMvp: boolean;
}

export interface DashboardLeaveSummary {
  membersOnLeaveToday: number;
  membersOnLeaveTotal: number;
  totalWorkingDays: number;
  totalCalendarDays: number;
  byType: LeaveTypeSummary[];
  members: MemberLeaveDetail[];
}

export interface LeaveTypeSummary {
  type: string;
  recordCount: number;
  workingDays: number;
  calendarDays: number;
}

export interface MemberLeaveDetail {
  teamMemberId: string;
  memberName: string;
  recordCount: number;
  totalWorkingDays: number;
  totalCalendarDays: number;
  records: DetailedLeaveRecord[];
}

export interface DetailedLeaveRecord {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  calendarDays: number;
  notes: string | null;
}

export interface SprintVotesResponse {
  votes: SprintVoteDto[];
  tally: VoteTallyDto[];
}
