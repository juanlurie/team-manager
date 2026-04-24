import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ProgressService } from '../../core/services/progress.service';
import { ProgressPI, ProgressSprint, ProgressFeature } from '../../core/models/progress.model';

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatButtonModule],
  template: `
    <div style="margin-bottom:24px;display:flex;align-items:center;gap:12px">
      <h2 style="margin:0;font-size:1.1rem;font-weight:600;opacity:0.85">PI Progress</h2>
      <button mat-icon-button (click)="load()" title="Refresh" style="opacity:0.5">
        <mat-icon style="font-size:18px;width:18px;height:18px;line-height:18px">refresh</mat-icon>
      </button>
    </div>

    @if (loading()) {
      <div style="text-align:center;padding:64px;opacity:0.3">Loading…</div>
    }

    @for (pi of pis(); track pi.id) {
      <div style="margin-bottom:32px">
        <!-- PI header with timeline bar -->
        <div style="margin-bottom:12px">
          <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:6px">
            <span style="font-size:1rem;font-weight:700;opacity:0.9">{{ pi.name }}</span>
            <span style="font-size:0.75rem;opacity:0.4">{{ formatDate(pi.startDate) }} → {{ formatDate(pi.endDate) }}</span>
            <span [style.color]="piStatusColor(pi)" style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em">
              {{ piStatusLabel(pi) }}
            </span>
          </div>
          <!-- PI timeline bar -->
          <div style="position:relative;height:6px;border-radius:3px;background:rgba(255,255,255,0.06);overflow:visible">
            <!-- completed portion -->
            <div [style.width.%]="piCompletedPct(pi)"
                 style="position:absolute;left:0;top:0;height:100%;border-radius:3px;background:rgba(129,199,132,0.5);transition:width 0.3s"></div>
            <!-- today marker -->
            @if (todayPct(pi.startDate, pi.endDate) >= 0 && todayPct(pi.startDate, pi.endDate) <= 100) {
              <div [style.left.%]="todayPct(pi.startDate, pi.endDate)"
                   style="position:absolute;top:-3px;width:2px;height:12px;background:#64b5f6;border-radius:1px;transform:translateX(-50%)">
              </div>
            }
          </div>
        </div>

        <!-- Sprints -->
        @for (sprint of pi.sprints; track sprint.id) {
          <div style="margin-bottom:16px;padding:14px 16px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06)">
            <!-- Sprint header -->
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
              <mat-icon style="font-size:15px;width:15px;height:15px;line-height:15px;opacity:0.4">
                {{ sprint.isInnovationSprint ? 'lightbulb' : 'directions_run' }}
              </mat-icon>
              <a [routerLink]="['/sprints', sprint.id]"
                 style="font-size:0.82rem;font-weight:600;color:rgba(255,255,255,0.7);text-decoration:none"
                 onmouseenter="this.style.color='#64b5f6'" onmouseleave="this.style.color='rgba(255,255,255,0.7)'">
                {{ sprint.name }}
              </a>
              <span style="font-size:0.72rem;opacity:0.35">{{ formatDate(sprint.startDate) }} – {{ formatDate(sprint.endDate) }}</span>

              <!-- sprint today indicator -->
              @if (isCurrentSprint(sprint)) {
                <span style="font-size:0.65rem;font-weight:700;color:#64b5f6;text-transform:uppercase;letter-spacing:0.07em;
                             background:rgba(100,181,246,0.12);padding:2px 7px;border-radius:4px">Current</span>
              }

              <div style="flex:1"></div>
              <!-- sprint mini stats -->
              <span style="font-size:0.72rem;opacity:0.45">{{ sprintCompletedFeatures(sprint) }}/{{ sprint.features.length }} features</span>
            </div>

            <!-- Sprint timeline bar -->
            <div style="position:relative;height:4px;border-radius:2px;background:rgba(255,255,255,0.05);margin-bottom:10px;overflow:visible">
              <div [style.width.%]="sprintCompletedPct(sprint)"
                   style="position:absolute;left:0;top:0;height:100%;border-radius:2px;background:rgba(129,199,132,0.45)"></div>
              @if (todayPct(sprint.startDate, sprint.endDate) >= 0 && todayPct(sprint.startDate, sprint.endDate) <= 100) {
                <div [style.left.%]="todayPct(sprint.startDate, sprint.endDate)"
                     style="position:absolute;top:-3px;width:2px;height:10px;background:#64b5f6;border-radius:1px;transform:translateX(-50%)"></div>
              }
            </div>

            <!-- Feature rows -->
            @if (sprint.features.length === 0) {
              <div style="font-size:0.75rem;opacity:0.25;padding:4px 0">No features planned</div>
            }

            <!-- Planned features -->
            @for (f of plannedFeatures(sprint); track f.id) {
              <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
                <!-- Status dot -->
                <div [style.background]="featureStatusColor(f)"
                     style="width:8px;height:8px;border-radius:50%;flex-shrink:0"></div>

                <!-- Ticket ref -->
                @if (f.externalTicketRef) {
                  <span style="font-size:0.72rem;font-family:monospace;opacity:0.45;flex-shrink:0">{{ f.externalTicketRef }}</span>
                }

                <!-- Title -->
                <a [routerLink]="['/sprints', sprint.id, 'features']"
                   style="font-size:0.82rem;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
                          text-decoration:none;color:inherit"
                   [style.opacity]="f.status === 'Completed' || f.status === 'Released' ? 0.45 : 0.85"
                   onmouseenter="this.style.textDecoration='underline'" onmouseleave="this.style.textDecoration='none'">
                  {{ f.title }}
                </a>

                <!-- Right side: start date, progress bar, est days, overdue, blocked -->
                <div style="flex-shrink:0;display:flex;align-items:center;gap:8px">
                  @if (f.startDate) {
                    <span style="font-size:0.68rem;opacity:0.35;white-space:nowrap">
                      {{ formatDate(f.startDate) }}
                    </span>
                  }
                  @if (f.totalTasks > 0) {
                    <div style="display:flex;align-items:center;gap:5px">
                      <div style="width:70px;height:5px;border-radius:3px;background:rgba(255,255,255,0.07);position:relative;overflow:hidden">
                        <div [style.width.%]="taskCompletedPct(f)"
                             [style.background]="taskBarColor(f)"
                             style="position:absolute;left:0;top:0;height:100%"></div>
                      </div>
                      <span style="font-size:0.68rem;opacity:0.4;white-space:nowrap">{{ f.completedTasks }}/{{ f.totalTasks }}</span>
                    </div>
                  } @else {
                    <span style="font-size:0.68rem;opacity:0.25">no tasks</span>
                  }
                  @if (f.estimatedDays) {
                    <span [style.color]="isOverdue(f) ? '#ffb74d' : ''"
                          [style.opacity]="isOverdue(f) ? '1' : '0.4'"
                          style="font-size:0.7rem;white-space:nowrap">
                      {{ f.estimatedDays }}d
                    </span>
                  }
                  @if (isOverdue(f)) {
                    <mat-icon style="font-size:14px;width:14px;height:14px;line-height:14px;color:#ffb74d;flex-shrink:0"
                              title="May be overdue">schedule</mat-icon>
                  }
                  @if (f.blockedTasks > 0) {
                    <mat-icon style="font-size:14px;width:14px;height:14px;line-height:14px;color:#ef5350;flex-shrink:0">block</mat-icon>
                  }
                </div>
              </div>
            }

            <!-- Unplanned features (separator) -->
            @if (unplannedFeatures(sprint).length > 0) {
              <div style="display:flex;align-items:center;gap:8px;margin:10px 0 6px">
                <div style="height:1px;flex:1;background:rgba(255,183,77,0.2)"></div>
                <span style="font-size:0.65rem;color:#ffb74d;text-transform:uppercase;letter-spacing:0.08em;font-weight:700">Unplanned</span>
                <div style="height:1px;flex:1;background:rgba(255,183,77,0.2)"></div>
              </div>

              @for (f of unplannedFeatures(sprint); track f.id) {
                <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04)">
                  <div style="width:8px;height:8px;border-radius:50%;background:rgba(255,183,77,0.6);flex-shrink:0"></div>
                  @if (f.externalTicketRef) {
                    <span style="font-size:0.72rem;font-family:monospace;opacity:0.45;flex-shrink:0">{{ f.externalTicketRef }}</span>
                  }
                  <a [routerLink]="['/sprints', sprint.id, 'features']"
                     style="font-size:0.82rem;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
                            opacity:0.75;text-decoration:none;color:inherit"
                     onmouseenter="this.style.textDecoration='underline'" onmouseleave="this.style.textDecoration='none'">
                    {{ f.title }}
                  </a>
                  @if (f.totalTasks > 0) {
                    <div style="flex-shrink:0;display:flex;align-items:center;gap:6px">
                      <div style="width:80px;height:5px;border-radius:3px;background:rgba(255,255,255,0.07);position:relative;overflow:hidden">
                        <div [style.width.%]="taskCompletedPct(f)"
                             [style.background]="taskBarColor(f)"
                             style="position:absolute;left:0;top:0;height:100%"></div>
                      </div>
                      <span style="font-size:0.68rem;opacity:0.4;white-space:nowrap">{{ f.completedTasks }}/{{ f.totalTasks }}</span>
                    </div>
                  }
                  @if (f.blockedTasks > 0) {
                    <mat-icon style="font-size:14px;width:14px;height:14px;line-height:14px;color:#ef5350;flex-shrink:0">block</mat-icon>
                  }
                </div>
              }
            }
          </div>
        }
      </div>
    }

    @if (!loading() && pis().length === 0) {
      <div style="text-align:center;padding:64px;opacity:0.3;font-size:0.95rem">No PIs found.</div>
    }
  `
})
export class ProgressComponent implements OnInit {
  private svc = inject(ProgressService);

