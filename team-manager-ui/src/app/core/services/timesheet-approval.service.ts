import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, of } from 'rxjs';
import { FetchTimesheetApprovalsRequest, TimesheetApprovalMember } from '../models/timesheet-approval.model';

@Injectable({ providedIn: 'root' })
export class TimesheetApprovalService {
  private http = inject(HttpClient);

  fetchOutstanding(req: FetchTimesheetApprovalsRequest): Observable<TimesheetApprovalMember[]> {
    return this.http.post<TimesheetApprovalMember[]>('/api/v1/timesheets/approval/fetch', req);
  }

  approve(member: TimesheetApprovalMember, period: { start: string; end: string }, cookie: string, credentials?: Record<string, string>): Observable<any> {
    const totalHours = member.entries.reduce((sum, e) => sum + e.hours + e.minutes / 60, 0);
    return this.http.post<any>('/api/v1/sync-queue/enqueue', {
      action: 'ApproveTimesheet',
      label: `${member.memberName} | ${period.start} – ${period.end}`,
      sourceType: 'TimesheetApproval',
      sourceId: member.teamMemberId ?? member.memberName,
      variables: {
        memberName: member.memberName,
        start: period.start,
        end: period.end,
        totalHours: totalHours.toFixed(2)
      },
      cookie,
      credentials
    }).pipe(
      switchMap(result => result.autoSynced
        ? of(result)
        : this.http.post<any>(`/api/v1/sync-queue/${result.id}/send`, { cookie, credentials }))
    );
  }
}
