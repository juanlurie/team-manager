import { Component, input, output, signal, HostListener, ElementRef, viewChild } from '@angular/core';
import { FilterOption } from './k-picker.types';

@Component({
  selector: 'app-filter-dropdown',
  standalone: true,
  template: `
    <div class="k-filter-wrapper" #wrapper>
      <button class="k-filter-btn" (click)="toggleOpen()"
              [attr.aria-haspopup]="'listbox'"
              [attr.aria-expanded]="isOpen()">
        {{ displayLabel() }} <span class="k-filter-arrow">▾</span>
      </button>
      @if (isOpen()) {
        <div class="k-filter-panel" role="listbox"
             [style.min-width.px]="140">
          <button class="k-filter-option" role="option"
                  [class.selected]="selectedId() === null"
                  (click)="selectOption(null)">
            {{ label() }}
          </button>
          @for (opt of options(); track opt.id) {
            <button class="k-filter-option" role="option"
                    [class.selected]="selectedId() === opt.id"
                    (click)="selectOption(opt.id)">
              {{ opt.label }}
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .k-filter-wrapper {
      position: relative;
      display: inline-block;
    }
    .k-filter-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      font-size: 14px;
      font-weight: 500;
      color: #8B90A8;
      background: transparent;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: color 100ms ease, background-color 100ms ease;
      white-space: nowrap;
    }
    .k-filter-btn:hover {
      color: #E7E9F2;
      background: rgba(255,255,255,0.05);
    }
    .k-filter-btn:focus-visible {
      outline: 2px solid #528BFF;
      outline-offset: 2px;
    }
    .k-filter-arrow {
      font-size: 10px;
      opacity: 0.7;
    }
    .k-filter-panel {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      z-index: 20;
      background: #1A1E2C;
      border: 1px solid #2A2F44;
      border-radius: 8px;
      box-shadow: 0px 8px 24px rgba(0,0,0,0.4);
      padding: 4px;
      min-width: 140px;
      animation: k-filter-in 120ms ease-out;
    }
    @keyframes k-filter-in {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .k-filter-option {
      display: block;
      width: 100%;
      padding: 6px 12px;
      font-size: 13px;
      color: #E7E9F2;
      background: transparent;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      text-align: left;
      transition: background-color 100ms ease;
    }
    .k-filter-option:hover {
      background: #252A3D;
    }
    .k-filter-option.selected {
      color: #528BFF;
      font-weight: 500;
    }
    .k-filter-option:focus-visible {
      outline: 2px solid #528BFF;
      outline-offset: -2px;
    }
  `]
})
export class FilterDropdownComponent {
  readonly label = input.required<string>();
  readonly options = input.required<FilterOption[]>();
  readonly selectedId = input<string | null>(null);

  readonly selectionChange = output<string | null>();

  protected isOpen = signal(false);

  private readonly wrapperRef = viewChild<ElementRef<HTMLElement>>('wrapper');

  protected displayLabel = (): string => {
    const sid = this.selectedId();
    if (sid === null) return this.label();
    const opt = this.options().find(o => o.id === sid);
    return opt?.label || this.label();
  };

  toggleOpen(): void {
    this.isOpen.update(v => !v);
  }

  selectOption(id: string | null): void {
    this.selectionChange.emit(id);
    this.isOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const wrapper = this.wrapperRef();
    if (wrapper && !wrapper.nativeElement.contains(event.target as Node)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isOpen()) {
      this.isOpen.set(false);
      event.stopPropagation();
    }
  }
}
