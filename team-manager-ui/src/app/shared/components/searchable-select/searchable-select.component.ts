import { Component, OnInit, computed, input, output, signal, forwardRef, ChangeDetectorRef, OnDestroy, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [FormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule, MatIconModule, MatProgressSpinnerModule, MatChipsModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SearchableSelectComponent),
    multi: true
  }],
  template: `
    @if (multiple() && selectedOptions().length > 0) {
      <mat-chip-set style="display:block;margin-bottom:8px">
        @for (opt of selectedOptions(); track trackBy()(opt)) {
          <mat-chip (removed)="removeOption(opt)" [removable]="!disabled()">
            {{ displayFn()(opt) }}
            @if (!disabled()) { <button matChipRemove type="button"><mat-icon>cancel</mat-icon></button> }
          </mat-chip>
        }
      </mat-chip-set>
    }
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
      @if (!multiple() && displayText() && !disabled()) {
        <button matSuffix type="button" class="clear-btn"
                (click)="clear($event)"
                (mousedown)="$event.preventDefault()">
          <mat-icon>close</mat-icon>
        </button>
      }
      <mat-autocomplete #auto="matAutocomplete"
                        [displayWith]="autocompleteDisplay"
                        (optionSelected)="onSelect($event)"
                        (closed)="onPanelClosed()">
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
  multiple = input(false);
  maxSelections = input<number | null>(null);

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

  // Material writes the selected option object directly into the input before optionSelected runs.
  // Multi-select renders selections as chips, so the text input must remain a search box rather
  // than briefly displaying the object's default "[object Object]" string representation.
  autocompleteDisplay = (option: any): string => {
    if (this.multiple() || option == null) return '';
    return this.displayFn()(option);
  };

  filtered = computed(() => {
    const q = this.searchInput().trim().toLowerCase();
    const all = this.options();
    const displayFn = this.displayFn();
    const selected = this.multiple() && Array.isArray(this.selectedValue()) ? this.selectedValue() : [];
    if (this.multiple() && this.maxSelections() !== null && selected.length >= this.maxSelections()!) return [];
    const available = all.filter(o => !selected.includes(this.valueFn()(o)));
    if (!q) return available;
    return available.filter(o => displayFn(o).toLowerCase().includes(q));
  });

  selectedOptions = computed(() => {
    if (!this.multiple() || !Array.isArray(this.selectedValue())) return [];
    const selected = this.selectedValue();
    return this.options().filter(o => selected.includes(this.valueFn()(o)));
  });

  ngOnInit() {
    this.disabledSig.set(this.disabled());
  }

  ngOnDestroy() {}

  // ── ControlValueAccessor ──

  writeValue(value: any): void {
    this.selectedValue.set(this.multiple() ? (Array.isArray(value) ? value : []) : value);
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
    if (!val && !this.multiple()) {
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
    if (this.multiple()) {
      const current = Array.isArray(this.selectedValue()) ? this.selectedValue() : [];
      if (this.maxSelections() !== null && current.length >= this.maxSelections()!) return;
      const next = current.includes(extracted) ? current : [...current, extracted];
      this.selectedValue.set(next);
      this.displayText.set('');
      this.onChange(next);
      this.valueChange.emit(next);
      this.searchInput.set('');
      return;
    }
    this.selectedValue.set(extracted);
    this.searchInput.set('');
    this.updateDisplay();
    this.onChange(extracted);
    this.valueChange.emit(extracted);
  }

  onBlur(): void {
    this.onTouched();
  }

  // Firefox and Chromium order (blur) vs (optionSelected) differently when clicking an option --
  // in Firefox the input can blur, refocus and reopen the panel with the unfiltered list before
  // optionSelected ever fires, so resetting the search from (blur) is unreliable (it either races
  // the click on Chromium or never runs before the panel reopens on Firefox). The autocomplete's
  // own (closed) event is guaranteed by the CDK to fire after optionSelected, so driving the reset
  // off the panel's own lifecycle instead of guessing about focus timing works on both.
  onPanelClosed(): void {
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

  removeOption(opt: any): void {
    if (!this.multiple() || this.disabled()) return;
    const value = this.valueFn()(opt);
    const next = (this.selectedValue() as any[]).filter(v => v !== value);
    this.selectedValue.set(next);
    this.onChange(next);
    this.valueChange.emit(next);
  }

  private updateDisplay(): void {
    if (this.multiple()) {
      this.displayText.set('');
      return;
    }
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
