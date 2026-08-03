import type { Meta, StoryObj } from '@storybook/angular-vite';
import { DatePickerComponent } from './date-picker.component';

const meta: Meta<DatePickerComponent> = {
  title: 'Shared/DatePicker',
  component: DatePickerComponent,
  tags: ['autodocs'],
  argTypes: {
    appearance: { control: 'select', options: ['outline', 'fill'] },
  },
  args: {
    label: 'Start date',
    placeholder: 'Select date',
    appearance: 'outline',
    width: '260px',
  },
};
export default meta;

type Story = StoryObj<DatePickerComponent>;

export const Default: Story = {};

export const NoLabel: Story = {
  args: { label: '' },
};

export const WithMinMax: Story = {
  args: {
    label: 'Sprint end date',
    min: new Date('2026-08-01'),
    max: new Date('2026-08-31'),
  },
};
