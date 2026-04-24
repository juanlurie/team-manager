export interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  piId: string | null;
  piName: string | null;
  sprintNumber: number | null;
  isInnovationSprint: boolean;
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
