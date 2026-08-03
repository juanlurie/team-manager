import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { WowDurationPickerComponent } from './wow-duration-picker.component';

const meta: Meta<WowDurationPickerComponent> = {
  title: 'Shared/WowDurationPicker',
  component: WowDurationPickerComponent,
  tags: ['autodocs'],
  args: {
    value: 90,
    max: 600,
    disabled: false,
    valueChange: fn(),
  },
};
export default meta;

type Story = StoryObj<WowDurationPickerComponent>;

export const Default: Story = {};

export const AtMinimum: Story = {
  args: { value: 15 },
};

export const AtMaximum: Story = {
  args: { value: 600, max: 600 },
};

export const Disabled: Story = {
  args: { disabled: true },
};
