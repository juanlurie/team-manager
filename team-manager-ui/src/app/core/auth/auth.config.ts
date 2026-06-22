import { AuthConfig } from 'angular-oauth2-oidc';

export const authConfig: AuthConfig = {
  issuer:      'https://accounts.google.com',
  redirectUri: window.location.origin,
  clientId:    '480197338228-e6cqhoab3957o6r9d14rdqf3et79f6jo.apps.googleusercontent.com',
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
  // access_type=offline gets us a refresh_token; prompt=consent forces Google to actually
  // issue one even if the user already granted consent previously without it. Needed so
  // AuthService can call setupAutomaticSilentRefresh() and keep sessions alive without
  // the ~1hr access-token expiry logging people out mid-use.
  customQueryParams: { access_type: 'offline', prompt: 'consent' },
};
