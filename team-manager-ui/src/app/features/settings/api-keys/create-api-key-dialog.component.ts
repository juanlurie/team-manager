import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiKeyService } from '../../../core/services/api-key.service';
import { CreatedApiKeyResult } from '../../../core/models/api-key.model';

@Component({
  selector: 'app-create-api-key-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <h2 mat-dialog-title>Create API Key</h2>
    <mat-dialog-content>
      <form [formGroup]="form" style="display:flex;flex-direction:column;gap:12px;padding-top:8px">
        <mat-form-field appearance="outline">
          <mat-label>Key name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. MCP Server" (keydown.enter)="submit()" autofocus>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="submit()" [disabled]="form.invalid || creating()">
        @if (creating()) {
          <mat-spinner diameter="16"></mat-spinner>
        } @else {
          Create
        }
      </button>
    </mat-dialog-actions>
  `
})
export class CreateApiKeyDialogComponent {
  private fb = inject(FormBuilder);
  private apiKeySvc = inject(ApiKeyService);
  private dialogRef = inject(MatDialogRef<CreateApiKeyDialogComponent, CreatedApiKeyResult>);

  creating = signal(false);

  form = this.fb.group({
    name: ['', Validators.required],
  });

  submit() {
    if (this.form.invalid || this.creating()) return;

    this.creating.set(true);
    this.apiKeySvc.create({ name: this.form.value.name! }).subscribe({
      next: (result) => this.dialogRef.close(result),
      error: () => this.creating.set(false),
    });
  }
}
