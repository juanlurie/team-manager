export interface TimesheetConfig {
  extraProjects: string[];
  extraCategories: Record<string, string[]>;
  quickActions: QuickActionConfig[];
  billableProjects?: string[];
  workWeek?: Record<string, string>;
  workLocationOptions?: string[];
}

export interface QuickActionConfig {
  label: string;
  project: string;
  category: string;
  note?: string | null;
  durationMins?: number | null;
  workedFrom?: string | null;
  color: string;
  bg: string;
}
