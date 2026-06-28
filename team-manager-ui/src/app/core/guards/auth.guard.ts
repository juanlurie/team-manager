import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.authStatus$.pipe(
    filter(status => status !== 'checking'),
    take(1),
    map(status => {
      if (status === 'authorized') return true;
      if (status === 'unauthorized') return router.createUrlTree(['/not-registered']);
      return router.createUrlTree(['/login']);
    }),
  );
};
