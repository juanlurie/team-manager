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

export interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'Member' | 'TeamLead' | 'TechLead';
  teamLeadId: string | null;
  teamLeadName: string | null;
  crafts: string[];
  isActive: boolean;
  createdAt: string;
  birthDate: string | null;
  joinDate: string | null;
  achievements: Badge[];
  squads: SquadSummary[];
}

export interface CreateTeamMemberRequest {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  teamLeadId: string | null;
  crafts: string[];
  birthDate: string | null;
  joinDate: string | null;
}

export interface UpdateTeamMemberRequest extends CreateTeamMemberRequest {
  isActive: boolean;
}
