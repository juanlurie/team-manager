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

  uploadVariant(id: string, variant: 'positive' | 'negative' | 'action', file: File): Observable<{ updatedAt: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ updatedAt: string }>(`${this.base}/${id}/variants/${variant}`, form);
  }

  deleteVariant(id: string, variant: 'positive' | 'negative' | 'action'): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/variants/${variant}`);
  }

  // Fetched as a blob (not a plain <img src>) -- the endpoint sits behind the same bearer-token
  // auth as everything else here, and an <img> tag can't attach the Authorization header the auth
  // interceptor adds to HttpClient requests.
  getVariantBlob(id: string, variant: 'positive' | 'negative' | 'action'): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/variants/${variant}`, { responseType: 'blob' });
  }
}
