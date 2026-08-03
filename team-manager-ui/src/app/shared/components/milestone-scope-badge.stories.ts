import type { Meta, StoryObj } from '@storybook/angular-vite';
import { MilestoneScopeBadgeComponent } from './milestone-scope-badge.component';

const meta: Meta<MilestoneScopeBadgeComponent> = {
  title: 'Shared/MilestoneScopeBadge',
  component: MilestoneScopeBadgeComponent,
  tags: ['autodocs'],
  args: {
    scope: 'Global',
    squadName: null,
    squadColor: null,
  },
};
export default meta;

type Story = StoryObj<MilestoneScopeBadgeComponent>;

export const Global: Story = {};

export const Squad: Story = {
  args: {
    scope: 'Squad',
    squadName: 'Payments',
    squadColor: '#64b5f6',
  },
};

export const SquadUnnamed: Story = {
  args: {
    scope: 'Squad',
    squadName: null,
    squadColor: null,
  },
};
