import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { SearchInputComponent } from './search-input.component';

const meta: Meta<SearchInputComponent> = {
  title: 'Shared/SearchInput',
  component: SearchInputComponent,
  tags: ['autodocs'],
  argTypes: {
    appearance: { control: 'select', options: ['outline', 'fill'] },
  },
  args: {
    label: '',
    placeholder: 'Search…',
    mentionHint: '',
    width: '240px',
    appearance: 'outline',
    valueChange: fn(),
  },
};
export default meta;

type Story = StoryObj<SearchInputComponent>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: { label: 'Search tasks' },
};

export const WithMentionHint: Story = {
  args: { mentionHint: 'Type @ to mention a team member' },
};
