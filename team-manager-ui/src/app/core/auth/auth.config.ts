import { AuthConfig } from 'angular-oauth2-oidc';

export const authConfig: AuthConfig = {
  issuer:      'https://accounts.google.com',
  redirectUri: window.location.origin + '/index.html',
  clientId:    '480197338228-e6cqhoab3957o6r9d14rdqf3et79f6jo.apps.googleusercontent.com',
  responseType: 'code',
  scope:        'openid profile email',
  showDebugInformation: true,
  skipIssuerCheck: true,
  strictDiscoveryDocumentValidation: false,
  requireHttps: true,
  oidc: true,
};
