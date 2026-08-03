export interface TeamSummary {
  id: string;
  name: string;
}

export interface TeamSquadEntry {
  id: string;
  name: string;
  color: string | null;
}

export interface Team extends TeamSummary {
  squads: TeamSquadEntry[];
}

export interface CreateTeamRequest {
  name: string;
}

/**
 * Filter sentinel for "no team" -- the derived team set being empty, which also covers members
 * in no squad at all. Not a real team id, and deliberately not a "No team" pseudo-team: squads
 * without a team contribute nothing to the set. See docs/plans/team-admin-rollout.md.
 */
export const NO_TEAM = '__no_team__';
