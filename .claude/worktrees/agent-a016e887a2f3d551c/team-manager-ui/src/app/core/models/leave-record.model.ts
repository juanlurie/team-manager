export type LeaveType = 'Annual' | 'Sick' | 'Other';

export interface LeaveRecord {
  id: string;
  teamMemberId: string;
  memberName: string;
  startDate: string;
  endDate: string;
  type: LeaveType;
  daysCount: number;
  notes: string | null;
}

export interface CreateLeaveRecordRequest {
  teamMemberId: string;
  startDate: string;
  endDate: string;
  type: string;
  daysCount: number;
  notes: string | null;
}
