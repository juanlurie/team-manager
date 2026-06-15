import { Component, OnInit, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';
import { DashboardService } from '../../../core/services/dashboard.service';
import { FeatureService } from '../../../core/services/feature.service';
import { SprintDashboard } from '../../../core/models/dashboard.model';
import { Feature } from '../../../core/models/feature.model';
import { FeatureFormDialogComponent } from '../feature-form-dialog/feature-form-dialog.component';
import { StatusLabelPipe } from '../../../core/pipes/status-label.pipe';
import { TaskListComponent, TaskItem } from '../../../shared/components/task-list/task-list.component';
import { IconButtonComponent } from '../../../shared/components/icon-btn/icon-btn.component';
import { FilterBarComponent, stripMentions } from '../../../shared/components/filter-bar/filter-bar.component';

interface FeatureView {
  feature: Feature;
  tasks: TaskItem[];
}

@Component({
  selector: 'app-sprint-features',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule, MatDialogModule, MatTooltipModule, MatMenuModule, MatChipsModule, StatusLabelPipe, TaskListComponent, IconButtonComponent, FilterBarComponent],
  template: `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap">
      <div>
        <div style="display:flex;align-items:center;gap:8px">
          <a mat-button [routerLink]="['/delivery/sprints', sprintId]"
             style="padding:0 8px 0 4px;gap:4px;color:rgba(255,255,255,0.55)">
            <mat-icon style="font-size:18px;width:18px;height:18px;line-height:18px">arrow_back</mat-icon>
            Sprints
          </a>
          <h2 style="margin:0;font-size:1.2rem">{{ dashboard()?.sprint?.name }} · Features</h2>
        </div>
        <div style="font-size:0.8rem;opacity:0.5;margin-top:2px;margin-left:44px">
          {{ $safeNavigationMigration(dashboard()?.sprint?.startDate) | date:'d MMM' }} – {{ $safeNavigationMigration(dashboard()?.sprint?.endDate) | date:'d MMM yyyy' }}
        </div>
      </div>
      <span style="flex:1"></span>
      <button mat-raised-button color="primary" (click)="addFeature()">
        <mat-icon>add</mat-icon> New Feature
      </button>
    </div>

    <div style="display:flex;margin-bottom:16px">
      <app-filter-bar
        [groups]="[]"
        searchPlaceholder="Search features and tasks…"
        [searchVal]="search()"
        (searchChange)="search.set($event)" />
    </div>

    @if (filteredFeatureViews().length === 0 && !search()) {
      <div style="text-align:center;padding:64px;opacity:0.35;font-size:0.9rem">
        No features yet — add one to get started
      </div>
    }

    <div style="display:flex;flex-direction:column;gap:16px">
      @for (fv of filteredFeatureViews(); track fv.feature.id) {
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
                @if (fv.feature.estimatedDays) {
                  <span style="font-size:0.68rem;padding:1px 6px;border-radius:6px;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.45)"
                        matTooltip="Estimated days">⏱ {{ fv.feature.estimatedDays }}d</span>
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
              <button mat-icon-button [matMenuTriggerFor]="featureMenu" style="color:rgba(255,255,255,0.4)">
                <mat-icon style="font-size:18px">more_vert</mat-icon>
              </button>
              <mat-menu #featureMenu="matMenu">
                <button mat-menu-item (click)="editFeature(fv.feature)">
                  <mat-icon>edit</mat-icon>
                  <span>Edit feature</span>
                </button>
                <button mat-menu-item (click)="toggleActive(fv.feature)">
                  <mat-icon>{{ fv.feature.isActive ? 'visibility_off' : 'visibility' }}</mat-icon>
                  <span>{{ fv.feature.isActive ? 'Hide from task dropdown' : 'Unhide feature' }}</span>
                </button>
              </mat-menu>
            </div>
          </div>

          <!-- Tasks table -->
          <div style="padding:8px 16px">
            <app-task-list [tasks]="fv.tasks" [showAssignee]="true" />
          </div>
        </div>
      }

       <!-- Unlinked tasks section -->
       @if (filteredUnlinkedTasks().length > 0) {
         <div style="border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);overflow:hidden">
           <div style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.05)">
             <span style="font-size:0.75rem;font-weight:600;opacity:0.35;text-transform:uppercase;letter-spacing:0.08em">Unlinked tasks</span>
           </div>
           <div style="padding:8px 16px">
             <app-task-list [tasks]="filteredUnlinkedTasks()" [showAssignee]="true" />
           </div>
         </div>
       }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
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
  search = signal('');

  featureViews = computed<FeatureView[]>(() => {
    const d = this.dashboard();
    if (!d) return [];
    return d.features.map(f => ({
      feature: f,
      tasks: d.members.flatMap(m =>
        m.workItems
          .filter(wi => wi.featureId === f.id)
          .map(wi => ({ id: wi.id, title: wi.title, type: wi.type, status: wi.status, externalTicketRef: wi.externalTicketRef, assignee: m.fullName } as TaskItem))
      )
    }));
  });

  filteredUnlinkedTasks = computed<TaskItem[]>(() => {
    const q = stripMentions(this.search()).toLowerCase();
    const tasks = this.unlinkedTasks();
    if (!q) return tasks;
    return tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.assignee ?? '').toLowerCase().includes(q) ||
      (t.externalTicketRef ?? '').toLowerCase().includes(q)
    );
  });

  staleDays = computed(() => {
    const start = this.dashboard()?.sprint?.startDate;
    if (!start) return 0;
    const ms = Date.now() - new Date(start).getTime();
    return Math.max(0, Math.floor(ms / 86_400_000));
  });

  filteredFeatureViews = computed<FeatureView[]>(() => {
    const q = stripMentions(this.search()).toLowerCase();
    if (!q) return this.featureViews();
    return this.featureViews()
      .map(fv => {
        const featureMatches =
          fv.feature.title.toLowerCase().includes(q) ||
          (fv.feature.externalTicketRef ?? '').toLowerCase().includes(q) ||
          (fv.feature.description ?? '').toLowerCase().includes(q);
        const matchingTasks = fv.tasks.filter(t =>
          t.title.toLowerCase().includes(q) ||
          (t.assignee ?? '').toLowerCase().includes(q) ||
          (t.externalTicketRef ?? '').toLowerCase().includes(q)
        );
        if (!featureMatches && matchingTasks.length === 0) return null;
        return { feature: fv.feature, tasks: featureMatches ? fv.tasks : matchingTasks };
      })
      .filter((fv): fv is FeatureView => fv !== null);
  });

  unlinkedTasks = computed<TaskItem[]>(() => {
    const d = this.dashboard();
    if (!d) return [];
    return d.members.flatMap(m =>
      m.workItems
        .filter(wi => !wi.featureId)
        .map(wi => ({ id: wi.id, title: wi.title, type: wi.type, status: wi.status, externalTicketRef: wi.externalTicketRef, assignee: m.fullName } as TaskItem))
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
