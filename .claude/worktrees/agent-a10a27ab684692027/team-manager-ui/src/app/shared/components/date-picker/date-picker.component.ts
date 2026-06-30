import { Component, Input, forwardRef, ChangeDetectionStrategy } from '@angular/core';

import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule, DateFilterFn } from '@angular/material/datepicker';

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true,
    },
  ],
  template: `
    <mat-form-field [appearance]="appearance" [class]="fieldClass" [style.width]="width">
      @if (label) {
        <mat-label>{{ label }}</mat-label>
      }
      <input matInput [matDatepicker]="picker" [placeholder]="placeholder" [min]="min" [max]="max"
             [matDatepickerFilter]="dateFilter" [(ngModel)]="value"
             [disabled]="disabled" (dateChange)="onTouched()">
      <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
      <mat-datepicker #picker (closed)="onTouched()"></mat-datepicker>
    </mat-form-field>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    :host { display: block; }
  `],
})
export class DatePickerComponent implements ControlValueAccessor {
  @Input() label = '';
  @Input() placeholder = 'Select date';
  @Input() min: Date | null = null;
  @Input() max: Date | null = null;
  @Input() dateFilter: DateFilterFn<Date | null> = () => true;
  @Input() appearance: 'outline' | 'fill' = 'outline';
  @Input() fieldClass = '';
  @Input() width = '100%';

  value: Date | null = null;
  disabled = false;

  private _onChange: (value: Date | null) => void = () => {};
  onTouched = () => {};

  writeValue(date: Date | string | null): void {
    if (date instanceof Date) {
      this.value = date;
    } else if (typeof date === 'string' && date) {
      this.value = new Date(date + 'T00:00:00');
    } else {
      this.value = null;
    }
  }

  registerOnChange(fn: (value: Date | null) => void): void {
    this._onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onDateSelected(date: Date | null): void {
    this.value = date;
    this._onChange(date);
  }
}
