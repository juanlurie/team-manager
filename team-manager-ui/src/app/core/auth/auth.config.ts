import { AuthConfig } from 'angular-oauth2-oidc';

export const authConfig: AuthConfig = {
  issuer:      'https://accounts.google.com',
  redirectUri: window.location.origin + '/index.html',
  clientId:    '<GOOGLE-CLIENT-ID-FROM-CONSOLE>',
  responseType: 'code',
  scope:        'openid profile email',
  showDebugInformation: true,
  skipIssuerCheck: false,
  strictDiscoveryDocumentValidation: false
};
