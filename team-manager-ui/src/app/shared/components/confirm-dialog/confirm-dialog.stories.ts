import type { Meta, StoryObj } from '@storybook/angular-vite';
import { moduleMetadata } from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

function withData(data: ConfirmDialogData) {
  return moduleMetadata({
    providers: [
      { provide: MatDialogRef, useValue: { close: fn() } },
      { provide: MAT_DIALOG_DATA, useValue: data },
    ],
  });
}

const meta: Meta<ConfirmDialogComponent> = {
  title: 'Shared/ConfirmDialog',
  component: ConfirmDialogComponent,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<ConfirmDialogComponent>;

export const Default: Story = {
  decorators: [withData({
    title: 'Delete this item?',
    message: 'This action cannot be undone.',
  })],
};

export const CustomLabel: Story = {
  decorators: [withData({
    title: 'Remove team member?',
    message: 'They will lose access to this workspace immediately.',
    confirmLabel: 'Remove',
  })],
};

export const NonDestructive: Story = {
  decorators: [withData({
    title: 'Archive sprint?',
    message: 'You can restore it later from the archive.',
    confirmLabel: 'Archive',
    danger: false,
  })],
};
