import { Component, OnInit, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Sprint, PI } from '../../../core/models/sprint.model';
import { Feature } from '../../../core/models/feature.model';
import { SprintService } from '../../../core/services/sprint.service';
import { FeatureService } from '../../../core/services/feature.service';
import { SprintFormComponent } from '../sprint-form/sprint-form.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

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
    MatDialogModule, MatChipsModule, MatTooltipModule],
  template: `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap">
      <h2 style="margin:0;flex:1;min-width:120px">Sprints</h2>
      <button mat-stroked-button (click)="openPIForm()"><mat-icon>add</mat-icon> New PI</button>
      <button mat-raised-button color="primary" (click)="openSprintForm()"><mat-icon>add</mat-icon> New Sprint</button>
    </div>

    <!-- Current Sprint -->
    @if (currentSprint()) {
      <div style="margin-bottom:28px">
        <div style="font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;opacity:0.5;margin-bottom:8px">Current Sprint</div>
        <div style="padding:18px 20px;border-radius:12px;
                    background:linear-gradient(135deg,rgba(100,181,246,0.12),rgba(100,181,246,0.04));
                    border:1px solid rgba(100,181,246,0.25)">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">
            <div style="flex:1;min-width:0">
              <div style="font-size:1.05rem;font-weight:600">{{ currentSprint()!.name }}</div>
              <div style="font-size:0.8rem;opacity:0.55;margin-top:2px">
                {{ currentSprint()!.startDate | date:'d MMM' }} – {{ currentSprint()!.endDate | date:'d MMM yyyy' }}
                @if (currentSprint()!.piName) {
                  · <span>{{ currentSprint()!.piName }}</span>
                }
              </div>
            </div>
            @if (currentSprint()!.isInnovationSprint) {
              <mat-chip>IP Sprint</mat-chip>
            }
            <a mat-raised-button color="primary" [routerLink]="['/sprints', currentSprint()!.id]">
              <mat-icon>open_in_new</mat-icon> Open
            </a>
            <button mat-icon-button (click)="openSprintForm(currentSprint()!)"><mat-icon>edit</mat-icon></button>
          </div>

          <!-- Feature summary -->
          @if (currentFeatures().length) {
            <div style="border-top:1px solid rgba(100,181,246,0.15);padding-top:12px">
              <div style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;opacity:0.4;margin-bottom:8px">Sprint Goals</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                @for (f of currentFeaturesSorted(); track f.id) {
                  <span style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;
                               font-size:0.72rem;font-weight:500;
                               background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1)">
                    <span [style.width]="'7px'" [style.height]="'7px'" [style.border-radius]="'50%'"
                          [style.background]="featureStatusColor(f.status)" [style.flex-shrink]="'0'"></span>
                    {{ f.externalTicketRef ? f.externalTicketRef + ' · ' : '' }}{{ f.title }}
                  </span>
                }
              </div>
            </div>
          }
        </div>
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

    <!-- Sprint List -->
    <div style="display:flex;flex-direction:column;gap:6px">
      @for (s of filteredSprints(); track s.id) {
        <div style="display:flex;align-items:center;padding:12px 16px;border-radius:8px;
                    background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);gap:12px"
             [style.opacity]="isPast(s) ? '0.5' : '1'">
          <div style="flex:1;min-width:0">
            <div style="font-weight:500;font-size:0.9rem">{{ s.name }}</div>
            <div style="font-size:0.78rem;opacity:0.5;margin-top:1px">
              {{ s.startDate | date:'d MMM' }} – {{ s.endDate | date:'d MMM yyyy' }}
              @if (s.piName) { · {{ s.piName }} }
            </div>
          </div>
          @if (s.isInnovationSprint) {
            <mat-chip style="font-size:0.7rem">IP</mat-chip>
          }
          <a mat-button color="primary" [routerLink]="['/sprints', s.id]">View</a>
          <button mat-icon-button (click)="openSprintForm(s)"><mat-icon>edit</mat-icon></button>
          <button mat-icon-button color="warn" (click)="deleteSprint(s.id)"><mat-icon>delete</mat-icon></button>
        </div>
      }
      @if (filteredSprints().length === 0) {
        <div style="text-align:center;padding:48px;opacity:0.4;font-size:0.9rem">No sprints found</div>
      }
    </div>
  `,
  styles: [`.active-filter { background: rgba(100,181,246,0.15) !important; border-color: rgba(100,181,246,0.4) !important; color: #64b5f6 !important; }`]
})
export class SprintListComponent implements OnInit {
  private svc = inject(SprintService);
  private featureSvc = inject(FeatureService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  private sprints = signal<Sprint[]>([]);
  pis = signal<PI[]>([]);
  selectedPI = signal<string | null>(null);
  currentFeatures = signal<Feature[]>([]);

  private today = (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();

  currentSprint = computed(() =>
    this.sprints().find(s => new Date(s.startDate) <= this.today && new Date(s.endDate) >= this.today) ?? null
  );

  currentFeaturesSorted = computed(() =>
    [...this.currentFeatures().filter(f => f.isActive)]
      .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))
  );

  hasUngrouped = computed(() => this.sprints().some(s => !s.piId));

  filteredSprints = computed(() => {
    const pid = this.selectedPI();
    return this.sprints().filter(s => {
      if (pid === null) return true;
      if (pid === 'none') return !s.piId;
      return s.piId === pid;
    });
  });

  isPast(s: Sprint) { return new Date(s.endDate) < this.today; }
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
    this.svc.getPIs().subscribe(pis => this.pis.set(pis));
    this.svc.getSprints().subscribe(sprints => this.sprints.set(sprints));
  }

  openSprintForm(sprint?: Sprint) {
    const ref = this.dialog.open(SprintFormComponent, { width: '480px', data: { sprint, pis: this.pis() } });
    ref.afterClosed().subscribe(r => { if (r) this.load(); });
  }

  openPIForm() {
    const ref = this.dialog.open(SprintFormComponent, { width: '480px', data: { piMode: true } });
    ref.afterClosed().subscribe(r => { if (r) this.load(); });
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
