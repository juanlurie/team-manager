import { Component, input, signal, ChangeDetectionStrategy } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { DashboardLeaveSummary } from '../../../core/models/dashboard.model';

@Component({
  selector: 'app-leave-summary-card',
  standalone: true,
  imports: [MatIconModule],
  styles: [`
    .stat-card { transition:filter 0.15s; }
    .stat-card:hover { filter:brightness(1.25); }
    .member-card { transition:background 0.15s; }
    .member-card:hover { background:rgba(206,147,216,0.08); }
  `],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @let summary = leaveSummary();
    @if (summary) {
      <div class="stat-card" style="border-radius:10px;background:rgba(206,147,216,0.06);border:1px solid rgba(206,147,216,0.18);padding:14px 18px">
        @if (summary.membersOnLeaveTotal === 0) {
          <div style="display:flex;align-items:center;gap:8px">
            <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px;color:#ce93d8">beach_access</mat-icon>
            <span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#ce93d8">LEAVE & PTO SUMMARY</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;padding:12px 16px">
            <mat-icon style="color:#ce93d8;font-size:16px;width:16px;height:16px;line-height:16px;opacity:0.5">check_circle</mat-icon>
            <span style="font-size:0.85rem;opacity:0.45">No leave records this sprint</span>
          </div>
        } @else {
          <div role="button" tabindex="0" [attr.aria-expanded]="expanded()"
               (click)="toggleExpanded()" (keydown.enter)="toggleExpanded()"
               (keydown.space)="toggleExpanded(); $event.preventDefault()"
               style="display:flex;align-items:center;gap:8px;cursor:pointer;outline:none"
               class="toggle-header">
            <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px;color:#ce93d8">beach_access</mat-icon>
            <span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#ce93d8">LEAVE & PTO SUMMARY</span>
            <mat-icon style="font-size:20px;width:20px;height:20px;line-height:20px;color:#ce93d8;opacity:0.5;margin-left:auto" aria-hidden="true">{{ expanded() ? 'expand_less' : 'expand_more' }}</mat-icon>
          </div>
          <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;margin-top:10px;font-size:0.82rem;opacity:0.75;line-height:1.5">
            <span>{{ summary.membersOnLeaveToday }} on leave today</span>
            <span style="opacity:0.4">·</span>
            <span>{{ summary.membersOnLeaveTotal }} members on leave</span>
            <span style="opacity:0.4">·</span>
            <span>{{ summary.totalCalendarDays }} calendar days</span>
          </div>
          @if (expanded()) {
            <div style="border-top:1px solid rgba(206,147,216,0.12);margin:12px 0 14px"></div>
            <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;opacity:0.45;margin-bottom:8px">By Type</div>
            @for (type of summary.byType; track type.type; let last = $last) {
              <div style="display:flex;align-items:center;padding:6px 0" [style.border-bottom]="last ? 'none' : '1px solid rgba(206,147,216,0.07)'">
                <span style="font-size:0.82rem;font-weight:600;min-width:80px;color:#ce93d8">{{ type.type }}</span>
                <span style="font-size:0.75rem;opacity:0.55;flex:1">{{ type.recordCount }} {{ type.recordCount === 1 ? 'record' : 'records' }}</span>
                <span style="font-size:0.75rem;opacity:0.7;min-width:90px;text-align:right">{{ type.workingDays }} working days</span>
                <span style="font-size:0.75rem;font-weight:600;opacity:0.9;min-width:80px;text-align:right">{{ type.calendarDays }} cal days</span>
              </div>
            }
            <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;opacity:0.45;margin:16px 0 8px">Team Members</div>
            @for (member of summary.members; track member.teamMemberId) {
              <div class="member-card" style="border-radius:10px;background:rgba(206,147,216,0.04);border:1px solid rgba(206,147,216,0.13);padding:11px 16px;margin-bottom:6px">
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="font-size:0.88rem;font-weight:600">{{ member.memberName }}</span>
                  <span style="font-size:0.68rem;font-weight:600;border-radius:8px;padding:2px 8px;background:rgba(206,147,216,0.15);color:#ce93d8">{{ member.recordCount }} {{ member.recordCount === 1 ? 'record' : 'records' }}</span>
                  <span style="font-size:0.75rem;opacity:0.5;margin-left:auto">{{ member.totalWorkingDays }} working days</span>
                </div>
                @for (rec of member.records; track rec.id) {
                  <div style="display:flex;align-items:center;gap:8px;padding:4px 0 4px 4px;margin-top:6px">
                    <span style="font-size:0.68rem;font-weight:600;border-radius:6px;padding:2px 8px;min-width:44px;text-align:center"
                          [style.background]="badgeStyle(rec.type).background"
                          [style.color]="badgeStyle(rec.type).color">{{ rec.type }}</span>
                    <span style="font-size:0.78rem;opacity:0.7;flex:1">{{ fmtDate(rec.startDate) }} – {{ fmtDate(rec.endDate) }}</span>
                    <span style="font-size:0.72rem;opacity:0.5;min-width:48px;text-align:right">{{ rec.workingDays }} work</span>
                    <span style="font-size:0.72rem;font-weight:600;opacity:0.8;min-width:44px;text-align:right">{{ rec.calendarDays }} cal</span>
                    @if (rec.notes) {
                      <mat-icon style="font-size:14px;width:14px;height:14px;line-height:14px;opacity:0.3;flex-shrink:0" aria-label="Has notes">notes</mat-icon>
                    }
                  </div>
                }
              </div>
            }
          }
        }
      </div>
    }
  `
})
export class LeaveSummaryCardComponent {
  leaveSummary = input<DashboardLeaveSummary | null>(null);
  expanded = signal(false);

  toggleExpanded() {
    this.expanded.update(v => !v);
  }

  badgeStyle(type: string): { background: string; color: string } {
    if (type === 'Sick') {
      return { background: 'rgba(239,83,80,0.13)', color: '#ef9a9a' };
    }
    const knownTypes = ['Annual', 'Birthday', 'Loyalty', 'Discretionary', 'FamilyResponsibility'];
    if (knownTypes.includes(type)) {
      return { background: 'rgba(206,147,216,0.18)', color: '#ce93d8' };
    }
    return { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' };
  }

  fmtDate(iso: string): string {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
}