  pis = signal<ProgressPI[]>([]);
  loading = signal(true);

  private today = new Date();
  private todayMs = this.today.getTime();

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAll().subscribe({
      next: data => { this.pis.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  formatDate(d: string) {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  todayPct(startDate: string, endDate: string): number {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (end <= start) return -1;
    return Math.min(100, Math.max(0, ((this.todayMs - start) / (end - start)) * 100));
  }

  isCurrentSprint(sprint: ProgressSprint): boolean {
    const start = new Date(sprint.startDate).getTime();
    const end = new Date(sprint.endDate).getTime();
    return this.todayMs >= start && this.todayMs <= end;
  }

  plannedFeatures(sprint: ProgressSprint) {
    return sprint.features.filter(f => !f.isUnplanned);
  }

  unplannedFeatures(sprint: ProgressSprint) {
    return sprint.features.filter(f => f.isUnplanned);
  }

  sprintCompletedFeatures(sprint: ProgressSprint): number {
    return sprint.features.filter(f =>
      f.status === 'Completed' || f.status === 'Released' || f.status === 'ReadyForRelease'
    ).length;
  }

  sprintCompletedPct(sprint: ProgressSprint): number {
    if (sprint.features.length === 0) return 0;
    return (this.sprintCompletedFeatures(sprint) / sprint.features.length) * 100;
  }

  piCompletedPct(pi: ProgressPI): number {
    const total = pi.sprints.reduce((s, sp) => s + sp.features.length, 0);
    if (total === 0) return 0;
    const done = pi.sprints.reduce((s, sp) =>
      s + sp.features.filter(f =>
        f.status === 'Completed' || f.status === 'Released' || f.status === 'ReadyForRelease'
      ).length, 0);
    return (done / total) * 100;
  }

  piStatusLabel(pi: ProgressPI): string {
    const pct = this.todayPct(pi.startDate, pi.endDate);
    if (pct < 0) return 'Upcoming';
    if (pct > 100) return 'Completed';
    return 'Active';
  }

  piStatusColor(pi: ProgressPI): string {
    const label = this.piStatusLabel(pi);
    if (label === 'Active') return '#64b5f6';
    if (label === 'Completed') return '#81c784';
    return 'rgba(255,255,255,0.3)';
  }

  featureStatusColor(f: ProgressFeature): string {
    switch (f.status) {
      case 'Completed':
      case 'Released':
      case 'ReadyForRelease': return '#81c784';
      case 'InProgress':      return '#64b5f6';
      case 'Blocked':         return '#ef5350';
      case 'Planned':         return 'rgba(255,255,255,0.2)';
      default:                return 'rgba(255,255,255,0.15)';
    }
  }

  taskCompletedPct(f: ProgressFeature): number {
    if (f.totalTasks === 0) return 0;
    return (f.completedTasks / f.totalTasks) * 100;
  }

  isOverdue(f: ProgressFeature): boolean {
    if (!f.startDate || !f.estimatedDays) return false;
    if (f.status === 'Completed' || f.status === 'Released' || f.status === 'ReadyForRelease') return false;
    const dueMs = new Date(f.startDate).getTime() + f.estimatedDays * 86400000;
    return dueMs < this.todayMs;
  }

  taskBarColor(f: ProgressFeature): string {
    if (f.blockedTasks > 0) return '#ef5350';
    const pct = this.taskCompletedPct(f);
    if (pct === 100) return '#81c784';
    if (pct > 0) return '#64b5f6';
    return 'rgba(255,255,255,0.2)';
  }
}
