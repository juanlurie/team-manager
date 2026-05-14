export interface MeetingSeriesSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  locationId?: string;
  locationName?: string;
  locationColor?: string;
  sortOrder: number;
}

export interface MeetingSeriesItemParticipant {
  id: string;
  teamMemberId: string;
  teamMemberName?: string;
  role: string;
}

export interface MeetingSeriesItemAvailability {
  id: string;
  meetingSeriesItemId: string;
  meetingSeriesSlotId: string;
  teamMemberId: string;
  teamMemberName?: string;
  notes?: string;
  createdAt: string;
}

export interface MeetingSeriesItem {
  id: string;
  title: string;
  description?: string;
  durationMinutes?: number;
  confirmedSlotId?: string;
  isConfirmed: boolean;
  createdAt: string;
  participants: MeetingSeriesItemParticipant[];
  availabilities: MeetingSeriesItemAvailability[];
}

export interface MeetingSeries {
  id: string;
  title: string;
  description?: string;
  createdByMemberId: string;
  createdByMemberName?: string;
  isActive: boolean;
  createdAt: string;
  slots: MeetingSeriesSlot[];
  items: MeetingSeriesItem[];
}

export interface CreateMeetingSeriesRequest {
  title: string;
  description?: string;
  isActive?: boolean;
  slots: CreateMeetingSeriesSlotRequest[];
}

export interface CreateMeetingSeriesSlotRequest {
  date: string;
  startTime: string;
  endTime: string;
  locationId?: string;
  sortOrder: number;
}

export interface UpdateMeetingSeriesRequest {
  title: string;
  description?: string;
  isActive: boolean;
}

export interface CreateMeetingSeriesSlotsRequest {
  slots: CreateMeetingSeriesSlotRequest[];
}

export interface UpdateMeetingSeriesSlotRequest {
  date: string;
  startTime: string;
  endTime: string;
  locationId?: string;
  sortOrder: number;
}

export interface CreateMeetingSeriesItemRequest {
  title: string;
  description?: string;
  durationMinutes?: number;
  participants: CreateMeetingSeriesItemParticipantRequest[];
}

export interface CreateMeetingSeriesItemParticipantRequest {
  teamMemberId: string;
  role: string;
}

export interface UpdateMeetingSeriesItemRequest {
  title: string;
  description?: string;
  durationMinutes?: number;
  participants: UpdateMeetingSeriesItemParticipantRequest[];
}

export interface UpdateMeetingSeriesItemParticipantRequest {
  teamMemberId: string;
  role: string;
}

export interface AddMeetingSeriesItemAvailabilityRequest {
  meetingSeriesSlotId: string;
  teamMemberId: string;
  notes?: string;
}