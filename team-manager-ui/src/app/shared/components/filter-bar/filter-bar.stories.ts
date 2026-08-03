import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { of } from 'rxjs';
import { FilterBarComponent, FilterGroup } from './filter-bar.component';
import { TeamMemberService } from '../../../core/services/team-member.service';

const groups: FilterGroup[] = [
  {
    key: 'squad', label: 'Squad', icon: 'group', options: [
      { id: 's1', label: 'Payments Squad' },
      { id: 's2', label: 'Platform Squad' },
    ]
  },
  {
    key: 'status', label: 'Status', icon: 'flag', options: [
      { id: 'InProgress', label: 'In Progress' },
      { id: 'Completed', label: 'Completed' },
    ]
  },
];

// TeamMemberService is only used here for @-mention candidates; stub avoids a real HTTP call
// on init since Storybook has no backend to talk to.
const teamMemberServiceStub = {
  getAll: () => of([
    { id: 'm1', firstName: 'Alice', lastName: 'Johnson' },
    { id: 'm2', firstName: 'Bob', lastName: 'Smith' },
  ]),
};

const meta: Meta<FilterBarComponent> = {
  title: 'Shared/FilterBar',
  component: FilterBarComponent,
  tags: ['autodocs'],
  decorators: [moduleMetadata({
    providers: [{ provide: TeamMemberService, useValue: teamMemberServiceStub }],
  })],
  args: {
    groups,
    searchPlaceholder: 'Search…',
    mentionHint: 'Type @ to mention a team member',
    searchVal: '',
    selectedValues: {},
    searchChange: fn(),
    apply: fn(),
  },
};
export default meta;

type Story = StoryObj<FilterBarComponent>;

export const Default: Story = {};

export const WithSelections: Story = {
  args: {
    selectedValues: { squad: ['s1'], status: ['InProgress', 'Completed'] },
  },
};

export const NoGroups: Story = {
  args: { groups: [] },
};
