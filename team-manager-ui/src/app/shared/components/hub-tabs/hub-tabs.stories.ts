import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { provideRouter } from '@angular/router';
import { HubTabsComponent, HubTab } from './hub-tabs.component';

const tabs: HubTab[] = [
  { label: 'Overview', route: '/pulse', exact: true },
  { label: 'Retro', route: '/pulse/retro' },
  { label: 'Win of the Week', route: '/pulse/wow' },
  { label: 'Quiz', route: '/pulse/quiz' },
];

const meta: Meta<HubTabsComponent> = {
  title: 'Shared/HubTabs',
  component: HubTabsComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ providers: [provideRouter([])] })],
  args: {
    tabs,
  },
};
export default meta;

type Story = StoryObj<HubTabsComponent>;

export const Default: Story = {};

export const ManyTabs: Story = {
  args: {
    tabs: Array.from({ length: 10 }, (_, i) => ({ label: `Tab ${i + 1}`, route: `/pulse/tab-${i + 1}` })),
  },
};
