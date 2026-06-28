export interface MeetingSession {
  id: string;
  title: string;
  description: string | null;
  date: string;
  startTime: string;
  endTime: string;
  location: 'Remote' | 'OnSite' | 'Hybrid';
  type: 'Workshop' | 'Presentation' | 'Discussion' | 'Social' | 'Standup';
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
  locationId: string | null;
  locationName: string | null;
  locationColor: string | null;
  notes: string | null;
  slotType: 'TeamMember' | 'Facilitator';
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  bookedAt: string | null;
}

export interface CreateSessionRequest {
  title: string;
  description: string | null;
  location: string;
  type: string;
  slots: SlotDefinition[];
}

export interface SlotDefinition {
  date: string;
  startTime: string;
  endTime: string;
  slotType: string;
  locationId: string | null;
  teamMemberId?: string | null;
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
