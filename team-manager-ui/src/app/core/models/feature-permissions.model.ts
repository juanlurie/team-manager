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

export const ROLES = ['Member', 'TeamLead', 'TechLead'] as const;
export type Role = (typeof ROLES)[number];
