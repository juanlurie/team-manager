import { Injectable } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { authConfig } from './auth.config';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _isDone$ = new BehaviorSubject<boolean>(false);
  isDone$ = this._isDone$.asObservable();

  constructor(private oauth: OAuthService) {
    this.oauth.configure(authConfig);
  }

  async init(): Promise<void> {
    try {
      await this.oauth.loadDiscoveryDocumentAndTryLogin();
    } catch (err) {
      console.error('[Auth] Discovery failed, trying login anyway:', err);
      try {
        await this.oauth.tryLogin();
      } catch {
        // ignore
      }
    }
    console.log('[Auth] Init complete, hasValidToken:', this.hasValidToken());
    this._isDone$.next(true);
  }

  login()  { this.oauth.initImplicitFlow(); }
  logout() { this.oauth.revokeTokenAndLogout(); }
  hasValidToken() { return this.oauth.hasValidAccessToken() || this.oauth.hasValidIdToken(); }

  get token() { return this.oauth.getAccessToken() || this.oauth.getIdToken(); }

  get identityClaims() { return this.oauth.getIdentityClaims(); }

  hasRole(role: string): boolean {
    const claims = this.identityClaims as any;
    return claims?.role === role;
  }
}
