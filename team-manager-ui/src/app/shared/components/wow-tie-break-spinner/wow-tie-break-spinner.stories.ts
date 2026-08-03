import type { Meta, StoryObj } from '@storybook/angular-vite';
import { WowTieBreakSpinnerComponent } from './wow-tie-break-spinner.component';

const meta: Meta<WowTieBreakSpinnerComponent> = {
  title: 'Shared/WowTieBreakSpinner',
  component: WowTieBreakSpinnerComponent,
  tags: ['autodocs'],
  args: {
    show: true,
    name: 'Alice Johnson',
  },
};
export default meta;

type Story = StoryObj<WowTieBreakSpinnerComponent>;

export const Default: Story = {};

export const Hidden: Story = {
  args: { show: false },
};
