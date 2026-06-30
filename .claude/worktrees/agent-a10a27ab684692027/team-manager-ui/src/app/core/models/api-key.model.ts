export interface ApiKey {
  id: string;
  name: string;
  teamMemberId: string;
  teamMemberName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
}

export interface CreateApiKeyRequest {
  name: string;
  teamMemberId?: string;
  expiresAt?: string | null;
}

export interface CreatedApiKeyResult {
  id: string;
  name: string;
  rawKey: string;
  teamMemberId: string;
  teamMemberName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  expiresAt: string | null;
}
