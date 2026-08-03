import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { WowNominationCardComponent } from './wow-nomination-card.component';
import { WowNominationDisplay } from '../../../core/models/win-week.model';

const nomination: WowNominationDisplay = {
  id: 'n1',
  nomineeMemberId: 'm1',
  nomineeName: 'Alice Johnson',
  nomineeAvatarSeed: null,
  nominatorName: 'Bob Smith',
  title: 'Fixed the flaky deploy pipeline',
  description: 'Spent the week digging into intermittent CI failures and landed a fix that unblocked the whole team.',
  voteCount: 4,
  hasVoted: false,
  isOwned: false,
  powerUp: null,
  chaosCard: null,
  hypeMeterCount: 0,
};

const meta: Meta<WowNominationCardComponent> = {
  title: 'Shared/WowNominationCard',
  component: WowNominationCardComponent,
  tags: ['autodocs'],
  argTypes: {
    weekStatus: { control: 'select', options: ['Nominating', 'Voting', 'SuddenDeath', 'Closed'] },
  },
  args: {
    nomination,
    weekStatus: 'Voting',
    canEdit: false,
    votesRemaining: 3,
    isTied: false,
    canApplyCards: false,
    isHost: false,
    hypeBattleActive: false,
    hypeBattleTotal: 0,
    hideVoteCounts: false,
    reactionBursts: [],
    voteClick: fn(),
    removeVoteClick: fn(),
    editClick: fn(),
    deleteClick: fn(),
    hypeClick: fn(),
    applyPowerUpClick: fn(),
    applyChaosCardClick: fn(),
    reactionClick: fn(),
  },
};
export default meta;

type Story = StoryObj<WowNominationCardComponent>;

export const Voting: Story = {};

export const Nominating: Story = {
  args: { weekStatus: 'Nominating', canEdit: true },
};

export const AlreadyVoted: Story = {
  args: { nomination: { ...nomination, hasVoted: true } },
};

export const Tied: Story = {
  args: { isTied: true },
};

export const SpotlightPowerUp: Story = {
  args: { nomination: { ...nomination, powerUp: 'Spotlight' } },
};

export const HypeBattle: Story = {
  args: {
    hypeBattleActive: true,
    hypeBattleTotal: 20,
    nomination: { ...nomination, hypeMeterCount: 8 },
  },
};
