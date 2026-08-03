import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { WowLimitsControlComponent } from './wow-limits-control.component';

const meta: Meta<WowLimitsControlComponent> = {
  title: 'Shared/WowLimitsControl',
  component: WowLimitsControlComponent,
  tags: ['autodocs'],
  args: {
    maxNominations: 3,
    maxVotes: 3,
    min: 1,
    max: 20,
    disabled: false,
    limitsChange: fn(),
  },
};
export default meta;

type Story = StoryObj<WowLimitsControlComponent>;

export const Default: Story = {};

export const AtMinimum: Story = {
  args: { maxNominations: 1, maxVotes: 1 },
};

export const AtMaximum: Story = {
  args: { maxNominations: 20, maxVotes: 20 },
};

export const Disabled: Story = {
  args: { disabled: true },
};
