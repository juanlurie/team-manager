export interface Badge {
  id: string;
  icon: string;
  name: string;
  category: string;
}

export interface SquadSummary {
  id: string;
  name: string;
  color: string | null;
}

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
