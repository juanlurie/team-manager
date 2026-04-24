export interface Badge {
  id: string;
  icon: string;
  name: string;
  category: string;
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
  achievements: Badge[];
}

export interface CreateTeamMemberRequest {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  teamLeadId: string | null;
  crafts: string[];
}

export interface UpdateTeamMemberRequest extends CreateTeamMemberRequest {
  isActive: boolean;
}
