import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MemberSprintCard } from '../../../core/models/dashboard.model';
import { Sprint } from '../../../core/models/sprint.model';

@Component({
  selector: 'app-sprint-workload-summary',
  standalone: true,
  imports: [CommonModule, MatTooltipModule],
  template: `
    <!-- Workload panel -->
    <div style="margin-bottom:12px;border-radius:10px;background:rgba(255,255,255,0.03);
                border:1px solid rgba(255,255,255,0.07);overflow:hidden">
      <div style="padding:8px 14px 6px;border-bottom:1px solid rgba(255,255,255,0.06)">
        <span style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;opacity:0.4">Workload</span>
      </div>
      @for (row of summary(); track row.name) {
        <div style="display:flex;align-items:center;gap:10px;padding:7px 14px;border-top:1px solid rgba(255,255,255,0.04)">
          <span style="font-size:0.8rem;font-weight:600;width:130px;flex-shrink:0;
                       overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ row.name }}</span>
          @if (row.capacity !== null && row.capacity < 100) {
            <span style="font-size:0.68rem;font-weight:700;padding:1px 6px;border-radius:6px;flex-shrink:0;
                         background:rgba(255,152,0,0.15);color:#ffb74d"
                  [matTooltip]="'Reduced capacity: ' + row.capacity + '%'">
              ⚡ {{ row.capacity }}%
            </span>
          }
          <div style="flex:1;display:flex;gap:2px;height:6px;border-radius:3px;overflow:hidden;min-width:60px">
            @if (row.total > 0) {
              @if (row.completed + row.released + row.ready > 0) {
                <div style="background:#4caf50;transition:width 0.3s"
                     [style.width.%]="((row.completed + row.released + row.ready) / row.total) * 100"></div>
              }
              @if (row.inProgress > 0) {
                <div style="background:#64b5f6" [style.width.%]="(row.inProgress / row.total) * 100"></div>
              }
              @if (row.blocked > 0) {
                <div style="background:#ef5350" [style.width.%]="(row.blocked / row.total) * 100"></div>
              }
              @if (row.planned > 0) {
                <div style="background:rgba(158,158,158,0.4)" [style.width.%]="(row.planned / row.total) * 100"></div>
              }
            } @else {
              <div style="background:rgba(255,255,255,0.06);width:100%"></div>
            }
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            @if (row.blocked > 0) {
              <span style="font-size:0.7rem;font-weight:700;color:#ef5350" [matTooltip]="row.blocked + ' blocked'">🔴 {{ row.blocked }}</span>
            }
            @if (row.inProgress > 0) {
              <span style="font-size:0.7rem;color:#64b5f6" [matTooltip]="row.inProgress + ' in progress'">{{ row.inProgress }} in prog</span>
            }
            @if (row.planned > 0) {
              <span style="font-size:0.7rem;opacity:0.4" [matTooltip]="row.planned + ' planned'">{{ row.planned }} planned</span>
            }
            <span style="font-size:0.7rem;opacity:0.25;margin-left:2px">{{ row.total }} total</span>
          </div>
        </div>
      }
    </div>

    <!-- Capacity panel (requires sprint input) -->
    @if (sprint) {
      <div style="margin-bottom:16px;border-radius:10px;background:rgba(255,255,255,0.03);
                  border:1px solid rgba(255,255,255,0.07);overflow:hidden">
        <div style="padding:8px 14px 6px;border-bottom:1px solid rgba(255,255,255,0.06);
                    display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;opacity:0.4">Capacity</span>
          <span style="font-size:0.68rem;opacity:0.3">{{ sprintDays() }} sprint days</span>
        </div>
        @for (row of capacity(); track row.name) {
          <div style="display:flex;align-items:center;gap:10px;padding:7px 14px;border-top:1px solid rgba(255,255,255,0.04)"
               [matTooltip]="capacityTooltip(row)">
            <span style="font-size:0.8rem;font-weight:600;width:130px;flex-shrink:0;
                         overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ row.name }}</span>
            <!-- Segmented capacity bar -->
            <div style="flex:1;display:flex;height:6px;border-radius:3px;overflow:hidden;min-width:60px;background:rgba(255,255,255,0.06)">
              @if (row.available > 0) {
                <div style="background:#4caf50;transition:width 0.3s"
                     [style.width.%]="(row.available / row.sprintDays) * 100"></div>
              }
              @if (row.leaveDays > 0) {
                <div style="background:#ffa726"
                     [style.width.%]="(row.leaveDays / row.sprintDays) * 100"></div>
              }
              @if (row.reducedDays > 0) {
                <div style="background:rgba(255,255,255,0.08)"
                     [style.width.%]="(row.reducedDays / row.sprintDays) * 100"></div>
              }
            </div>
            <!-- Available days label -->
            <span style="font-size:0.75rem;font-weight:600;flex-shrink:0;min-width:52px;text-align:right"
                  [style.color]="row.available <= 1 ? '#ef9a9a' : row.available <= row.sprintDays * 0.4 ? '#ffb74d' : 'rgba(255,255,255,0.7)'">
              {{ row.available | number:'1.1-1' }}d
            </span>
          </div>
        }
      </div>
    }
  `
})
export class SprintWorkloadSummaryComponent {
  @Input({ required: true }) members: MemberSprintCard[] = [];
  @Input() sprint?: Sprint;

  summary() {
    return this.members.map(m => {
      const wis = m.workItems;
      return {
        name:       m.fullName,
        capacity:   m.capacity,
        total:      wis.length,
        planned:    wis.filter(w => w.status === 'Planned').length,
        inProgress: wis.filter(w => w.status === 'InProgress').length,
        blocked:    wis.filter(w => w.status === 'Blocked').length,
        completed:  wis.filter(w => w.status === 'Completed').length,
        ready:      wis.filter(w => w.status === 'ReadyForRelease').length,
        released:   wis.filter(w => w.status === 'Released').length,
      };
    });
  }

  sprintDays(): number {
    if (!this.sprint) return 0;
    return this.workDays(this.sprint.startDate, this.sprint.endDate);
  }

  capacity() {
    if (!this.sprint) return [];
    const sd = this.sprintDays();
    return this.members.map(m => {
      const capacityPct = m.capacity ?? 100;
      const allocatedDays = sd * capacityPct / 100;
      const reducedDays = sd - allocatedDays;
      const leaveDays = m.leaveRecords.reduce((sum, r) => {
        const overlapStart = r.startDate > this.sprint!.startDate ? r.startDate : this.sprint!.startDate;
        const overlapEnd   = r.endDate   < this.sprint!.endDate   ? r.endDate   : this.sprint!.endDate;
        return sum + (overlapStart <= overlapEnd ? this.workDays(overlapStart, overlapEnd) : 0);
      }, 0);
      const available = Math.max(0, allocatedDays - leaveDays);
      return { name: m.fullName, sprintDays: sd, allocatedDays, reducedDays, leaveDays, available };
    });
  }

  capacityTooltip(row: ReturnType<typeof this.capacity>[number]): string {
    const parts = [`${row.sprintDays} sprint days`];
    if (row.reducedDays > 0) parts.push(`${row.reducedDays.toFixed(1)}d capacity reduction`);
    if (row.leaveDays > 0)   parts.push(`${row.leaveDays}d leave`);
    parts.push(`${row.available.toFixed(1)}d available`);
    return parts.join(' · ');
  }

  private workDays(startStr: string, endStr: string): number {
    const start = new Date(startStr + 'T00:00:00');
    const end   = new Date(endStr   + 'T00:00:00');
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }
}
