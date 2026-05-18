import { Component, OnInit, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Sprint, PI, VelocityEntry } from '../../../core/models/sprint.model';
import { Feature } from '../../../core/models/feature.model';
import { SprintService } from '../../../core/services/sprint.service';
import { FeatureService } from '../../../core/services/feature.service';
import { SprintFormComponent } from '../sprint-form/sprint-form.component';
import { SprintCloneDialogComponent } from '../sprint-clone-dialog/sprint-clone-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { IconButtonComponent } from '../../../shared/components/icon-btn/icon-btn.component';
import { CurrentSprintCardComponent } from '../../../shared/components/current-sprint-card/current-sprint-card.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

const STATUS_ORDER = ['InProgress', 'Planned', 'Completed', 'ReadyForRelease', 'Released'];
const STATUS_LABEL: Record<string, string> = {
  InProgress: 'In Progress', Planned: 'Planned', Completed: 'Completed',
  ReadyForRelease: 'Ready for Release', Released: 'Released'
};
const STATUS_COLOR: Record<string, string> = {
  InProgress: '#E67E22', Planned: '#95A5A6', Completed: '#2980B9',
  ReadyForRelease: '#8E44AD', Released: '#27AE60'
};

@Component({
  selector: 'app-sprint-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatIconModule,
    MatDialogModule, MatChipsModule, MatTooltipModule, MatProgressSpinnerModule,
    SprintCloneDialogComponent, IconButtonComponent, CurrentSprintCardComponent],
  template: `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap">
      <h2 style="margin:0;flex:1;min-width:120px">Sprints</h2>
      <button mat-stroked-button (click)="openPIForm()"><mat-icon>add</mat-icon> New PI</button>
      <button mat-raised-button color="primary" (click)="openSprintForm()"><mat-icon>add</mat-icon> New Sprint</button>
    </div>

    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    } @else {

    <!-- Current Sprint -->
    @if (currentSprint()) {
      <div style="margin-bottom:28px">
        <div style="font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;opacity:0.5;margin-bottom:8px">Current Sprint</div>
        <app-current-sprint-card
          [sprint]="currentSprint()!"
          [features]="currentFeatures()"
          (edit)="openSprintForm($event)" />
      </div>
    }

    <!-- PI Filter -->
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <span style="font-size:0.8rem;opacity:0.5;margin-right:4px">Filter:</span>
      <button mat-stroked-button [class.active-filter]="selectedPI() === null"
              style="min-width:0;padding:0 12px;height:32px;font-size:0.8rem"
              (click)="selectedPI.set(null)">All</button>
      @for (pi of pis(); track pi.id) {
        <button mat-stroked-button [class.active-filter]="selectedPI() === pi.id"
                style="min-width:0;padding:0 12px;height:32px;font-size:0.8rem"
                (click)="selectedPI.set(pi.id)">{{ pi.name }}</button>
      }
      @if (hasUngrouped()) {
        <button mat-stroked-button [class.active-filter]="selectedPI() === 'none'"
                style="min-width:0;padding:0 12px;height:32px;font-size:0.8rem"
                (click)="selectedPI.set('none')">No PI</button>
      }
    </div>

    <!-- Active sprints -->
    <div style="display:flex;flex-direction:column;gap:6px">
      @for (s of activeSprints(); track s.id) {
        <a class="sprint-card" [routerLink]="['/sprints', s.id]">
          <div style="flex:1;min-width:0">
            <div style="font-weight:500;font-size:0.9rem">{{ s.name }}</div>
            <div style="font-size:0.78rem;opacity:0.5;margin-top:1px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span>{{ s.startDate | date:'d MMM' }} – {{ s.endDate | date:'d MMM yyyy' }}</span>
              @if (s.piName) { <span>· <a [routerLink]="['/pis', s.piId]" style="color:inherit;text-decoration:none" (click)="$event.stopPropagation()">{{ s.piName }}</a></span> }
              <span [style.color]="daysLeft(s) <= 3 ? '#ffb74d' : 'rgba(255,255,255,0.4)'"
                    [style.font-weight]="daysLeft(s) <= 3 ? '600' : '400'">
                {{ daysLeft(s) === 0 ? 'ends today' : daysLeft(s) + 'd left' }}
              </span>
            </div>
          </div>
          @if (s.isInnovationSprint) {
            <mat-chip style="font-size:0.7rem">IP</mat-chip>
          }
          <app-icon-btn icon="edit" size="sm" tooltip="Edit" (btnClick)="$event.preventDefault(); $event.stopPropagation(); openSprintForm(s)" />
          <app-icon-btn icon="content_copy" size="sm" tooltip="Clone sprint" (btnClick)="$event.preventDefault(); $event.stopPropagation(); cloneSprint(s)" />
          <app-icon-btn icon="delete" size="sm" tooltip="Delete" [danger]="true" (btnClick)="$event.preventDefault(); $event.stopPropagation(); deleteSprint(s.id)" />
        </a>
      }
      @if (activeSprints().length === 0) {
        <div style="text-align:center;padding:48px;opacity:0.4;font-size:0.9rem">No sprints found</div>
      }
    </div>

    <!-- Past sprints collapsible -->
    @if (pastSprints().length > 0) {
      <div style="margin-top:24px">
        <button style="display:flex;align-items:center;gap:8px;background:none;border:none;
                       color:rgba(255,255,255,0.35);cursor:pointer;padding:4px 0;font-size:0.78rem;
                       font-weight:600;text-transform:uppercase;letter-spacing:0.07em"
                (click)="pastExpanded.set(!pastExpanded())">
          <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px;transition:transform 0.2s"
                    [style.transform]="pastExpanded() ? 'rotate(90deg)' : 'rotate(0)'">chevron_right</mat-icon>
          Past Sprints ({{ pastSprints().length }})
        </button>
        @if (pastExpanded()) {
          <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">
            @for (s of pastSprints(); track s.id) {
              <a class="sprint-card sprint-card-past" [routerLink]="['/sprints', s.id]">
                <div style="flex:1;min-width:0">
                  <div style="font-weight:500;font-size:0.88rem">{{ s.name }}</div>
                  <div style="font-size:0.75rem;opacity:0.5;margin-top:1px">
                    {{ s.startDate | date:'d MMM' }} – {{ s.endDate | date:'d MMM yyyy' }}
                    @if (s.piName) { · <a [routerLink]="['/pis', s.piId]" style="color:inherit;text-decoration:none" (click)="$event.stopPropagation()">{{ s.piName }}</a> }
                  </div>
                </div>
                @if (s.isInnovationSprint) {
                  <mat-chip style="font-size:0.7rem">IP</mat-chip>
                }
                <app-icon-btn icon="edit" size="sm" tooltip="Edit" (btnClick)="$event.preventDefault(); $event.stopPropagation(); openSprintForm(s)" />
                <app-icon-btn icon="content_copy" size="sm" tooltip="Clone sprint" (btnClick)="$event.preventDefault(); $event.stopPropagation(); cloneSprint(s)" />
                <app-icon-btn icon="delete" size="sm" tooltip="Delete" [danger]="true" (btnClick)="$event.preventDefault(); $event.stopPropagation(); deleteSprint(s.id)" />
              </a>
            }
          </div>
        }
      </div>
    }
    <!-- Velocity chart -->
    @if (velocityData().length > 1) {
      <div style="margin-top:36px">
        <div style="font-size:0.72rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;opacity:0.4;margin-bottom:12px">
          Velocity — completed tasks per sprint
        </div>

        <!-- bars -->
        <div style="display:flex;align-items:flex-end;gap:2px;height:110px">
          @for (v of velocityData(); track v.sprintId) {
            <div style="flex:1;min-width:6px;position:relative;height:100%"
                 [matTooltip]="barTooltip(v)" matTooltipClass="pre-tooltip">
              <!-- total background -->
              <div style="position:absolute;bottom:0;left:0;right:0;border-radius:3px 3px 0 0;
                          background:rgba(255,255,255,0.06)"
                   [style.height]="totalPct(v) + '%'"></div>
              <!-- completed bar -->
              <div style="position:absolute;bottom:0;left:0;right:0;border-radius:3px 3px 0 0;min-height:2px;transition:height 0.3s"
                   [style.height]="completedPct(v) + '%'"
                   [style.background]="piColor(v.piId)"></div>
              <!-- count label above bar -->
              @if (v.completedItems > 0) {
                <div style="position:absolute;left:0;right:0;text-align:center;font-size:0.55rem;
                            font-weight:600;opacity:0.7;line-height:1"
                     [style.bottom]="'calc(' + completedPct(v) + '% + 3px)'">
                  {{ v.completedItems }}
                </div>
              }
            </div>
          }
        </div>

        <!-- sprint name labels -->
        <div style="display:flex;gap:2px;margin-top:5px">
          @for (v of velocityData(); track v.sprintId) {
            <div style="flex:1;min-width:0;font-size:0.57rem;opacity:0.35;text-align:center;
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis"
                 [title]="v.sprintName">
              {{ v.sprintName }}
            </div>
          }
        </div>

        <!-- PI colour legend -->
        @if (pis().length > 1) {
          <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px">
            @for (pi of pis(); track pi.id) {
              <div style="display:flex;align-items:center;gap:4px;font-size:0.68rem;opacity:0.55">
                <span style="width:8px;height:8px;border-radius:2px;flex-shrink:0"
                      [style.background]="piColor(pi.id)"></span>
                {{ pi.name }}
              </div>
            }
            <div style="display:flex;align-items:center;gap:4px;font-size:0.68rem;opacity:0.55">
              <span style="width:8px;height:8px;border-radius:2px;flex-shrink:0;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15)"></span>
              total items
            </div>
          </div>
        }
      </div>
    }

    } <!-- end @else -->
  `,
  styles: [`
    .active-filter { background: rgba(100,181,246,0.15) !important; border-color: rgba(100,181,246,0.4) !important; color: #64b5f6 !important; }
    .sprint-card {
      display: flex; align-items: center; padding: 12px 16px; border-radius: 8px; gap: 12px;
      background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
      text-decoration: none; color: inherit; cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }
    .sprint-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.14); }
    .sprint-card-past { opacity: 0.6; background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.05); padding: 10px 16px; }
    .sprint-card-past:hover { opacity: 0.85; }
  `]
})
export class SprintListComponent implements OnInit {
  private svc = inject(SprintService);
  private featureSvc = inject(FeatureService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  loading = signal(true);
  private sprints = signal<Sprint[]>([]);
  pis = signal<PI[]>([]);
  selectedPI = signal<string | null>(null);
  currentFeatures = signal<Feature[]>([]);
  private velocity = signal<VelocityEntry[]>([]);

  private readonly PI_PALETTE = ['#64b5f6','#81c784','#ffb74d','#ce93d8','#4dd0e1','#f48fb1','#a5d6a7','#ff8a65'];

  private piColorMap = computed(() => {
    const map = new Map<string, number>();
    this.pis().forEach((pi, i) => map.set(pi.id, i));
    return map;
  });

  velocityData = computed(() => {
    const ids = new Set(this.filteredSprints().map(s => s.id));
    return this.velocity().filter(v => ids.has(v.sprintId));
  });

  private maxVelocityTotal = computed(() =>
    Math.max(1, ...this.velocityData().map(v => v.totalItems))
  );

  completedPct(v: VelocityEntry): number {
    return (v.completedItems / this.maxVelocityTotal()) * 100;
  }
  totalPct(v: VelocityEntry): number {
    return (v.totalItems / this.maxVelocityTotal()) * 100;
  }
  piColor(piId: string | null): string {
    if (!piId) return 'rgba(255,255,255,0.3)';
    const idx = this.piColorMap().get(piId) ?? 0;
    return this.PI_PALETTE[idx % this.PI_PALETTE.length];
  }
  barTooltip(v: VelocityEntry): string {
    return `${v.sprintName}\n${v.completedItems} completed / ${v.totalItems} total`;
  }

  private today = (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();

  currentSprint = computed(() =>
    this.sprints().find(s => new Date(s.startDate) <= this.today && new Date(s.endDate) >= this.today) ?? null
  );

  currentFeaturesSorted = computed(() =>
    [...this.currentFeatures().filter(f => f.isActive)]
      .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
  );

  hasUngrouped = computed(() => this.sprints().some(s => !s.piId));

  pastExpanded = signal(false);

  filteredSprints = computed(() => {
    const pid = this.selectedPI();
    return this.sprints().filter(s => {
      if (pid === null) return true;
      if (pid === 'none') return !s.piId;
      return s.piId === pid;
    });
  });

  activeSprints = computed(() => this.filteredSprints().filter(s => !this.isPast(s) && s.id !== this.currentSprint()?.id));
  pastSprints   = computed(() => this.filteredSprints().filter(s => this.isPast(s)));

  isPast(s: Sprint) { return new Date(s.endDate) < this.today; }

  daysLeft(s: Sprint): number {
    const end = new Date(s.endDate);
    end.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((end.getTime() - this.today.getTime()) / 86_400_000));
  }
  featureStatusColor(status: string) { return STATUS_COLOR[status] ?? '#95A5A6'; }

  constructor() {
    effect(() => {
      const sprint = this.currentSprint();
      if (sprint) {
        this.featureSvc.getAll(sprint.id).subscribe(f => this.currentFeatures.set(f));
      }
    });
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getPIs().subscribe(pis => this.pis.set(pis));
    this.svc.getSprints().subscribe(sprints => { this.sprints.set(sprints); this.loading.set(false); });
    this.svc.getVelocity().subscribe(v => this.velocity.set(v));
  }

  openSprintForm(sprint?: Sprint) {
    const ref = this.dialog.open(SprintFormComponent, { width: '480px', data: { sprint, pis: this.pis() } });
    ref.afterClosed().subscribe(r => { if (r) this.load(); });
  }

  openPIForm() {
    const ref = this.dialog.open(SprintFormComponent, { width: '480px', data: { piMode: true } });
    ref.afterClosed().subscribe(r => { if (r) this.load(); });
  }

  cloneSprint(sprint: Sprint) {
    const ref = this.dialog.open(SprintCloneDialogComponent, { width: '440px', data: sprint });
    ref.afterClosed().subscribe(r => {
      if (r) {
        this.snack.open('Sprint cloned', 'OK', { duration: 2000 });
        this.load();
      }
    });
  }

  deleteSprint(id: string) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete sprint?', message: 'This will permanently remove the sprint and all its work items.', danger: true }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.svc.deleteSprint(id).subscribe(() => {
        this.snack.open('Sprint deleted', 'OK', { duration: 2000 });
        this.load();
      });
    });
  }
}
