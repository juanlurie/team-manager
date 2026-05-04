import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SprintDashboard } from '../../../core/models/dashboard.model';
import { DashboardService } from '../../../core/services/dashboard.service';
import { SprintWorkloadSummaryComponent } from '../sprint-workload-summary/sprint-workload-summary.component';

@Component({
  selector: 'app-sprint-workload-tab',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, SprintWorkloadSummaryComponent],
  template: `
    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    } @else {
      @if (dashboard()) {
        <app-sprint-workload-summary [members]="dashboard()!.members" [sprint]="dashboard()!.sprint"></app-sprint-workload-summary>
      }
    }
  `
})
export class SprintWorkloadTabComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private dashSvc = inject(DashboardService);

  sprintId = '';
  teamLeadId = '';
  loading = signal(true);
  dashboard = signal<SprintDashboard | null>(null);

  ngOnInit() {
    this.sprintId = this.route.parent!.snapshot.paramMap.get('id')!;
    this.teamLeadId = this.route.parent!.snapshot.queryParamMap.get('teamLeadId') ?? '';
    this.load();
  }

  load() {
    this.loading.set(true);
    this.dashSvc.getSprintDashboard(this.sprintId, this.teamLeadId || undefined)
      .subscribe(d => { this.dashboard.set(d); this.loading.set(false); });
  }
}
