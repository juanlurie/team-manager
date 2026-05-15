import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Wait for auth initialisation to finish before deciding.
  // This keeps the URL (including ?code=…) intact while tryLogin()
  // exchanges the OAuth authorisation code for tokens.
  return auth.isDone$.pipe(
    filter(Boolean),
    take(1),
    map(() => auth.hasValidToken() || router.createUrlTree(['/login'])),
  );
};
