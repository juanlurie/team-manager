export interface SessionType {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CreateSessionTypeRequest {
  name: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
}

export type UpdateSessionTypeRequest = CreateSessionTypeRequest;
