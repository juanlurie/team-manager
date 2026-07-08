import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RetroCustomTheme } from '../models/fun-retro.model';

// Team-wide library of custom retro board themes -- shared across every session, unlike a
// session-scoped upload. Selectable from any retro's theme picker alongside the fixed built-in
// themes (space/f1/ocean/retro-gaming).
@Injectable({ providedIn: 'root' })
export class RetroThemeLibraryService {
  private http = inject(HttpClient);
  private base = '/api/v1/retro-themes';

  getThemes(): Observable<RetroCustomTheme[]> {
    return this.http.get<RetroCustomTheme[]>(this.base);
  }

  createTheme(name: string): Observable<RetroCustomTheme> {
    return this.http.post<RetroCustomTheme>(this.base, { name });
  }

  renameTheme(id: string, name: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}`, { name });
  }

  deleteTheme(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // variant is either a legacy tone ("positive"|"negative"|"action") or a template column key
  // ("well", "start", "wind", ...) -- the backend accepts any safe-string variant now.
  uploadVariant(id: string, variant: string, file: File): Observable<{ updatedAt: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ updatedAt: string }>(`${this.base}/${id}/variants/${variant}`, form);
  }

  deleteVariant(id: string, variant: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/variants/${variant}`);
  }

  // Fetched as a blob (not a plain <img src>) -- the endpoint sits behind the same bearer-token
  // auth as everything else here, and an <img> tag can't attach the Authorization header the auth
  // interceptor adds to HttpClient requests.
  getVariantBlob(id: string, variant: string): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/variants/${variant}`, { responseType: 'blob' });
  }

  // builtInId null clears an existing override. Server enforces at most one custom theme may
  // claim a given built-in id at a time -- rejects with 409 if another theme already owns it.
  setOverride(id: string, builtInId: string | null): Observable<void> {
    return this.http.patch<void>(`${this.base}/${id}/override`, { builtInId });
  }
}
