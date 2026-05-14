export interface SlotLocation {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CreateSlotLocationRequest {
  name: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
}

export type UpdateSlotLocationRequest = CreateSlotLocationRequest;
