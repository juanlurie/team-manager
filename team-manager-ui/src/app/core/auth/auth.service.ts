import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OAuthService } from 'angular-oauth2-oidc';
import { authConfig } from './auth.config';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _isDone$ = new BehaviorSubject<boolean>(false);
  isDone$ = this._isDone$.asObservable();

  // Set to true when the backend is running without JWT (dev mode).
  // In this mode the frontend skips Google OAuth entirely.
  private devMode = false;

  constructor(private oauth: OAuthService, private http: HttpClient) {
    this.http.get<{ authRequired: boolean }>('/api/auth-mode').subscribe({
      next: ({ authRequired }) => {
        if (!authRequired) {
          // Backend dev mode: no OAuth needed, proceed immediately.
          this.devMode = true;
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
        this._isDone$.next(true);
      })
      .catch(err => {
        console.error('[Auth] Init failed:', err);
        this._isDone$.next(true);
      });
  }

  login()  { if (!this.devMode) this.oauth.initCodeFlow(); }
  logout() { if (!this.devMode) this.oauth.revokeTokenAndLogout(); }

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
