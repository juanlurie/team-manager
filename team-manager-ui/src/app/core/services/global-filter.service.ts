import { Injectable, signal } from '@angular/core';
import { FilterState } from '../components/k-picker/k-picker.types';

@Injectable({ providedIn: 'root' })
export class GlobalFilterService {
  // Current filter state (set by k-picker)
  readonly filters = signal<FilterState>({
    squadId: null,
    featureId: null,
    leadId: null,
  });

  // Helper to update filters
  setFilters(filters: Partial<FilterState>): void {
    this.filters.update(current => ({ ...current, ...filters }));
  }

  // Helper to clear all filters
  clearFilters(): void {
    this.filters.set({ squadId: null, featureId: null, leadId: null });
  }
}
