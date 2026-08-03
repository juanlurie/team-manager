import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { SquadFilterComponent } from './squad-filter.component';
import { SquadSummary } from '../../../core/models/squad.model';

const squads: SquadSummary[] = [
  { id: '1', name: 'Payments Squad', color: '#64b5f6' },
  { id: '2', name: 'Platform Squad', color: '#81c784' },
  { id: '3', name: 'Growth Squad', color: '#ffb74d' },
];

const meta: Meta<SquadFilterComponent> = {
  title: 'Shared/SquadFilter',
  component: SquadFilterComponent,
  tags: ['autodocs'],
  args: {
    squads,
    value: '',
    placeholder: 'Search squads…',
    valueChange: fn(),
  },
};
export default meta;

type Story = StoryObj<SquadFilterComponent>;

export const Default: Story = {};

export const Preselected: Story = {
  args: { value: '2' },
};

export const NoSquads: Story = {
  args: { squads: [] },
};
