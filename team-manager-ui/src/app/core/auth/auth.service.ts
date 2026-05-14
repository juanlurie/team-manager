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
    this.oauth.loadDiscoveryDocumentAndTryLogin()
      .then(() => this._isDone$.next(true))
      .catch(err => {
        console.error('[Auth] Init failed:', err);
        this._isDone$.next(true);
      });
  }

  login()  { this.oauth.initImplicitFlow(); }
  logout() { this.oauth.revokeTokenAndLogout(); }
  hasValidToken() { return this.oauth.hasValidAccessToken(); }

  get token() { return this.oauth.getAccessToken(); }

  get identityClaims() { return this.oauth.getIdentityClaims(); }

  hasRole(role: string): boolean {
    const claims = this.identityClaims as any;
    return claims?.role === role;
  }
}
