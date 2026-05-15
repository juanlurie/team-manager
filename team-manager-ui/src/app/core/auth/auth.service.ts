import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OAuthService } from 'angular-oauth2-oidc';
import { authConfig } from './auth.config';
import { BehaviorSubject, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface MeResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _isDone$ = new BehaviorSubject<boolean>(false);
  isDone$ = this._isDone$.asObservable();

  private _isAuthorized$ = new BehaviorSubject<boolean>(false);
  isAuthorized$ = this._isAuthorized$.asObservable();

  private _me$ = new BehaviorSubject<MeResponse | null>(null);
  me$ = this._me$.asObservable();

  // Set to true when the backend is running without JWT (dev mode).
  // In this mode the frontend skips Google OAuth entirely.
  private devMode = false;

  constructor(private oauth: OAuthService, private http: HttpClient) {
    this.http.get<{ authRequired: boolean }>('/api/auth-mode').subscribe({
      next: ({ authRequired }) => {
        if (!authRequired) {
          // Backend dev mode: no OAuth needed, proceed immediately.
          this.devMode = true;
          // In dev mode, we can't verify membership server-side, so allow through
          this._isAuthorized$.next(true);
          this._isDone$.next(true);
        } else {
          this.initOAuth();
        }
      },
      error: () => {
        // Can't reach backend — fall back to OAuth so prod still works.
        this.initOAuth();
      },
    });
  }

  private initOAuth(): void {
    this.oauth.configure(authConfig);
    this.oauth.tryLogin()
      .then(() => {
        console.log('[Auth] Init complete, hasValidToken:', this.hasValidToken());
        if (this.hasValidToken()) {
          // Verify membership by calling /api/auth/me
          this.http.get<MeResponse>('/api/auth/me').pipe(
            map(me => {
              this._me$.next(me);
              this._isAuthorized$.next(true);
              this._isDone$.next(true);
            }),
            catchError(() => {
              // 403 or error — not a team member
              this._isAuthorized$.next(false);
              this._isDone$.next(true);
              return of(null);
            })
          ).subscribe();
        } else {
          this._isAuthorized$.next(false);
          this._isDone$.next(true);
        }
      })
      .catch(err => {
        console.error('[Auth] Init failed:', err);
        this._isAuthorized$.next(false);
        this._isDone$.next(true);
      });
  }

  login()  { if (!this.devMode) this.oauth.initCodeFlow(); }

  logout() {
    // Remove OAuth tokens from localStorage (angular-oauth2-oidc storage)
    ['access_token', 'id_token', 'access_token_stored_at', 'granted_scopes', 'nonce'].forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    // Hard redirect to origin — app will detect no token and start login flow
    window.location.href = window.location.origin;
  }

  hasValidToken(): boolean {
    if (this.devMode) return true;
    return this.oauth.hasValidAccessToken() || this.oauth.hasValidIdToken();
  }

  get token(): string | null {
    if (this.devMode) return null;
    return this.oauth.getIdToken();
  }

  get identityClaims() { return this.oauth.getIdentityClaims(); }

  hasRole(role: string): boolean {
    const claims = this.identityClaims as any;
    return claims?.role === role;
  }
}
