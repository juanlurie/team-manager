import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Feature } from '../../core/models/feature.model';
import { FeatureService } from '../../core/services/feature.service';
import { FeatureFormDialogComponent } from '../sprints/feature-form-dialog/feature-form-dialog.component';
import { CommentsComponent } from '../../shared/comments/comments.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FilterBarComponent } from '../../shared/components/filter-bar/filter-bar.component';

const ACTIVE_STATUSES = ['InProgress', 'ReadyForRelease', 'Planned', 'Completed'];
const DONE_STATUS = 'Released';

const STATUS_LABEL: Record<string, string> = {
  InProgress: 'In Progress', Planned: 'Planned', Completed: 'Completed',
  ReadyForRelease: 'Ready for Release', Released: 'Released'
};
const STATUS_COLOR: Record<string, string> = {
  InProgress: '#64b5f6', Planned: '#9e9e9e', Completed: '#4caf50',
  ReadyForRelease: '#ffd54f', Released: '#a0a0a0'
};
const TASK_STATUS_COLOR: Record<string, string> = {
  InProgress: 'rgba(33,150,243,0.15)', Planned: 'rgba(158,158,158,0.12)',
  Completed: 'rgba(76,175,80,0.12)', ReadyForRelease: 'rgba(255,193,7,0.12)',
  Released: 'rgba(255,255,255,0.08)'
};
const TASK_STATUS_TEXT: Record<string, string> = {
  InProgress: '#64b5f6', Planned: '#9e9e9e', Completed: '#4caf50',
  ReadyForRelease: '#ffd54f', Released: '#a0a0a0'
};

