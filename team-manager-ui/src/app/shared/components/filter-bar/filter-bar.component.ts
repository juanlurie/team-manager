import { Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';

export interface FilterOption { id: string; label: string; }
export interface FilterGroup { key: string; label: string; icon: string; options: FilterOption[]; }

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatMenuModule],
  template: `
    <div class="filter-bar">
      <input class="fb-search" type="text"
             [placeholder]="searchPlaceholder()"
             [value]="search()"
             (input)="onSearch($any($event.target).value)" />

      <div class="fb-divider"></div>

      <div class="fb-desktop">
        @for (group of groups(); track group.key) {
          @if (group.options.length > 0) {
            <div class="fb-dd" [matMenuTriggerFor]="menu">
              <span class="fb-dd-label">{{ group.label }}</span>
              <span class="fb-dd-value">{{ groupLabel(group.key) }}</span>
              <mat-icon class="fb-dd-arrow">expand_more</mat-icon>
            </div>
            <mat-menu #menu="matMenu" panelClass="fb-menu-panel" xPosition="before" [hasBackdrop]="false">
              <div class="fb-menu-content" (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()">
                <input class="fb-menu-search" type="text" placeholder="Search…"
                       [value]="ddSearch()[group.key] ?? ''"
                       (input)="setDdSearch(group.key, $any($event.target).value)"
                       (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()" />
                <div class="fb-menu-list">
                  @for (opt of filteredOptions(group.key); track opt.id) {
                    <label class="fb-menu-item" (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()">
                      <input type="checkbox" [checked]="isSelected(group.key, opt.id)"
                             (change)="$event.stopPropagation(); toggleMulti(group.key, opt.id)" />
                      <span>{{ opt.label }}</span>
                    </label>
                  }
                </div>
                @if (selectedFor(group.key).length > 0) {
                  <div class="fb-menu-footer">
                    <button (click)="$event.stopPropagation(); clearFilter(group.key)"><mat-icon>close</mat-icon> Clear</button>
                  </div>
                }
              </div>
            </mat-menu>
          }
        }
      </div>

      <button class="fb-filters-btn" (click)="openSheet()">
        <mat-icon>filter_list</mat-icon>
        <span>Filters</span>
        @if (totalCount() > 0) {
          <span class="fb-badge">{{ totalCount() }}</span>
        }
      </button>
    </div>

    @if (sheetOpen()) {
      <div class="fb-overlay" (click)="sheetOpen.set(false)"></div>
      <div class="fb-sheet" (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()">
        <div class="fb-sheet-header">
          <h3>Filters</h3>
          <button class="fb-sheet-close" (click)="$event.stopPropagation(); sheetOpen.set(false)"><mat-icon>close</mat-icon></button>
        </div>
        <div class="fb-sheet-tabs" (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()">
          @for (group of groups(); track group.key) {
            @if (group.options.length > 0) {
              <button class="fb-sheet-tab" [class.active]="sheetTab() === group.key"
                      (click)="$event.stopPropagation(); sheetTab.set(group.key)" (mousedown)="$event.stopPropagation()">
                <mat-icon>{{ group.icon }}</mat-icon> {{ group.label }}
                @if (sheetTabCount(group.key) > 0) {
                  <span class="fb-tab-badge">{{ sheetTabCount(group.key) }}</span>
                }
              </button>
            }
          }
        </div>
        <div class="fb-sheet-body" (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()">
          @for (group of groups(); track group.key) {
            @if (group.options.length > 0 && sheetTab() === group.key) {
              <input class="fb-sheet-search" type="text" placeholder="Search…"
                     [value]="sheetSearch()[group.key] ?? ''"
                     (input)="setSheetSearch(group.key, $any($event.target).value)" (click)="$event.stopPropagation()" />
              <div class="fb-checklist" (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()">
                @for (opt of sheetFilteredOptions(group.key); track opt.id) {
                  <div class="fb-check-item" (click)="toggleMulti(group.key, opt.id); $event.stopPropagation()" (mousedown)="$event.stopPropagation()">
                    <input type="checkbox" [checked]="isSelected(group.key, opt.id)" (click)="$event.stopPropagation()" (change)="$event.stopPropagation()" />
                    <span>{{ opt.label }}</span>
                  </div>
                }
              </div>
            }
          }
        </div>
        <div class="fb-sheet-footer" (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()">
          <button class="fb-sheet-clear" (click)="clearAll()">Clear all</button>
          <button class="fb-sheet-apply" (click)="emitApply()">Apply</button>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display:flex; flex:1; min-width:0; }
    .filter-bar {
      display:flex; align-items:center; flex:1; min-width:0; border-radius:12px;
      border:1px solid rgba(255,255,255,0.12); overflow:visible; background:#252535;
      position:relative;
    }
    .fb-search {
      flex:1; min-width:0; padding:10px 14px; border:none; background:transparent;
      color:#e0e0e0; font-size:0.85rem; outline:none;
    }
    .fb-search::placeholder { color:rgba(255,255,255,0.35); }

    .fb-divider {
      width:1px; height:24px; background:rgba(255,255,255,0.1);
      flex-shrink:0; margin:0 4px;
    }

    .fb-desktop { display:none; align-items:center; gap:4px; }
    .fb-dd {
      display:inline-flex; align-items:center; gap:4px; padding:6px 10px;
      border-radius:8px; cursor:pointer; transition:background 0.15s;
      white-space:nowrap; min-width:0;
    }
    .fb-dd:hover { background:rgba(255,255,255,0.06); }
    .fb-dd-label { font-size:0.72rem; color:rgba(255,255,255,0.35); }
    .fb-dd-value { font-size:0.8rem; color:rgba(255,255,255,0.7); max-width:120px; overflow:hidden; text-overflow:ellipsis; }
    .fb-dd-arrow { font-size:14px; width:14px; height:14px; line-height:14px; color:rgba(255,255,255,0.3); }

    ::ng-deep .fb-menu { margin-top:4px !important; }
    ::ng-deep .fb-menu-panel { max-width:220px !important; min-width:140px !important; width:auto !important; }
    ::ng-deep .fb-menu .mat-mdc-menu-content { padding:0 !important; overflow:visible !important; }
    ::ng-deep .fb-menu .mat-mdc-menu-panel { pointer-events: auto !important; }
    .fb-menu-content { width:240px; padding:8px; }
    .fb-menu-search {
      width:100%; padding:6px 10px; border:1px solid rgba(255,255,255,0.12);
      border-radius:6px; background:rgba(255,255,255,0.05); color:#e0e0e0;
      font-size:0.8rem; outline:none; box-sizing:border-box; margin-bottom:6px;
    }
    .fb-menu-search::placeholder { color:rgba(255,255,255,0.3); }
    .fb-menu-list { max-height:220px; overflow-y:auto; display:flex; flex-direction:column; }
    .fb-menu-item {
      display:flex; align-items:center; gap:8px; padding:6px 8px;
      border-radius:6px; cursor:pointer; transition:background 0.1s;
    }
    .fb-menu-item:hover { background:rgba(255,255,255,0.04); }
    .fb-menu-item input[type="checkbox"] { accent-color:#2196f3; width:14px; height:14px; flex-shrink:0; }
    .fb-menu-item span { font-size:0.82rem; color:rgba(255,255,255,0.8); }
    .fb-menu-footer {
      padding:8px; border-top:1px solid rgba(255,255,255,0.08); margin-top:4px;
    }
    .fb-menu-footer button {
      display:flex; align-items:center; gap:4px; padding:6px 10px; border:none;
      background:transparent; color:#64b5f6; font-size:0.78rem; cursor:pointer;
      border-radius:6px; width:100%; justify-content:center;
    }
    .fb-menu-footer button:hover { background:rgba(100,181,246,0.1); }
    .fb-menu-footer button mat-icon { font-size:14px; width:14px; height:14px; line-height:14px; }

    .fb-filters-btn {
      display:none; align-items:center; gap:6px; padding:8px 14px; border:none;
      background:transparent; color:rgba(255,255,255,0.6); font-size:0.82rem;
      cursor:pointer; transition:background 0.15s; white-space:nowrap; flex-shrink:0;
    }
    .fb-filters-btn:hover { background:rgba(255,255,255,0.06); color:#fff; }
    .fb-filters-btn mat-icon { font-size:18px; width:18px; height:18px; line-height:18px; }

    .fb-badge, .fb-tab-badge {
      display:inline-flex; align-items:center; justify-content:center;
      min-width:18px; height:18px; padding:0 5px; border-radius:9px;
      background:#2196f3; color:#fff; font-size:0.7rem; font-weight:600;
    }
    .fb-tab-badge { min-width:16px; height:16px; padding:0 4px; font-size:0.65rem; }

    .fb-overlay {
      position:fixed; inset:0; background:rgba(0,0,0,0.5); z-index:998;
      animation:fbFadeIn .2s ease-out;
    }
    .fb-sheet {
      position:fixed; bottom:0; left:0; right:0; z-index:999;
      background:#1e1e2e; border-radius:16px 16px 0 0;
      max-height:85vh; display:flex; flex-direction:column;
      animation:fbSlideUp .25s ease-out;
    }
    .fb-sheet-header {
      display:flex; align-items:center; justify-content:space-between;
      padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.08);
    }
    .fb-sheet-header h3 { margin:0; font-size:1rem; font-weight:600; }
    .fb-sheet-close {
      display:flex; align-items:center; justify-content:center;
      width:32px; height:32px; border:none; border-radius:50%;
      background:transparent; color:rgba(255,255,255,0.6); cursor:pointer;
    }
    .fb-sheet-close:hover { background:rgba(255,255,255,0.08); color:#fff; }
    .fb-sheet-tabs { display:flex; border-bottom:1px solid rgba(255,255,255,0.08); }
    .fb-sheet-tab {
      flex:1; display:flex; align-items:center; gap:6px; justify-content:center;
      padding:10px 8px; border:none; border-bottom:2px solid transparent;
      background:transparent; color:rgba(255,255,255,0.45); font-size:0.78rem;
      cursor:pointer; transition:all 0.15s;
    }
    .fb-sheet-tab:hover { color:rgba(255,255,255,0.7); background:rgba(255,255,255,0.03); }
    .fb-sheet-tab.active { color:#90caf9; border-bottom-color:#2196f3; background:rgba(33,150,243,0.06); }
    .fb-sheet-tab mat-icon { font-size:14px; width:14px; height:14px; line-height:14px; }
    .fb-sheet-body { flex:1; overflow-y:auto; padding:12px 20px; }
    .fb-sheet-search {
      width:100%; padding:8px 12px; border:1px solid rgba(255,255,255,0.12);
      border-radius:8px; background:rgba(255,255,255,0.05); color:#e0e0e0;
      font-size:0.82rem; outline:none; margin-bottom:10px; box-sizing:border-box;
    }
    .fb-sheet-search::placeholder { color:rgba(255,255,255,0.3); }
    .fb-sheet-search:focus { border-color:rgba(33,150,243,0.5); }
    .fb-checklist { display:flex; flex-direction:column; gap:2px; }
    .fb-check-item {
      display:flex; align-items:center; gap:10px; padding:8px 10px;
      border-radius:8px; cursor:pointer; transition:background 0.1s;
    }
    .fb-check-item:hover { background:rgba(255,255,255,0.04); }
    .fb-check-item input[type="checkbox"] {
      accent-color:#2196f3; width:16px; height:16px; flex-shrink:0;
    }
    .fb-check-item span { font-size:0.85rem; color:rgba(255,255,255,0.8); }
    .fb-sheet-footer {
      display:flex; gap:10px; padding:14px 20px;
      border-top:1px solid rgba(255,255,255,0.08);
      padding-bottom:max(14px, env(safe-area-inset-bottom));
    }
    .fb-sheet-clear {
      flex:1; padding:10px; border:1px solid rgba(255,255,255,0.2); border-radius:8px;
      background:transparent; color:rgba(255,255,255,0.7); font-size:0.9rem;
      cursor:pointer; transition:all 0.15s;
    }
    .fb-sheet-clear:hover { background:rgba(255,255,255,0.06); color:#fff; }
    .fb-sheet-apply {
      flex:1.5; padding:10px; border:none; border-radius:8px;
      background:#2196f3; color:#fff; font-size:0.9rem; font-weight:500;
      cursor:pointer; transition:background 0.15s;
    }
    .fb-sheet-apply:hover { background:#1e88e5; }

    @keyframes fbFadeIn { from { opacity:0; } to { opacity:1; } }
    @keyframes fbSlideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }

    @media (max-width: 767px) {
      .fb-desktop { display: none !important; }
      .fb-filters-btn { display: flex !important; }
    }
    @media (min-width: 768px) {
      .fb-desktop { display: flex !important; }
      .fb-filters-btn { display: none !important; }
    }
  `]
})
export class FilterBarComponent {
  groups = input<FilterGroup[]>([]);
  searchPlaceholder = input('Search…');
  searchVal = input('');
  selectedValues = input<Record<string, string[]>>({});

