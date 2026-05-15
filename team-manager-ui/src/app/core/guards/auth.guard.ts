import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Wait for auth initialisation + membership verification to finish
  return auth.isAuthorized$.pipe(
    filter(val => val !== null && auth.isDone$),
    take(1),
    map(isAuthorized => {
      if (isAuthorized) return true;
      return router.createUrlTree(['/not-registered']);
    }),
  );
};
