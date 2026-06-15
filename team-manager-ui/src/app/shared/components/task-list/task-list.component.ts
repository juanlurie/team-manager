import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StatusLabelPipe } from '../../../core/pipes/status-label.pipe';

export interface TaskItem {
  id: string;
  title: string;
  type: string;
  status: string;
  externalTicketRef: string | null;
  assignee?: string;
}

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [MatIconModule, MatTooltipModule, StatusLabelPipe],
  styles: [`
    .wi-type { padding:2px 6px;border-radius:6px;font-size:0.68rem;font-weight:700;text-transform:uppercase; }
    .type-analysis  { background:rgba(156,39,176,0.15);color:#ce93d8; }
    .type-design    { background:rgba(0,188,212,0.15);color:#4dd0e1; }
    .type-dev       { background:rgba(33,150,243,0.15);color:#64b5f6; }
    .type-qa        { background:rgba(255,152,0,0.15);color:#ff9800; }
    .type-bug       { background:rgba(244,67,54,0.15);color:#f44336; }
    .type-task      { background:rgba(158,158,158,0.15);color:#9e9e9e; }
    .type-release   { background:rgba(76,175,80,0.15);color:#4caf50; }
    .wi-planned          { background:rgba(158,158,158,0.12);color:#9e9e9e; }
    .wi-inprogress       { background:rgba(33,150,243,0.12);color:#64b5f6; }
    .wi-completed        { background:rgba(76,175,80,0.12);color:#4caf50; }
    .wi-readyforrelease  { background:rgba(255,193,7,0.15);color:#ffd54f; }
    .wi-released         { background:rgba(255,255,255,0.1);color:#e0e0e0;border:1px solid rgba(255,255,255,0.2); }
  `],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    @if (tasks.length === 0) {
      <div style="padding:12px 16px;font-size:0.8rem;opacity:0.3;font-style:italic">
        {{ emptyMessage }}
      </div>
    } @else {
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:0.82rem">
          <thead>
            <tr style="background:rgba(0,0,0,0.2)">
              <th style="padding:7px 16px;text-align:left;opacity:0.5;font-weight:600;white-space:nowrap">Task</th>
              <th style="padding:7px 12px;text-align:left;opacity:0.5;font-weight:600;white-space:nowrap">Type</th>
              <th style="padding:7px 12px;text-align:left;opacity:0.5;font-weight:600;white-space:nowrap">Status</th>
              @if (showAssignee) {
                <th style="padding:7px 16px;text-align:left;opacity:0.5;font-weight:600;white-space:nowrap">Assignee</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (task of tasks; track task.id) {
              <tr style="border-top:1px solid rgba(255,255,255,0.04)">
                <td style="padding:8px 16px">
                  {{ task.title }}
                  @if (task.externalTicketRef) {
                    <span style="opacity:0.4;font-size:0.75rem;margin-left:6px;font-family:monospace">{{ task.externalTicketRef }}</span>
                  }
                </td>
                <td style="padding:8px 12px"><span [class]="'wi-type type-' + task.type.toLowerCase()">{{ task.type }}</span></td>
                <td style="padding:8px 12px"><span [class]="'wi-' + task.status.toLowerCase()">{{ task.status | statusLabel }}</span></td>
                @if (showAssignee) {
                  <td style="padding:8px 16px;opacity:0.7">{{ task.assignee }}</td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `
})
export class TaskListComponent {
  @Input() tasks: TaskItem[] = [];
  @Input() showAssignee = true;
  @Input() emptyMessage = 'No tasks linked to this feature';
}