  searchChange = output<string>();
  apply = output<Record<string, string[]>>();

  search = signal('');
  selected = signal<Record<string, string[]>>({});

  ddSearch = signal<Record<string, string>>({});
  sheetSearch = signal<Record<string, string>>({});

  sheetOpen = signal(false);
  sheetTab = signal('');

  openSheet() {
    this.sheetOpen.set(true);
    if (!this.sheetTab() && this.groups().length > 0) {
      const first = this.groups().find(g => g.options.length > 0);
      if (first) this.sheetTab.set(first.key);
    }
  }

  constructor() {
    effect(() => { untracked(() => this.search.set(this.searchVal())); });
    effect(() => { untracked(() => this.selected.set({ ...this.selectedValues() })); });
    effect(() => {
      const g = this.groups();
      untracked(() => {
        if (g.length > 0 && !this.sheetTab()) {
          const first = g.find(gr => gr.options.length > 0);
          if (first) this.sheetTab.set(first.key);
        }
      });
    });
  }

  groupLabel(key: string): string {
    const sel = this.selected()[key] ?? [];
    const group = this.groups().find(g => g.key === key);
    if (!group || sel.length === 0) return '';
    if (sel.length === 1) return group.options.find(o => o.id === sel[0])?.label ?? '';
    return `${sel.length} selected`;
  }

