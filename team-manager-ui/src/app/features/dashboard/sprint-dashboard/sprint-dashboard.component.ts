import { Component, OnInit, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
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
  imports: [CommonModule, RouterLink, FormsModule,
    MatSelectModule, MatFormFieldModule, MatIconModule, MatDialogModule, MatProgressSpinnerModule,
    IconButtonComponent, CurrentSprintCardComponent, LeaveSummaryCardComponent],
  styles: [`
    .stat-card { transition:filter 0.15s; }
    .stat-card:hover { filter:brightness(1.25); }
    .blocker-row { background:rgba(239,83,80,0.07);transition:background 0.15s; }
    .blocker-row:hover { background:rgba(239,83,80,0.12); }
    .discussion-row { background:rgba(121,134,203,0.05);transition:background 0.15s; }
    .discussion-row:hover { background:rgba(121,134,203,0.1); }
    .retro-row { background:rgba(100,181,246,0.04);transition:background 0.15s; }
    .retro-row:hover { background:rgba(100,181,246,0.09); }
    .dashboard-hint {
      text-align: right;
      padding: 8px 0;
      font-size: 0.68rem;
      opacity: 0.25;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
      user-select: none;
      transition: opacity 0.2s;
    }
    .dashboard-hint:hover { opacity: 0.45; }
    @media (max-width: 767px) {
      .dashboard-hint { display: none; }
    }
  `],
  template: `
    <!-- Current Sprint Card -->
    @if (currentSprint()) {
      <div style="margin-bottom:28px">
        <div style="font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;opacity:0.5;margin-bottom:8px">Current Sprint</div>
        <app-current-sprint-card
          [sprint]="currentSprint()!"
          [features]="currentFeatures()"
          [showEditButton]="false" />
      </div>
    }

    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    }

    @if (selectedSprintId && summary() && !loading()) {
      <!-- Sprint goal -->
      @if (selectedSprint()?.goal) {
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:20px;padding:12px 16px;
                    border-radius:10px;background:rgba(100,181,246,0.06);border:1px solid rgba(100,181,246,0.18)">
          <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px;color:#64b5f6;margin-top:2px;flex-shrink:0">flag</mat-icon>
          <span style="font-size:0.88rem;opacity:0.85;line-height:1.5">{{ selectedSprint()!.goal }}</span>
        </div>
      }

      <!-- Stat pills -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:28px">
        @for (stat of stats(); track stat.label) {
          <a [routerLink]="stat.route" [queryParams]="stat.queryParams" class="stat-card"
             style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-radius:10px;
                    border:1px solid;flex:1;min-width:110px;max-width:160px;text-decoration:none;cursor:pointer"
             [style.background]="stat.bg"
             [style.border-color]="stat.border">
            <div style="flex:1;min-width:0">
              <div style="font-size:1.5rem;font-weight:800;line-height:1" [style.color]="stat.color">{{ stat.value }}</div>
              <div style="font-size:0.72rem;opacity:0.55;margin-top:2px">{{ stat.label }}</div>
            </div>
            <mat-icon style="font-size:14px;width:14px;height:14px;line-height:14px;opacity:0.3;flex-shrink:0">chevron_right</mat-icon>
          </a>
        }
      </div>

      <!-- Sprint progress bar -->
      @if (sprintProgress() && sprintProgress()!.total > 0) {
        <div style="margin-bottom:24px;padding:14px 18px;border-radius:10px;
                    background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08)">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px;opacity:0.5">speed</mat-icon>
            <span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;opacity:0.5">
              Sprint Progress
            </span>
            <span style="margin-left:auto;font-size:0.78rem;opacity:0.6">
              {{ sprintProgress()!.done }} / {{ sprintProgress()!.total }} done
              <span style="opacity:0.6">({{ sprintProgress()!.pct }}%)</span>
            </span>
          </div>
          <div style="height:6px;border-radius:3px;background:rgba(255,255,255,0.08);overflow:hidden">
            <div style="height:100%;border-radius:3px;background:linear-gradient(90deg,#4caf50,#81c784);transition:width 0.4s"
                 [style.width]="sprintProgress()!.pct + '%'"></div>
          </div>
        </div>
      }

      <!-- Discussion points -->
      <div style="margin-bottom:28px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <mat-icon style="color:#7986cb;font-size:18px;width:18px;height:18px;line-height:18px">forum</mat-icon>
          <span style="font-size:0.8rem;font-weight:700;color:#7986cb;text-transform:uppercase;letter-spacing:0.07em">
            Discussions
            @if (openDiscussions().length > 0) { ({{ openDiscussions().length }}) }
          </span>
          <a routerLink="/discussion" style="margin-left:auto;font-size:0.72rem;opacity:0.4;text-decoration:none;
                                             display:flex;align-items:center;gap:2px">
            View all <mat-icon style="font-size:12px;width:12px;height:12px;line-height:12px">open_in_new</mat-icon>
          </a>
        </div>

        @if (openDiscussions().length === 0) {
          <div style="display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:10px;
                      background:rgba(121,134,203,0.05);border:1px solid rgba(121,134,203,0.15)">
            <mat-icon style="color:#7986cb;font-size:16px;width:16px;height:16px;line-height:16px;opacity:0.5">check_circle</mat-icon>
            <span style="font-size:0.85rem;opacity:0.45">No open discussions for this sprint</span>
          </div>
        } @else {
          <div style="display:flex;flex-direction:column;gap:6px">
            @for (d of openDiscussions(); track d.id) {
              <a routerLink="/discussion" class="discussion-row"
                 style="display:flex;align-items:center;gap:12px;padding:11px 16px;border-radius:10px;
                        border:1px solid rgba(121,134,203,0.15);cursor:pointer;text-decoration:none">
                <!-- Priority dot -->
                <span style="width:8px;height:8px;border-radius:50%;flex-shrink:0"
                      [style.background]="discussionPriorityColor(d.priority)"></span>
                <!-- Title -->
                <span style="flex:1;font-size:0.88rem;font-weight:500;overflow:hidden;
                             text-overflow:ellipsis;white-space:nowrap;color:inherit">{{ d.title }}</span>
                <!-- Status badge -->
                <span style="font-size:0.68rem;font-weight:600;border-radius:8px;padding:2px 8px;flex-shrink:0"
                      [style.background]="d.status === 'InProgress' ? 'rgba(33,150,243,0.15)' : 'rgba(255,255,255,0.08)'"
                      [style.color]="d.status === 'InProgress' ? '#2196f3' : 'rgba(255,255,255,0.45)'">
                  {{ d.status === 'InProgress' ? 'In Progress' : d.status }}
                </span>
                <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px;opacity:0.3;flex-shrink:0">chevron_right</mat-icon>
              </a>
            }
          </div>
        }
      </div>

      <!-- Retro Action Items -->
      @if (pendingRetroActions().length > 0) {
        <div style="margin-bottom:28px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <mat-icon style="color:#64b5f6;font-size:18px;width:18px;height:18px;line-height:18px">task_alt</mat-icon>
            <span style="font-size:0.8rem;font-weight:700;color:#64b5f6;text-transform:uppercase;letter-spacing:0.07em">
              Retro Actions ({{ pendingRetroActions().length }})
            </span>
            <a [routerLink]="['/sprints', selectedSprintId]" [fragment]="'retro'"
               style="margin-left:auto;font-size:0.72rem;opacity:0.4;text-decoration:none;display:flex;align-items:center;gap:2px">
              View retro <mat-icon style="font-size:12px;width:12px;height:12px;line-height:12px">open_in_new</mat-icon>
            </a>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            @for (a of pendingRetroActions(); track a.id) {
              <div class="retro-row"
                   style="display:flex;align-items:center;gap:12px;padding:11px 16px;border-radius:10px;
                          border:1px solid rgba(100,181,246,0.15)">
                <!-- Status dot -->
                <span style="width:8px;height:8px;border-radius:50%;flex-shrink:0"
                      [style.background]="retroStatusColor(a.status)"></span>
                <!-- Content -->
                <div style="flex:1;min-width:0">
                  <div style="font-size:0.88rem;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                    {{ a.title }}
                  </div>
                  @if (a.assignedTo || a.dueDate) {
                    <div style="font-size:0.72rem;opacity:0.4;margin-top:2px;display:flex;gap:8px">
                      @if (a.assignedTo) { <span>{{ a.assignedTo }}</span> }
                      @if (a.dueDate) {
                        <span [style.color]="isRetroOverdue(a) ? '#ef9a9a' : 'inherit'"
                              [style.opacity]="isRetroOverdue(a) ? '0.85' : 'inherit'">
                          {{ fmtDate(a.dueDate) }}{{ isRetroOverdue(a) ? ' ⚠' : '' }}
                        </span>
                      }
                    </div>
                  }
                </div>
                <!-- Status badge -->
                <span style="font-size:0.68rem;font-weight:600;border-radius:8px;padding:2px 8px;flex-shrink:0"
                      [style.background]="a.status === 'InProgress' ? 'rgba(100,181,246,0.15)' : 'rgba(255,255,255,0.07)'"
                      [style.color]="a.status === 'InProgress' ? '#64b5f6' : 'rgba(255,255,255,0.4)'">
                  {{ a.status === 'InProgress' ? 'In Progress' : 'Open' }}
                </span>
                <!-- Promote button -->
                <app-icon-btn [icon]="promotingId() === a.id ? 'check_circle' : 'move_up'" size="sm" [tooltip]="promotingId() === a.id ? 'Promoted!' : 'Promote to Discussion'" [disabled]="promotingId() === a.id" [style.color]="promotingId() === a.id ? '#81c784' : '#7986cb'" (btnClick)="promoteToDiscussion(a)" />
              </div>
            }
          </div>
        </div>
      }

      <!-- PI Progress -->
      @if (selectedSprint()?.piId && piFeatures().length > 0) {
        <div style="margin-bottom:28px;padding:16px 20px;border-radius:10px;
                    background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
            <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px;opacity:0.5">timeline</mat-icon>
            <span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;opacity:0.5">
              PI Progress
            </span>
            <span style="font-size:0.8rem;font-weight:600;opacity:0.9">{{ selectedSprint()!.piName }}</span>
            <span style="margin-left:auto;font-size:0.75rem;opacity:0.4">{{ piFeatures().length }} features</span>
          </div>

          <!-- Progress bar -->
          <div style="height:6px;border-radius:3px;background:rgba(255,255,255,0.08);margin-bottom:12px;overflow:hidden">
            <div style="height:100%;border-radius:3px;background:linear-gradient(90deg,#27ae60,#8e44ad);transition:width 0.4s"
                 [style.width]="piDonePercent() + '%'"></div>
          </div>

          <!-- Status counts -->
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            @for (st of statusOrder; track st) {
              @if (piCount(st) > 0) {
                <div style="display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;
                            background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07)">
                  <span style="width:8px;height:8px;border-radius:50%;flex-shrink:0"
                        [style.background]="statusColor(st)"></span>
                  <span style="font-size:0.78rem;font-weight:700" [style.color]="statusColor(st)">{{ piCount(st) }}</span>
                  <span style="font-size:0.72rem;opacity:0.5">{{ statusLabel(st) }}</span>
                </div>
              }
            }
          </div>
        </div>
      }

      <!-- Celebrations -->
      @if (celebrations().length > 0) {
        <div style="margin-bottom:28px;padding:14px 18px;border-radius:10px;
                    background:rgba(255,183,77,0.06);border:1px solid rgba(255,183,77,0.2)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
            <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px;color:#ffb74d">celebration</mat-icon>
            <span style="font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#ffb74d">Upcoming Celebrations</span>
          </div>
          @for (c of celebrations(); track c.name + c.type) {
            <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px">
              <span style="font-size:0.75rem;flex-shrink:0;width:18px">{{ c.type === 'birthday' ? '🎂' : '🎉' }}</span>
              <span style="font-size:0.82rem;font-weight:600">{{ c.name }}</span>
              <span style="font-size:0.75rem;opacity:0.5">
                {{ c.type === 'anniversary' ? (c.years + ' yr' + (c.years !== 1 ? 's' : '')) : 'birthday' }}
              </span>
              <span style="font-size:0.72rem;opacity:0.4;margin-left:auto">
                {{ c.daysUntil === 0 ? 'Today! 🎊' : c.daysUntil === 1 ? 'Tomorrow' : 'in ' + c.daysUntil + 'd' }}
              </span>
            </div>
          }
        </div>
      }

      <!-- Leave & PTO Summary -->
      @if (leaveSummary()) {
        <app-leave-summary-card [leaveSummary]="leaveSummary()!" style="display:block;margin-bottom:28px" />
      }

      <!-- Blockers section -->
      @if (blockers().length > 0) {
        <div style="margin-bottom:28px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <mat-icon style="color:#ef5350;font-size:18px;width:18px;height:18px;line-height:18px">block</mat-icon>
            <span style="font-size:0.8rem;font-weight:700;color:#ef5350;text-transform:uppercase;letter-spacing:0.07em">
              Blockers ({{ blockers().length }})
            </span>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            @for (b of blockers(); track b.workItemId) {
              <div (click)="openBlocker(b)" class="blocker-row"
                   style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-radius:10px;
                          border:1px solid rgba(239,83,80,0.25);cursor:pointer">

                <!-- Days badge -->
                <div style="flex-shrink:0;min-width:44px;text-align:center;background:rgba(239,83,80,0.15);
                            border-radius:8px;padding:4px 8px;border:1px solid rgba(239,83,80,0.3)">
                  <div style="font-size:1rem;font-weight:800;color:#ef5350;line-height:1">{{ b.daysBlocked }}</div>
                  <div style="font-size:0.6rem;opacity:0.6;margin-top:1px">{{ b.daysBlocked === 1 ? 'day' : 'days' }}</div>
                </div>

                <!-- Info -->
                <div style="flex:1;min-width:0">
                  <div style="font-size:0.88rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                    {{ b.title }}
                  </div>
                  <div style="font-size:0.72rem;opacity:0.45;margin-top:2px;display:flex;gap:8px;flex-wrap:wrap">
                    @if (b.featureTitle) { <span>{{ b.featureTitle }}</span> }
                    @if (b.externalTicketRef) { <span style="font-family:monospace">{{ b.externalTicketRef }}</span> }
                  </div>
                </div>

                <!-- Member -->
                <div style="flex-shrink:0;font-size:0.78rem;opacity:0.6;text-align:right">
                  {{ b.memberName }}
                </div>

                <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px;opacity:0.3;flex-shrink:0">chevron_right</mat-icon>
              </div>
            }
          </div>
        </div>
      }

      @if (blockers().length === 0 && summary()) {
        <div style="display:flex;align-items:center;gap:8px;padding:12px 16px;border-radius:10px;
                    background:rgba(129,199,132,0.07);border:1px solid rgba(129,199,132,0.2);margin-bottom:28px">
          <mat-icon style="color:#81c784;font-size:18px;width:18px;height:18px;line-height:18px">check_circle</mat-icon>
          <span style="font-size:0.85rem;color:#81c784">No blockers this sprint</span>
        </div>
      }

      <div class="dashboard-hint" aria-hidden="true">
        <mat-icon>keyboard</mat-icon>
        Ctrl+P / ⌘+P  Quick navigation
      </div>
    }

    @if (!selectedSprintId && !loading()) {
      <div style="text-align:center;padding:64px;opacity:0.3;font-size:0.95rem">
        Select a sprint to view the dashboard.
      </div>
    }
  `
})
export class SprintDashboardComponent implements OnInit {
  private sprintSvc      = inject(SprintService);
  private dashSvc        = inject(DashboardService);
  private featureSvc     = inject(FeatureService);
  private memberSvc      = inject(TeamMemberService);
  private workItemSvc    = inject(WorkItemService);
  private discussionSvc  = inject(DiscussionPointService);
  private retroActionSvc = inject(RetroActionService);
  private dialog         = inject(MatDialog);
  private router         = inject(Router);

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
    const sprintRoute = ['/sprints', this.selectedSprintId];
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
  }

  load() {
    const sprint = this.currentSprint();
    if (!sprint) return;
    this.selectedSprintId = sprint.id;
    this.loading.set(true);
    const requests: Record<string, any> = {
      summary:      this.dashSvc.getSprintSummary(sprint.id),
      blockers:     this.dashSvc.getBlockers(sprint.id),
      discussions:  this.discussionSvc.getAll(),
      retroActions: this.retroActionSvc.getBySprintId(sprint.id),
      leaveSummary: this.dashSvc.getLeaveSummary(sprint.id),
    };
    if (sprint.piId) {
      requests['piFeatures'] = this.featureSvc.getAllAcrossSprints({ piId: sprint.piId });
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
