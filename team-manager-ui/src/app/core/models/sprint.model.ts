export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  piId: string | null;
  piName: string | null;
  sprintNumber: number | null;
  isInnovationSprint: boolean;
  goal: string | null;
  retroWentWell: string | null;
  retroDidntGoWell: string | null;
  retroActionItems: string | null;
}

export interface PI {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  description: string | null;
}

export interface CreateSprintRequest {
  name: string;
  startDate: string;
  endDate: string;
  piId: string | null;
  sprintNumber: number | null;
  isInnovationSprint: boolean;
}
