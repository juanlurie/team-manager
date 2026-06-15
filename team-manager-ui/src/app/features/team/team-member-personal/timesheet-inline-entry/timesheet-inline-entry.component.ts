import { Component, computed, inject, input, output, signal, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  QUICK_COMBOS,
  TIME_PRESETS_MINUTES, WORKED_FROM_OPTIONS, SENTIMENT_OPTIONS,
} from '../timesheet-data.constants';
import { TimesheetDefaultsService } from '../../../../core/services/timesheet-defaults.service';
import { CreateTimesheetEntryRequest } from '../../../../core/models/timesheet.model';

@Component({
  selector: 'app-timesheet-inline-entry',
  standalone: true,
  imports: [FormsModule, MatButtonModule],
  styles: [`
    .combo-chip {
      padding: 7px 14px; border-radius: 16px; font-size: 0.8rem; font-weight: 600;
      border: 1px solid rgba(100,181,246,0.3); background: rgba(100,181,246,0.08);
      color: #64b5f6; cursor: pointer; transition: background 0.12s;
    }
    .combo-chip:hover, .combo-chip.active { background: rgba(100,181,246,0.2); }
    .step-btn {
      width: 40px; height: 40px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); cursor: pointer;
      font-size: 1.1rem; line-height: 1; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .step-btn:hover { border-color: #64b5f6; color: #64b5f6; }
    .preset-chip {
      padding: 5px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 600;
      border: 1px solid rgba(255,255,255,0.13); background: transparent;
      color: rgba(255,255,255,0.55); cursor: pointer; transition: all 0.12s;
    }
    .preset-chip:hover { border-color: #64b5f6; color: #64b5f6; background: rgba(100,181,246,0.1); }
    .c-select {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px; color: inherit; font-size: 0.8rem; padding: 5px 7px;
      outline: none; font-family: inherit; cursor: pointer;
    }
    .c-select:disabled { opacity: 0.4; cursor: not-allowed; }
  `],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div style="border-top:1px solid rgba(255,255,255,0.07);padding:10px 0 6px;margin-top:4px">

      <!-- Quick combos -->
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:9px">
        @for (combo of combos; track combo.label) {
          <button class="combo-chip" type="button"
                  [class.active]="project() === combo.project && category() === combo.category"
                  (click)="applyCombo(combo)">{{ combo.label }}</button>
        }
      </div>

      <!-- Time row -->
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:9px">
        <button class="step-btn" type="button" (click)="stepTime(-15)">−</button>
        <span style="font-size:0.95rem;font-weight:700;min-width:52px;text-align:center">{{ timeLabel() }}</span>
        <button class="step-btn" type="button" (click)="stepTime(15)">+</button>
        <div style="display:flex;gap:3px;flex-wrap:wrap;margin-left:2px">
          @for (preset of timePresets; track preset) {
            <button class="preset-chip" type="button" (click)="totalMinutes.set(preset)">{{ formatPreset(preset) }}</button>
          }
        </div>
      </div>

      <!-- Project / Category / WorkedFrom / Sentiment / Billable -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:9px">
        <select [ngModel]="project()" (ngModelChange)="setProject($event)" class="c-select" style="min-width:150px">
          <option value="">Project…</option>
          @for (p of projects; track p) { <option [value]="p">{{ p }}</option> }
        </select>
        <select [ngModel]="category()" (ngModelChange)="category.set($event)" class="c-select"
                [disabled]="!project()" style="min-width:150px">
          <option value="">Category…</option>
          @for (c of availableCategories(); track c) { <option [value]="c">{{ c }}</option> }
        </select>
        <select [ngModel]="workedFrom()" (ngModelChange)="workedFrom.set($event)" class="c-select">
          @for (opt of workedFromOptions; track opt) { <option [value]="opt">{{ opt }}</option> }
        </select>
        <select [ngModel]="sentiment()" (ngModelChange)="sentiment.set($event)" class="c-select">
          @for (opt of sentimentOptions; track opt) { <option [value]="opt">{{ opt }}</option> }
        </select>
        <label style="display:flex;align-items:center;gap:4px;font-size:0.8rem;cursor:pointer;flex-shrink:0;white-space:nowrap">
          <input type="checkbox" [checked]="billable()" (change)="billable.set(!billable())"
                 style="accent-color:#64b5f6;width:14px;height:14px;cursor:pointer">
          Billable
        </label>
      </div>

      <!-- Actions -->
      <div style="display:flex;align-items:center;gap:8px">
        <button type="button"
                style="background:none;border:none;color:#64b5f6;font-size:0.78rem;cursor:pointer;padding:0;text-decoration:underline"
                (click)="openFull.emit()">More fields…</button>
        <div style="flex:1"></div>
        <button mat-button type="button" (click)="cancelled.emit()" style="font-size:0.8rem;min-height:40px">Cancel</button>
        <button mat-raised-button color="primary" type="button"
                [disabled]="!isValid()" (click)="save()" style="font-size:0.8rem;min-height:40px">Save</button>
      </div>

    </div>
  `
})
export class TimesheetInlineEntryComponent {
  date = input.required<string>();

  saved = output<CreateTimesheetEntryRequest>();
  cancelled = output();
  openFull = output();

  private tsd = inject(TimesheetDefaultsService);

  readonly combos = QUICK_COMBOS;
  readonly timePresets = TIME_PRESETS_MINUTES;
  get projects() { return this.tsd.projects(); }
  readonly workedFromOptions = WORKED_FROM_OPTIONS;
  readonly sentimentOptions = SENTIMENT_OPTIONS;

  project = signal('');
  category = signal('');
  totalMinutes = signal(60);
  workedFrom = signal('Home');
  sentiment = signal('Neutral');
  billable = signal(false);

  availableCategories = computed(() => this.tsd.categoriesFor(this.project()));
  isValid = computed(() => !!this.project() && !!this.category() && this.totalMinutes() > 0);
  timeLabel = computed(() => {
    const h = Math.floor(this.totalMinutes() / 60);
    const m = this.totalMinutes() % 60;
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    return `${m}m`;
  });

  formatPreset(mins: number): string {
    return mins < 60 ? `${mins}m` : `${mins / 60}h`;
  }

  applyCombo(combo: typeof QUICK_COMBOS[0]) {
    this.project.set(combo.project);
    this.category.set(combo.category);
  }

  setProject(p: string) {
    this.project.set(p);
    this.category.set('');
  }

  stepTime(delta: number) {
    this.totalMinutes.update(m => Math.max(15, m + delta));
  }

  save() {
    if (!this.isValid()) return;
    this.saved.emit({
      date: this.date(),
      project: this.project(),
      category: this.category(),
      hours: Math.floor(this.totalMinutes() / 60),
      minutes: this.totalMinutes() % 60,
      billable: this.billable(),
      workedFrom: this.workedFrom(),
      sentiment: this.sentiment(),
      description: null,
      ticketNumber: null,
    });
    this.totalMinutes.set(60);
  }
}
