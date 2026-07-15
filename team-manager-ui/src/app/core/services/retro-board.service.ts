import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  RetroBoardSession, RetroBoardSummary, RetroBoardColumn, RetroBoardCheckinQuestion,
  RetroBoardAction, RetroBoardAiSummary, RetroColumnInput, CheckinQuestionInput, RetroStepDurations,
  RetroBoardFeedbackPrompt, FeedbackPromptInput,
} from '../models/retro-board.model';

@Injectable({ providedIn: 'root' })
export class RetroBoardService {
  private http = inject(HttpClient);
  private base = '/api/v1/retro-board';

  // ---- sessions ----
  // Lobby list: non-archived sessions (draft/live and recently closed).
  getLobbySessions(): Observable<RetroBoardSummary[]> {
    return this.http.get<RetroBoardSummary[]>(this.base);
  }
  getArchivedSessions(): Observable<RetroBoardSummary[]> {
    return this.http.get<RetroBoardSummary[]>(`${this.base}/archived`);
  }
  getSession(idOrSlug: string): Observable<RetroBoardSession> {
    return this.http.get<RetroBoardSession>(`${this.base}/${idOrSlug}`);
  }
  /** Full response variant so callers can read the server `Date` header and correct clock skew
   *  on the live countdowns (see the store's serverOffset). */
  getSessionResponse(idOrSlug: string): Observable<HttpResponse<RetroBoardSession>> {
    return this.http.get<RetroBoardSession>(`${this.base}/${idOrSlug}`, { observe: 'response' });
  }
  createSession(req: {
    title?: string; squadId?: string | null; sprintId?: string | null;
    columns?: RetroColumnInput[]; checkinQuestions?: CheckinQuestionInput[]; feedbackPrompts?: FeedbackPromptInput[];
    votesPerUser?: number; allowAnonymous?: boolean; hideNotesUntilReveal?: boolean;
    stepDurations?: RetroStepDurations; seedFromPreviousRetro?: boolean;
  }): Observable<RetroBoardSession> {
    return this.http.post<RetroBoardSession>(this.base, req);
  }
  join(idOrSlug: string): Observable<RetroBoardSession> {
    return this.http.post<RetroBoardSession>(`${this.base}/${idOrSlug}/join`, {});
  }
  deleteSession(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
  setPhase(id: string, phase: string): Observable<RetroBoardSession> {
    return this.http.put<RetroBoardSession>(`${this.base}/${id}/phase`, { phase });
  }
  // Publish a draft for asynchronous pre-capture (draft → open).
  openRetro(id: string): Observable<RetroBoardSession> {
    return this.http.post<RetroBoardSession>(`${this.base}/${id}/open`, {});
  }
  // Start the synced, guided session (open → live).
  goLive(id: string): Observable<RetroBoardSession> {
    return this.http.post<RetroBoardSession>(`${this.base}/${id}/go-live`, {});
  }
  // Set the owning squad and auto-enrol its members as participants.
  setSquad(id: string, squadId: string | null): Observable<RetroBoardSession> {
    return this.http.put<RetroBoardSession>(`${this.base}/${id}/squad`, { squadId });
  }
  close(id: string): Observable<RetroBoardSession> {
    return this.http.post<RetroBoardSession>(`${this.base}/${id}/close`, {});
  }
  reopen(id: string): Observable<RetroBoardSession> {
    return this.http.post<RetroBoardSession>(`${this.base}/${id}/reopen`, {});
  }
  archive(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/archive`, {});
  }
  unarchive(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/unarchive`, {});
  }
  updateSettings(id: string, req: {
    votesPerUser?: number; allowAnonymous?: boolean; hideNotesUntilReveal?: boolean; stepDurations?: RetroStepDurations;
  }): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/settings`, req);
  }
  reveal(id: string, revealed = true): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/reveal`, {}, { params: { revealed } });
  }
  setLiveState(id: string, liveStateJson: string | null): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/live-state`, { liveStateJson });
  }
  analyse(id: string): Observable<RetroBoardAiSummary> {
    return this.http.post<RetroBoardAiSummary>(`${this.base}/${id}/analyse`, {});
  }

  // ---- columns ----
  addColumn(id: string, input: RetroColumnInput): Observable<RetroBoardColumn> {
    return this.http.post<RetroBoardColumn>(`${this.base}/${id}/columns`, input);
  }
  updateColumn(id: string, columnId: string, input: RetroColumnInput): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/columns/${columnId}`, input);
  }
  deleteColumn(id: string, columnId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/columns/${columnId}`);
  }

  // ---- notes ----
  addNote(id: string, columnId: string, text: string, isAnonymous: boolean): Observable<RetroBoardSession> {
    return this.http.post<RetroBoardSession>(`${this.base}/${id}/notes`, { columnId, text, isAnonymous });
  }
  updateNoteText(id: string, noteId: string, text: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/notes/${noteId}/text`, { text });
  }
  deleteNote(id: string, noteId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/notes/${noteId}`);
  }
  flagNote(id: string, noteId: string, flagged: boolean): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/notes/${noteId}/flag`, { flagged });
  }
  clarifyNote(id: string, noteId: string, clarification: string | null): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/notes/${noteId}/clarify`, { clarification });
  }
  markIntroduced(id: string, noteId: string, introduced: boolean): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/notes/${noteId}/introduced`, { flagged: introduced });
  }

  // ---- votes ----
  addVote(id: string, noteId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/notes/${noteId}/vote`, {});
  }
  removeVote(id: string, noteId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/notes/${noteId}/vote`);
  }

  // ---- check-in ----
  addCheckinQuestion(id: string, input: CheckinQuestionInput): Observable<RetroBoardCheckinQuestion> {
    return this.http.post<RetroBoardCheckinQuestion>(`${this.base}/${id}/checkin-questions`, input);
  }
  deleteCheckinQuestion(id: string, questionId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/checkin-questions/${questionId}`);
  }
  respondCheckin(id: string, questionId: string, rating: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/checkin-questions/${questionId}/respond`, { rating });
  }

  // ---- feedback ----
  addFeedbackPrompt(id: string, input: FeedbackPromptInput): Observable<RetroBoardFeedbackPrompt> {
    return this.http.post<RetroBoardFeedbackPrompt>(`${this.base}/${id}/feedback-prompts`, input);
  }
  deleteFeedbackPrompt(id: string, promptId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/feedback-prompts/${promptId}`);
  }
  respondFeedback(id: string, promptId: string, score: number, comment: string | null): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/feedback-prompts/${promptId}/respond`, { score, comment });
  }

  // ---- actions ----
  addAction(id: string, title: string, opts?: { sourceNoteId?: string | null; assigneeMemberIds?: string[] }): Observable<RetroBoardAction> {
    return this.http.post<RetroBoardAction>(`${this.base}/${id}/actions`, { title, sourceNoteId: opts?.sourceNoteId, assigneeMemberIds: opts?.assigneeMemberIds });
  }
  updateAction(id: string, actionId: string, req: { title?: string; status?: string; dueDate?: string | null; assigneeMemberIds?: string[] }): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/actions/${actionId}`, req);
  }
  deleteAction(id: string, actionId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/actions/${actionId}`);
  }

  // ---- participants ----
  setParticipantRole(id: string, memberId: string, role: string): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/participants/role`, { memberId, role });
  }
}
