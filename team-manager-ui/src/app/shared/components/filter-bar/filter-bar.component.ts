import { Component, computed, effect, input, output, signal, untracked, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { SquadSummary } from '../../../core/models/squad.model';
import { Feature } from '../../../core/models/feature.model';
import { TeamMember } from '../../../core/models/team-member.model';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatMenuModule],
  template: `
    <div class="filter-bar">
      <input class="fb-search" type="text"
             [placeholder]="searchPlaceholder()"
             [value]="search()"
             (input)="search.set($any($event.target).value)" />

      <div class="fb-divider"></div>

      <div class="fb-desktop">
        @if (squads().length > 0) {
          <div class="fb-dd" #squadTrigger="matMenuTrigger" [matMenuTriggerFor]="squadMenu">
            <span class="fb-dd-label">Squad</span>
            <span class="fb-dd-value">{{ squadLabel() }}</span>
            <mat-icon class="fb-dd-arrow">expand_more</mat-icon>
          </div>
          <mat-menu #squadMenu="matMenu" panelClass="fb-menu-panel" xPosition="before"
                    [hasBackdrop]="false" (closed)="onMenuClosed('squad', squadTrigger)">
            <div class="fb-menu-content" (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()">
              <input class="fb-menu-search" type="text" placeholder="Search…"
                     [value]="ddSearch.squad()" (input)="ddSearch.squad.set($any($event.target).value)"
                     (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()" />
              <div class="fb-menu-list">
                @for (s of filteredSquads(); track s.id) {
                  <label class="fb-menu-item" (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()">
                    <input type="checkbox" [checked]="selectedSquads().includes(s.id)"
                           (change)="toggleMulti('squad', s.id)" />
                    <span>{{ s.name }}</span>
                  </label>
                }
              </div>
              @if (selectedSquads().length > 0) {
                <div class="fb-menu-footer">
                  <button (click)="$event.stopPropagation(); clearFilter('squad')"><mat-icon>close</mat-icon> Clear</button>
                </div>
              }
            </div>
          </mat-menu>
        }
        @if (features().length > 0) {
          <div class="fb-dd" #featTrigger="matMenuTrigger" [matMenuTriggerFor]="featMenu">
            <span class="fb-dd-label">Feature</span>
            <span class="fb-dd-value">{{ featureLabel() }}</span>
            <mat-icon class="fb-dd-arrow">expand_more</mat-icon>
          </div>
          <mat-menu #featMenu="matMenu" panelClass="fb-menu-panel" xPosition="before"
                    [hasBackdrop]="false" (closed)="onMenuClosed('feature', featTrigger)">
            <div class="fb-menu-content" (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()">
              <input class="fb-menu-search" type="text" placeholder="Search…"
                     [value]="ddSearch.feature()" (input)="ddSearch.feature.set($any($event.target).value)"
                     (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()" />
              <div class="fb-menu-list">
                @for (f of filteredFeatures(); track f.id) {
                  <label class="fb-menu-item" (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()">
                    <input type="checkbox" [checked]="selectedFeatures().includes(f.id)"
                           (change)="toggleMulti('feature', f.id)" />
                    <span>{{ f.title }}</span>
                  </label>
                }
              </div>
              @if (selectedFeatures().length > 0) {
                <div class="fb-menu-footer">
                  <button (click)="$event.stopPropagation(); clearFilter('feature')"><mat-icon>close</mat-icon> Clear</button>
                </div>
              }
            </div>
          </mat-menu>
        }
        @if (teamLeads().length > 0) {
          <div class="fb-dd" #leadTrigger="matMenuTrigger" [matMenuTriggerFor]="leadMenu">
            <span class="fb-dd-label">Lead</span>
            <span class="fb-dd-value">{{ leadLabel() }}</span>
            <mat-icon class="fb-dd-arrow">expand_more</mat-icon>
          </div>
          <mat-menu #leadMenu="matMenu" panelClass="fb-menu-panel" xPosition="before"
                    [hasBackdrop]="false" (closed)="onMenuClosed('lead', leadTrigger)">
            <div class="fb-menu-content" (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()">
              <input class="fb-menu-search" type="text" placeholder="Search…"
                     [value]="ddSearch.lead()" (input)="ddSearch.lead.set($any($event.target).value)"
                     (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()" />
              <div class="fb-menu-list">
                @for (l of filteredLeads(); track l.id) {
                  <label class="fb-menu-item" (click)="$event.stopPropagation()" (mousedown)="$event.stopPropagation()">
                    <input type="checkbox" [checked]="selectedLeads().includes(l.id)"
                           (change)="toggleMulti('lead', l.id)" />
                    <span>{{ l.firstName }} {{ l.lastName }}</span>
                  </label>
                }
              </div>
              @if (selectedLeads().length > 0) {
                <div class="fb-menu-footer">
                  <button (click)="$event.stopPropagation(); clearFilter('lead')"><mat-icon>close</mat-icon> Clear</button>
                </div>
              }
            </div>
          </mat-menu>
        }
      </div>

      <button class="fb-filters-btn" (click)="sheetOpen.set(true)">
        <mat-icon>filter_list</mat-icon>
        <span>Filters</span>
        @if (totalCount() > 0) {
          <span class="fb-badge">{{ totalCount() }}</span>
        }
      </button>
    </div>

    @if (sheetOpen()) {
      <div class="fb-overlay" (click)="sheetOpen.set(false)"></div>
      <div class="fb-sheet">
        <div class="fb-sheet-header">
          <h3>Filters</h3>
          <button class="fb-sheet-close" (click)="sheetOpen.set(false)"><mat-icon>close</mat-icon></button>
        </div>
        <div class="fb-sheet-tabs">
          @for (t of sheetTabs; track t.key) {
            <button class="fb-sheet-tab" [class.active]="sheetTab() === t.key"
                    (click)="sheetTab.set(t.key)">
              <mat-icon>{{ t.icon }}</mat-icon> {{ t.label }}
              @if (sheetTabCount(t.key) > 0) {
                <span class="fb-tab-badge">{{ sheetTabCount(t.key) }}</span>
              }
            </button>
          }
        </div>
        <div class="fb-sheet-body">
          @switch (sheetTab()) {
            @case ('squad') {
              <input class="fb-sheet-search" type="text" placeholder="Search…"
                     [value]="sheetSquadSearch()" (input)="sheetSquadSearch.set($any($event.target).value)" />
              <div class="fb-checklist">
                @for (s of sheetFilteredSquads(); track s.id) {
                  <label class="fb-check-item" (click)="toggleMulti('squad', s.id)">
                    <input type="checkbox" [checked]="selectedSquads().includes(s.id)" />
                    <span>{{ s.name }}</span>
                  </label>
                }
              </div>
            }
            @case ('feature') {
              <input class="fb-sheet-search" type="text" placeholder="Search…"
                     [value]="sheetFeatureSearch()" (input)="sheetFeatureSearch.set($any($event.target).value)" />
              <div class="fb-checklist">
                @for (f of sheetFilteredFeatures(); track f.id) {
                  <label class="fb-check-item" (click)="toggleMulti('feature', f.id)">
                    <input type="checkbox" [checked]="selectedFeatures().includes(f.id)" />
                    <span>{{ f.title }}</span>
                  </label>
                }
              </div>
            }
            @case ('lead') {
              <input class="fb-sheet-search" type="text" placeholder="Search…"
                     [value]="sheetLeadSearch()" (input)="sheetLeadSearch.set($any($event.target).value)" />
              <div class="fb-checklist">
                @for (l of sheetFilteredLeads(); track l.id) {
                  <label class="fb-check-item" (click)="toggleMulti('lead', l.id)">
                    <input type="checkbox" [checked]="selectedLeads().includes(l.id)" />
                    <span>{{ l.firstName }} {{ l.lastName }}</span>
                  </label>
                }
              </div>
            }
          }
        </div>
        <div class="fb-sheet-footer">
          <button class="fb-sheet-clear" (click)="clearAll()">Clear all</button>
          <button class="fb-sheet-apply" (click)="applyAndClose()">Show results</button>
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
  @ViewChild('squadTrigger') squadTrigger!: MatMenuTrigger;
  @ViewChild('featTrigger') featTrigger!: MatMenuTrigger;
  @ViewChild('leadTrigger') leadTrigger!: MatMenuTrigger;

  searchPlaceholder = input('Search members…');
  squads = input<SquadSummary[]>([]);
  features = input<Feature[]>([]);
  teamLeads = input<TeamMember[]>([]);

  searchVal = input('');
  selectedSquadsVal = input<string[]>([]);
  selectedFeaturesVal = input<string[]>([]);
  selectedLeadsVal = input<string[]>([]);

  searchChange = output<string>();
  apply = output<{ squads?: string[]; features?: string[]; leads?: string[] }>();

  search = signal('');
  selectedSquads = signal<string[]>([]);
  selectedFeatures = signal<string[]>([]);
  selectedLeads = signal<string[]>([]);

  constructor() {
    effect(() => { untracked(() => this.search.set(this.searchVal())); });
    effect(() => { untracked(() => this.selectedSquads.set(this.selectedSquadsVal())); });
    effect(() => { untracked(() => this.selectedFeatures.set(this.selectedFeaturesVal())); });
    effect(() => { untracked(() => this.selectedLeads.set(this.selectedLeadsVal())); });
  }

  ddSearch = { squad: signal(''), feature: signal(''), lead: signal('') };

  filteredSquads = computed(() => {
    const q = this.ddSearch.squad().trim().toLowerCase();
    return q ? this.squads().filter(s => s.name.toLowerCase().includes(q)) : this.squads();
  });
  filteredFeatures = computed(() => {
    const q = this.ddSearch.feature().trim().toLowerCase();
    return q ? this.features().filter(f => f.title.toLowerCase().includes(q)) : this.features();
  });
  filteredLeads = computed(() => {
    const q = this.ddSearch.lead().trim().toLowerCase();
    return q ? this.teamLeads().filter(l => `${l.firstName} ${l.lastName}`.toLowerCase().includes(q)) : this.teamLeads();
  });

  sheetOpen = signal(false);
  sheetTab = signal<'squad' | 'feature' | 'lead'>('squad');
  sheetTabs = [
    { key: 'squad' as const, icon: 'groups', label: 'Squad' },
    { key: 'feature' as const, icon: 'flag', label: 'Feature' },
    { key: 'lead' as const, icon: 'person', label: 'Lead' },
  ];
  sheetSquadSearch = signal('');
  sheetFeatureSearch = signal('');
  sheetLeadSearch = signal('');

  sheetFilteredSquads = computed(() => {
    const q = this.sheetSquadSearch().trim().toLowerCase();
    return q ? this.squads().filter(s => s.name.toLowerCase().includes(q)) : this.squads();
  });
  sheetFilteredFeatures = computed(() => {
    const q = this.sheetFeatureSearch().trim().toLowerCase();
    return q ? this.features().filter(f => f.title.toLowerCase().includes(q)) : this.features();
  });
  sheetFilteredLeads = computed(() => {
    const q = this.sheetLeadSearch().trim().toLowerCase();
    return q ? this.teamLeads().filter(l => `${l.firstName} ${l.lastName}`.toLowerCase().includes(q)) : this.teamLeads();
  });

  squadLabel = computed(() => {
    const sel = this.selectedSquads();
    if (sel.length === 0) return '';
    if (sel.length === 1) return this.squads().find(s => s.id === sel[0])?.name ?? '';
    return `${sel.length} selected`;
  });
  featureLabel = computed(() => {
    const sel = this.selectedFeatures();
    if (sel.length === 0) return '';
    if (sel.length === 1) return this.features().find(f => f.id === sel[0])?.title ?? '';
    return `${sel.length} selected`;
  });
  leadLabel = computed(() => {
    const sel = this.selectedLeads();
    if (sel.length === 0) return '';
    if (sel.length === 1) {
      const l = this.teamLeads().find(t => t.id === sel[0]);
      return l ? `${l.firstName} ${l.lastName}` : '';
    }
    return `${sel.length} selected`;
  });

  totalCount = computed(() => this.selectedSquads().length + this.selectedFeatures().length + this.selectedLeads().length);

  sheetTabCount(key: string): number {
    switch (key) {
      case 'squad': return this.selectedSquads().length;
      case 'feature': return this.selectedFeatures().length;
      case 'lead': return this.selectedLeads().length;
      default: return 0;
    }
  }

  toggleMulti(group: 'squad' | 'feature' | 'lead', id: string) {
    this._menuReopen = true;
    const fn = (arr: string[]) => arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id];
    switch (group) {
      case 'squad': this.selectedSquads.update(fn); break;
      case 'feature': this.selectedFeatures.update(fn); break;
      case 'lead': this.selectedLeads.update(fn); break;
    }
    this.emitApply();
  }

  clearFilter(group: 'squad' | 'feature' | 'lead') {
    switch (group) {
      case 'squad': this.selectedSquads.set([]); break;
      case 'feature': this.selectedFeatures.set([]); break;
      case 'lead': this.selectedLeads.set([]); break;
    }
    this.emitApply();
  }

  clearAll() {
    this.selectedSquads.set([]);
    this.selectedFeatures.set([]);
    this.selectedLeads.set([]);
  }

  private _menuReopen = false;

  onMenuClosed(group: string, trigger: MatMenuTrigger) {
    if (this._menuReopen) {
      this._menuReopen = false;
      setTimeout(() => trigger.openMenu());
    }
  }

  emitApply() {
    this.apply.emit({
      squads: this.selectedSquads(),
      features: this.selectedFeatures(),
      leads: this.selectedLeads(),
    });
  }

  applyAndClose() {
    this.emitApply();
    this.sheetOpen.set(false);
  }

  openDd() {
    this.ddSearch.squad.set('');
    this.ddSearch.feature.set('');
    this.ddSearch.lead.set('');
  }
}
