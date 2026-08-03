export interface SquadSummary {
  id: string;
  name: string;
  color: string | null;
  /** A squad belongs to at most one team, so this is optional. */
  teamId: string | null;
  teamName: string | null;
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
  teamId: string | null;
}

/**
 * No teamId, deliberately — the API used to write it on every update, so a caller that omitted it
 * silently detached the squad from its team. Use `SquadService.setTeam()` to move a squad.
 */
export interface UpdateSquadRequest {
  name: string;
  color: string | null;
}
