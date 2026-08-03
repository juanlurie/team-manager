import type { Meta, StoryObj } from '@storybook/angular-vite';
import { AppLoadingComponent } from './app-loading.component';

const meta: Meta<AppLoadingComponent> = {
  title: 'Shared/AppLoading',
  component: AppLoadingComponent,
  tags: ['autodocs'],
  args: {
    spinner: false,
  },
};
export default meta;

type Story = StoryObj<AppLoadingComponent>;

export const TextOnly: Story = {};

export const Spinner: Story = {
  args: { spinner: true },
};
