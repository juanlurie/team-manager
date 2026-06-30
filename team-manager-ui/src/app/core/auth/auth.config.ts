import { AuthConfig } from 'angular-oauth2-oidc';

export const authConfig: AuthConfig = {
  issuer:      'https://accounts.google.com',
  redirectUri: window.location.origin,
  clientId:    'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
  responseType: 'code',
  scope:        'openid profile email',
  showDebugInformation: true,
  skipIssuerCheck: true,
  strictDiscoveryDocumentValidation: false,
  requireHttps: false,
  oidc: true,
  // Hardcoded endpoints to avoid CORS-blocked discovery document fetch
  tokenEndpoint:         'https://oauth2.googleapis.com/token',
  userinfoEndpoint:      'https://openidconnect.googleapis.com/v1/userinfo',
  loginUrl:              'https://accounts.google.com/o/oauth2/v2/auth',
  logoutUrl:             'https://accounts.google.com/Logout',
  // access_type=offline gets us a refresh_token, needed so AuthService can call
  // setupAutomaticSilentRefresh() and keep sessions alive past the ~1hr access-token expiry.
  // Do NOT set prompt=consent here -- that forces Google's consent screen on every single
  // login, not just the first. AuthService.login() adds it dynamically only when there's no
  // refresh_token stored yet (new users, or this account's one-time upgrade).
  customQueryParams: { access_type: 'offline' },
};
