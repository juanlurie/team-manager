import { Routes } from '@angular/router';

export const DISCUSSION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./discussion-points.component').then(m => m.DiscussionPointsComponent)
  }
];
