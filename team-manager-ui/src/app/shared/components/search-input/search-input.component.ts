import { Component, forwardRef, input, output, signal, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatIconModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SearchInputComponent),
    multi: true
  }],
  template: `
    <mat-form-field [appearance]="appearance()" style="margin:0" [style.width]="width()" subscriptSizing="dynamic">
      @if (label()) {
        <mat-label>{{ label() }}</mat-label>
      }
      <mat-icon matPrefix class="search-prefix">search</mat-icon>
      <input matInput type="text"
             [ngModel]="value()"
             [placeholder]="placeholder()"
              (ngModelChange)="onInput($event)"
             (blur)="onTouched()"
             (keydown)="onKeydown($event)">
      @if (value()) {
        <button matSuffix type="button" class="clear-btn"
                (click)="clear($event)"
                (mousedown)="$event.preventDefault()">
          <mat-icon>close</mat-icon>
        </button>
      }
    </mat-form-field>
    @if (mentionHint()) {
      <div class="si-mention-hint" aria-hidden="true">{{ mentionHint() }}</div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    .search-prefix { opacity:0.35; font-size:18px; width:18px; height:18px; line-height:18px; }
    .clear-btn {
      display:flex; align-items:center; justify-content:center;
      width:24px; height:24px; padding:0; margin:0 4px;
      background:transparent; border:none; border-radius:50%;
      cursor:pointer; color:rgba(255,255,255,0.4);
      transition:color 0.15s, background 0.15s;
    }
    .clear-btn:hover { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.9); }
    .clear-btn mat-icon { font-size:16px; width:16px; height:16px; line-height:16px; }
    .si-mention-hint {
      font-size: 0.65rem;
      opacity: 0.2;
      padding: 2px 0 0 2px;
      line-height: 1;
      user-select: none;
      transition: opacity 0.2s;
    }
    .si-mention-hint:hover { opacity: 0.45; }
  `]
})
export class SearchInputComponent implements ControlValueAccessor {
  label = input('');
  placeholder = input('');
  mentionHint = input('');
  width = input('200px');
  appearance = input<'outline' | 'fill'>('outline');

  valueChange = output<string>();

  value = signal('');
  private onChange: (v: string) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(val: string): void { this.value.set(val ?? ''); }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }

  onInput(val: string): void {
    this.value.set(val);
    this.onChange(val);
    this.valueChange.emit(val);
  }

  clear(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.value.set('');
    this.onChange('');
    this.valueChange.emit('');
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.value()) {
      this.clear(event);
    }
  }
}
