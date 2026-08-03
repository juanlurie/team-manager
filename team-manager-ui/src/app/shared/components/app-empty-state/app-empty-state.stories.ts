import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { AppEmptyStateComponent } from './app-empty-state.component';

const meta: Meta<AppEmptyStateComponent> = {
  title: 'Shared/AppEmptyState',
  component: AppEmptyStateComponent,
  tags: ['autodocs'],
  args: {
    icon: 'inbox',
    title: 'No items found',
    subtitle: '',
    actionLabel: '',
    actionClick: fn(),
  },
};
export default meta;

type Story = StoryObj<AppEmptyStateComponent>;

export const Default: Story = {};

export const WithSubtitle: Story = {
  args: { subtitle: 'Try adjusting your filters to see more results.' },
};

export const WithAction: Story = {
  args: {
    subtitle: 'Get started by creating your first task.',
    actionLabel: 'Create task',
  },
};
