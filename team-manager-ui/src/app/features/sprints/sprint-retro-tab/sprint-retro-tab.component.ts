import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { filter, take } from 'rxjs';

import { ActivatedRoute } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SprintDashboard } from '../../../core/models/dashboard.model';
import { DashboardService } from '../../../core/services/dashboard.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SprintRetroComponent } from '../sprint-retro/sprint-retro.component';

@Component({
  selector: 'app-sprint-retro-tab',
  standalone: true,
  imports: [MatProgressSpinnerModule, SprintRetroComponent],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    } @else {
      @if (dashboard()) {
        <app-sprint-retro
          [sprintId]="sprintId"
          [sprint]="dashboard()!.sprint"
          [members]="dashboard()!.members"
          [currentMemberId]="currentMemberId"
          [currentMemberName]="currentMemberName">
        </app-sprint-retro>
      }
    }
  `
})
export class SprintRetroTabComponent implements OnInit {
  private route   = inject(ActivatedRoute);
  private dashSvc = inject(DashboardService);
  private auth    = inject(AuthService);

  sprintId          = '';
  teamLeadId        = '';
  currentMemberId   = '';
  currentMemberName = '';

  loading   = signal(true);
  dashboard = signal<SprintDashboard | null>(null);

  ngOnInit() {
    this.sprintId   = this.route.parent!.snapshot.paramMap.get('id')!;
    this.teamLeadId = this.route.parent!.snapshot.queryParamMap.get('teamLeadId') ?? '';

    this.auth.me$.pipe(filter(m => m !== null), take(1)).subscribe(me => {
      this.currentMemberId   = me!.id;
      this.currentMemberName = `${me!.firstName} ${me!.lastName}`.trim();
      this.load();
    });
  }

  load() {
    this.loading.set(true);
    this.dashSvc.getSprintDashboard(this.sprintId, this.teamLeadId || undefined)
      .subscribe(d => { this.dashboard.set(d); this.loading.set(false); });
  }
}
