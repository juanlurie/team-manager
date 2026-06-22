export interface TimesheetApprovalEntry {
  date: string;
  project: string;
  category: string;
  hours: number;
  minutes: number;
  billable: boolean;
  workedFrom: string;
  description: string | null;
  ticketNumber: string | null;
  externalId: string | null;
  violations: string[];
}

export interface TimesheetApprovalMember {
  memberName: string;
  entries: TimesheetApprovalEntry[];
  violationCount: number;
}

export interface FetchTimesheetApprovalsRequest {
  cookie: string;
  start: string;
  end: string;
  credentials?: Record<string, string>;
}

export interface MemberWeekHours {
  memberName: string;
  hours: number;
}

export interface WeeklyTimesheetSummary {
  weekStart: string;
  weekEnd: string;
  memberHours: MemberWeekHours[];
  missingMemberNames: string[];
}

export interface TimesheetApprovalFetchResult {
  members: TimesheetApprovalMember[];
  weeklySummary: WeeklyTimesheetSummary[];
  teams: string[];
  memberTeams: Record<string, string>;
}

export interface QualityEntryInput {
  date: string;
  project: string;
  category: string;
  hours: number;
  minutes: number;
  billable: boolean;
  description: string | null;
}

export interface MemberQualityInput {
  memberName: string;
  totalHours: number;
  entries: QualityEntryInput[];
}

export interface TimesheetQualityAnalysis {
  configured: boolean;
  analysis: string | null;
  status: string;
}
