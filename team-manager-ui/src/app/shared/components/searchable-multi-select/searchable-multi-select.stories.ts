import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { SearchableMultiSelectComponent } from './searchable-multi-select.component';

const options = [
  { id: '1', name: 'Alice Johnson' },
  { id: '2', name: 'Bob Smith' },
  { id: '3', name: 'Carol Davis' },
  { id: '4', name: 'Dan Lee' },
];

const meta: Meta<SearchableMultiSelectComponent> = {
  title: 'Shared/SearchableMultiSelect',
  component: SearchableMultiSelectComponent,
  tags: ['autodocs'],
  argTypes: {
    appearance: { control: 'select', options: ['outline', 'fill'] },
  },
  args: {
    options,
    label: 'Assignees',
    placeholder: 'Search team members…',
    width: '320px',
    appearance: 'outline',
    disabled: false,
    loading: false,
    valueChange: fn(),
  },
};
export default meta;

type Story = StoryObj<SearchableMultiSelectComponent>;

export const Default: Story = {};

export const Loading: Story = {
  args: { loading: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const NoOptions: Story = {
  args: { options: [] },
};
