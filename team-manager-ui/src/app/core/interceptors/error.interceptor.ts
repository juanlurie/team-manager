import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

// Module-level guard so a burst of concurrent 401s (several in-flight requests all rejected at
// once) only triggers one redirect/snackbar instead of one per request.
let handlingSessionExpiry = false;

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  const router = inject(Router);
  const auth = inject(AuthService);
  return next(req).pipe(
    catchError(error => {
      const isOAuthEndpoint = req.url.includes('accounts.google.com') || req.url.includes('googleapis.com') || req.url.includes('openidconnect');
      if (!req.context.get(SKIP_ERROR_TOAST) && !isOAuthEndpoint) {
        if (error?.status === 403 && error?.error?.error === 'feature_disabled') {
          return throwError(() => error);
        }
        // A 401 mid-session means the token expired or was revoked while the tab was open --
        // that's not "an unexpected error", it's a session expiry. Send them back to login
        // instead of leaving a confusing generic error on screen.
        if (error?.status === 401 && !handlingSessionExpiry && !router.url.startsWith('/login')) {
          handlingSessionExpiry = true;
          auth.handleSessionExpired();
          snackBar.open('Your session has expired. Please sign in again.', 'Close', { duration: 6000 });
          router.navigateByUrl('/login').finally(() => { handlingSessionExpiry = false; });
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
