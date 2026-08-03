import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { PendingApprovalsDialogComponent } from './pending-approvals-dialog.component';
import { AccessRequestsService, AccessRequest } from '../../../core/services/access-requests.service';

const requests: AccessRequest[] = [
  { id: 'r1', name: 'Alice Johnson', email: 'alice@example.com', googleSub: null, reason: 'Joining the Payments squad next sprint.', status: 'Pending', createdAt: new Date().toISOString() },
  { id: 'r2', name: 'Bob Smith', email: 'bob@example.com', googleSub: null, reason: '', status: 'Pending', createdAt: new Date().toISOString() },
];

// AccessRequestsService is HTTP-backed and fires listPending() on init; stub it so the story
// renders without a live backend rather than fighting a real HttpClient mock.
function withRequests(reqs: AccessRequest[]) {
  return moduleMetadata({
    providers: [
      { provide: MatDialogRef, useValue: { close: fn() } },
      {
        provide: AccessRequestsService,
        useValue: {
          pendingCount: signal(reqs.length),
          listPending: () => of(reqs),
          approve: () => of({}),
          deny: () => of({}),
        },
      },
    ],
  });
}

const meta: Meta<PendingApprovalsDialogComponent> = {
  title: 'Shared/PendingApprovalsDialog',
  component: PendingApprovalsDialogComponent,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<PendingApprovalsDialogComponent>;

export const Default: Story = {
  decorators: [withRequests(requests)],
};

export const Empty: Story = {
  decorators: [withRequests([])],
};
