import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Comment, CreateCommentRequest } from '../models/comment.model';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private http = inject(HttpClient);
  private base = '/api/v1/comments';

  getComments(entityType: string, entityId: string) {
    return this.http.get<Comment[]>(`${this.base}/${entityType}/${entityId}`);
  }

  create(req: CreateCommentRequest) {
    return this.http.post<Comment>(this.base, req);
  }

  delete(id: string) {
    return this.http.delete(`${this.base}/${id}`);
  }
}
