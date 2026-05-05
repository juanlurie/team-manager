import { Component, computed, effect, forwardRef, input, output, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

function safeDisplay(o: any): string {
  if (!o) return '';
  if (typeof o === 'string') return o;
  if (typeof o === 'number') return String(o);
  if (o.name != null) return String(o.name);
  if (o.firstName != null && o.lastName != null) return `${o.firstName} ${o.lastName}`;
  if (o.firstName != null) return String(o.firstName);
  if (o.lastName != null) return String(o.lastName);
  if (o.fullName != null) return String(o.fullName);
  if (o.label != null) return String(o.label);
  if (o.title != null) return String(o.title);
  return '';
}

@Component({
  selector: 'app-searchable-multi-select',
  standalone: true,
  imports: [CommonModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule, MatIconModule, MatProgressSpinnerModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SearchableMultiSelectComponent),
    multi: true
  }],
  template: `
    <div class="ms-wrapper">
      <mat-form-field [appearance]="appearance()" class="ms-field" [style.width]="width()" subscriptSizing="dynamic">
        @if (label()) {
          <mat-label>{{ label() }}</mat-label>
        }
        <input #inputEl matInput type="text"
               [matAutocomplete]="auto"
               [placeholder]="selectedItems().length === 0 ? placeholder() : ''"
               [disabled]="disabled()"
               (input)="onSearchInput($event)"
               (blur)="onBlur()"
               (focus)="onFocus()">
        @if (selectedItems().length > 0 && !disabled()) {
          <button matSuffix type="button" class="clear-btn"
                  (click)="clearAll($event)"
                  (mousedown)="$event.preventDefault()">
            <mat-icon>close</mat-icon>
          </button>
        }
        @if (loading()) {
          <mat-spinner matSuffix diameter="18"></mat-spinner>
        }
        <mat-autocomplete #auto="matAutocomplete"
                          [displayWith]="displayFn"
                          (optionSelected)="onSelect($event)">
          @for (opt of availableOptions(); track trackVal(opt)) {
            <mat-option [value]="opt">
              <span class="ms-option-text">{{ itemLabel(opt) }}</span>
              @if (isItemSelected(opt)) {
                <mat-icon class="ms-check-icon">check</mat-icon>
              }
            </mat-option>
          }
          @if (availableOptions().length === 0 && searchInput()) {
            <mat-option disabled>No matches</mat-option>
          }
        </mat-autocomplete>
      </mat-form-field>
      @if (selectedItems().length > 0) {
        <div class="ms-chips">
          @for (item of selectedItems(); track trackVal(item)) {
            <span class="ms-chip">
              <span class="ms-chip-label">{{ itemLabel(item) }}</span>
              <button type="button" class="ms-chip-remove"
                      (click)="remove(item)"
                      (mousedown)="$event.preventDefault()">
                <mat-icon>close</mat-icon>
              </button>
            </span>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .ms-wrapper { display: block; }
    .ms-field { margin: 0; }
    .ms-field :host ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }

    .clear-btn {
      display: flex; align-items: center; justify-content: center;
      width: 24px; height: 24px; padding: 0; margin: 0 4px;
      background: transparent; border: none; border-radius: 50%;
      cursor: pointer; color: rgba(255,255,255,0.4);
      transition: color 0.15s, background 0.15s;
    }
    .clear-btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); }
    .clear-btn mat-icon { font-size: 16px; width: 16px; height: 16px; line-height: 16px; }

    .ms-chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 4px 0 6px; }
    .ms-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 8px 2px 10px; border-radius: 12px;
      background: rgba(100,181,246,0.12); border: 1px solid rgba(100,181,246,0.2);
      font-size: 0.75rem; color: #64b5f6; white-space: nowrap;
    }
    .ms-chip-label { max-width: 150px; overflow: hidden; text-overflow: ellipsis; }
    .ms-chip-remove {
      display: flex; align-items: center; justify-content: center;
      width: 18px; height: 18px; padding: 0; margin: 0;
      background: transparent; border: none; border-radius: 50%;
      cursor: pointer; color: rgba(100,181,246,0.6);
      transition: color 0.15s, background 0.15s;
    }
    .ms-chip-remove:hover { background: rgba(255,255,255,0.1); color: #64b5f6; }
    .ms-chip-remove mat-icon { font-size: 14px; width: 14px; height: 14px; line-height: 14px; }

    .ms-option-text { flex: 1; }
    .ms-check-icon { font-size: 16px; width: 16px; height: 16px; line-height: 16px; color: #64b5f6; margin-left: 4px; }
  `]
})
export class SearchableMultiSelectComponent implements ControlValueAccessor {
  options = input<any[]>([]);
  label = input('');
  placeholder = input('');
  width = input('100%');
  appearance = input<'outline' | 'fill'>('outline');
  disabled = input(false);
  loading = input(false);

