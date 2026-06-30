import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const oauth = inject(OAuthService);
  const token = oauth.getIdToken();
  if (!token) return next(req);
  return next(req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  }));
};
