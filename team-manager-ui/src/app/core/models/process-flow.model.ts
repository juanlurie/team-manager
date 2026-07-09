export interface ProcessFlowNode {
  id: string;
  sessionId: string;
  label: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  color: string | null;
  createdByMemberId: string;
}

export interface ProcessFlowEdge {
  id: string;
  sessionId: string;
  fromNodeId: string;
  toNodeId: string;
  label: string | null;
}

export interface ProcessFlowSession {
  id: string;
  title: string | null;
  createdByMemberId: string;
  createdAt: string;
  nodes: ProcessFlowNode[];
  edges: ProcessFlowEdge[];
}

export interface ProcessFlowSessionSummary {
  id: string;
  title: string | null;
  createdByMemberId: string;
  createdByName: string;
  nodeCount: number;
  createdAt: string;
}
