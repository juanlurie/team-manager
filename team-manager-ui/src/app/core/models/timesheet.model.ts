export interface TimesheetEntry {
  id: string;
  teamMemberId: string;
  date: string;
  project: string;
  category: string;
  hours: number;
  minutes: number;
  billable: boolean;
  workedFrom: string;
  sentiment: string;
  description: string | null;
  ticketNumber: string | null;
  createdAt: string;
  externalId?: string | null;
  syncStatus?: 'pending' | 'failed' | null;
}

export interface CreateTimesheetEntryRequest {
  date: string;
  project: string;
  category: string;
  hours: number;
  minutes: number;
  billable: boolean;
  workedFrom: string;
  sentiment: string;
  description: string | null;
  ticketNumber: string | null;
}
