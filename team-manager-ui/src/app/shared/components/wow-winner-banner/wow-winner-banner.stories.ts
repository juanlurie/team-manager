import type { Meta, StoryObj } from '@storybook/angular-vite';
import { WowWinnerBannerComponent } from './wow-winner-banner.component';

const meta: Meta<WowWinnerBannerComponent> = {
  title: 'Shared/WowWinnerBanner',
  component: WowWinnerBannerComponent,
  tags: ['autodocs'],
  args: {
    winnerNomineeName: 'Alice Johnson',
    winnerTitle: 'Shipped the new onboarding flow ahead of schedule',
    winnerStory: null,
    showPoints: true,
    runnersUp: [
      { name: 'Bob Smith', voteCount: 5 },
      { name: 'Carol Davis', voteCount: 3 },
    ],
    storyPending: false,
  },
};
export default meta;

type Story = StoryObj<WowWinnerBannerComponent>;

export const Default: Story = {};

export const WithHeroStory: Story = {
  args: {
    winnerStory: 'In a week full of tight deadlines, Alice quietly rebuilt the onboarding flow from scratch, cutting drop-off in half and leaving the whole team a smoother path forward.',
  },
};

export const StoryBrewing: Story = {
  args: { storyPending: true },
};

export const NoRunnersUp: Story = {
  args: { runnersUp: [] },
};
