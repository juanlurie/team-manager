import type { Meta, StoryObj } from '@storybook/angular-vite';
import { TaskListComponent, TaskItem } from './task-list.component';

const tasks: TaskItem[] = [
  { id: '1', title: 'Implement login flow', type: 'Dev', status: 'InProgress', externalTicketRef: 'ENG-101', assignee: 'Alice Johnson' },
  { id: '2', title: 'Design review', type: 'Design', status: 'Completed', externalTicketRef: 'ENG-100', assignee: 'Bob Smith' },
  { id: '3', title: 'Fix flaky test', type: 'Bug', status: 'Planned', externalTicketRef: null, assignee: 'Carol Davis' },
  { id: '4', title: 'Release notes', type: 'Release', status: 'ReadyForRelease', externalTicketRef: 'ENG-98', assignee: 'Dan Lee' },
];

const meta: Meta<TaskListComponent> = {
  title: 'Shared/TaskList',
  component: TaskListComponent,
  tags: ['autodocs'],
  args: {
    tasks,
    showAssignee: true,
    emptyMessage: 'No tasks linked to this feature',
  },
};
export default meta;

type Story = StoryObj<TaskListComponent>;

export const Default: Story = {};

export const NoAssigneeColumn: Story = {
  args: { showAssignee: false },
};

export const Empty: Story = {
  args: { tasks: [] },
};
