export interface Comment {
  id: string;
  entityType: string;
  entityId: string;
  text: string;
  authorName?: string;
  createdAt: string;
}

export interface CreateCommentRequest {
  entityType: string;
  entityId: string;
  text: string;
  authorName?: string;
}
