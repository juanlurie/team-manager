import { TeamMember } from '../../models/team-member.model';

/** Data passed to the K picker dialog via MAT_DIALOG_DATA */
export interface KPickerData {
  /** Pre-selected members shown as chips on open */
  preSelectedMembers?: TeamMember[];
  /** Selection mode */
  mode?: 'single' | 'multi';
  /** Optional dialog title */
  title?: string;
}

/** A section of the member list (Recent, People, Anyone in...) */
export interface MemberSection {
  label: string;
  items: TeamMember[];
  type?: 'recent' | 'people' | 'group';
  groupCount?: number;
}

/** Active filter state */
export interface FilterState {
  squadId: string | null;
  featureId: string | null;
  leadId: string | null;
}

/** A single option in a filter dropdown */
export interface FilterOption {
  id: string;
  label: string;
}

/** Configuration for a filter dropdown */
export interface FilterDropdownConfig {
  label: string;
  options: FilterOption[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
}

/** Avatar rendering config */
export interface AvatarConfig {
  initials: string;
  color: string;
  size?: number;
}

/** Result returned when k-picker dialog closes */
export interface KPickerResult {
  selectedMembers: TeamMember[];
  filters: FilterState;
}
