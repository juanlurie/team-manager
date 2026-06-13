import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';

import { TeamMemberService } from '../../core/services/team-member.service';
import { TimesheetTabComponent } from '../team/team-member-personal/timesheet-tab/timesheet-tab.component';

@Component({
  selector: 'app-timesheet-page',
  standalone: true,
  imports: [TimesheetTabComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (memberId()) {
      <app-timesheet-tab [memberId]="memberId()!" />
    }
  `
})
export class TimesheetPageComponent implements OnInit {
  private memberSvc = inject(TeamMemberService);
  memberId = signal<string | null>(null);

  ngOnInit() {
    this.memberSvc.getMe().subscribe(me => this.memberId.set(me.id));
  }
}
