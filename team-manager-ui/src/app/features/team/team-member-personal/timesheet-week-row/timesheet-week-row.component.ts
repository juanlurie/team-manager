import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TimesheetEntry } from '../../../../core/models/timesheet.model';
import { IconButtonComponent } from '../../../../shared/components/icon-btn/icon-btn.component';

@Component({
  selector: 'app-timesheet-week-row',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule, IconButtonComponent],
  styles: [`
    .entry-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 5px 10px; border-radius: 14px; font-size: 0.8rem;
      background: rgba(100,181,246,0.12); border: 1px solid rgba(100,181,246,0.25);
      color: rgba(255,255,255,0.85); cursor: pointer; transition: background 0.12s;
    }
    .entry-chip:hover { background: rgba(100,181,246,0.22); }
  `],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)"
         [style.opacity]="isInCurrentMonth() ? '1' : '0.4'">
      <div style="display:flex;align-items:flex-start;gap:8px;min-height:40px">

        <!-- Day label + total -->
        <div style="min-width:64px;flex-shrink:0;padding-top:6px">
          <div style="font-size:0.8rem"
               [style.color]="isToday() ? '#64b5f6' : 'rgba(255,255,255,0.5)'"
               [style.fontWeight]="isToday() ? '700' : '400'">{{ dayLabel() }}</div>
          @if (dayTotal() > 0) {
            <div style="font-size:0.82rem;font-weight:700;color:rgba(255,255,255,0.85);margin-top:1px">
              {{ formatMinutes(dayTotal()) }}
            </div>
          }
        </div>

        <!-- Entry chips (tap to open day dialog) -->
        <div style="flex:1;display:flex;flex-wrap:wrap;gap:5px;min-width:0;padding-top:5px">
          @for (entry of entries(); track entry.id) {
            <span class="entry-chip" (click)="openDay.emit(date())" matTooltip="Manage this day">
              {{ entryLabel(entry) }}
            </span>
          }

          <!-- Add / open dialog button -->
          <app-icon-btn [icon]="entries().length > 0 ? 'edit_calendar' : 'add'" size="lg" tooltip="Manage this day" (btnClick)="openDay.emit(date())" />
        </div>

      </div>
    </div>
  `
})
export class TimesheetWeekRowComponent {
  date = input.required<string>();
  entries = input.required<TimesheetEntry[]>();
  isToday = input<boolean>(false);
  isInCurrentMonth = input<boolean>(true);

  openDay = output<string>();

  dayLabel = computed(() => {
    const d = new Date(this.date() + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
  });

  dayTotal = computed(() =>
    this.entries().reduce((s, e) => s + e.hours * 60 + e.minutes, 0)
  );

  entryLabel(entry: TimesheetEntry): string {
    return `${this.formatMinutes(entry.hours * 60 + entry.minutes)} · ${entry.category}`;
  }

  formatMinutes(total: number): string {
    const h = Math.floor(total / 60), m = total % 60;
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    return `${m}m`;
  }
}
