import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface TimesheetDefaults {
  projects: string[];
  categories: Record<string, string[]>;
  correlationIds: Record<string, string>;
}

const EMPTY: TimesheetDefaults = { projects: [], categories: {}, correlationIds: {} };

@Injectable({ providedIn: 'root' })
export class TimesheetDefaultsService {
  private http = inject(HttpClient);

  private _defaults = signal<TimesheetDefaults>(EMPTY);
  private _loaded = false;

  get defaults() { return this._defaults.asReadonly(); }

  load() {
    if (this._loaded) return;
    this._loaded = true;
    this.http.get<TimesheetDefaults>('/api/v1/timesheet-defaults').subscribe({
      next: (d) => this._defaults.set(d),
      error: () => {}
    });
  }

  reload() {
    this._loaded = false;
    this.load();
  }

  projects(): string[] {
    return this._defaults().projects;
  }

  categoriesFor(project: string): string[] {
    return this._defaults().categories[project] ?? [];
  }

  correlationId(name: string): string | undefined {
    return this._defaults().correlationIds[name];
  }
}
