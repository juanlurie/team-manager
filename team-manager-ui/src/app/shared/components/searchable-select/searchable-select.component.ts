import { Component, OnInit, computed, input, output, signal, forwardRef, ChangeDetectorRef, OnDestroy, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [FormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule, MatIconModule, MatProgressSpinnerModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SearchableSelectComponent),
    multi: true
  }],
  template: `
    <mat-form-field [appearance]="appearance()" style="margin:0" [style.width]="width()" subscriptSizing="dynamic">
      @if (label()) {
        <mat-label>{{ label() }}</mat-label>
      }
      <input matInput type="text"
             [ngModel]="displayText()"
             [matAutocomplete]="auto"
             [placeholder]="placeholder()"
             [disabled]="disabled()"
             (ngModelChange)="onSearchInput($event)"
             (blur)="onBlur()">
      @if (loading()) {
        <mat-spinner matSuffix diameter="18" style="margin-right:8px"></mat-spinner>
      }
      @if (displayText() && !disabled()) {
        <button matSuffix type="button" class="clear-btn"
                (click)="clear($event)"
                (mousedown)="$event.preventDefault()">
          <mat-icon>close</mat-icon>
        </button>
      }
      <mat-autocomplete #auto="matAutocomplete"
                        (optionSelected)="onSelect($event)">
        @if (nullable()) {
          <mat-option [value]="nullValue()">{{ nullableLabel() }}</mat-option>
        }
        @for (opt of filtered(); track trackBy()(opt)) {
          <mat-option [value]="opt">{{ displayFn()(opt) }}</mat-option>
        }
        @if (filtered().length === 0 && searchInput()) {
          <mat-option disabled>No matches</mat-option>
        }
      </mat-autocomplete>
    </mat-form-field>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .clear-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      margin: 0 4px;
      background: transparent;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      color: rgba(255,255,255,0.4);
      transition: color 0.15s, background 0.15s;
    }
    .clear-btn:hover {
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.9);
    }
    .clear-btn mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      line-height: 16px;
    }
  `]
})
export class SearchableSelectComponent implements ControlValueAccessor, OnInit, OnDestroy {
  // Inputs
  options = input<any[]>([]);
  label = input('');
  placeholder = input('');
  width = input('170px');
  appearance = input<'outline' | 'fill'>('outline');
  nullable = input(true);
  nullableLabel = input('All');
  nullValue = input('');
  disabled = input(false);
  loading = input(false);

  // Functions for custom value extraction and display
  valueFn = input<(o: any) => any>((o: any) => o?.id ?? o);
  displayFn = input<(o: any) => string>((o: any) => {
    if (!o) return '';
    if (typeof o === 'string') return o;
    if (o.name != null) return String(o.name);
    if (o.firstName != null && o.lastName != null) return `${o.firstName} ${o.lastName}`;
    if (o.fullName != null) return String(o.fullName);
    return String(o);
  });
  trackBy = input<(o: any) => any>((o: any) => o?.id ?? o);
  searchFields = input<(o: any) => string[]>(() => ['name']);

  // Outputs
  valueChange = output<any>();

  // Internal state
  selectedValue = signal<any>(null);
  searchInput = signal('');
  displayText = signal('');
  disabledSig = signal(false);

  // ControlValueAccessor callbacks
  private onChange: ((v: any) => void) = () => {};
  private onTouched: () => void = () => {};

  filtered = computed(() => {
    const q = this.searchInput().trim().toLowerCase();
    const all = this.options();
    const displayFn = this.displayFn();
    if (!q) return all;
    return all.filter(o => displayFn(o).toLowerCase().includes(q));
  });

  ngOnInit() {
    this.disabledSig.set(this.disabled());
  }

  ngOnDestroy() {}

  // ── ControlValueAccessor ──

  writeValue(value: any): void {
    this.selectedValue.set(value);
    this.updateDisplay();
  }

  registerOnChange(fn: (v: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledSig.set(isDisabled);
  }

  // ── Events ──

  onSearchInput(val: string): void {
    this.searchInput.set(val);
    if (!val) {
      // If user clears input, reset selection
      this.selectedValue.set(this.nullValue());
      this.displayText.set('');
      this.onChange(this.nullValue());
      this.valueChange.emit(this.nullValue());
    }
  }

  onSelect(event: MatAutocompleteSelectedEvent): void {
    const opt = event.option.value;
    const extracted = this.valueFn()(opt);
    this.selectedValue.set(extracted);
    this.searchInput.set('');
    this.updateDisplay();
    this.onChange(extracted);
    this.valueChange.emit(extracted);
  }

  onBlur(): void {
    this.onTouched();
    // Restore display if selection exists
    this.updateDisplay();
    this.searchInput.set('');
  }

  clear(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.selectedValue.set(this.nullValue());
    this.searchInput.set('');
    this.displayText.set('');
    this.onChange(this.nullValue());
    this.valueChange.emit(this.nullValue());
  }

  private updateDisplay(): void {
    const val = this.selectedValue();
    const displayFn = this.displayFn();
    if (val === null || val === undefined || val === this.nullValue()) {
      this.displayText.set('');
    } else {
      // Try to find the option to get its display
      const opts = this.options();
      const valueFn = this.valueFn();
      const found = opts.find(o => valueFn(o) === val);
      this.displayText.set(found ? displayFn(found) : String(val));
    }
  }
}