  selectedFor(key: string): string[] {
    return this.selected()[key] ?? [];
  }

  isSelected(key: string, id: string): boolean {
    return (this.selected()[key] ?? []).includes(id);
  }

  filteredOptions(key: string): FilterOption[] {
    const q = (this.ddSearch()[key] ?? '').trim().toLowerCase();
    const group = this.groups().find(g => g.key === key);
    if (!group) return [];
    return q ? group.options.filter(o => o.label.toLowerCase().includes(q)) : group.options;
  }

  sheetFilteredOptions(key: string): FilterOption[] {
    const q = (this.sheetSearch()[key] ?? '').trim().toLowerCase();
    const group = this.groups().find(g => g.key === key);
    if (!group) return [];
    return q ? group.options.filter(o => o.label.toLowerCase().includes(q)) : group.options;
  }

  totalCount = computed(() => {
    const sel = this.selected();
    return Object.values(sel).reduce((sum, arr) => sum + arr.length, 0);
  });

  sheetTabCount(key: string): number {
    return (this.selected()[key] ?? []).length;
  }

  onSearch(val: string) {
    this.search.set(val);
    this.searchChange.emit(val);
  }

  setDdSearch(key: string, val: string) {
    this.ddSearch.set({ ...this.ddSearch(), [key]: val });
  }

  setSheetSearch(key: string, val: string) {
    this.sheetSearch.set({ ...this.sheetSearch(), [key]: val });
  }

  toggleMulti(key: string, id: string) {
    const arr = this.selected()[key] ?? [];
    const next = arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];
    this.selected.set({ ...this.selected(), [key]: next });
  }

  clearFilter(key: string) {
    this.selected.set({ ...this.selected(), [key]: [] });
    this.emitApply();
  }

  clearAll() {
    const cleared: Record<string, string[]> = {};
    for (const g of this.groups()) cleared[g.key] = [];
    this.selected.set(cleared);
  }

  emitApply() {
    this.apply.emit(this.selected());
  }
}
