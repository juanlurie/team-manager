export interface SearchCapability {
  name: string;
  icon: string;
  trigger: string;
  description: string;
  features: string[];
  details: string;
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
  tags?: string[];
  description: string;
}
