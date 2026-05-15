import { AuthConfig } from 'angular-oauth2-oidc';

export const authConfig: AuthConfig = {
  issuer:       'https://accounts.google.com',
  redirectUri:  'https://team.media.juanlurie.com',
  clientId:     '480197338228-e6cqhoab3957o6r9d14rdqf3et79f6jo.apps.googleusercontent.com',
  responseType: 'id_token token',
  scope:        'openid profile email',
  requireHttps: true,
  oidc: true,
  showDebugInformation: true,
  loginUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  userinfoEndpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};
