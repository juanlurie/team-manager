import { Component, computed, effect, input, output, signal, untracked, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { TeamMemberService } from '../../../core/services/team-member.service';

export interface FilterOption { id: string; label: string; }
export interface FilterGroup { key: string; label: string; icon: string; options: FilterOption[]; }

export interface MentionItem {
  id: string;
  label: string;
}

/** Strip @Name mentions from a search string for plain-text matching */
export function stripMentions(text: string): string {
  return text.replace(/@[\w'-]+(?:\s[\w'-]+)*/g, '').trim();
}

/** Extract lowercased names from @mention tokens in a search string */
export function extractMentionNames(text: string): string[] {
  return [...text.matchAll(/@([\w'-]+(?:\s[\w'-]+)*)/g)].map(m => m[1].toLowerCase());
}

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatMenuModule],
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.scss']
})
export class FilterBarComponent implements OnInit {
  private teamMemberSvc = inject(TeamMemberService);

  groups = input<FilterGroup[]>([]);
  searchPlaceholder = input('Search…');
  mentionHint = input('Type @ to mention a team member');
  searchVal = input('');
  selectedValues = input<Record<string, string[]>>({});

  searchChange = output<string>();
  apply = output<Record<string, string[]>>();

  search = signal('');
  selected = signal<Record<string, string[]>>({});

  /** @-mention candidates loaded from TeamMemberService */
  private mentionCandidates = signal<MentionItem[]>([]);

  // @-mention state
  mentionActive = signal(false);
  mentionQuery = signal('');
  mentionAtPos = 0;
  mentionSelectedIndex = 0;

  filteredMentions = computed(() => {
    if (!this.mentionActive()) return [];
    const q = this.mentionQuery().toLowerCase();
    if (!q) return [];
    return this.mentionCandidates().filter(m =>
      m.label.toLowerCase().includes(q)
    ).slice(0, 10);
  });

  /** Extract all @-mentioned members currently in the search text */
  activeMentions = computed(() => {
    const q = this.search();
    const items = this.mentionCandidates();
    const result: MentionItem[] = [];
    const seen = new Set<string>();
    const regex = /@([\w'-]+(?:\s[\w'-]+)*)/g;
    let match;
    while ((match = regex.exec(q)) !== null) {
      const name = match[1].toLowerCase();
      const found = items.find(m => m.label.toLowerCase().includes(name));
      if (found && !seen.has(found.id)) {
        seen.add(found.id);
        result.push(found);
      }
    }
    return result;
  });

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
    effect(() => { const v = this.searchVal(); untracked(() => this.search.set(v)); });
    effect(() => { const v = this.selectedValues(); untracked(() => this.selected.set({ ...v })); });
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

  hasGroups = computed(() => this.groups().some(g => g.options.length > 0));

  sheetTabCount(key: string): number {
    return (this.selected()[key] ?? []).length;
  }

  onSearchInput(val: string, event: Event) {
    this.search.set(val);
    this.searchChange.emit(val);
    this.detectMention(val, event);
  }

  onSearchKeydown(event: KeyboardEvent) {
    if (this.mentionActive() && this.filteredMentions().length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const max = this.filteredMentions().length - 1;
        this.mentionSelectedIndex = Math.min(this.mentionSelectedIndex + 1, max);
        return;
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.mentionSelectedIndex = Math.max(this.mentionSelectedIndex - 1, 0);
        return;
      } else if (event.key === 'Enter' || event.key === 'Tab') {
        const items = this.filteredMentions();
        if (items[this.mentionSelectedIndex]) {
          event.preventDefault();
          this.insertMention(items[this.mentionSelectedIndex]);
          return;
        }
      } else if (event.key === 'Escape') {
        this.resetMention();
        return;
      }
    }
    if (event.key === 'Escape' && this.search()) {
      event.preventDefault();
      this.search.set('');
      this.searchChange.emit('');
    }
  }

  ngOnInit() {
    this.teamMemberSvc.getAll({ isActive: true }).subscribe(members => {
      this.mentionCandidates.set(members.map(m => ({
        id: m.id,
        label: `${m.firstName} ${m.lastName}`
      })));
    });
  }

  private detectMention(val: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const cursorPos = input.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atIdx = textBeforeCursor.lastIndexOf('@');
    if (atIdx >= 0) {
      const query = textBeforeCursor.slice(atIdx + 1);
      if (!query.includes(' ')) {
        this.mentionActive.set(true);
        this.mentionAtPos = atIdx;
        this.mentionQuery.set(query);
        this.mentionSelectedIndex = 0;
        return;
      }
    }
    this.resetMention();
  }

  private resetMention() {
    this.mentionActive.set(false);
    this.mentionQuery.set('');
    this.mentionSelectedIndex = 0;
  }

  insertMention(item: MentionItem) {
    const before = this.search().slice(0, this.mentionAtPos);
    const after = this.search().slice(this.mentionAtPos + 1 + this.mentionQuery().length);
    const newVal = `${before}@${item.label} ${after}`;
    this.search.set(newVal);
    this.searchChange.emit(newVal);
    this.resetMention();
  }

  /** Remove a @-mentioned member from the search text */
  removeMention(item: MentionItem) {
    const escaped = item.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`@${escaped}\\s*`, 'g');
    const newVal = this.search().replace(regex, '').trim().replace(/\s{2,}/g, ' ');
    this.search.set(newVal);
    this.searchChange.emit(newVal);
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
    this.sheetOpen.set(false);
    this.apply.emit(this.selected());
  }
}
