import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { DashboardService } from '../../../core/services/dashboard.service';
import { FeatureService } from '../../../core/services/feature.service';
import { SprintDashboard } from '../../../core/models/dashboard.model';
import { Feature } from '../../../core/models/feature.model';
import { FeatureFormDialogComponent } from '../feature-form-dialog/feature-form-dialog.component';
import { StatusLabelPipe } from '../../../core/pipes/status-label.pipe';

interface TaskRow {
  id: string;
  title: string;
  type: string;
  status: string;
  externalTicketRef: string | null;
  assignee: string;
}

interface FeatureView {
  feature: Feature;
  tasks: TaskRow[];
}

@Component({
  selector: 'app-sprint-features',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatDialogModule, MatTooltipModule, MatChipsModule, StatusLabelPipe],
  template: `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap">
      <div>
        <div style="display:flex;align-items:center;gap:8px">
          <a mat-icon-button [routerLink]="['/sprints', sprintId]" matTooltip="Back to sprint">
            <mat-icon>arrow_back</mat-icon>
          </a>
          <h2 style="margin:0;font-size:1.2rem">{{ dashboard()?.sprint?.name }} · Features</h2>
        </div>
        <div style="font-size:0.8rem;opacity:0.5;margin-top:2px;margin-left:44px">
          {{ dashboard()?.sprint?.startDate | date:'d MMM' }} – {{ dashboard()?.sprint?.endDate | date:'d MMM yyyy' }}
        </div>
      </div>
      <span style="flex:1"></span>
      <button mat-raised-button color="primary" (click)="addFeature()">
        <mat-icon>add</mat-icon> New Feature
      </button>
    </div>

    @if (featureViews().length === 0) {
      <div style="text-align:center;padding:64px;opacity:0.35;font-size:0.9rem">
        No features yet — add one to get started
      </div>
    }

    <div style="display:flex;flex-direction:column;gap:16px">
      @for (fv of featureViews(); track fv.feature.id) {
        <div [style.opacity]="fv.feature.isActive ? 1 : 0.45" style="border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);overflow:hidden">

          <!-- Feature header -->
          <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06)">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span style="font-weight:600;font-size:0.95rem">{{ fv.feature.title }}</span>
                @if (fv.feature.externalTicketRef) {
                  <span style="font-size:0.75rem;opacity:0.4;font-family:monospace">{{ fv.feature.externalTicketRef }}</span>
                }
                <span [class]="featureStatusClass(fv.feature.status)">{{ fv.feature.status | statusLabel }}</span>
                @if (fv.feature.status === 'InProgress' && staleDays() >= 5) {
                  <span [style.background]="staleDays() >= 10 ? 'rgba(239,83,80,0.15)' : 'rgba(255,152,0,0.15)'"
                        [style.color]="staleDays() >= 10 ? '#ef5350' : '#ffa726'"
                        style="display:inline-flex;align-items:center;gap:3px;font-size:0.68rem;font-weight:700;
                               padding:2px 7px;border-radius:6px"
                        [matTooltip]="staleDays() + ' days since sprint started'">
                    <mat-icon style="font-size:10px;width:10px;height:10px;line-height:10px">schedule</mat-icon>
                    {{ staleDays() }}d
                  </span>
                }
                @if (!fv.feature.isActive) {
                  <span style="font-size:0.68rem;padding:1px 6px;border-radius:6px;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.35)">hidden</span>
                }
              </div>
              @if (fv.feature.description) {
                <div style="font-size:0.8rem;opacity:0.5;margin-top:4px">{{ fv.feature.description }}</div>
              }
            </div>
            <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
              <span style="font-size:0.75rem;opacity:0.4">{{ fv.tasks.length }} task{{ fv.tasks.length !== 1 ? 's' : '' }}</span>
              <button mat-icon-button style="width:28px;height:28px"
                      [matTooltip]="fv.feature.isActive ? 'Hide from task dropdown' : 'Unhide feature'"
                      (click)="toggleActive(fv.feature)">
                <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px">{{ fv.feature.isActive ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <button mat-icon-button style="width:28px;height:28px" (click)="editFeature(fv.feature)">
                <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px">edit</mat-icon>
              </button>
            </div>
          </div>

          <!-- Tasks table -->
          @if (fv.tasks.length === 0) {
            <div style="padding:12px 16px;font-size:0.8rem;opacity:0.3;font-style:italic">No tasks linked to this feature</div>
          } @else {
            <div style="overflow-x:auto">
              <table style="width:100%;border-collapse:collapse;font-size:0.82rem">
                <thead>
                  <tr style="background:rgba(0,0,0,0.2)">
                    <th style="padding:7px 16px;text-align:left;opacity:0.5;font-weight:600;white-space:nowrap">Task</th>
                    <th style="padding:7px 12px;text-align:left;opacity:0.5;font-weight:600;white-space:nowrap">Type</th>
                    <th style="padding:7px 12px;text-align:left;opacity:0.5;font-weight:600;white-space:nowrap">Status</th>
                    <th style="padding:7px 16px;text-align:left;opacity:0.5;font-weight:600;white-space:nowrap">Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  @for (task of fv.tasks; track task.id) {
                    <tr style="border-top:1px solid rgba(255,255,255,0.04)">
                      <td style="padding:8px 16px">
                        {{ task.title }}
                        @if (task.externalTicketRef) {
                          <span style="opacity:0.4;font-size:0.75rem;margin-left:6px;font-family:monospace">{{ task.externalTicketRef }}</span>
                        }
                      </td>
                      <td style="padding:8px 12px"><span [class]="wiTypeClass(task.type)">{{ task.type }}</span></td>
                      <td style="padding:8px 12px"><span [class]="wiStatusClass(task.status)">{{ task.status | statusLabel }}</span></td>
                      <td style="padding:8px 16px;opacity:0.7">{{ task.assignee }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- Unlinked tasks section -->
      @if (unlinkedTasks().length > 0) {
        <div style="border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);overflow:hidden">
          <div style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.05)">
            <span style="font-size:0.75rem;font-weight:600;opacity:0.35;text-transform:uppercase;letter-spacing:0.08em">Unlinked tasks</span>
          </div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:0.82rem">
              <tbody>
                @for (task of unlinkedTasks(); track task.id) {
                  <tr style="border-top:1px solid rgba(255,255,255,0.04)">
                    <td style="padding:8px 16px">{{ task.title }}</td>
                    <td style="padding:8px 12px"><span [class]="wiTypeClass(task.type)">{{ task.type }}</span></td>
                    <td style="padding:8px 12px"><span [class]="wiStatusClass(task.status)">{{ task.status | statusLabel }}</span></td>
                    <td style="padding:8px 16px;opacity:0.7">{{ task.assignee }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .wi-type  { padding:2px 6px;border-radius:6px;font-size:0.68rem;font-weight:700;text-transform:uppercase; }
    .wi-badge { padding:2px 6px;border-radius:6px;font-size:0.68rem;font-weight:600; }
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
    .fs-planned          { padding:2px 8px;border-radius:8px;font-size:0.7rem;font-weight:600;background:rgba(158,158,158,0.15);color:#9e9e9e; }
    .fs-inprogress       { padding:2px 8px;border-radius:8px;font-size:0.7rem;font-weight:600;background:rgba(33,150,243,0.15);color:#64b5f6; }
    .fs-completed        { padding:2px 8px;border-radius:8px;font-size:0.7rem;font-weight:600;background:rgba(76,175,80,0.15);color:#4caf50; }
    .fs-readyforrelease  { padding:2px 8px;border-radius:8px;font-size:0.7rem;font-weight:600;background:rgba(255,193,7,0.15);color:#ffd54f; }
    .fs-released         { padding:2px 8px;border-radius:8px;font-size:0.7rem;font-weight:600;background:rgba(255,255,255,0.1);color:#e0e0e0;border:1px solid rgba(255,255,255,0.2); }
  `]
})
export class SprintFeaturesComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private dashSvc = inject(DashboardService);
  private featureSvc = inject(FeatureService);
  private dialog = inject(MatDialog);

  sprintId = '';
  dashboard = signal<SprintDashboard | null>(null);

  featureViews = computed<FeatureView[]>(() => {
    const d = this.dashboard();
    if (!d) return [];
    return d.features.map(f => ({
      feature: f,
      tasks: d.members.flatMap(m =>
        m.workItems
          .filter(wi => wi.featureId === f.id)
          .map(wi => ({ id: wi.id, title: wi.title, type: wi.type, status: wi.status, externalTicketRef: wi.externalTicketRef, assignee: m.fullName }))
      )
    }));
  });

  staleDays = computed(() => {
    const start = this.dashboard()?.sprint?.startDate;
    if (!start) return 0;
    const ms = Date.now() - new Date(start).getTime();
    return Math.max(0, Math.floor(ms / 86_400_000));
  });

  unlinkedTasks = computed<TaskRow[]>(() => {
    const d = this.dashboard();
    if (!d) return [];
    return d.members.flatMap(m =>
      m.workItems
        .filter(wi => !wi.featureId)
        .map(wi => ({ id: wi.id, title: wi.title, type: wi.type, status: wi.status, externalTicketRef: wi.externalTicketRef, assignee: m.fullName }))
    );
  });

  ngOnInit() {
    this.sprintId = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load() {
    this.dashSvc.getSprintDashboard(this.sprintId).subscribe(d => this.dashboard.set(d));
  }

  featureStatusClass(status: string) { return `fs-${status.toLowerCase()}`; }
  wiTypeClass(type: string) { return `wi-type type-${type.toLowerCase()}`; }
  wiStatusClass(status: string) { return `wi-badge wi-${status.toLowerCase()}`; }

  addFeature() {
    const ref = this.dialog.open(FeatureFormDialogComponent, { width: '440px', data: { sprintId: this.sprintId } });
    ref.afterClosed().subscribe(r => { if (r) this.load(); });
  }

  editFeature(feature: Feature) {
    const ref = this.dialog.open(FeatureFormDialogComponent, { width: '440px', data: { sprintId: this.sprintId, feature } });
    ref.afterClosed().subscribe(r => { if (r) this.load(); });
  }

  toggleActive(feature: Feature) {
    this.featureSvc.toggleActive(this.sprintId, feature.id).subscribe(() => this.load());
  }
}
