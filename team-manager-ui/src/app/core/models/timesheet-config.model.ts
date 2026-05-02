export interface TimesheetConfig {
  extraProjects: string[];
  extraCategories: Record<string, string[]>;
  quickActions: QuickActionConfig[];
}

export interface QuickActionConfig {
  label: string;
  project: string;
  category: string;
  note?: string | null;
  durationMins?: number | null;
  color: string;
  bg: string;
}
