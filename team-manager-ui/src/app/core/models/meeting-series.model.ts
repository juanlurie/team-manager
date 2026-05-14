export interface MeetingSeriesSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  locationId?: string;
  locationName?: string;
  locationColor?: string;
  sortOrder: number;
  isClaimed?: boolean;
  claimedByItemId?: string;
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

export interface MyMeetingItem {
  itemId: string;
  seriesId: string;
  seriesTitle: string;
  itemTitle: string;
  role: string;
  isConfirmed: boolean;
  mandatoryCount: number;
  mandatoryFilled: number;
  createdAt: string;
}

export interface BulkAvailabilityItem {
  itemId: string;
  itemTitle: string;
  isConfirmed: boolean;
  availableSlotIds: string[];
}

export interface BulkAvailabilitySlot {
  slotId: string;
  date: string;
  startTime: string;
  endTime: string;
  locationId?: string;
  locationName?: string;
  locationColor?: string;
  isClaimed: boolean;
  claimedByItemId?: string;
}

export interface BulkAvailabilityResponse {
  seriesId: string;
  memberId: string;
  memberName: string;
  items: BulkAvailabilityItem[];
  slots: BulkAvailabilitySlot[];
}

export interface BulkAvailabilityRequest {
  availabilities: { itemId: string; slotId: string }[];
}

export interface MyMeetingSeries {
  seriesId: string;
  seriesTitle: string;
  seriesDescription?: string;
  totalItems: number;
  openItems: number;
  confirmedItems: number;
  role: string;
  createdAt: string;
}