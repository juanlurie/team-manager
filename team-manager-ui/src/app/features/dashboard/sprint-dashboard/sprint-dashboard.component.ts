import { Component, OnInit, inject, signal, computed, effect, OnDestroy, ChangeDetectionStrategy } from '@angular/core';

import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Sprint } from '../../../core/models/sprint.model';
import { SprintSummary, Blocker, DashboardLeaveSummary } from '../../../core/models/dashboard.model';
import { Feature } from '../../../core/models/feature.model';
import { TeamMember } from '../../../core/models/team-member.model';
import { DiscussionPoint } from '../../../core/models/discussion-point.model';
import { RetroAction } from '../../../core/models/retro-action.model';
import { SprintService } from '../../../core/services/sprint.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { FeatureService } from '../../../core/services/feature.service';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { DiscussionPointService } from '../../../core/services/discussion-point.service';
import { RetroActionService } from '../../../core/services/retro-action.service';
import { WorkItemFormComponent } from '../work-item-form/work-item-form.component';
import { WorkItemService } from '../../../core/services/work-item.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { IconButtonComponent } from '../../../shared/components/icon-btn/icon-btn.component';
import { CurrentSprintCardComponent } from '../../../shared/components/current-sprint-card/current-sprint-card.component';
import { LeaveSummaryCardComponent } from '../leave-summary-card/leave-summary-card.component';
import { WebSocketService } from '../../../core/websocket/websocket.service';
import { RetroEvent, RETRO_EVENT_TYPES } from '../../../core/websocket/events/retro.events';

const STATUS_ORDER  = ['Released', 'ReadyForRelease', 'InProgress', 'Completed', 'Planned'] as const;
const STATUS_LABEL: Record<string, string> = {
  Released: 'Released', ReadyForRelease: 'Ready for Release',
  InProgress: 'In Progress', Completed: 'Completed', Planned: 'Planned',
};
const STATUS_COLOR: Record<string, string> = {
  Released: '#27ae60', ReadyForRelease: '#8e44ad',
  InProgress: '#e67e22', Completed: '#2980b9', Planned: '#95a5a6',
};

@Component({
  selector: 'app-sprint-dashboard',
  standalone: true,
  imports: [RouterLink, FormsModule, MatSelectModule, MatFormFieldModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule, IconButtonComponent, CurrentSprintCardComponent, LeaveSummaryCardComponent],
  templateUrl: './sprint-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.Default,
  styleUrls: ['./sprint-dashboard.component.scss']
})
export class SprintDashboardComponent implements OnInit, OnDestroy {
  private sprintSvc      = inject(SprintService);
  private dashSvc        = inject(DashboardService);
  private featureSvc     = inject(FeatureService);
  private memberSvc      = inject(TeamMemberService);
  private workItemSvc    = inject(WorkItemService);
  private discussionSvc  = inject(DiscussionPointService);
  private retroActionSvc = inject(RetroActionService);
  private wsSvc          = inject(WebSocketService);
  private dialog         = inject(MatDialog);
  private router         = inject(Router);
  private wsSub: Subscription | null = null;

  readonly statusOrder = STATUS_ORDER;

  loading  = signal(false);
  sprints  = signal<Sprint[]>([]);
  summary  = signal<SprintSummary | null>(null);
  blockers = signal<Blocker[]>([]);
  piFeatures   = signal<Feature[]>([]);
  allMembers   = signal<TeamMember[]>([]);
  discussions  = signal<DiscussionPoint[]>([]);
  retroActions = signal<RetroAction[]>([]);
  promotingId  = signal<string | null>(null);
  leaveSummary = signal<DashboardLeaveSummary | null>(null);
  selectedSprintId = '';
  currentFeatures = signal<Feature[]>([]);

