export interface MeetingSession {
  id: string;
  title: string;
  description: string | null;
  date: string;
  startTime: string;
  endTime: string;
  location: 'Remote' | 'OnSite' | 'Hybrid';
  status: 'Open' | 'Filled' | 'Cancelled';
  createdByMemberId: string;
  createdByMemberName: string | null;
  slots: MeetingSlot[];
  createdAt: string;
}

export interface MeetingSlot {
  id: string;
  meetingSessionId: string;
  teamMemberId: string | null;
  teamMemberName: string | null;
  notes: string | null;
  slotType: 'TeamMember' | 'Facilitator';
  bookedAt: string | null;
}

export interface CreateSessionRequest {
  title: string;
  description: string | null;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  teamMemberSlotCount: number;
  facilitatorSlotCount: number;
}

export interface UpdateSessionRequest {
  title: string;
  description: string | null;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
}

export interface BookSlotRequest {
  notes: string | null;
}

export interface UpdateStatusRequest {
  status: string;
}