@Component({
  selector: 'app-all-features',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule,
    MatTooltipModule, MatDialogModule, CommentsComponent,
    MatProgressSpinnerModule, FilterBarComponent],
  styles: [`
    .feat-btn { width:28px;height:28px;border:none;border-radius:6px;cursor:pointer;
                display:flex;align-items:center;justify-content:center;
                background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.4);
                transition:background 0.15s,color 0.15s; }
    .feat-btn-blue:hover { background:rgba(100,181,246,0.15);color:#64b5f6; }
    .feat-btn-green:hover { background:rgba(76,175,80,0.15);color:#4caf50; }
  `],
  template: `
    <div style="display:flex;align-items:center;margin-bottom:10px">
      <h2 style="margin:0;font-size:1.2rem">Features</h2>
    </div>
    <div style="display:flex;margin-bottom:16px">
      <app-filter-bar
        [groups]="filterGroups"
        searchPlaceholder="Search features…"
        [searchVal]="search()"
        [selectedValues]="filterValues()"
        (searchChange)="search.set($event)"
        (apply)="onFilterApply($event)" />
    </div>

    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:80px">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    } @else {

    <!-- Status summary counts -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px">
      @for (st of activeStatuses; track st) {
        <button (click)="toggleStatus(st)"
                [style.border-color]="statusFilters().includes(st) ? statusColor(st) : 'rgba(255,255,255,0.1)'"
                [style.background]="statusFilters().includes(st) ? 'rgba(255,255,255,0.06)' : 'transparent'"
                style="border:1px solid;border-radius:8px;padding:6px 14px;cursor:pointer;color:inherit;
                       display:flex;align-items:center;gap:8px;font-size:0.8rem">
          <span [style.color]="statusColor(st)" style="font-weight:700">{{ countByStatus(st) }}</span>
          <span style="opacity:0.6">{{ statusLabel(st) }}</span>
        </button>
      }
    </div>

    <!-- Active features -->
    @if (activeFiltered().length === 0) {
      <div style="text-align:center;padding:48px;opacity:0.35;font-size:0.9rem">No features found</div>
    }

    <div style="display:flex;flex-direction:column;gap:5px">
      @for (f of activeFiltered(); track f.id) {
        <div style="border-radius:8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);overflow:hidden"
             [style.opacity]="f.isActive ? 1 : 0.5">

          <!-- Feature row -->
          <div (click)="toggleExpand(f.id)"
               style="display:flex;align-items:center;gap:8px;padding:10px 14px;cursor:pointer;flex-wrap:wrap">

            <!-- Left: chevron + status + title -->
            <div style="display:flex;align-items:center;gap:8px;flex:1 1 160px;min-width:0">
              <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px;opacity:0.4;flex-shrink:0;transition:transform 0.2s"
                        [style.transform]="expanded().has(f.id) ? 'rotate(90deg)' : 'rotate(0)'">
                chevron_right
              </mat-icon>
              <span [style.background]="statusBg(f.status)" [style.color]="statusColor(f.status)"
                    style="flex-shrink:0;font-size:0.65rem;font-weight:700;text-transform:uppercase;
                           padding:2px 7px;border-radius:6px;white-space:nowrap">
                {{ statusLabel(f.status) }}
              </span>
              <div style="min-width:0;overflow:hidden">
                <div style="font-size:0.88rem;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ f.title }}</div>
                @if (f.externalTicketRef) {
                  <div style="font-size:0.7rem;opacity:0.4;font-family:monospace;margin-top:1px">{{ f.externalTicketRef }}</div>
                }
              </div>
            </div>

            <!-- Right: chips + count + actions -->
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end"
                 (click)="$event.stopPropagation()">
              @if (f.estimatedDays) {
                <span style="font-size:0.65rem;padding:2px 7px;border-radius:6px;
                             background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.45);white-space:nowrap"
                      matTooltip="Estimated days">⏱ {{ f.estimatedDays }}d</span>
              }
              @if (f.tasks?.length) {
                <span style="font-size:0.7rem;opacity:0.4;white-space:nowrap">
                  {{ f.tasks!.length }} task{{ f.tasks!.length !== 1 ? 's' : '' }}
                </span>
              }
              @if (f.sprintName) {
                <span style="font-size:0.65rem;padding:2px 7px;border-radius:10px;
                             background:rgba(100,181,246,0.12);color:#64b5f6;white-space:nowrap">
                  {{ f.sprintName }}
                </span>
              }
              @if (f.piName) {
                <span style="font-size:0.65rem;padding:2px 7px;border-radius:10px;
                             background:rgba(171,71,188,0.12);color:#ce93d8;white-space:nowrap">
                  {{ f.piName }}
                </span>
              }
              <button (click)="editFeature(f)" class="feat-btn feat-btn-blue"
                      matTooltip="Edit feature">
                <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px">edit</mat-icon>
              </button>
              <button (click)="markDone(f)" class="feat-btn feat-btn-green"
                      matTooltip="Mark as Released">
                <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px">check_circle</mat-icon>
              </button>
            </div>
          </div>

          <!-- Expanded tasks -->
          @if (expanded().has(f.id) && f.tasks?.length) {
            <div style="border-top:1px solid rgba(255,255,255,0.05);background:rgba(0,0,0,0.15)">
              @for (t of f.tasks!; track t.id) {
                <div style="display:flex;align-items:center;gap:8px;padding:8px 14px 8px 26px;
                            border-bottom:1px solid rgba(255,255,255,0.03);flex-wrap:wrap">
                  <div style="display:flex;align-items:center;gap:8px;flex:1 1 120px;min-width:0">
                    <span [style.background]="taskStatusBg(t.status)" [style.color]="taskStatusColor(t.status)"
                          style="font-size:0.62rem;font-weight:600;padding:1px 6px;border-radius:5px;
                                 text-transform:uppercase;white-space:nowrap;flex-shrink:0">
                      {{ statusLabel(t.status) }}
                    </span>
                    <span style="flex-shrink:0;background:rgba(255,255,255,0.06);padding:1px 6px;border-radius:5px;
                                 font-size:0.65rem;font-weight:600;color:rgba(255,255,255,0.5)">
                      {{ t.type }}
                    </span>
                    <span style="font-size:0.82rem;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ t.title }}</span>
                  </div>
                  <span style="font-size:0.75rem;opacity:0.45;flex-shrink:0">{{ t.assignee }}</span>
                </div>
              }
            </div>
          }
          @if (expanded().has(f.id) && !f.tasks?.length) {
            <div style="padding:10px 14px 10px 42px;font-size:0.8rem;opacity:0.3;border-top:1px solid rgba(255,255,255,0.05)">
              No tasks linked to this feature
            </div>
          }
          @if (expanded().has(f.id)) {
            <div style="padding:8px 14px 14px 42px;border-top:1px solid rgba(255,255,255,0.04)">
              <app-comments entityType="Feature" [entityId]="f.id"></app-comments>
            </div>
          }
        </div>
      }
    </div>

    <!-- Done section -->
    <div style="margin-top:32px">
      <button (click)="showDone.set(!showDone())"
              style="display:flex;align-items:center;gap:8px;background:none;border:none;cursor:pointer;
                     color:rgba(255,255,255,0.35);font-size:0.78rem;font-weight:600;text-transform:uppercase;
                     letter-spacing:0.08em;padding:0;margin-bottom:12px">
        <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px;transition:transform 0.2s"
                  [style.transform]="showDone() ? 'rotate(90deg)' : 'rotate(0)'">chevron_right</mat-icon>
        Done / Released ({{ doneFeatures().length }})
      </button>

      @if (showDone()) {
        <div style="display:flex;flex-direction:column;gap:5px">
          @for (f of doneFeatures(); track f.id) {
            <div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-radius:8px;
                        background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);opacity:0.55">
              <span style="flex-shrink:0;font-size:0.65rem;font-weight:700;text-transform:uppercase;
                           padding:2px 7px;border-radius:6px;background:rgba(255,255,255,0.08);
                           color:#a0a0a0;white-space:nowrap">Released</span>
              <span style="font-size:0.85rem;flex:1;min-width:0">{{ f.title }}</span>
              @if (f.externalTicketRef) {
                <span style="font-size:0.72rem;opacity:0.4;font-family:monospace">{{ f.externalTicketRef }}</span>
              }
              <div style="display:flex;gap:5px;flex-shrink:0">
                @if (f.sprintName) {
                  <span style="font-size:0.65rem;padding:2px 7px;border-radius:10px;
                               background:rgba(100,181,246,0.08);color:rgba(100,181,246,0.6);white-space:nowrap">
                    {{ f.sprintName }}
                  </span>
                }
                @if (f.piName) {
                  <span style="font-size:0.65rem;padding:2px 7px;border-radius:10px;
                               background:rgba(171,71,188,0.08);color:rgba(206,147,216,0.6);white-space:nowrap">
                    {{ f.piName }}
                  </span>
                }
              </div>
              <button (click)="unmarkDone(f)" class="feat-btn feat-btn-blue"
                      style="flex-shrink:0"
                      matTooltip="Move back to active">
                <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px">undo</mat-icon>
              </button>
            </div>
          }
          @if (doneFeatures().length === 0) {
            <div style="padding:20px;opacity:0.3;font-size:0.85rem;text-align:center">No released features yet</div>
          }
        </div>
      }
    </div>
    } <!-- end @else -->
  `
})
export class AllFeaturesComponent implements OnInit {
  private svc = inject(FeatureService);
  private dialog = inject(MatDialog);

