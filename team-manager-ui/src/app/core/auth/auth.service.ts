import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { authConfig } from './auth.config';
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
  pendingClaims = signal<{ name: string; email: string; picture: string; sub: string } | null>(null);

  // Set to true when the backend is running without JWT (dev mode).
  // In this mode the frontend skips Google OAuth entirely.
  private devMode = false;

  private static readonly RETURN_URL_KEY = 'auth_return_url';

  constructor(private oauth: OAuthService, private http: HttpClient, private router: Router) {
    // If the refresh token itself is rejected (revoked, expired after long inactivity), don't
    // wait for some unrelated API call to surface a 401 — log out cleanly right away.
    this.oauth.events.subscribe(e => {
      if (e.type === 'token_refresh_error') this.logout();
    });

    this.http.get<{ authRequired: boolean }>('/api/auth-mode').subscribe({
      next: ({ authRequired }) => {
        if (!authRequired) {
          // Backend dev mode: no OAuth needed. The backend's dev auth handler
          // still resolves a real TeamMember, so fetch /api/auth/me before
          // declaring authorized — role-based UI logic needs me$ populated
          // by the time guards/components run, same ordering as the OAuth path.
          this.devMode = true;
          this.http.get<MeResponse>('/api/auth/me', { context: new HttpContext().set(SKIP_ERROR_TOAST, true) }).subscribe({
            next: (me) => this._me$.next(me),
            error: () => {},
            complete: () => {
              this._authStatus$.next('authorized');
              this._isDone$.next(true);
            },
          });
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
        if (!this.hasValidToken()) {
          this._authStatus$.next('unauthenticated');
          this._isDone$.next(true);
          return;
        }
        this.http.get<MeResponse>('/api/auth/me', { context: new HttpContext().set(SKIP_ERROR_TOAST, true) }).pipe(
          map(me => {
            this._me$.next(me);
            this._authStatus$.next('authorized');
            this._isDone$.next(true);
            this.oauth.setupAutomaticSilentRefresh();
            const returnUrl = localStorage.getItem(AuthService.RETURN_URL_KEY);
            if (returnUrl) {
              localStorage.removeItem(AuthService.RETURN_URL_KEY);
              this.router.navigateByUrl(returnUrl);
            }
          }),
          catchError((err) => {
            // A plain 401 means the token itself was rejected (expired/invalid signature) --
            // that's a session-expiry case, not "this Google account isn't a team member".
            // Only the backend's explicit 403 not_registered means the latter; route each to
            // the right place instead of treating every /me failure as "access not granted".
            if (err?.status === 401) {
              this.clearStoredTokens();
              this._authStatus$.next('unauthenticated');
              this._isDone$.next(true);
              return of(null);
            }

            // Try backend-provided claims first, then fall back to local ID token claims
            const gc = err?.error?.googleClaims;
            const tc = this.oauth.getIdentityClaims() as Record<string, string> | null;
            const name    = gc?.name    || tc?.['name']    || '';
            const email   = gc?.email   || tc?.['email']   || '';
            const picture = gc?.picture || tc?.['picture'] || '';
            const sub     = gc?.sub     || tc?.['sub']     || '';
            if (email) {
              this.pendingClaims.set({ name, email, picture, sub });
            }
            this._authStatus$.next('unauthorized');
            this._isDone$.next(true);
            return of(null);
          })
        ).subscribe();
      })
      .catch(() => {
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
    this.clearStoredTokens();
    // Hard redirect to origin — app will detect no token and start login flow
    window.location.href = window.location.origin;
  }

  // Removes OAuth tokens from storage (angular-oauth2-oidc storage) without the hard redirect --
  // used when a stale/expired token gets rejected so a fresh login attempt isn't confused by it.
  // Delegates to the library's own logOut(true) (no redirect to Google) so every key it stores
  // (access_token, id_token, refresh_token, expires_at, nonce, PKCE_verifier, ...) gets cleared,
  // not just the subset we'd otherwise have to keep in sync by hand.
  private clearStoredTokens() {
    this.oauth.logOut(true);
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
    return this._me$.value?.role === role;
  }

  isLead(): boolean {
    const role = this._me$.value?.role;
    return role === 'TeamLead' || role === 'TechLead';
  }

  isSelfOrLead(memberId: string): boolean {
    return this.isLead() || this._me$.value?.id === memberId;
  }
}
