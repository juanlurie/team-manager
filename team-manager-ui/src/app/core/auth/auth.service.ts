import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { authConfig } from './auth.config';
import { HttpContext } from '@angular/common/http';
import { BehaviorSubject, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SKIP_ERROR_TOAST } from '../interceptors/error.interceptor';

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

  // null = still checking, 'unauthenticated' = no token, 'unauthorized' = token but not a member, 'authorized' = good
  private _authStatus$ = new BehaviorSubject<'checking' | 'unauthenticated' | 'unauthorized' | 'authorized'>('checking');
  authStatus$ = this._authStatus$.asObservable();

  private _me$ = new BehaviorSubject<MeResponse | null>(null);
  me$ = this._me$.asObservable();

  // Populated when authenticated via Google but not a team member
  pendingClaims: { name: string; email: string; picture: string; sub: string } | null = null;

  // Set to true when the backend is running without JWT (dev mode).
  // In this mode the frontend skips Google OAuth entirely.
  private devMode = false;

  private static readonly RETURN_URL_KEY = 'auth_return_url';

  constructor(private oauth: OAuthService, private http: HttpClient, private router: Router) {
    this.http.get<{ authRequired: boolean }>('/api/auth-mode').subscribe({
      next: ({ authRequired }) => {
        if (!authRequired) {
          // Backend dev mode: no OAuth needed, proceed immediately.
          this.devMode = true;
          this._authStatus$.next('authorized');
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
          this.http.get<MeResponse>('/api/auth/me', { context: new HttpContext().set(SKIP_ERROR_TOAST, true) }).pipe(
            map(me => {
              this._me$.next(me);
              this._authStatus$.next('authorized');
              this._isDone$.next(true);
              const returnUrl = localStorage.getItem(AuthService.RETURN_URL_KEY);
              if (returnUrl) {
                localStorage.removeItem(AuthService.RETURN_URL_KEY);
                this.router.navigateByUrl(returnUrl);
              }
            }),
            catchError(() => {
              const c = this.oauth.getIdentityClaims() as any;
              if (c) {
                this.pendingClaims = {
                  name: c.name || c.given_name || '',
                  email: c.email || '',
                  picture: c.picture || '',
                  sub: c.sub || ''
                };
              }
              this._authStatus$.next('unauthorized');
              this._isDone$.next(true);
              return of(null);
            })
          ).subscribe();
        } else {
          this._authStatus$.next('unauthenticated');
          this._isDone$.next(true);
        }
      })
      .catch(err => {
        console.error('[Auth] Init failed:', err);
        this._authStatus$.next('unauthenticated');
        this._isDone$.next(true);
      });
  }

  login(returnUrl?: string) {
    if (!this.devMode) {
      if (returnUrl) localStorage.setItem(AuthService.RETURN_URL_KEY, returnUrl);
      this.oauth.initCodeFlow();
    }
  }

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
