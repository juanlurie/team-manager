import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PersonalMapSession, PersonalMapSessionSummary, PersonalMapNode } from '../models/personal-map.model';

@Injectable({ providedIn: 'root' })
export class PersonalMapService {
  private http = inject(HttpClient);
  private base = '/api/v1/personal-maps';

  getSessions(): Observable<PersonalMapSessionSummary[]> {
    return this.http.get<PersonalMapSessionSummary[]>(this.base);
  }

  getSession(id: string): Observable<PersonalMapSession> {
    return this.http.get<PersonalMapSession>(`${this.base}/${id}`);
  }

  createSession(title?: string): Observable<PersonalMapSession> {
    return this.http.post<PersonalMapSession>(this.base, { title });
  }

  deleteSession(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  addNode(sessionId: string, label: string, x: number, y: number): Observable<PersonalMapNode> {
    return this.http.post<PersonalMapNode>(`${this.base}/${sessionId}/nodes`, { label, positionX: x, positionY: y });
  }

  updateNodePosition(sessionId: string, nodeId: string, x: number, y: number): Observable<void> {
    return this.http.patch<void>(`${this.base}/${sessionId}/nodes/${nodeId}/position`, { positionX: x, positionY: y });
  }

  updateNodeText(sessionId: string, nodeId: string, label: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${sessionId}/nodes/${nodeId}/text`, { label });
  }

  deleteNode(sessionId: string, nodeId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${sessionId}/nodes/${nodeId}`);
  }
}
