import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { RevealProgressBarComponent } from './reveal-progress-bar.component';

const meta: Meta<RevealProgressBarComponent> = {
  title: 'Shared/RevealProgressBar',
  component: RevealProgressBarComponent,
  tags: ['autodocs'],
  args: {
    endsAt: new Date(Date.now() + 8000).toISOString(),
    drained: fn(),
  },
};
export default meta;

type Story = StoryObj<RevealProgressBarComponent>;

export const Default: Story = {};

export const Idle: Story = {
  args: { endsAt: null },
};
