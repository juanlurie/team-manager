import { Routes } from '@angular/router';
import { PollComponent } from './poll.component';

export const POLL_ROUTES: Routes = [
  { path: '', component: PollComponent },
  { path: ':id', component: PollComponent }
];
