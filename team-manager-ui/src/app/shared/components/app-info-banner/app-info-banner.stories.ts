import type { Meta, StoryObj } from '@storybook/angular-vite';
import { AppInfoBannerComponent } from './app-info-banner.component';

const meta: Meta<AppInfoBannerComponent> = {
  title: 'Shared/AppInfoBanner',
  component: AppInfoBannerComponent,
  tags: ['autodocs'],
  argTypes: {
    type: { control: 'select', options: ['info', 'warning', 'success', 'error'] },
  },
  args: {
    type: 'info',
  },
  render: (args) => ({
    props: args,
    template: `<app-info-banner [type]="type">This is an informational message shown to the user.</app-info-banner>`,
  }),
};
export default meta;

type Story = StoryObj<AppInfoBannerComponent>;

export const Info: Story = {};

export const Warning: Story = {
  args: { type: 'warning' },
};

export const Success: Story = {
  args: { type: 'success' },
};

export const Error: Story = {
  args: { type: 'error' },
};
