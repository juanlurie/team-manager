import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

// Module-level guard so a burst of concurrent 401s (several in-flight requests all rejected at
// once) only triggers one redirect/snackbar instead of one per request.
let handlingSessionExpiry = false;

// Mirrors AuthService.clearStoredTokens() -- duplicated here instead of injecting AuthService,
// since AuthService's own constructor makes an HTTP call that runs through this interceptor;
// injecting it eagerly here created a circular dependency that broke the app on every load.
function clearStoredAuthTokens() {
  ['access_token', 'id_token', 'access_token_stored_at', 'granted_scopes', 'nonce'].forEach(k => {
    localStorage.removeItem(k);
    sessionStorage.removeItem(k);
  });
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  return next(req).pipe(
    catchError(error => {
      const isOAuthEndpoint = req.url.includes('accounts.google.com') || req.url.includes('googleapis.com') || req.url.includes('openidconnect');
      if (!req.context.get(SKIP_ERROR_TOAST) && !isOAuthEndpoint) {
        if (error?.status === 403 && error?.error?.error === 'feature_disabled') {
          return throwError(() => error);
        }
        // A 401 mid-session means the token expired or was revoked while the tab was open --
        // that's not "an unexpected error", it's a session expiry. Send them back to login
        // instead of leaving a confusing generic error on screen. Hard reload (not router
        // navigation) so AuthService re-constructs fresh instead of keeping its stale
        // 'authorized' state, which would otherwise just bounce the guard right back here.
        if (error?.status === 401 && !handlingSessionExpiry && !window.location.pathname.startsWith('/login')) {
          handlingSessionExpiry = true;
          clearStoredAuthTokens();
          snackBar.open('Your session has expired. Please sign in again.', 'Close', { duration: 6000 });
          window.location.href = `${window.location.origin}/login`;
          return throwError(() => error);
        }
        let message: string;
        if (error?.status === 0) {
          message = 'Connection lost. Please check your network and try again.';
        } else {
          message = error?.error?.detail ?? error?.error?.title ?? 'An unexpected error occurred.';
        }
        snackBar.open(message, 'Close', { duration: 5000, panelClass: ['error-snackbar'] });
      }
      return throwError(() => error);
    })
  );
};
