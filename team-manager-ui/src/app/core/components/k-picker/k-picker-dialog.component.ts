import {
  Component, inject, signal, computed, OnInit, AfterViewInit,
  ViewChild, ElementRef, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TeamMember } from '../../models/team-member.model';
import { TeamMemberService } from '../../services/team-member.service';
import { SquadService } from '../../services/squad.service';
import { SquadSummary } from '../../models/squad.model';
import { KPickerData, MemberSection, FilterOption } from './k-picker.types';
import { fuzzyMatch, clamp } from './k-picker.utils';
import { MemberRowComponent } from './member-row.component';
import { SelectedMemberChipComponent } from './selected-member-chip.component';
import { FilterDropdownComponent } from './filter-dropdown.component';

@Component({
  selector: 'app-k-picker-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatIconModule, MatDialogModule,
    MemberRowComponent, SelectedMemberChipComponent,
    FilterDropdownComponent,
  ],
  template: `
    <div class="k-frame" role="dialog" aria-modal="true"
         [attr.aria-busy]="isLoading()"
         aria-label="K picker — Select team members">
      <!-- ═══ Search / Header Bar ═══ -->
      <div class="k-bar">
        <div class="k-bar-left">
          <div class="k-bar-row" #chipRow>
            <!-- Selected member chips -->
            @for (member of selectedMembers(); track member.id) {
              <app-selected-member-chip [member]="member"
                                         (remove)="removeMember($event)" />
            }
            <!-- Search input -->
            <input #searchInput class="k-search-input"
                   [placeholder]="searchPlaceholder()"
                   [disabled]="isLoading() || !!error()"
                   autocomplete="off" spellcheck="false"
                   (input)="onSearchInput($event)"
                   (keydown)="onSearchKeydown($event)" />
          </div>
          <div class="k-helper">
            {{ helperText() }}
          </div>
        </div>
        <div class="k-bar-right">
          <button class="k-rail-btn" (click)="close()" title="Close (Esc)" aria-label="Close picker">esc</button>
        </div>
      </div>

      <!-- ═══ Popover / Dropdown Panel ═══ -->
      <div class="k-popover" [class.k-popover-no-results]="noResults()">
        @if (isLoading()) {
          <div class="k-loading" role="status" aria-busy="true">Loading team members…</div>
        } @else if (error()) {
          <div class="k-error" role="alert">
            <div class="k-error-msg">{{ error() }}</div>
            <button class="k-retry-btn" (click)="retryLoad()">Retry</button>
          </div>
        } @else if (members().length === 0) {
          <div class="k-empty" role="status">No team members found</div>
        } @else if (noResults()) {
          <div class="k-empty" role="status">
            @if (query()) {
              No results for "{{ query() }}"
            } @else {
              No results
            }
          </div>
        } @else {
          <!-- Filter bar (top) -->
          <div class="k-filter-bar">
            <app-filter-dropdown label="Squad"
                                  [options]="squadFilterOptions()"
                                  [selectedId]="activeSquadFilter()"
                                  (selectionChange)="activeSquadFilter.set($event)" />
            <app-filter-dropdown label="Lead"
                                  [options]="leadFilterOptions()"
                                  [selectedId]="activeLeadFilter()"
                                  (selectionChange)="activeLeadFilter.set($event)" />
          </div>
          <!-- Member sections -->
          @for (section of filteredSections(); track section.label; let secIdx = $index) {
            <div class="k-section-label">{{ section.label }}</div>
            @for (item of section.items; track item.id; let idx = $index) {
              <app-member-row [member]="item"
                              [isActive]="globalActiveIndex() === computeGlobalIndex(secIdx, idx)"
                              [isSelected]="selectedIds().has(item.id)"
                              (select)="toggleMember($event)"
                              (hover)="onRowHover(secIdx, idx)" />
            }
          }
        }
      </div>
    </div>
  `,
  styles: [`
    /* ═══════════════════════════════════════════════
       K Picker Dialog — Inline Styles
       All design tokens from the UX spec.
       ═══════════════════════════════════════════════ */

    :host {
      display: block;
      font-family: 'Geist', -apple-system, system-ui, 'Segoe UI', sans-serif;
      color: #E7E9F2;
    }

    /* ── Main frame ── */
    .k-frame {
      width: 852px;
      max-width: 95vw;
      background: #0D0F17;
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-sizing: border-box;
      overflow: hidden;
      position: relative;
    }

    /* ── Search bar ── */
    .k-bar {
      display: flex;
      flex-direction: row;
      background: #171A26;
      border: 1px solid #232636;
      border-radius: 14px;
      min-height: 64px;
      overflow: hidden;
    }

    .k-bar-left {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 10px 16px;
      min-width: 0;
    }

    .k-bar-row {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .k-search-input {
      flex: 1;
      min-width: 120px;
      background: transparent;
      border: none;
      color: #E7E9F2;
      font-size: 13px;
      font-family: inherit;
      outline: none;
      padding: 2px 0;
    }
    .k-search-input::placeholder {
      color: #5A607A;
    }
    .k-search-input:focus {
      outline: none;
    }
    .k-search-input:focus-visible {
      outline: 2px solid #528BFF;
      outline-offset: 2px;
      border-radius: 2px;
    }

    .k-helper {
      color: #5A607A;
      font-size: 12px;
      font-weight: 400;
      line-height: normal;
      padding: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── Right section ── */
    .k-bar-right {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 4px;
      padding: 0 10px;
      border-left: 1px solid #232636;
      flex-shrink: 0;
    }

    .k-rail-btn {
      padding: 8px 10px;
      font-size: 14px;
      font-weight: 500;
      color: #8B90A8;
      background: transparent;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: color 100ms ease, background-color 100ms ease;
    }
    .k-rail-btn:hover {
      color: #E7E9F2;
      background: rgba(255,255,255,0.05);
    }
    .k-rail-btn:focus-visible {
      outline: 2px solid #528BFF;
      outline-offset: 2px;
    }

    /* ── Popover panel ── */
    .k-popover {
      background: #1A1E2C;
      border: 1px solid #2A2F44;
      border-radius: 12px;
      box-shadow: 0px 16px 40px 0px rgba(0,0,0,0.5), 0px 0px 0px 1px rgba(255,255,255,0.02);
      padding: 6px;
      min-height: 80px;
      max-height: 360px;
      overflow-y: auto;
      position: relative;
      z-index: 10;
    }

    .k-popover-no-results {
      min-height: 80px;
    }

    /* ── Section labels ── */
    .k-section-label {
      color: #5A607A;
      font-size: 11px;
      font-weight: 600;
      padding: 6px 10px 4px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    /* ── Loading / Empty / Error states ── */
    .k-loading, .k-empty, .k-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
      font-size: 13px;
      color: #5A607A;
    }
    .k-error {
      color: #E06C75;
      gap: 12px;
    }
    .k-error-msg {
      color: #E06C75;
    }
    .k-retry-btn {
      padding: 8px 16px;
      font-size: 13px;
      font-family: inherit;
      color: #E7E9F2;
      background: #252A3D;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 100ms ease;
    }
    .k-retry-btn:hover {
      background: #2A2F44;
    }
    .k-retry-btn:focus-visible {
      outline: 2px solid #528BFF;
      outline-offset: 2px;
    }

    /* ── Filter bar ── */
    .k-filter-bar {
      display: flex;
      flex-direction: row;
      gap: 8px;
      padding: 8px 10px 4px;
      flex-wrap: wrap;
    }

    /* ── Responsive: mobile full-screen ── */
    @media (max-width: 767px) {
      .k-frame {
        width: 100vw;
        max-width: 100vw;
        border-radius: 0;
        padding: 16px;
        min-height: 100vh;
      }
      .k-bar-right {
        padding: 0 6px;
      }
      .k-rail-btn {
        padding: 6px 8px;
        font-size: 12px;
      }
      .k-helper {
        font-size: 10px;
      }
      .k-popover {
        max-height: none;
        flex: 1;
      }
    }
  `]
})
export class KPickerDialogComponent implements OnInit, AfterViewInit {
  // ── Injected dependencies ──
  private dialogRef = inject(MatDialogRef<KPickerDialogComponent>);
  private data: KPickerData = inject(MAT_DIALOG_DATA);
  private teamMemberService = inject(TeamMemberService);
  private squadService = inject(SquadService);

