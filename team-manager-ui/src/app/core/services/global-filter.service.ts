import { Injectable, signal } from '@angular/core';
import { FilterState } from '../components/k-picker/k-picker.types';
import { TeamMember } from '../models/team-member.model';

@Injectable({ providedIn: 'root' })
export class GlobalFilterService {
  readonly filters = signal<FilterState>({
    squadId: null,
    featureId: null,
    leadId: null,
  });

  readonly searchHint = signal<string>('');

  /** Last members selected in the k-picker, used to re-populate it on next open */
  readonly selectedMembers = signal<TeamMember[]>([]);

  setFilters(filters: Partial<FilterState>): void {
    this.filters.update(current => ({ ...current, ...filters }));
  }

  setSearchHint(hint: string): void {
    this.searchHint.set(hint);
  }

  setSelectedMembers(members: TeamMember[]): void {
    this.selectedMembers.set(members);
  }

  clearFilters(): void {
    this.filters.set({ squadId: null, featureId: null, leadId: null });
    this.searchHint.set('');
    this.selectedMembers.set([]);
  }
}
