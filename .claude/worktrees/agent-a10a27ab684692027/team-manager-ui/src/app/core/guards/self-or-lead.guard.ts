import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../auth/auth.service';

export const selfOrLeadGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);

  const memberId = route.paramMap.get('id');
  if (!memberId) return true;

  return auth.me$.pipe(
    filter(me => me !== null),
    take(1),
    map(me => {
      if (me!.id === memberId || me!.role === 'TeamLead' || me!.role === 'TechLead') return true;
      snackBar.open('You can only view your own profile.', 'Close', { duration: 4000 });
      return router.createUrlTree(['/team/members']);
    }),
  );
};