  // ── View children ──
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  // ── Primary state signals ──
  protected members = signal<TeamMember[]>([]);
  protected query = signal<string>('');
  protected selectedMembers = signal<TeamMember[]>(this.data?.preSelectedMembers ?? []);
  protected activeIndex = signal(0);
  protected recentMemberIds = signal<string[]>(this.loadRecentFromStorage());
  protected squads = signal<SquadSummary[]>([]);
  protected activeSquadFilter = signal<string | null>(null);
  protected activeLeadFilter = signal<string | null>(null);
  protected isLoading = signal(true);
  protected error = signal<string | null>(null);

  // ── Derived / computed signals ──

  /** Set of selected member IDs for O(1) lookup */
  protected selectedIds = computed(() => new Set(this.selectedMembers().map(m => m.id)));

  /** Recent members resolved from IDs */
  protected recentMembers = computed(() =>
    this.recentMemberIds()
      .map(id => this.members().find(m => m.id === id))
      .filter((m): m is TeamMember => !!m)
  );

  /** Search-filtered member list (applies text + squad + feature + lead filters) */
  protected searchFiltered = computed(() => {
    const q = this.query().toLowerCase().trim();
    const squadId = this.activeSquadFilter();
    const leadId = this.activeLeadFilter();
    const selectedIdsSet = this.selectedIds();

    let list = this.members();

    // Text filter
    if (q) {
      list = list.filter(m =>
        fuzzyMatch(q, m.firstName, m.lastName, `${m.firstName} ${m.lastName}`)
      );
    }

    // Squad filter
    if (squadId) {
      list = list.filter(m =>
        m.squads?.some(s => s.id === squadId)
      );
    }

    // Lead filter (role-based)
    if (leadId === 'team-lead') {
      list = list.filter(m => m.role === 'TeamLead');
    } else if (leadId === 'tech-lead') {
      list = list.filter(m => m.role === 'TechLead');
    }

    return list;
  });

