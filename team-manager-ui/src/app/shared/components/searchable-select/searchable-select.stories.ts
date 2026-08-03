import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { SearchableSelectComponent } from './searchable-select.component';

const options = [
  { id: '1', name: 'Payments Squad' },
  { id: '2', name: 'Platform Squad' },
  { id: '3', name: 'Growth Squad' },
];

const meta: Meta<SearchableSelectComponent> = {
  title: 'Shared/SearchableSelect',
  component: SearchableSelectComponent,
  tags: ['autodocs'],
  argTypes: {
    appearance: { control: 'select', options: ['outline', 'fill'] },
  },
  args: {
    options,
    label: 'Squad',
    placeholder: 'Search squads…',
    width: '240px',
    appearance: 'outline',
    nullable: true,
    nullableLabel: 'All',
    disabled: false,
    loading: false,
    valueChange: fn(),
  },
};
export default meta;

type Story = StoryObj<SearchableSelectComponent>;

export const Default: Story = {};

export const Loading: Story = {
  args: { loading: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const NotNullable: Story = {
  args: { nullable: false },
};
