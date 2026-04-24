import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MemberPersonal, MemberSkill, MemberNote, MemberTask } from '../models/member-personal.model';
import { API_BASE } from './api.config';

@Injectable({ providedIn: 'root' })
export class MemberPersonalService {
  private http = inject(HttpClient);
  private base(id: string) { return `${API_BASE}/team-members/${id}`; }

  getPersonal(memberId: string): Observable<MemberPersonal> {
    return this.http.get<MemberPersonal>(`${this.base(memberId)}/personal`);
  }
  upsertPersonal(memberId: string, personalMap: string | null): Observable<MemberPersonal> {
    return this.http.put<MemberPersonal>(`${this.base(memberId)}/personal`, { personalMap });
  }

  getSkills(memberId: string): Observable<MemberSkill[]> {
    return this.http.get<MemberSkill[]>(`${this.base(memberId)}/skills`);
  }
  createSkill(memberId: string, name: string, category: string | null): Observable<MemberSkill> {
    return this.http.post<MemberSkill>(`${this.base(memberId)}/skills`, { name, category });
  }
  addSkillRating(memberId: string, skillId: string, rating: number, notes: string | null, ratedAt: string | null): Observable<MemberSkill> {
    return this.http.post<MemberSkill>(`${this.base(memberId)}/skills/${skillId}/ratings`, { rating, notes, ratedAt });
  }
  deleteSkill(memberId: string, skillId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(memberId)}/skills/${skillId}`);
  }

  getNotes(memberId: string): Observable<MemberNote[]> {
    return this.http.get<MemberNote[]>(`${this.base(memberId)}/notes`);
  }
  createNote(memberId: string, text: string): Observable<MemberNote> {
    return this.http.post<MemberNote>(`${this.base(memberId)}/notes`, { text });
  }
  deleteNote(memberId: string, noteId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(memberId)}/notes/${noteId}`);
  }

  getTasks(memberId: string): Observable<MemberTask[]> {
    return this.http.get<MemberTask[]>(`${this.base(memberId)}/tasks`);
  }
  createTask(memberId: string, title: string, dueDate?: string | null): Observable<MemberTask> {
    return this.http.post<MemberTask>(`${this.base(memberId)}/tasks`, { title, dueDate: dueDate ?? null });
  }
  updateTask(memberId: string, taskId: string, patch: { title?: string; isCompleted?: boolean; dueDate?: string | null }): Observable<MemberTask> {
    return this.http.patch<MemberTask>(`${this.base(memberId)}/tasks/${taskId}`, patch);
  }
  deleteTask(memberId: string, taskId: string): Observable<void> {
    return this.http.delete<void>(`${this.base(memberId)}/tasks/${taskId}`);
  }
}
