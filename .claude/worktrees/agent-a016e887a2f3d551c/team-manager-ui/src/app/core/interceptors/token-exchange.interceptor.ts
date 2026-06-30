import { HttpInterceptorFn } from '@angular/common/http';

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

/**
 * Intercepts the token exchange request that angular-oauth2-oidc sends
 * directly to Google and routes it through our own backend instead.
 * The backend adds the client_secret server-side so it is never exposed
 * in the browser.
 */
export const tokenExchangeInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url === GOOGLE_TOKEN_ENDPOINT) {
    return next(req.clone({ url: '/api/auth/exchange' }));
  }
  return next(req);
};
