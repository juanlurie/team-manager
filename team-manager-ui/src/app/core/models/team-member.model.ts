export interface Badge {
  id: string;
  icon: string;
  name: string;
  category: string;
}

// Re-exported rather than restated: this file used to carry its own copy of SquadSummary, which
// would now need the team fields adding in two places to stay in step with the API.
import type { SquadSummary } from './squad.model';
import type { TeamSummary } from './team.model';
export type { SquadSummary };

export type MemberRole = 'Member' | 'TeamLead' | 'TechLead' | 'Admin';

/** The one place role ids and their display labels are listed on the frontend. */
export const MEMBER_ROLES: { id: MemberRole; label: string }[] = [
  { id: 'Member',   label: 'Member' },
  { id: 'TeamLead', label: 'Team Lead' },
  { id: 'TechLead', label: 'Tech Lead' },
  { id: 'Admin',    label: 'Admin' },
];

export function roleLabel(role: string): string {
  return MEMBER_ROLES.find(r => r.id === role)?.label ?? role;
}

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: MemberRole;
  teamLeadId: string | null;
  teamLeadName: string | null;
  crafts: string[];
  avatarSeed: string | null;
  isActive: boolean;
  createdAt: string;
  birthDate: string | null;
  joinDate: string | null;
  achievements: Badge[];
  squads: SquadSummary[];
  /**
   * Derived by the API from the member's squads, never stored. Plural: a member in squads across
   * different teams belongs to all of them, so there is no singular "their team" to read.
   */
  teams: TeamSummary[];
}

// No role field: role is set through TeamMemberService.changeRole(), never as part of a
// general member save. See docs/plans/team-admin-rollout.md, workstream A.
export interface CreateTeamMemberRequest {
  firstName: string;
  lastName: string;
  email: string;
  teamLeadId: string | null;
  crafts: string[];
  birthDate: string | null;
  joinDate: string | null;
}

export interface UpdateTeamMemberRequest extends CreateTeamMemberRequest {
  isActive: boolean;
}
