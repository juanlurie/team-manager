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
  teamMemberId: string | null;
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
