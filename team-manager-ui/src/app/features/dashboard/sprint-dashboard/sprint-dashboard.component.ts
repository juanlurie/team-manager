import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { Sprint } from '../../../core/models/sprint.model';
import { SprintSummary, Blocker } from '../../../core/models/dashboard.model';
import { SprintService } from '../../../core/services/sprint.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { WorkItemFormComponent } from '../work-item-form/work-item-form.component';
import { WorkItemService } from '../../../core/services/work-item.service';

@Component({
  selector: 'app-sprint-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, MatButtonModule,
    MatSelectModule, MatFormFieldModule, MatIconModule, MatDialogModule],
  template: `
    <!-- Header row -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap">
      <mat-form-field appearance="outline" subscriptSizing="dynamic" style="width:220px">
        <mat-label>Sprint</mat-label>
        <mat-select [(ngModel)]="selectedSprintId" (ngModelChange)="load()">
          @for (s of sprints(); track s.id) {
            <mat-option [value]="s.id">{{ s.name }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      @if (selectedSprintId) {
        <a mat-stroked-button [routerLink]="['/sprints', selectedSprintId]" style="height:40px">
          <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px">directions_run</mat-icon>
          Manage Sprint
        </a>
        <a mat-stroked-button [routerLink]="['/export']" style="height:40px">
          <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px">download</mat-icon>
          Export
        </a>
      }
    </div>

    @if (selectedSprintId && summary()) {
      <!-- Stat pills -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:28px">
        @for (stat of stats(); track stat.label) {
          <a [routerLink]="stat.route" [queryParams]="stat.queryParams"
             style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:10px;
                    border:1px solid;flex:1;min-width:110px;max-width:160px;text-decoration:none;
                    cursor:pointer;transition:filter 0.15s"
             [style.background]="stat.bg"
             [style.border-color]="stat.border"
             onmouseenter="this.style.filter='brightness(1.25)'"
             onmouseleave="this.style.filter=''">
            <div>
              <div style="font-size:1.5rem;font-weight:800;line-height:1" [style.color]="stat.color">{{ stat.value }}</div>
              <div style="font-size:0.72rem;opacity:0.55;margin-top:2px">{{ stat.label }}</div>
            </div>
          </a>
        }
      </div>

      <!-- Blockers section -->
      @if (blockers().length > 0) {
        <div style="margin-bottom:28px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <mat-icon style="color:#ef5350;font-size:18px;width:18px;height:18px;line-height:18px">block</mat-icon>
            <span style="font-size:0.8rem;font-weight:700;color:#ef5350;text-transform:uppercase;letter-spacing:0.07em">
              Blockers ({{ blockers().length }})
            </span>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            @for (b of blockers(); track b.workItemId) {
              <div (click)="openBlocker(b)"
                   style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;
                          background:rgba(239,83,80,0.07);border:1px solid rgba(239,83,80,0.25);
                          cursor:pointer;transition:background 0.15s"
                   onmouseenter="this.style.background='rgba(239,83,80,0.12)'"
                   onmouseleave="this.style.background='rgba(239,83,80,0.07)'">

                <!-- Days badge -->
                <div style="flex-shrink:0;min-width:44px;text-align:center;background:rgba(239,83,80,0.15);
                            border-radius:8px;padding:4px 8px;border:1px solid rgba(239,83,80,0.3)">
                  <div style="font-size:1rem;font-weight:800;color:#ef5350;line-height:1">{{ b.daysBlocked }}</div>
                  <div style="font-size:0.6rem;opacity:0.6;margin-top:1px">{{ b.daysBlocked === 1 ? 'day' : 'days' }}</div>
                </div>

                <!-- Info -->
                <div style="flex:1;min-width:0">
                  <div style="font-size:0.88rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                    {{ b.title }}
                  </div>
                  <div style="font-size:0.72rem;opacity:0.45;margin-top:2px;display:flex;gap:8px;flex-wrap:wrap">
                    @if (b.featureTitle) { <span>{{ b.featureTitle }}</span> }
                    @if (b.externalTicketRef) { <span style="font-family:monospace">{{ b.externalTicketRef }}</span> }
                  </div>
                </div>

                <!-- Member -->
                <div style="flex-shrink:0;font-size:0.78rem;opacity:0.6;text-align:right">
                  {{ b.memberName }}
                </div>

                <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px;opacity:0.3;flex-shrink:0">chevron_right</mat-icon>
              </div>
            }
          </div>
        </div>
      }

      @if (blockers().length === 0 && summary()) {
        <div style="display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:10px;
                    background:rgba(129,199,132,0.07);border:1px solid rgba(129,199,132,0.2);margin-bottom:28px">
          <mat-icon style="color:#81c784;font-size:18px;width:18px;height:18px;line-height:18px">check_circle</mat-icon>
          <span style="font-size:0.85rem;color:#81c784">No blockers this sprint</span>
        </div>
      }
    }

    @if (!selectedSprintId) {
      <div style="text-align:center;padding:64px;opacity:0.3;font-size:0.95rem">
        Select a sprint to view the dashboard.
      </div>
    }
  `
})
export class SprintDashboardComponent implements OnInit {
  private sprintSvc  = inject(SprintService);
  private dashSvc    = inject(DashboardService);
  private workItemSvc = inject(WorkItemService);
  private dialog     = inject(MatDialog);
  private router     = inject(Router);