  /** Build filtered sections for the template */
  filteredSections = computed((): MemberSection[] => {
    const q = this.query().trim();
    const filtered = this.searchFiltered();
    const selectedIdsSet = this.selectedIds();
    const recent = this.recentMembers();

    // Remove already-selected members from the list
    const available = filtered.filter(m => !selectedIdsSet.has(m.id));

    if (q) {
      // When searching: single "People" section
      return [{ label: 'People', items: available }];
    }

    const sections: MemberSection[] = [];

    // Recent section
    if (recent.length > 0) {
      const recentAvailable = recent.filter(m => !selectedIdsSet.has(m.id));
      if (recentAvailable.length > 0) {
        sections.push({ label: 'Recent', items: recentAvailable, type: 'recent' });
      }
    }

    // People section (excluding recent)
    const recentIds = new Set(recent.map(m => m.id));
    const peopleItems = available.filter(m => !recentIds.has(m.id));
    sections.push({ label: 'People', items: peopleItems, type: 'people' });

    return sections;
  });

  /** Whether there are no results to show */
  protected noResults = computed(() => {
    const sections = this.filteredSections();
    return sections.length === 0 || sections.every(s => s.items.length === 0);
  });

  /** Compute a flat active index across all sections */
  protected globalActiveIndex = computed(() => {
    const sections = this.filteredSections();
    let idx = this.activeIndex();
    // Clamp to available items
    const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
    if (totalItems === 0) return -1;
    return clamp(idx, 0, totalItems - 1);
  });

  /** Helper to compute the global index for a section+row combination */
  protected computeGlobalIndex = (sectionIndex: number, rowIndex: number): number => {
    const sections = this.filteredSections();
    let globalIdx = 0;
    for (let si = 0; si < sectionIndex; si++) {
      globalIdx += sections[si].items.length;
    }
    return globalIdx + rowIndex;
  };

  /** Total count of all visible items across all sections */
  private totalItems = computed(() =>
    this.filteredSections().reduce((sum, s) => sum + s.items.length, 0)
  );

  // ── Filter options ──
  protected squadFilterOptions = computed((): FilterOption[] =>
    this.squads().map(s => ({ id: s.id, label: s.name }))
  );

  protected leadFilterOptions = computed((): FilterOption[] => [
    { id: 'team-lead', label: 'Team Lead' },
    { id: 'tech-lead', label: 'Tech Lead' },
  ]);

  // ── Display helpers ──
  protected searchPlaceholder = (): string => {
    if (this.isLoading()) return 'Loading…';
    if (this.error()) return '';
    if (this.selectedMembers().length > 0) return '+ Add member';
    return '+ Add member';
  };

  protected helperText = (): string => {
    const modKey = navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl+K';
    return `${modKey} · ↑↓ to navigate · ⏎ to add · Esc to close`;
  };

  // ── Debounce ──
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // ── localStorage keys ──
  private readonly RECENT_STORAGE_KEY = 'k-picker-recent';
  private readonly MAX_RECENT = 10;

