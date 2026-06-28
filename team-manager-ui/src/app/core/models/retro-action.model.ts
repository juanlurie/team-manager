export type RetroActionStatus = 'Open' | 'InProgress' | 'Done';

export interface RetroAction {
  id: string;
  sprintId: string;
  title: string;
  notes: string | null;
  assignedTo: string | null;
  status: RetroActionStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRetroActionRequest {
  sprintId: string;
  title: string;
  notes: string | null;
  assignedTo: string | null;
  status: string;
  dueDate: string | null;
}
