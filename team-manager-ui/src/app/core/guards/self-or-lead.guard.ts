import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../auth/auth.service';

export const selfOrLeadGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);

  // 'memberId' is used where a route also carries a second id (e.g. /team/:memberId/personal-maps/:mapId).
  const memberId = route.paramMap.get('id') ?? route.paramMap.get('memberId');
  if (!memberId) return true;

  return auth.me$.pipe(
    filter(me => me !== null),
    take(1),
    map(() => {
      if (auth.isSelfOrLead(memberId)) return true;
      snackBar.open('You can only view your own profile.', 'Close', { duration: 4000 });
      return router.createUrlTree(['/team/members']);
    }),
  );
};
