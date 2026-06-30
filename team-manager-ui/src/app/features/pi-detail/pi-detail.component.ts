import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { SprintService } from '../../core/services/sprint.service';
import { MilestoneService } from '../../core/services/milestone.service';
import { SquadService } from '../../core/services/squad.service';
import { PI } from '../../core/models/sprint.model';
import { Sprint } from '../../core/models/sprint.model';
import { Milestone, CreateMilestoneRequest, MilestoneScope } from '../../core/models/milestone.model';
import { SquadSummary } from '../../core/models/squad.model';
import { MilestoneScopeBadgeComponent } from '../../shared/components/milestone-scope-badge.component';

interface MilestoneCreateDialogData {
  title: string;
  description: string | null;
  targetDate: string | null;
  scope: MilestoneScope;
  squadId: string | null;
}

@Component({
  selector: 'app-pi-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    MatButtonModule, MatIconModule, MatTooltipModule, MatDialogModule,
    MatButtonToggleModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatRadioModule,
    MilestoneScopeBadgeComponent
  ],
  template: `
    @if (loading()) {
      <div style="text-align:center;padding:64px;opacity:0.35">Loading…</div>
    }

    @if (pi(); as p) {
      <div style="margin-bottom:24px">
        <a mat-button routerLink="/" style="padding:0 8px 0 4px;gap:4px;color:rgba(255,255,255,0.55)">
          <mat-icon style="font-size:18px;width:18px;height:18px;line-height:18px">arrow_back</mat-icon>
          Home
        </a>
      </div>

      <div style="margin-bottom:32px">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <h2 style="margin:0;font-size:1.4rem">{{ p.name }}</h2>
          <span style="font-size:0.8rem;opacity:0.4">
            {{ p.startDate | date:'d MMM yyyy' }} – {{ p.endDate | date:'d MMM yyyy' }}
          </span>
        </div>
        @if (p.description) {
          <p style="opacity:0.5;margin:6px 0 0;font-size:0.85rem">{{ p.description }}</p>
        }
      </div>

      <!-- Milestone Timeline -->
      <div style="margin-bottom:32px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
          <h3 style="margin:0;font-size:0.95rem;font-weight:600">Milestones</h3>
          <span style="font-size:0.75rem;opacity:0.4"> · {{ filteredMilestones().length }}</span>
          <span style="flex:1"></span>
          <a mat-button [routerLink]="['/pis', piId, 'roadmap']" style="font-size:0.8rem">
            <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px;margin-right:4px">map</mat-icon>
            Road to Product
          </a>
          <button mat-stroked-button color="primary" (click)="addMilestone()" style="font-size:0.8rem">
            <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px;margin-right:4px">add</mat-icon>
            Add milestone
          </button>
        </div>

        <!-- Filter Bar -->
        @if (userSquads().length > 0) {
          <div style="margin-bottom:16px">
            <mat-button-toggle-group [value]="scopeFilter()" (change)="scopeFilter.set($event.value)" style="font-size:0.78rem">
              <mat-button-toggle value="All">All</mat-button-toggle>
              <mat-button-toggle value="Global">Global</mat-button-toggle>
              <mat-button-toggle value="MySquads">My Squads</mat-button-toggle>
            </mat-button-toggle-group>
          </div>
        }

        @if (milestones().length === 0) {
          <div style="text-align:center;padding:48px;opacity:0.25;font-size:0.85rem;font-style:italic">
            No milestones yet — add one to start tracking outcomes within this PI
          </div>
        } @else if (filteredMilestones().length === 0) {
          <div style="text-align:center;padding:48px;opacity:0.25;font-size:0.85rem">
            No squad-specific milestones yet<br>
            <span style="font-size:0.78rem">Global milestones are shown for everyone — create squad milestones to track your squad's progress</span>
          </div>
        } @else {
          <div style="position:relative;overflow-x:auto;padding:16px 0">
            <!-- Timeline connector line -->
            <div style="position:absolute;top:38px;left:0;right:0;height:2px;background:rgba(255,255,255,0.1)"></div>

            <div style="display:flex;gap:24px;min-width:max-content;align-items:flex-start">
              @for (m of filteredMilestones(); track m.id; let i = $index) {
                <div style="display:flex;flex-direction:column;align-items:center;position:relative;min-width:140px;max-width:200px">
                  <!-- Scope badge -->
                  <div style="margin-bottom:6px">
                    <app-milestone-scope-badge [scope]="m.scope" [squadName]="m.squadName" [squadColor]="m.squadColor" />
                  </div>

                  <!-- Diamond node -->
                  <div [routerLink]="['/milestones', m.id]"
                       [class]="'timeline-node ' + nodeClass(m.status)"
                       [style.border-color]="m.scope === 'Squad' && m.squadColor ? m.squadColor : undefined"
                       style="cursor:pointer;transition:all 0.2s"
                       [matTooltip]="m.title + ' — ' + m.progressPercent + '%'">
                  </div>

                  <!-- Content below node -->
                  <div style="text-align:center;margin-top:8px">
                    <a [routerLink]="['/milestones', m.id]"
                       style="font-size:0.8rem;font-weight:600;color:inherit;text-decoration:none;display:block;line-height:1.3">
                      {{ m.title }}
                    </a>
                    @if (m.targetDate) {
                      <div style="font-size:0.68rem;opacity:0.35;margin-top:2px">
                        {{ m.targetDate | date:'d MMM' }}
                      </div>
                    }
                    <span [class]="statusBadge(m.status)" style="display:inline-block;margin-top:4px;padding:1px 6px;border-radius:6px;font-size:0.65rem;font-weight:600">
                      {{ m.status }}
                    </span>
                    <div style="margin-top:4px;height:3px;width:100%;border-radius:3px;background:rgba(255,255,255,0.1);overflow:hidden">
                      <div [style.width]="m.progressPercent + '%'"
                           [style.background]="m.status === 'Done' ? '#4caf50' : '#64b5f6'"
                           style="height:100%;transition:width 0.3s"></div>
                    </div>
                    <div style="font-size:0.65rem;opacity:0.3;margin-top:2px">
                      {{ m.completedTaskCount }}/{{ m.taskCount }} tasks
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>

      <!-- Sprint List -->
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
          <h3 style="margin:0;font-size:0.95rem;font-weight:600">Sprints</h3>
          <span style="font-size:0.75rem;opacity:0.4"> · {{ sprints().length }}</span>
        </div>

        @if (sprints().length === 0) {
          <div style="text-align:center;padding:48px;opacity:0.25;font-size:0.85rem;font-style:italic">
            No sprints in this PI yet
          </div>
        } @else {
          <div style="display:flex;flex-direction:column;gap:8px">
            @for (s of sprints(); track s.id) {
              <a [routerLink]="['/delivery/sprints', s.id]"
                 style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-radius:8px;
                        background:rgba(255,255,255,0.03);text-decoration:none;color:inherit;transition:background 0.15s"
                 [style.background.hover]="'rgba(255,255,255,0.06)'">
                <span style="flex:1;font-weight:500;font-size:0.9rem">{{ s.name }}</span>
                <span style="font-size:0.75rem;opacity:0.4">{{ s.startDate | date:'d MMM' }} – {{ s.endDate | date:'d MMM yyyy' }}</span>
                @if (s.isInnovationSprint) {
                  <span style="font-size:0.65rem;padding:1px 6px;border-radius:4px;background:rgba(156,39,176,0.15);color:#ce93d8">Innovation</span>
                }
                <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px;opacity:0.3">chevron_right</mat-icon>
              </a>
            }
          </div>
        }
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .timeline-node {
      width: 24px;height: 24px;
      transform: rotate(45deg);
      border-radius: 3px;
      border: 2px solid;
      flex-shrink: 0;
      margin-bottom: 4px;
    }
    .timeline-node:hover {
      transform: rotate(45deg) scale(1.2);
    }
    .node-upcoming   { background:rgba(158,158,158,0.15);border-color:#9e9e9e; }
    .node-inprogress { background:rgba(33,150,243,0.2);border-color:#64b5f6; }
    .node-done       { background:rgba(76,175,80,0.2);border-color:#4caf50; }

    .sb-upcoming   { background:rgba(158,158,158,0.15);color:#9e9e9e; }
    .sb-inprogress { background:rgba(33,150,243,0.15);color:#64b5f6; }
    .sb-done       { background:rgba(76,175,80,0.15);color:#4caf50; }
  `]
})
export class PIDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private sprintSvc = inject(SprintService);
  private milestoneSvc = inject(MilestoneService);
  private squadSvc = inject(SquadService);
  private dialog = inject(MatDialog);

  piId = '';
  loading = signal(true);
  pi = signal<PI | null>(null);
  sprints = signal<Sprint[]>([]);
  milestones = signal<Milestone[]>([]);
  userSquads = signal<SquadSummary[]>([]);
  scopeFilter = signal<string>('All');

  filteredMilestones = computed(() => {
    const filter = this.scopeFilter();
    const ms = this.milestones();
    if (filter === 'All') return ms;
    if (filter === 'Global') return ms.filter(m => m.scope === 'Global');
    if (filter === 'MySquads') {
      const squadIds = new Set(this.userSquads().map(s => s.id));
      return ms.filter(m => m.scope === 'Squad' && m.squadId && squadIds.has(m.squadId));
    }
    return ms;
  });

  ngOnInit() {
    this.piId = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load() {
    this.loading.set(true);
    this.sprintSvc.getSprints({ piId: this.piId }).subscribe(sprints => {
      this.sprints.set(sprints);
      this.loading.set(false);
    });
    this.sprintSvc.getPIs().subscribe(pis => {
      this.pi.set(pis.find(p => p.id === this.piId) ?? null);
    });
    this.milestoneSvc.getByPI(this.piId).subscribe(ms => {
      this.milestones.set(ms);
    });
    this.squadSvc.getAll().subscribe(squads => {
      this.userSquads.set(squads);
    });
  }

  nodeClass(status: string): string {
    return `node-${status.toLowerCase()}`;
  }

  statusBadge(status: string): string {
    return `sb-${status.toLowerCase()}`;
  }

  addMilestone() {
    const dialogRef = this.dialog.open(MilestoneCreateDialogComponent, {
      width: '420px',
      data: {
        squads: this.userSquads()
      }
    });

    dialogRef.afterClosed().subscribe((result: MilestoneCreateDialogData | undefined) => {
      if (result?.title?.trim()) {
        this.milestoneSvc.create(this.piId, {
          title: result.title.trim(),
          description: result.description,
          targetDate: result.targetDate,
          position: this.milestones().length,
          scope: result.scope,
          squadId: result.squadId
        }).subscribe(() => this.load());
      }
    });
  }
}