  valueChange = output<any[]>();

  selectedItems = signal<any[]>([]);
  searchInput = signal('');
  private pendingIds = signal<any[] | null>(null);

  private onChange: ((v: any) => void) = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    effect(() => {
      const opts = this.options();
      const pending = this.pendingIds();
      if (!pending || pending.length === 0) return;
      const optionMap = new Map(opts.map(o => [this.trackVal(o), o]));
      const resolved = pending.map(v => {
        const found = optionMap.get(v);
        return found ?? (typeof v === 'object' && v !== null ? v : v);
      });
      untracked(() => this.selectedItems.set(resolved));
    });
  }

  private selectedIdsSet = computed(() => {
    return new Set(this.selectedItems().map(o => this.trackVal(o)));
  });

  availableOptions = computed(() => {
    const q = this.searchInput().trim().toLowerCase();
    let filtered = this.options();
    if (q) {
      filtered = filtered.filter(o => this.itemLabel(o).toLowerCase().includes(q));
    }
    return filtered;
  });

  displayFn = (_: any): string => '';

  itemLabel(item: any): string {
    return safeDisplay(item);
  }

  trackVal(item: any): any {
    if (!item) return item;
    return item.id ?? item;
  }

  isItemSelected(opt: any): boolean {
    return this.selectedIdsSet().has(this.trackVal(opt));
  }

  onSearchInput(event: Event): void {
    this.searchInput.set((event.target as HTMLInputElement).value);
  }

  onSelect(event: MatAutocompleteSelectedEvent): void {
    const option = event.option.value;
    const id = this.trackVal(option);
    if (this.selectedIdsSet().has(id)) {
      this.selectedItems.set(this.selectedItems().filter(o => this.trackVal(o) !== id));
    } else {
      this.selectedItems.set([...this.selectedItems(), option]);
    }
    this.searchInput.set('');
    setTimeout(() => this.emitValue(), 0);
  }

  remove(item: any): void {
    const id = this.trackVal(item);
    this.selectedItems.set(this.selectedItems().filter(o => this.trackVal(o) !== id));
    this.emitValue();
  }

  clearAll(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.selectedItems.set([]);
    this.emitValue();
  }

  onBlur(): void {
    this.onTouched();
    this.searchInput.set('');
  }

  onFocus(): void {
    this.searchInput.set('');
  }

  private emitValue(): void {
    const values = this.selectedItems().map(o => this.trackVal(o));
    this.onChange(values);
    this.valueChange.emit(values);
  }

  writeValue(values: any[]): void {
    if (!values || values.length === 0) {
      this.selectedItems.set([]);
      this.pendingIds.set(null);
      return;
    }
    const optionMap = new Map(this.options().map(o => [this.trackVal(o), o]));
    const resolved = values.map(v => {
      const found = optionMap.get(v);
      return found ?? (typeof v === 'object' && v !== null ? v : v);
    });
    this.selectedItems.set(resolved);
    this.pendingIds.set(values);
  }

  registerOnChange(fn: (v: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