  sprints  = signal<Sprint[]>([]);
  summary  = signal<SprintSummary | null>(null);
  blockers = signal<Blocker[]>([]);
  selectedSprintId = '';

  stats = () => {
    const s = this.summary();
    if (!s) return [];
    const sprintRoute = ['/sprints', this.selectedSprintId];
    return [
      { label: 'Members',     value: s.totalMembers,    color: '#64b5f6', bg: 'rgba(100,181,246,0.07)', border: 'rgba(100,181,246,0.2)', route: ['/team'],      queryParams: null },
      { label: 'In Progress', value: s.inProgressCount, color: '#ffb74d', bg: 'rgba(255,183,77,0.07)',  border: 'rgba(255,183,77,0.2)', route: sprintRoute,    queryParams: null },
      { label: 'Blocked',     value: s.blockedCount,    color: '#ef5350', bg: 'rgba(239,83,80,0.07)',   border: 'rgba(239,83,80,0.2)', route: sprintRoute,    queryParams: null },
      { label: 'Completed',   value: s.completedCount,  color: '#81c784', bg: 'rgba(129,199,132,0.07)', border: 'rgba(129,199,132,0.2)', route: sprintRoute,  queryParams: null },
      { label: 'Planned',     value: s.plannedCount,    color: '#9e9e9e', bg: 'rgba(158,158,158,0.07)', border: 'rgba(158,158,158,0.2)', route: sprintRoute,  queryParams: null },
      { label: 'Leave Days',  value: s.totalLeaveDays,  color: '#ce93d8', bg: 'rgba(206,147,216,0.07)', border: 'rgba(206,147,216,0.2)', route: ['/leave'],   queryParams: null },
    ];
  };

  ngOnInit() {
    this.sprintSvc.getSprints().subscribe(s => {
      this.sprints.set(s);
      if (s.length) { this.selectedSprintId = s[0].id; this.load(); }
    });
  }

  load() {
    if (!this.selectedSprintId) return;
    forkJoin({
      summary:  this.dashSvc.getSprintSummary(this.selectedSprintId),
      blockers: this.dashSvc.getBlockers(this.selectedSprintId)
    }).subscribe(({ summary, blockers }) => {
      this.summary.set(summary);
      this.blockers.set(blockers);
    });
  }

  openBlocker(b: Blocker) {
    this.workItemSvc.getById(b.workItemId).subscribe(wi => {
      if (!wi) return;
      const ref = this.dialog.open(WorkItemFormComponent, {
        width: '520px',
        data: { workItem: wi, sprintMemberId: wi.sprintMemberId }
      });
      ref.afterClosed().subscribe(changed => { if (changed) this.load(); });
    });
  }
}
