import type { Meta, StoryObj } from '@storybook/angular-vite';
import { AiBadgeComponent } from './ai-badge.component';

const meta: Meta<AiBadgeComponent> = {
  title: 'Shared/AiBadge',
  component: AiBadgeComponent,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<AiBadgeComponent>;

export const Default: Story = {
  render: () => ({
    template: `<span style="color:#fff">Generated summary<app-ai-badge /></span>`,
  }),
};
