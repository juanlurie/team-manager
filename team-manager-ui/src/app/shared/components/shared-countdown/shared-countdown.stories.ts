import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { SharedCountdownComponent } from './shared-countdown.component';

const meta: Meta<SharedCountdownComponent> = {
  title: 'Shared/SharedCountdown',
  component: SharedCountdownComponent,
  tags: ['autodocs'],
  args: {
    endsAt: new Date(Date.now() + 60_000).toISOString(),
    serverNow: null,
    warnAtSec: 30,
    urgentAtSec: 10,
    expired: fn(),
  },
};
export default meta;

type Story = StoryObj<SharedCountdownComponent>;

export const Default: Story = {};

export const Warning: Story = {
  args: { endsAt: new Date(Date.now() + 20_000).toISOString() },
};

export const Urgent: Story = {
  args: { endsAt: new Date(Date.now() + 8_000).toISOString() },
};

export const Idle: Story = {
  args: { endsAt: null },
};
