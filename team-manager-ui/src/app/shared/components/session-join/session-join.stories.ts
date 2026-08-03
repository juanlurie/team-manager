import type { Meta, StoryObj } from '@storybook/angular-vite';
import { SessionJoinComponent } from './session-join.component';

const meta: Meta<SessionJoinComponent> = {
  title: 'Shared/SessionJoin',
  component: SessionJoinComponent,
  tags: ['autodocs'],
  args: {
    url: 'https://team-manager.app/wow/join/abc123token',
    code: 'crisp-gecko',
    size: 200,
  },
};
export default meta;

type Story = StoryObj<SessionJoinComponent>;

export const Default: Story = {};

export const NoFriendlyCode: Story = {
  args: { code: null },
};

export const Small: Story = {
  args: { size: 120 },
};