  loading = signal(true);
  all = signal<Feature[]>([]);
  search = signal('');
  statusFilters = signal<string[]>([]);
  showDone = signal(false);
  expanded = signal<Set<string>>(new Set());
  activeStatuses = ['InProgress', 'ReadyForRelease', 'Planned', 'Completed'];

  readonly filterGroups = [{
    key: 'status', label: 'Status', icon: 'flag',
    options: [
      { id: 'InProgress', label: 'In Progress' },
      { id: 'Planned', label: 'Planned' },
      { id: 'Completed', label: 'Completed' },
      { id: 'ReadyForRelease', label: 'Ready for Release' },
    ]
  }];

  filterValues = computed(() => ({ status: this.statusFilters() }));

  activeFeatures = computed(() => this.all().filter(f => f.status !== DONE_STATUS));
  doneFeatures = computed(() => this.all().filter(f => f.status === DONE_STATUS));

  activeFiltered = computed(() => {
    const statuses = this.statusFilters();
    const q = this.search().trim().toLowerCase();
    let list = statuses.length > 0
      ? this.activeFeatures().filter(f => statuses.includes(f.status))
      : this.activeFeatures();
    if (q) {
      list = list.filter(f =>
        f.title.toLowerCase().includes(q) ||
        (f.externalTicketRef ?? '').toLowerCase().includes(q) ||
        (f.sprintName ?? '').toLowerCase().includes(q) ||
        (f.piName ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAllAcrossSprints().subscribe(f => { this.all.set(f); this.loading.set(false); });
  }

  onFilterApply(filters: Record<string, string[]>) {
    this.statusFilters.set(filters['status'] ?? []);
  }

  toggleStatus(st: string) {
    this.statusFilters.update(s => s.includes(st) ? s.filter(x => x !== st) : [...s, st]);
  }

  toggleExpand(id: string) {
    this.expanded.update(s => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  editFeature(f: Feature) {
    const ref = this.dialog.open(FeatureFormDialogComponent, {
      width: '440px',
      data: { sprintId: f.sprintId, feature: f }
    });
    ref.afterClosed().subscribe(r => { if (r) this.load(); });
  }

  markDone(f: Feature) {
    this.svc.setStatus(f.id, 'Released').subscribe(updated => {
      this.all.update(list => list.map(x => x.id === f.id ? { ...x, status: updated.status } : x));
    });
  }

  unmarkDone(f: Feature) {
    this.svc.setStatus(f.id, 'Completed').subscribe(updated => {
      this.all.update(list => list.map(x => x.id === f.id ? { ...x, status: updated.status } : x));
    });
  }

  countByStatus(status: string) { return this.activeFeatures().filter(f => f.status === status).length; }
  statusLabel(s: string) { return STATUS_LABEL[s] ?? s; }
  statusColor(s: string) { return STATUS_COLOR[s] ?? '#9e9e9e'; }
  statusBg(s: string): string {
    const map: Record<string, string> = {
      InProgress: 'rgba(33,150,243,0.15)', Planned: 'rgba(158,158,158,0.15)',
      Completed: 'rgba(76,175,80,0.15)', ReadyForRelease: 'rgba(255,193,7,0.15)',
      Released: 'rgba(255,255,255,0.08)'
    };
    return map[s] ?? 'rgba(158,158,158,0.15)';
  }
  taskStatusBg(s: string) { return TASK_STATUS_COLOR[s] ?? 'rgba(158,158,158,0.12)'; }
  taskStatusColor(s: string) { return TASK_STATUS_TEXT[s] ?? '#9e9e9e'; }
}
