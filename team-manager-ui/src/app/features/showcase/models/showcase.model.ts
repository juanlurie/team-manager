export interface SystemStats {
  teamMembers: number;
  activeMembers: number;
  sprints: number;
  activeSprints: number;
  pis: number;
  squads: number;
  features: number;
  workItems: number;
  meetingSeries: number;
  meetingSessions: number;
  discussionPoints: number;
  wheels: number;
  achievements: number;
  mcpTools: number;
  tuiScreens: number;
  searchComponents: number;
  uiRoutes: number;
}

export interface SearchCapability {
  name: string;
  icon: string;
  trigger: string;
  description: string;
  features: string[];
  details: string;
}

export interface ServerSideFilter {
  entity: string;
  filters: string[];
}

export interface TuiScreen {
  name: string;
  file: string;
  description: string;
  icon: string;
}

export interface TuiKeyBinding {
  key: string;
  action: string;
}

export interface McpDomain {
  name: string;
  icon: string;
  toolCount: number;
  tools: McpTool[];
}

export interface McpTool {
  name: string;
  description: string;
  requiredParams: string[];
  apiEndpoint: string;
  httpMethod: string;
}

export interface FeatureCard {
  domain: string;
  icon: string;
  color: string;
  route: string;
  stats: { label: string; value: string | number }[];
  description: string;
}