  private today = (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();

  currentSprint = computed(() =>
    this.sprints().find(s => new Date(s.startDate) <= this.today && new Date(s.endDate) >= this.today) ?? null
  );

  constructor() {
    effect(() => {
      const sprint = this.currentSprint();
      if (sprint) {
        this.featureSvc.getAll(sprint.id).subscribe(f => this.currentFeatures.set(f));
      }
    });
  }

  selectedSprint = computed(() => this.currentSprint() ?? null);

  piCount = (status: string) => this.piFeatures().filter(f => f.status === status).length;

  openDiscussions = computed(() => {
    const order: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
    return this.discussions()
      .filter(d => d.status === 'Open' || d.status === 'InProgress')
      .sort((a, b) => (order[a.priority] ?? 1) - (order[b.priority] ?? 1));
  });

  pendingRetroActions = computed(() =>
    this.retroActions().filter(a => a.status === 'Open' || a.status === 'InProgress')
  );

  sprintProgress = computed(() => {
    const s = this.summary();
    if (!s) return null;
    const total = s.plannedCount + s.inProgressCount + s.blockedCount + s.completedCount;
    const done  = s.completedCount;
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
  });

  discussionPriorityColor(priority: string): string {
    const map: Record<string, string> = { High: '#ef5350', Medium: '#ffb74d', Low: '#9e9e9e' };
    return map[priority] ?? '#9e9e9e';
  }

  piDonePercent = computed(() => {
    const total = this.piFeatures().length;
    if (!total) return 0;
    const done = this.piCount('Released') + this.piCount('ReadyForRelease');
    return Math.round((done / total) * 100);
  });

  statusColor = (s: string) => STATUS_COLOR[s] ?? '#9e9e9e';
  statusLabel = (s: string) => STATUS_LABEL[s] ?? s;

  stats = () => {
    const s = this.summary();
    if (!s) return [];
    const sprintRoute = ['/delivery/sprints', this.selectedSprintId];
    return [
      { label: 'Members',     value: s.totalMembers,    color: '#64b5f6', bg: 'rgba(100,181,246,0.07)', border: 'rgba(100,181,246,0.2)', route: ['/team'],   queryParams: null },
      { label: 'In Progress', value: s.inProgressCount, color: '#ffb74d', bg: 'rgba(255,183,77,0.07)',  border: 'rgba(255,183,77,0.2)', route: sprintRoute, queryParams: null },
      { label: 'Blocked',     value: s.blockedCount,    color: '#ef5350', bg: 'rgba(239,83,80,0.07)',   border: 'rgba(239,83,80,0.2)', route: sprintRoute,  queryParams: null },
      { label: 'Completed',   value: s.completedCount,  color: '#81c784', bg: 'rgba(129,199,132,0.07)', border: 'rgba(129,199,132,0.2)', route: sprintRoute, queryParams: null },
      { label: 'Planned',     value: s.plannedCount,    color: '#9e9e9e', bg: 'rgba(158,158,158,0.07)', border: 'rgba(158,158,158,0.2)', route: sprintRoute, queryParams: null },
      { label: 'Leave Days',  value: s.totalLeaveDays,  color: '#ce93d8', bg: 'rgba(206,147,216,0.07)', border: 'rgba(206,147,216,0.2)', route: ['/leave'],  queryParams: null },
    ];
  };

  isCurrent(s: Sprint): boolean {
    const today = this.todayStr();
    return s.startDate <= today && s.endDate >= today;
  }

  ngOnInit() {
    this.memberSvc.getAll({ isActive: true }).subscribe(m => this.allMembers.set(m));
    this.sprintSvc.getSprints().subscribe(s => {
      this.sprints.set(s);
      if (s.length) {
        this.load();
      }
    });

    this.wsSvc.connect();
    this.wsSub = this.wsSvc.roomEvents<RetroEvent>(RETRO_EVENT_TYPES).subscribe(msg => {
      if (msg.type === 'retro_action_created' || msg.type === 'retro_action_updated' || msg.type === 'retro_action_deleted') {
        const sprint = this.currentSprint();
        if (sprint) {
          this.retroActionSvc.getBySprintId(sprint.id).subscribe(a => this.retroActions.set(a));
        }
      }
    });
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
  }

  load() {
    const sprint = this.currentSprint();
    if (!sprint) return;
    this.selectedSprintId = sprint.id;
    this.loading.set(true);
    const requests: Record<string, any> = {
      summary:      this.dashSvc.getSprintSummary(sprint.id).pipe(catchError(() => of(null))),
      blockers:     this.dashSvc.getBlockers(sprint.id).pipe(catchError(() => of([]))),
      discussions:  this.discussionSvc.getAll().pipe(catchError(() => of([]))),
      retroActions: this.retroActionSvc.getBySprintId(sprint.id).pipe(catchError(() => of([]))),
      leaveSummary: this.dashSvc.getLeaveSummary(sprint.id).pipe(catchError(() => of(null))),
    };
    if (sprint.piId) {
      requests['piFeatures'] = this.featureSvc.getAllAcrossSprints({ piId: sprint.piId }).pipe(catchError(() => of([])));
    }

    forkJoin(requests).subscribe((res: any) => {
      this.summary.set(res['summary']);
      this.blockers.set(res['blockers']);
      this.discussions.set(res['discussions'] ?? []);
      this.retroActions.set(res['retroActions'] ?? []);
      this.piFeatures.set(res['piFeatures'] ?? []);
      this.leaveSummary.set(res['leaveSummary'] ?? null);
      this.loading.set(false);
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

  promoteToDiscussion(action: RetroAction) {
    if (this.promotingId()) return;
    this.promotingId.set(action.id);
    this.discussionSvc.create({
      title:      action.title,
      notes:      action.notes,
      status:     'Open',
      priority:   'Medium',
      startDate:  null,
      targetDate: action.dueDate,
    }).subscribe(dp => {
      this.discussions.update(list => [...list, dp]);
      setTimeout(() => this.promotingId.set(null), 1500);
    });
  }

  retroStatusColor(s: string): string {
    return { Open: '#64b5f6', InProgress: '#ffb74d', Done: '#81c784' }[s] ?? '#aaa';
  }

  isRetroOverdue(a: RetroAction): boolean {
    if (!a.dueDate || a.status === 'Done') return false;
    return a.dueDate < new Date().toISOString().slice(0, 10);
  }

  fmtDate(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  celebrations = computed(() => {
    const today = new Date();
    const events: { name: string; type: 'birthday' | 'anniversary'; daysUntil: number; years?: number }[] = [];
    for (const m of this.allMembers()) {
      const fullName = `${m.firstName} ${m.lastName}`;
      if (m.birthDate) {
        const d = this.daysUntilAnnual(m.birthDate, today);
        if (d <= 14) events.push({ name: fullName, type: 'birthday', daysUntil: d });
      }
      if (m.joinDate) {
        const d = this.daysUntilAnnual(m.joinDate, today);
        const years = today.getFullYear() - new Date(m.joinDate).getFullYear() + (d === 0 ? 0 : 1);
        if (d <= 14 && years > 0) events.push({ name: fullName, type: 'anniversary', daysUntil: d, years });
      }
    }
    return events.sort((a, b) => a.daysUntil - b.daysUntil);
  });

  private daysUntilAnnual(dateStr: string, today: Date): number {
    const d = new Date(dateStr);
    const next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
    if (next < today) next.setFullYear(next.getFullYear() + 1);
    return Math.round((next.getTime() - today.setHours(0,0,0,0)) / 86_400_000);
  }

  private todayStr()    { return new Date().toISOString().slice(0, 10); }
}
