import { MEMBER_ROLES, MemberRole } from './team-member.model';

export interface FeaturePermission {
  id: string;
  featureKey: string;
  category: string;
  label: string;
  role: string;
  isEnabled: boolean;
}

export interface FeatureCategoryGroup {
  category: string;
  permissions: FeaturePermission[];
}

export interface MemberFeatureOverride {
  id: string;
  featureKey: string;
  category: string;
  label: string;
  isEnabled: boolean;
  roleDefault: boolean;
}

// Derived from MEMBER_ROLES rather than restated -- see docs/plans/team-admin-rollout.md,
// "derive role lists, never restate them".
export const ROLES = MEMBER_ROLES.map(r => r.id);
export type Role = MemberRole;
