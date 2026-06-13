import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { ActivatedRoute } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SprintDashboard } from '../../../core/models/dashboard.model';
import { DashboardService } from '../../../core/services/dashboard.service';
import { SprintVotePanelComponent } from '../sprint-vote-panel/sprint-vote-panel.component';

@Component({
  selector: 'app-sprint-vote-tab',
  standalone: true,
  imports: [MatProgressSpinnerModule, SprintVotePanelComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    } @else {
      @if (dashboard()) {
        <app-sprint-vote-panel
          [sprintId]="sprintId"
          [members]="dashboard()!.members">
        </app-sprint-vote-panel>
      }
    }
  `
})
export class SprintVoteTabComponent implements OnInit {
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
