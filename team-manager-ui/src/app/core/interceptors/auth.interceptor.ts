import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const oauth = inject(OAuthService);
  const router = inject(Router);
  const token = oauth.getIdToken();
  if (!token) return next(req);
  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  })).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 403) {
        // Not a team member — clear tokens and redirect to not-registered page
        localStorage.clear();
        sessionStorage.clear();
        router.navigate(['/not-registered']);
      }
      return throwError(() => err);
    })
  );
};
