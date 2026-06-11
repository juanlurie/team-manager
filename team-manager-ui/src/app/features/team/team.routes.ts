import { Routes } from '@angular/router';
import { TeamHubComponent } from './team-hub.component';

export const TEAM_ROUTES: Routes = [
  {
    path: '',
    component: TeamHubComponent,
    children: [
      { path: '', redirectTo: 'members', pathMatch: 'full' },
      {
        path: 'members',
        loadComponent: () => import('./team-list/team-list.component').then(m => m.TeamListComponent)
      },
      {
        path: 'timesheet',
        loadComponent: () => import('../timesheet/timesheet-page.component').then(m => m.TimesheetPageComponent),
        data: { featureKey: 'team' }
      },
      {
        path: 'leave',
        loadChildren: () => import('../leave/leave.routes').then(m => m.LEAVE_ROUTES)
      },
      {
        path: 'expense-claim',
        loadComponent: () => import('../expense-claim/expense-claim.component').then(m => m.ExpenseClaimComponent),
        data: { featureKey: 'expense-claim' }
      },
      {
        path: 'access-requests',
        loadComponent: () => import('../access-requests/access-requests.component').then(m => m.AccessRequestsComponent),
        data: { featureKey: 'access-requests' }
      },
    ]
  },
  {
    path: ':id',
    loadComponent: () => import('./team-member-personal/team-member-personal.component').then(m => m.TeamMemberPersonalComponent)
  }
];
