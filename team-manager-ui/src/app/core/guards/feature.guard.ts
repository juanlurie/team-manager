import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { FeatureAccessService } from '../services/feature-access.service';
import { MatSnackBar } from '@angular/material/snack-bar';

const routeFeatureMap: Record<string, string> = {
  'dashboard': 'dashboard',
  'sprints': 'sprints',
  'features': 'features',
  'progress': 'progress',
  'discussion': 'discussion',
  'meetings': 'meetings',
  'fun': 'fun-hub',
  'team': 'team',
  'timesheet': 'team',
  'leave': 'leave',
  'export': 'export',
  'settings': 'settings',
  'access-requests': 'access-requests',
  'sync-queue': 'settings',
  'request-configs': 'settings',
  'pis': 'features',
  'milestones': 'features',
  'showcase': 'showcase',
  'session-types': 'meetings',
  'expense-claim': 'expense-claim',
  'api-keys': 'api-keys',
  'win-of-the-month': 'win-of-month',
  'jokes': 'jokes',
};

export const featureGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const featureAccess = inject(FeatureAccessService);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);

  const segment = route.url[0]?.path ?? '';
  const featureKey = route.data?.['featureKey'] ?? routeFeatureMap[segment];

  if (!featureKey) return true;

  if (featureAccess.hasAccess(featureKey)) return true;

  snackBar.open('This feature is not available for your account.', 'Close', { duration: 4000 });
  router.navigate(['/dashboard']);
  return false;
};
