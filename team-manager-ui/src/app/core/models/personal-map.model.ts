export interface PersonalMapNode {
  id: string;
  sessionId: string;
  label: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  color: string | null;
}

export interface PersonalMapSession {
  id: string;
  title: string | null;
  createdByMemberId: string;
  createdAt: string;
  nodes: PersonalMapNode[];
}

export interface PersonalMapSessionSummary {
  id: string;
  title: string | null;
  nodeCount: number;
  createdAt: string;
}
