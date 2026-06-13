import { Component, input, output, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Sprint } from '../../../core/models/sprint.model';
import { Feature } from '../../../core/models/feature.model';
import { IconButtonComponent } from '../icon-btn/icon-btn.component';

const STATUS_ORDER = ['InProgress', 'Planned', 'Completed', 'ReadyForRelease', 'Released'];

const STATUS_COLOR: Record<string, string> = {
  InProgress: '#E67E22', Planned: '#95A5A6', Completed: '#2980B9',
  ReadyForRelease: '#8E44AD', Released: '#27AE60'
};

@Component({
  selector: 'app-current-sprint-card',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatChipsModule, MatTooltipModule, IconButtonComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <a [routerLink]="['/delivery/sprints', sprint().id]"
       style="padding:18px 20px;border-radius:12px;display:block;text-decoration:none;color:inherit;cursor:pointer;
              background:linear-gradient(135deg,rgba(100,181,246,0.12),rgba(100,181,246,0.04));
              border:1px solid rgba(100,181,246,0.25);transition:border-color 0.15s,background 0.15s"
       (mouseenter)="$any($event.currentTarget).style.borderColor='rgba(100,181,246,0.5)'"
       (mouseleave)="$any($event.currentTarget).style.borderColor='rgba(100,181,246,0.25)'"
       >
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">
        <div style="flex:1;min-width:0">
          <div style="font-size:1.05rem;font-weight:600">{{ sprint().name }}</div>
          <div style="font-size:0.8rem;opacity:0.55;margin-top:2px">
            {{ sprint().startDate | date:'d MMM' }} – {{ sprint().endDate | date:'d MMM yyyy' }}
            @if (sprint().piName) {
              · <span>{{ sprint().piName }}</span>
            }
          </div>
        </div>
        @if (sprint().isInnovationSprint) {
          <mat-chip>IP Sprint</mat-chip>
        }
        @if (showEditButton()) {
          <app-icon-btn icon="edit" size="sm" tooltip="Edit" (btnClick)="$event.preventDefault(); $event.stopPropagation(); edit.emit(sprint())" />
        }
      </div>

      @if (sortedFeatures().length) {
        <div style="border-top:1px solid rgba(100,181,246,0.15);padding-top:12px">
          <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;opacity:0.4;margin-bottom:8px">Sprint Goals</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            @for (f of sortedFeatures(); track f.id) {
              <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;
                           font-size:0.72rem;font-weight:500;
                           background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1)">
                <span [style.width]="'7px'" [style.height]="'7px'" [style.border-radius]="'50%'"
                      [style.background]="featureStatusColor(f.status)" [style.flex-shrink]="'0'"></span>
                {{ f.externalTicketRef ? f.externalTicketRef + ' · ' : '' }}{{ f.title }}
              </span>
            }
          </div>
        </div>
      }
    </a>
  `
})
export class CurrentSprintCardComponent {
  readonly sprint = input.required<Sprint>();
  readonly features = input<Feature[]>([]);
  readonly showEditButton = input(true);
  readonly edit = output<Sprint>();

  sortedFeatures = computed(() =>
    [...this.features().filter(f => f.isActive)]
      .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
  );

  featureStatusColor(status: string): string {
    return STATUS_COLOR[status] ?? '#95A5A6';
  }
}
