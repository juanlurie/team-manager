import { Component, inject, computed, signal, effect, OnDestroy, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IconButtonComponent } from '../../../../shared/components/icon-btn/icon-btn.component';
import { TimesheetService } from '../../../../core/services/timesheet.service';
import { TimesheetEntry, CreateTimesheetEntryRequest } from '../../../../core/models/timesheet.model';
import {
  SENTIMENT_OPTIONS, TIME_PRESETS_MINUTES, QUICK_COMBOS, DESCRIPTION_PRESETS,
} from '../timesheet-data.constants';
import { TimesheetDefaultsService } from '../../../../core/services/timesheet-defaults.service';

export interface TimesheetEntryDialogData {
  memberId: string;
  defaultDate?: string;
  workLocationOptions?: string[];
}

@Component({
  selector: 'app-timesheet-entry-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, IconButtonComponent],
  styles: [`
    .date-nav {
      display: flex; align-items: center; gap: 8px;
      background: rgba(255,255,255,0.04); border-radius: 10px;
      padding: 4px 8px; margin-bottom: 16px;
    }
    .date-nav-label { flex: 1; text-align: center; font-size: 1rem; font-weight: 700; }
    .nav-btn { width: 48px !important; height: 48px !important; flex-shrink: 0; }

    .entry-row {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 4px; border-radius: 8px; transition: background 0.1s;
    }
    .entry-row.is-editing { background: rgba(100,181,246,0.08); border: 1px solid rgba(100,181,246,0.2); }
    .time-adj { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .adj-btn {
      width: 32px; height: 32px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.13);
      background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.6);
      cursor: pointer; font-size: 1.1rem; line-height: 1;
      display: flex; align-items: center; justify-content: center; transition: border-color 0.12s, color 0.12s;
      flex-shrink: 0;
    }
    .adj-btn:hover { border-color: #64b5f6; color: #64b5f6; }
    .entry-badge {
      font-size: 0.82rem; font-weight: 700; color: #64b5f6;
      min-width: 46px; text-align: center; flex-shrink: 0;
    }
    .entry-details { flex: 1; min-width: 0; }
    .entry-cat { font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .entry-proj { font-size: 0.72rem; opacity: 0.45; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .entry-btns { display: flex; gap: 2px; flex-shrink: 0; }
    .icon-btn {
      width: 36px; height: 36px; border: none; background: none; border-radius: 8px;
      cursor: pointer; color: rgba(255,255,255,0.4);
      display: flex; align-items: center; justify-content: center; transition: color 0.12s, background 0.12s;
    }
    .icon-btn:hover { color: rgba(255,255,255,0.9); background: rgba(255,255,255,0.06); }
    .icon-btn.danger:hover { color: #ef9a9a; background: rgba(239,154,154,0.08); }
    .icon-btn mat-icon { font-size: 18px; width: 18px; height: 18px; line-height: 18px; }

    .day-total-row { text-align: right; font-size: 0.8rem; opacity: 0.5; padding: 4px 6px 0; }
    .no-entries { text-align: center; padding: 10px; font-size: 0.85rem; opacity: 0.35; }
    .section-divider { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 14px 0; }

    .form-heading {
      font-size: 0.72rem; font-weight: 700; opacity: 0.45;
      text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px;
    }

    .combo-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
    .combo-chip {
      padding: 8px 16px; border-radius: 20px; font-size: 0.82rem; font-weight: 600;
      border: 1px solid rgba(100,181,246,0.3); background: rgba(100,181,246,0.08);
      color: #64b5f6; cursor: pointer; transition: background 0.12s;
    }
    .combo-chip:hover, .combo-chip.active { background: rgba(100,181,246,0.22); }

    .time-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .step-btn {
      width: 44px; height: 44px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7);
      cursor: pointer; font-size: 1.2rem; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; transition: border-color 0.12s, color 0.12s;
    }
    .step-btn:hover { border-color: #64b5f6; color: #64b5f6; }
    .time-label { font-size: 1.1rem; font-weight: 700; min-width: 60px; text-align: center; }
    .presets { display: flex; gap: 4px; flex-wrap: wrap; }
    .preset-chip {
      padding: 5px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600;
      border: 1px solid rgba(255,255,255,0.13); background: transparent;
      color: rgba(255,255,255,0.55); cursor: pointer; transition: all 0.12s;
    }
    .preset-chip:hover { border-color: #64b5f6; color: #64b5f6; background: rgba(100,181,246,0.1); }

    .field-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
    .field-select {
      width: 100%; box-sizing: border-box;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px; color: inherit; font-size: 0.88rem;
      padding: 10px 12px; outline: none; font-family: inherit; cursor: pointer;
    }
    .field-select:disabled { opacity: 0.4; cursor: not-allowed; }

    .meta-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; }
    .billable-label {
      display: flex; align-items: center; gap: 6px;
      font-size: 0.85rem; cursor: pointer; flex-shrink: 0; min-height: 40px;
    }
    .billable-label input { width: 16px; height: 16px; cursor: pointer; accent-color: #64b5f6; }
    .field-select-sm {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px; color: inherit; font-size: 0.85rem;
      padding: 8px 10px; outline: none; font-family: inherit; cursor: pointer;
      flex: 1; min-width: 90px;
    }

    .form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 14px; }
    .action-btn { min-height: 44px; }
    .save-btn { flex: 1; }
    @media (max-width: 599px) {
      .form-actions { flex-direction: column-reverse; }
      .action-btn { width: 100%; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <mat-dialog-content style="padding-top:12px;min-width:min(480px,90vw)">

      <!-- Date navigation -->
      <div class="date-nav">
        <app-icon-btn icon="chevron_left" size="lg" tooltip="Previous day" (btnClick)="prevDay()" />
        <div class="date-nav-label">{{ dateLabel() }}</div>
        <app-icon-btn icon="chevron_right" size="lg" tooltip="Next day" (btnClick)="nextDay()" />
      </div>

      <!-- Existing entries for this day -->
      @if (loadingDay()) {
        <div style="display:flex;justify-content:center;padding:16px">
          <mat-spinner diameter="28"></mat-spinner>
        </div>
      } @else if (dayEntries().length > 0) {
        @for (entry of dayEntries(); track entry.id) {
          <div class="entry-row" [class.is-editing]="editingEntryId() === entry.id">
            <div class="time-adj">
              <button class="adj-btn" type="button" (click)="adjustEntryTime(entry, -15)">−</button>
              <div class="entry-badge">{{ formatMinutes(entry.hours * 60 + entry.minutes) }}</div>
              <button class="adj-btn" type="button" (click)="adjustEntryTime(entry, 15)">+</button>
            </div>
            <div class="entry-details">
              <div class="entry-cat">{{ entry.category }}</div>
              <div class="entry-proj">{{ entry.project }}@if (entry.description) { · {{ entry.description }} }</div>
            </div>
            <div class="entry-btns">
              <button class="icon-btn" type="button" (click)="startEdit(entry)"
                      [disabled]="editingEntryId() === entry.id">
                <mat-icon>edit</mat-icon>
              </button>
              <button class="icon-btn danger" type="button" (click)="deleteEntry(entry)">
                <mat-icon>delete_outline</mat-icon>
              </button>
            </div>
          </div>
        }
        <div class="day-total-row">Day total: <strong style="color:rgba(255,255,255,0.8)">{{ dayTotal() }}</strong></div>
      } @else {
        <div class="no-entries">No entries yet — add one below</div>
      }

      <hr class="section-divider">

      <!-- Add / Edit form -->
      <div class="form-heading">{{ editingEntryId() ? 'Edit Entry' : 'Add Entry' }}</div>

      <!-- Quick combos -->
      <div class="combo-row">
        @for (combo of quickCombos; track combo.label) {
          <button class="combo-chip" type="button"
                  [class.active]="project() === combo.project && category() === combo.category"
                  (click)="applyCombo(combo)">{{ combo.label }}</button>
        }
      </div>

      <!-- Time stepper -->
      <div class="time-row">
        <button class="step-btn" type="button" (click)="stepTime(-15)">−</button>
        <span class="time-label">{{ timeLabel() }}</span>
        <button class="step-btn" type="button" (click)="stepTime(15)">+</button>
        <div class="presets">
          @for (preset of timePresets; track preset) {
            <button class="preset-chip" type="button" (click)="totalMinutes.set(preset)">{{ formatPreset(preset) }}</button>
          }
        </div>
      </div>

      <!-- Project + Category -->
      <div class="field-group">
        <select [ngModel]="project()" (ngModelChange)="setProject($event)" class="field-select">
          <option value="">— Project —</option>
          @for (p of projects; track p) { <option [value]="p">{{ p }}</option> }
        </select>
        <select [ngModel]="category()" (ngModelChange)="category.set($event)" class="field-select"
                [disabled]="!project()">
          <option value="">— Category —</option>
          @for (c of availableCategories(); track c) { <option [value]="c">{{ c }}</option> }
        </select>
      </div>

      <!-- Meta row -->
      <div class="meta-row">
        <label class="billable-label">
          <input type="checkbox" [checked]="billable()" (change)="billable.set(!billable())"> Billable
        </label>
        <select [ngModel]="workedFrom()" (ngModelChange)="workedFrom.set($event)" class="field-select-sm">
          @for (opt of workedFromOptions; track opt) { <option [value]="opt">{{ opt }}</option> }
        </select>
        <select [ngModel]="sentiment()" (ngModelChange)="sentiment.set($event)" class="field-select-sm">
          @for (opt of sentimentOptions; track opt) { <option [value]="opt">{{ opt }}</option> }
        </select>
      </div>

      <!-- Description presets -->
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:6px">
        @for (p of descriptionPresets; track p) {
          <button class="preset-chip" type="button"
                  [style.border-color]="description() === p ? '#64b5f6' : ''"
                  [style.color]="description() === p ? '#64b5f6' : ''"
                  (click)="description.set(description() === p ? '' : p)">{{ p }}</button>
        }
      </div>
      <textarea [ngModel]="description()" (ngModelChange)="description.set($event)"
                rows="2" placeholder="Description (optional)"
                class="field-select" style="resize:vertical;line-height:1.5;margin-bottom:10px"></textarea>

      <!-- Form actions -->
      <div class="form-actions">
        @if (editingEntryId()) {
          <button mat-button class="action-btn" type="button" (click)="cancelEdit()">Cancel</button>
        }
        <button mat-raised-button color="primary" class="action-btn save-btn"
                [disabled]="!isValid() || saving()" type="button" (click)="save()">
          {{ editingEntryId() ? 'Update' : 'Add Entry' }}
        </button>
      </div>

    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close style="min-height:44px">Close</button>
    </mat-dialog-actions>
  `
})
export class TimesheetEntryDialogComponent implements OnDestroy {
  dialogRef = inject(MatDialogRef<TimesheetEntryDialogComponent>);
  data: TimesheetEntryDialogData = inject(MAT_DIALOG_DATA);
  private svc = inject(TimesheetService);
  private tsd = inject(TimesheetDefaultsService);

  get projects() { return this.tsd.projects(); }
  get workedFromOptions() { return this.data.workLocationOptions?.length ? this.data.workLocationOptions : ['Home', 'Client', 'Other']; }
  readonly sentimentOptions = SENTIMENT_OPTIONS;
  readonly timePresets = TIME_PRESETS_MINUTES;
  readonly quickCombos = QUICK_COMBOS;
  readonly descriptionPresets = DESCRIPTION_PRESETS;

  // Date state
  dateStr = signal(this.data.defaultDate ?? new Date().toISOString().substring(0, 10));
  dateLabel = computed(() => {
    const d = new Date(this.dateStr() + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  });
  private viewMonthKey = computed(() => this.dateStr().substring(0, 7));

  // Entries
  monthEntries = signal<TimesheetEntry[]>([]);
  loadingDay = signal(false);
  dayEntries = computed(() =>
    this.monthEntries()
      .filter(e => e.date === this.dateStr())
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  );
  dayTotal = computed(() => {
    const total = this.dayEntries().reduce((s, e) => s + e.hours * 60 + e.minutes, 0);
    return this.formatMinutes(total);
  });

  // Form state
  editingEntryId = signal<string | null>(null);
  saving = signal(false);
  project = signal('');
  category = signal('');
  totalMinutes = signal(60);
  billable = signal(false);
  workedFrom = signal('Home');
  sentiment = signal('Neutral');
  description = signal('');

  availableCategories = computed(() => this.tsd.categoriesFor(this.project()));
  hours = computed(() => Math.floor(this.totalMinutes() / 60));
  minutes = computed(() => this.totalMinutes() % 60);
  isValid = computed(() => !!this.project() && !!this.category() && this.totalMinutes() > 0);
  timeLabel = computed(() => {
    const h = this.hours(), m = this.minutes();
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    return `${m}m`;
  });

  private lastLoadedMonthKey = '';
  private adjustTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private pendingMinutes = new Map<string, number>();

  constructor() {
    effect(() => {
      const key = this.viewMonthKey();
      if (key !== this.lastLoadedMonthKey) {
        this.lastLoadedMonthKey = key;
        this.loadMonthEntries(+key.substring(0, 4), +key.substring(5, 7));
      }
    });
  }

  private loadMonthEntries(year: number, month: number) {
    this.loadingDay.set(true);
    this.svc.getByMonth(this.data.memberId, year, month).subscribe({
      next: entries => { this.monthEntries.set(entries); this.loadingDay.set(false); },
      error: () => this.loadingDay.set(false),
    });
  }

  prevDay() { this.dateStr.update(d => this.shiftDay(d, -1)); }
  nextDay() { this.dateStr.update(d => this.shiftDay(d, 1)); }

  private shiftDay(iso: string, delta: number): string {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    return d.toISOString().substring(0, 10);
  }

  startEdit(entry: TimesheetEntry) {
    this.editingEntryId.set(entry.id);
    this.project.set(entry.project);
    this.category.set(entry.category);
    this.totalMinutes.set(entry.hours * 60 + entry.minutes);
    this.billable.set(entry.billable);
    this.workedFrom.set(entry.workedFrom);
    this.sentiment.set(entry.sentiment);
    this.description.set(entry.description ?? '');
  }

  cancelEdit() {
    this.editingEntryId.set(null);
    this.resetForm();
  }

  deleteEntry(entry: TimesheetEntry) {
    this.svc.delete(this.data.memberId, entry.id).subscribe(() => {
      this.monthEntries.update(list => list.filter(e => e.id !== entry.id));
      if (this.editingEntryId() === entry.id) this.cancelEdit();
    });
  }

  save() {
    if (!this.isValid() || this.saving()) return;
    const req: CreateTimesheetEntryRequest = {
      date: this.dateStr(),
      project: this.project(),
      category: this.category(),
      hours: this.hours(),
      minutes: this.minutes(),
      billable: this.billable(),
      workedFrom: this.workedFrom(),
      sentiment: this.sentiment(),
      description: this.description() || null,
      ticketNumber: null,
    };
    const id = this.editingEntryId();
    this.saving.set(true);
    if (id) {
      this.svc.update(this.data.memberId, id, req).subscribe({
        next: updated => {
          this.monthEntries.update(list => list.map(e => e.id === id ? updated : e));
          this.saving.set(false);
          this.cancelEdit();
        },
        error: () => this.saving.set(false),
      });
    } else {
      this.svc.create(this.data.memberId, req).subscribe({
        next: entry => {
          this.monthEntries.update(list => [...list, entry]);
          this.saving.set(false);
          this.resetForm();
        },
        error: () => this.saving.set(false),
      });
    }
  }

  applyCombo(combo: typeof QUICK_COMBOS[0]) {
    this.project.set(combo.project);
    this.category.set(combo.category);
  }

  setProject(p: string) { this.project.set(p); this.category.set(''); }
  stepTime(delta: number) { this.totalMinutes.update(v => Math.max(15, v + delta)); }
  formatPreset(m: number): string { return m < 60 ? `${m}m` : `${m / 60}h`; }
  formatMinutes(total: number): string {
    const h = Math.floor(total / 60), m = total % 60;
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    return `${m}m`;
  }

  adjustEntryTime(entry: TimesheetEntry, delta: number) {
    const base = this.pendingMinutes.get(entry.id) ?? (entry.hours * 60 + entry.minutes);
    const newMinutes = Math.max(15, base + delta);
    if (newMinutes === base) return;

    this.pendingMinutes.set(entry.id, newMinutes);
    this.monthEntries.update(list => list.map(e =>
      e.id === entry.id
        ? { ...e, hours: Math.floor(newMinutes / 60), minutes: newMinutes % 60 }
        : e
    ));

    clearTimeout(this.adjustTimers.get(entry.id));
    this.adjustTimers.set(entry.id, setTimeout(() => {
      this.adjustTimers.delete(entry.id);
      const settled = this.pendingMinutes.get(entry.id)!;
      this.pendingMinutes.delete(entry.id);
      const req: CreateTimesheetEntryRequest = {
        date: entry.date, project: entry.project, category: entry.category,
        hours: Math.floor(settled / 60), minutes: settled % 60,
        billable: entry.billable, workedFrom: entry.workedFrom, sentiment: entry.sentiment,
        description: entry.description, ticketNumber: entry.ticketNumber,
      };
      this.svc.update(this.data.memberId, entry.id, req).subscribe({
        next: saved => this.monthEntries.update(list => list.map(e => e.id === saved.id ? saved : e)),
        error: () => this.monthEntries.update(list => list.map(e =>
          e.id === entry.id ? entry : e
        )),
      });
    }, 600));
  }

  ngOnDestroy() {
    this.adjustTimers.forEach(t => clearTimeout(t));
  }

  private resetForm() {
    this.project.set('');
    this.category.set('');
    this.totalMinutes.set(60);
    this.billable.set(false);
    this.workedFrom.set('Home');
    this.sentiment.set('Neutral');
    this.description.set('');
  }
}
