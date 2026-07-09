import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProcessFlowSession, ProcessFlowSessionSummary, ProcessFlowNode, ProcessFlowEdge } from '../models/process-flow.model';

@Injectable({ providedIn: 'root' })
export class ProcessFlowService {
  private http = inject(HttpClient);
  private base = '/api/v1/process-flows';

  getSessions(): Observable<ProcessFlowSessionSummary[]> {
    return this.http.get<ProcessFlowSessionSummary[]>(this.base);
  }

  getSession(id: string): Observable<ProcessFlowSession> {
    return this.http.get<ProcessFlowSession>(`${this.base}/${id}`);
  }

  createSession(title?: string): Observable<ProcessFlowSession> {
    return this.http.post<ProcessFlowSession>(this.base, { title });
  }

  deleteSession(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  addNode(sessionId: string, label: string, x: number, y: number): Observable<ProcessFlowNode> {
    return this.http.post<ProcessFlowNode>(`${this.base}/${sessionId}/nodes`, { label, positionX: x, positionY: y });
  }

  updateNodePosition(sessionId: string, nodeId: string, x: number, y: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/${sessionId}/nodes/${nodeId}/position`, { positionX: x, positionY: y });
  }

  updateNodeSize(sessionId: string, nodeId: string, width: number, height: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/${sessionId}/nodes/${nodeId}/size`, { width, height });
  }

  updateNodeColor(sessionId: string, nodeId: string, color: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${sessionId}/nodes/${nodeId}/color`, { color });
  }

  updateNodeText(sessionId: string, nodeId: string, label: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${sessionId}/nodes/${nodeId}/text`, { label });
  }

  deleteNode(sessionId: string, nodeId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${sessionId}/nodes/${nodeId}`);
  }

  addEdge(sessionId: string, fromNodeId: string, toNodeId: string): Observable<ProcessFlowEdge> {
    return this.http.post<ProcessFlowEdge>(`${this.base}/${sessionId}/edges`, { fromNodeId, toNodeId });
  }

  updateEdgeWaypoints(sessionId: string, edgeId: string, waypoints: { x: number; y: number }[]): Observable<void> {
    return this.http.patch<void>(`${this.base}/${sessionId}/edges/${edgeId}/waypoints`, { waypoints });
  }

  updateEdgeEndpoints(sessionId: string, edgeId: string, fromNodeId: string, toNodeId: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${sessionId}/edges/${edgeId}/endpoints`, { fromNodeId, toNodeId });
  }

  deleteEdge(sessionId: string, edgeId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${sessionId}/edges/${edgeId}`);
  }
}
