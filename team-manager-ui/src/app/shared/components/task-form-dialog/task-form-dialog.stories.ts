import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { provideHttpClient } from '@angular/common/http';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TaskFormDialogComponent, TaskFormData } from './task-form-dialog.component';
import { Feature } from '../../../core/models/feature.model';
import { Milestone } from '../../../core/models/milestone.model';
import { WorkItem } from '../../../core/models/work-item.model';

const features: Feature[] = [
  { id: 'f1', sprintId: 's1', title: 'User authentication flow', description: null, externalTicketRef: 'ENG-101', status: 'InProgress', isActive: true, estimatedDays: 5, isUnplanned: false, startDate: null },
  { id: 'f2', sprintId: 's1', title: 'Reporting dashboard', description: null, externalTicketRef: 'ENG-102', status: 'Planned', isActive: true, estimatedDays: 3, isUnplanned: false, startDate: null },
];

const milestones: Milestone[] = [];

// TaskFormDialogComponent injects HttpClient/WorkItemService/FeatureService/MilestoneService
// directly. Passing milestones (already loaded) and omitting sprintId/piId keeps ngOnInit from
// firing any real HTTP call, so a plain provideHttpClient() is enough without deeper mocking.
function withData(data: TaskFormData) {
  return moduleMetadata({
    providers: [
      provideHttpClient(),
      { provide: MatDialogRef, useValue: { close: fn() } },
      { provide: MAT_DIALOG_DATA, useValue: data },
    ],
  });
}

const meta: Meta<TaskFormDialogComponent> = {
  title: 'Shared/TaskFormDialog',
  component: TaskFormDialogComponent,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<TaskFormDialogComponent>;

export const AddTask: Story = {
  decorators: [withData({ featureId: null, sprintId: null, features, milestones })],
};

const workItem: WorkItem = {
  id: 'w1',
  title: 'Implement login flow',
  description: null,
  type: 'Dev',
  status: 'InProgress',
  sprintMemberId: 'sm1',
  featureId: 'f1',
  featureTitle: 'User authentication flow',
  milestoneId: null,
  milestoneTitle: null,
  externalTicketRef: 'ENG-101',
  estimatedPoints: 5,
  actualPoints: null,
  completedDate: null,
  blockedAt: null,
  blockedReason: null,
  commentCount: 0,
};

export const EditTask: Story = {
  decorators: [withData({ featureId: 'f1', sprintId: null, workItem, features, milestones })],
};
