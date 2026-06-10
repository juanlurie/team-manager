import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  return next(req).pipe(
    catchError(error => {
      const isOAuthEndpoint = req.url.includes('accounts.google.com') || req.url.includes('googleapis.com') || req.url.includes('openidconnect');
      if (!req.context.get(SKIP_ERROR_TOAST) && !isOAuthEndpoint) {
        if (error?.status === 403 && error?.error?.error === 'feature_disabled') {
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
