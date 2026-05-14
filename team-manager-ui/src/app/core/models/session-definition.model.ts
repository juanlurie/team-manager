export interface SessionDefinition {
  id: string;
  name: string;
  description: string | null;
  createdByMemberId: string;
  createdByMemberName: string | null;
  isActive: boolean;
  createdAt: string;
  participants: SessionDefinitionParticipant[];
  slots: SessionDefinitionSlot[];
}

export interface SessionDefinitionParticipant {
  id: string;
  teamMemberId: string;
  teamMemberName: string | null;
  role: 'Mandatory' | 'Optional';
}

export interface SessionDefinitionSlot {
  id: string;
  sessionDefinitionId: string;
  date: string;
  startTime: string;
  endTime: string;
  locationId: string | null;
  locationName: string | null;
  locationColor: string | null;
  isConfirmed: boolean;
  bookingCount: number;
  mandatoryCount: number;
  connectedMeetingSessionId: string | null;
  connectedMeetingSessionTitle: string | null;
  bookings: SessionDefinitionBooking[];
}

export interface SessionDefinitionBooking {
  id: string;
  sessionDefinitionSlotId: string;
  teamMemberId: string;
  teamMemberName: string | null;
  notes: string | null;
  bookedAt: string;
}

export interface CreateSessionDefinitionRequest {
  name: string;
  description: string | null;
  participants: ParticipantDefinition[];
}

export interface ParticipantDefinition {
  teamMemberId: string;
  role: 'Mandatory' | 'Optional';
}

export interface UpdateSessionDefinitionRequest {
  name: string;
  description: string | null;
  participants: ParticipantDefinition[];
}

export interface CreateSessionSlotsRequest {
  slots: SlotTimeDefinition[];
}

export interface SlotTimeDefinition {
  date: string;
  startTime: string;
  endTime: string;
  locationId: string | null;
}

export interface UpdateSessionSlotRequest {
  date: string;
  startTime: string;
  endTime: string;
  locationId: string | null;
}

export interface BookSessionSlotRequest {
  notes: string | null;
}