  // ── Lifecycle ──
  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.searchInput?.nativeElement?.focus());
  }

  /** Fetch all data from services */
  private loadData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.teamMemberService.getAll({ isActive: true }).subscribe({
      next: (members) => {
        this.members.set(members);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load team members', err);
        this.error.set('Failed to load team members');
        this.isLoading.set(false);
      },
    });

    // Load squads (best-effort)
    this.squadService.getAll().subscribe({
      next: (squads) => this.squads.set(squads),
      error: () => { /* Squad filter will be empty */ },
    });
  }

  /** Retry loading on error */
  protected retryLoad(): void {
    this.loadData();
  }

  // ── Search ──
  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.query.set(value);
      this.activeIndex.set(0);
    }, 150);
  }

  // ── Keyboard navigation (search input) ──
  protected onSearchKeydown(event: KeyboardEvent): void {
    const total = this.totalItems();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      if (total > 0) {
        this.activeIndex.update(i => (i + 1) % total);
      }
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      if (total > 0) {
        this.activeIndex.update(i => (i <= 0 ? total - 1 : i - 1));
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (total > 0 && this.globalActiveIndex() >= 0) {
        const member = this.findMemberByGlobalIndex(this.globalActiveIndex());
        if (member) this.toggleMember(member);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    } else if (event.key === 'Backspace') {
      const input = event.target as HTMLInputElement;
      if (input.value === '' && this.selectedMembers().length > 0) {
        event.preventDefault();
        const last = this.selectedMembers()[this.selectedMembers().length - 1];
        this.removeMember(last);
      }
    }
  }

  // ── Keyboard navigation (global) ──
  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const total = this.totalItems();
      if (total === 0) return;
      event.preventDefault();
      if (event.key === 'ArrowDown') {
        this.activeIndex.update(i => (i + 1) % total);
      } else {
        this.activeIndex.update(i => (i <= 0 ? total - 1 : i - 1));
      }
    }
  }

  /** Find a member by their global flat index in the sections */
  private findMemberByGlobalIndex(globalIdx: number): TeamMember | null {
    const sections = this.filteredSections();
    let counter = 0;
    for (const section of sections) {
      for (const item of section.items) {
        if (counter === globalIdx) return item;
        counter++;
      }
    }
    return null;
  }

  // ── Row hover ──
  protected onRowHover(sectionIndex: number, rowIndex: number): void {
    this.activeIndex.set(this.computeGlobalIndex(sectionIndex, rowIndex));
  }

  // ── Selection ──
  protected toggleMember(member: TeamMember): void {
    // Clear any pending debounce timer so a stale query doesn't overwrite reset
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    const mode = this.data?.mode ?? 'multi';
    const current = this.selectedMembers();
    const isSelected = this.selectedIds().has(member.id);

    if (isSelected) {
      // Deselect
      this.selectedMembers.set(current.filter(m => m.id !== member.id));
    } else {
      // Select
      if (mode === 'single') {
        // Single-select: close immediately
        this.addToRecent(member.id);
        this.dialogRef.close(member);
        return;
      }
      this.selectedMembers.set([...current, member]);
      this.addToRecent(member.id);
      // Clear search query to show full list
      this.query.set('');
      if (this.searchInput) {
        this.searchInput.nativeElement.value = '';
      }
      this.activeIndex.set(0);
    }
  }

  protected removeMember(member: TeamMember): void {
    this.selectedMembers.update(current => current.filter(m => m.id !== member.id));
  }

  // ── Recent selections persistence ──
  private loadRecentFromStorage(): string[] {
    try {
      const stored = localStorage.getItem(this.RECENT_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private saveRecentToStorage(ids: string[]): void {
    try {
      localStorage.setItem(
        this.RECENT_STORAGE_KEY,
        JSON.stringify(ids.slice(0, this.MAX_RECENT))
      );
    } catch {
      // localStorage unavailable — fail silently
    }
  }

  private addToRecent(memberId: string): void {
    const recent = this.recentMemberIds();
    const updated = [memberId, ...recent.filter(id => id !== memberId)];
    this.recentMemberIds.set(updated);
    this.saveRecentToStorage(updated);
  }

  // ── Close ──
  protected close(): void {
    const mode = this.data?.mode ?? 'multi';
    if (mode === 'single') {
      this.dialogRef.close(null);
    } else {
      this.dialogRef.close(this.selectedMembers());
    }
  }
}
