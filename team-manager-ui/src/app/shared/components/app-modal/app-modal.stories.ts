import type { Meta, StoryObj } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { AppModalComponent } from './app-modal.component';

const meta: Meta<AppModalComponent> = {
  title: 'Shared/AppModal',
  component: AppModalComponent,
  tags: ['autodocs'],
  args: {
    title: 'Confirm action',
    show: true,
    maxWidth: '440px',
    closed: fn(),
  },
  render: (args) => ({
    props: args,
    template: `
      <app-modal [title]="title" [show]="show" [maxWidth]="maxWidth" (closed)="closed()">
        <p style="opacity:0.75;margin:0">Are you sure you want to continue with this action?</p>
        <div modal-footer style="display:flex;gap:8px">
          <button style="padding:8px 14px">Cancel</button>
          <button style="padding:8px 14px;background:#64b5f6;color:#000;border:none;border-radius:6px">Confirm</button>
        </div>
      </app-modal>
    `,
  }),
};
export default meta;

type Story = StoryObj<AppModalComponent>;

export const Default: Story = {};

export const Hidden: Story = {
  args: { show: false },
};

export const Wide: Story = {
  args: { title: 'A wider modal', maxWidth: '640px' },
};
