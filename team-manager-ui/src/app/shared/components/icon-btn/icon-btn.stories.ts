import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { IconButtonComponent } from './icon-btn.component';

const meta: Meta<IconButtonComponent> = {
  title: 'Shared/IconButton',
  component: IconButtonComponent,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    color: { control: 'select', options: [null, 'primary', 'accent', 'warn'] },
  },
  args: {
    icon: 'edit',
    tooltip: 'Edit',
    disabled: false,
    danger: false,
    size: 'md',
    btnClick: fn(),
  },
};
export default meta;

type Story = StoryObj<IconButtonComponent>;

export const Default: Story = {};

export const Danger: Story = {
  args: { icon: 'delete', tooltip: 'Delete', danger: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Sizes: Story = {
  render: (args) => ({
    props: args,
    template: `
      <div style="display:flex;gap:12px;align-items:center">
        <app-icon-btn icon="edit" size="sm" tooltip="Small" />
        <app-icon-btn icon="edit" size="md" tooltip="Medium" />
        <app-icon-btn icon="edit" size="lg" tooltip="Large" />
      </div>
    `,
  }),
};
