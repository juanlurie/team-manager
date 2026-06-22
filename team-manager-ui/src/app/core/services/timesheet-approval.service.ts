import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, switchMap, of } from 'rxjs';
import { FetchTimesheetApprovalsRequest, MemberQualityInput, TimesheetApprovalFetchResult, TimesheetApprovalMember, TimesheetQualityAnalysis } from '../models/timesheet-approval.model';

@Injectable({ providedIn: 'root' })
export class TimesheetApprovalService {
  private http = inject(HttpClient);

  fetchOutstanding(req: FetchTimesheetApprovalsRequest): Observable<TimesheetApprovalFetchResult> {
    return this.http.post<TimesheetApprovalFetchResult>('/api/v1/timesheets/approval/fetch', req);
  }

  analyzeQuality(members: MemberQualityInput[]): Observable<TimesheetQualityAnalysis> {
    return this.http.post<TimesheetQualityAnalysis>('/api/v1/timesheets/approval/analyze-quality', { members });
  }

  approve(member: TimesheetApprovalMember, period: { start: string; end: string }, totalHours: number, cookie: string, credentials?: Record<string, string>): Observable<any> {
    return this.http.post<any>('/api/v1/sync-queue/enqueue', {
      action: 'ApproveTimesheet',
      label: `${member.memberName} | ${period.start} – ${period.end}`,
      sourceType: 'TimesheetApproval',
      sourceId: member.memberName,
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
