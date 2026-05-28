import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, EMPTY, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const oauth = inject(OAuthService);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);
  const token = oauth.getIdToken();
  if (!token) return next(req);
  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  })).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 403) {
        if (err.error?.error === 'feature_disabled') {
          snackBar.open('This feature is not available for your account.', 'Close', { duration: 4000 });
          return EMPTY;
        }
        if (req.url.includes('/api/auth/me')) {
          localStorage.clear();
          sessionStorage.clear();
          router.navigate(['/not-registered']);
          return EMPTY;
        }
      }
      return throwError(() => err);
    })
  );
};
