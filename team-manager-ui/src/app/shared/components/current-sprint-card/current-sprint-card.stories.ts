import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { provideRouter } from '@angular/router';
import { CurrentSprintCardComponent } from './current-sprint-card.component';
import { Sprint } from '../../../core/models/sprint.model';
import { Feature } from '../../../core/models/feature.model';

const sprint: Sprint = {
  id: 's1',
  name: 'Sprint 24',
  startDate: '2026-08-03',
  endDate: '2026-08-17',
  piId: 'pi1',
  piName: 'PI 2026.3',
  sprintNumber: 24,
  isInnovationSprint: false,
  isActive: true,
  goal: null,
  retroWentWell: null,
  retroDidntGoWell: null,
  retroActionItems: null,
  retroPhase: null,
  retroTimerJson: null,
};

const features: Feature[] = [
  { id: 'f1', sprintId: 's1', title: 'User authentication flow', description: null, externalTicketRef: 'ENG-101', status: 'InProgress', isActive: true, estimatedDays: 5, isUnplanned: false, startDate: null },
  { id: 'f2', sprintId: 's1', title: 'Reporting dashboard', description: null, externalTicketRef: 'ENG-102', status: 'Planned', isActive: true, estimatedDays: 3, isUnplanned: false, startDate: null },
  { id: 'f3', sprintId: 's1', title: 'Notification cleanup', description: null, externalTicketRef: null, status: 'Completed', isActive: true, estimatedDays: 1, isUnplanned: true, startDate: null },
];

const meta: Meta<CurrentSprintCardComponent> = {
  title: 'Shared/CurrentSprintCard',
  component: CurrentSprintCardComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ providers: [provideRouter([])] })],
  args: {
    sprint,
    features,
    showEditButton: true,
    edit: fn(),
  },
};
export default meta;

type Story = StoryObj<CurrentSprintCardComponent>;

export const Default: Story = {};

export const InnovationSprint: Story = {
  args: { sprint: { ...sprint, isInnovationSprint: true } },
};

export const NoGoals: Story = {
  args: { features: [] },
};

export const NoEditButton: Story = {
  args: { showEditButton: false },
};
