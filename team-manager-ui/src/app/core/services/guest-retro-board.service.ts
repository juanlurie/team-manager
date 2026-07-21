import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from './api.config';
import { GuestRetroBoard } from '../models/retro-board.model';

/**
 * Guest (non-member) access to a RetroBoard by its shareable slug. The guest identity is a
 * server-issued, signed httpOnly cookie set by these endpoints (see the API's GuestSessionManager),
 * carried automatically on same-origin requests — the client never sees or sends a token itself.
 * See docs/session-identity.md.
 */
@Injectable({ providedIn: 'root' })
export class GuestRetroBoardService {
  private http = inject(HttpClient);
  private base = `${API_BASE}/guest/retro-board`;

  /** Load the guest view of a board. 404 when the slug is unknown or the board doesn't allow guests. */
  getBoard(slug: string): Observable<GuestRetroBoard> {
    return this.http.get<GuestRetroBoard>(`${this.base}/${encodeURIComponent(slug)}`);
  }

  /** Join (or rejoin) the board as a guest with a display name. */
  join(slug: string, displayName: string): Observable<GuestRetroBoard> {
    return this.http.post<GuestRetroBoard>(`${this.base}/${encodeURIComponent(slug)}/join`, { displayName });
  }
}
