export interface SquadSummary {
  id: string;
  name: string;
  color: string | null;
}

export interface SquadMemberEntry {
  teamMemberId: string;
  fullName: string;
}

export interface Squad extends SquadSummary {
  members: SquadMemberEntry[];
}

export interface CreateSquadRequest {
  name: string;
  color: string | null;
}