@Component({
  selector: 'app-milestone-create-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatRadioModule
  ],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <h2 mat-dialog-title style="margin:0 0 16px;font-size:1.1rem">{{ data.isEdit ? 'Edit milestone' : 'Add milestone' }}</h2>
    <mat-dialog-content style="min-width:360px">
      <div style="display:flex;flex-direction:column;gap:16px;padding:8px 0">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Title</mat-label>
          <input matInput [(ngModel)]="form.title" placeholder="Milestone title" />
        </mat-form-field>

        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Description</mat-label>
          <textarea matInput [(ngModel)]="form.description" rows="2" placeholder="Optional description"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Target date</mat-label>
          <input matInput type="date" [(ngModel)]="form.targetDate" />
        </mat-form-field>

        <div>
          <div style="font-size:0.75rem;opacity:0.5;margin-bottom:8px">Scope</div>
          <mat-radio-group [(ngModel)]="form.scope" style="display:flex;gap:16px">
            <mat-radio-button value="Global">Global</mat-radio-button>
            <mat-radio-button value="Squad">Squad</mat-radio-button>
          </mat-radio-group>
        </div>

        @if (form.scope === 'Squad') {
          <mat-form-field appearance="outline" style="width:100%">
            <mat-label>Squad</mat-label>
            <mat-select [(ngModel)]="form.squadId">
              @for (s of data.squads; track s.id) {
                <mat-option [value]="s.id">{{ s.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" [mat-dialog-close]="form" [disabled]="!form.title.trim() || (form.scope === 'Squad' && !form.squadId)">
        {{ data.isEdit ? 'Save' : 'Create' }}
      </button>
    </mat-dialog-actions>
  `
})
export class MilestoneCreateDialogComponent {
  form: MilestoneCreateDialogData = {
    title: '',
    description: null,
    targetDate: null,
    scope: 'Global',
    squadId: null
  };

  data = inject<{ squads: SquadSummary[]; isEdit?: boolean }>(MAT_DIALOG_DATA);
}
