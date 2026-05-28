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
  'leave': 'leave',
  'export': 'export',
  'settings': 'settings',
  'access-requests': 'access-requests',
  'pis': 'features',
  'milestones': 'features',
  'showcase': 'features',
  'session-types': 'meetings',
  'expense-claim': 'features',
};

export const featureGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const featureAccess = inject(FeatureAccessService);
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);

  const firstSegment = route.pathFromRoot
    .map(r => r.url.map(s => s.path).join('/'))
    .join('/')
    .split('/')[0];

  const featureKey = routeFeatureMap[firstSegment];

  if (!featureKey) return true;

  if (featureAccess.hasAccess(featureKey)) return true;

  snackBar.open('This feature is not available for your account.', 'Close', { duration: 4000 });
  router.navigate(['/dashboard']);
  return false;
};
