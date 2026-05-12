import { Component, OnInit, inject, signal, computed, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Feature, FeatureTask } from '../../core/models/feature.model';
import { FeatureService } from '../../core/services/feature.service';
import { FeatureFormDialogComponent } from '../sprints/feature-form-dialog/feature-form-dialog.component';
import { TaskFormDialogComponent } from '../../shared/components/task-form-dialog/task-form-dialog.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FilterBarComponent, stripMentions } from '../../shared/components/filter-bar/filter-bar.component';
import { GlobalFilterService } from '../../core/services/global-filter.service';
import { CommentsComponent } from '../../shared/comments/comments.component';
import { WorkItemService } from '../../core/services/work-item.service';
import { TeamMemberService } from '../../core/services/team-member.service';
import { SquadService } from '../../core/services/squad.service';
import { Squad } from '../../core/models/squad.model';
import { WorkItem } from '../../core/models/work-item.model';

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
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule,
    MatTooltipModule, MatMenuModule, MatDialogModule,
    MatProgressSpinnerModule, FilterBarComponent, CommentsComponent],
  templateUrl: './all-features.component.html',
  styleUrls: ['./all-features.component.scss']
})
export class AllFeaturesComponent implements OnInit {
  private svc = inject(FeatureService);
  private dialog = inject(MatDialog);
  private workItemSvc = inject(WorkItemService);
  private teamMemberSvc = inject(TeamMemberService);
  private squadSvc = inject(SquadService);
  private globalFilterSvc = inject(GlobalFilterService);

  constructor() {
    effect(() => { const h = this.globalFilterSvc.searchHint(); untracked(() => this.search.set(h)); });

    effect(() => {
      const globalFilters = this.globalFilterSvc.filters();
      untracked(() => {
        if (globalFilters.squadId !== null) {
          this.squadFilters.set([globalFilters.squadId]);
        }
      });
    });
  }

  loading = signal(true);
  all = signal<Feature[]>([]);
  search = signal('');
  statusFilters = signal<string[]>([]);
  assigneeFilters = signal<string[]>([]);
  squadFilters = signal<string[]>([]);
  showDone = signal(false);
  expanded = signal<Set<string>>(new Set());
  activeStatuses = ['InProgress', 'ReadyForRelease', 'Planned', 'Completed'];

  teamMembers = signal<{id: string, label: string}[]>([]);
  squads = signal<Squad[]>([]);

  readonly filterGroups = [
    {
      key: 'status', label: 'Status', icon: 'flag',
      options: [
        { id: 'InProgress', label: 'In Progress' },
        { id: 'Planned', label: 'Planned' },
        { id: 'Completed', label: 'Completed' },
        { id: 'ReadyForRelease', label: 'Ready for Release' },
      ]
    },
    {
      key: 'assignee', label: 'Assignee', icon: 'person',
      options: [] as { id: string; label: string }[]
    },
    {
      key: 'squad', label: 'Squad', icon: 'group',
      options: [] as { id: string; label: string }[]
    }
  ];

  filterValues = computed(() => ({
    status: this.statusFilters(),
    assignee: this.assigneeFilters(),
    squad: this.squadFilters()
  }));

  /** Extract @mentioned assignee names from the raw search text */
  mentionAssigneeNames = computed(() => {
    const rawQ = this.search();
    const members = this.teamMembers();
    const names: string[] = [];
    const regex = /@([\w'-]+(?:\s[\w'-]+)*)/g;
    let match;
    while ((match = regex.exec(rawQ)) !== null) {
      const namePart = match[1].toLowerCase();
      const found = members.find(m => m.label.toLowerCase().includes(namePart));
      if (found && !names.includes(found.label)) {
        names.push(found.label);
      }
    }
    return names;
  });

  activeFeatures = computed(() => this.all().filter(f => f.status !== DONE_STATUS));
  doneFeatures = computed(() => this.all().filter(f => f.status === DONE_STATUS));

  activeFiltered = computed(() => {
    const statuses = this.statusFilters();
    const assignees = this.assigneeFilters();
    const squads = this.squadFilters();
    const mentionNames = this.mentionAssigneeNames();
    const rawQ = this.search();
    const q = stripMentions(rawQ).toLowerCase();
    let list = this.activeFeatures();
    if (statuses.length > 0) list = list.filter(f => statuses.includes(f.status));
    if (assignees.length > 0) {
      list = list.filter(f =>
        (f.tasks ?? []).some(t => assignees.includes(t.assignee))
      );
    }
    if (squads.length > 0) {
      const squadMembers = this.getSquadMemberNames(squads);
      list = list.filter(f =>
        (f.tasks ?? []).some(t => squadMembers.includes(t.assignee))
      );
    }
    // Filter by @mentioned assignee names
    if (mentionNames.length > 0) {
      list = list.filter(f =>
        (f.tasks ?? []).some(t => mentionNames.includes(t.assignee))
      );
    }
    if (q) {
      list = list.filter(f =>
        f.title.toLowerCase().includes(q) ||
        (f.externalTicketRef ?? '').toLowerCase().includes(q) ||
        (f.sprintName ?? '').toLowerCase().includes(q) ||
        (f.piName ?? '').toLowerCase().includes(q) ||
        (f.tasks ?? []).some(t =>
          t.title.toLowerCase().includes(q) ||
          t.assignee.toLowerCase().includes(q)
        )
      );
    }
    return list;
  });

  private getSquadMemberNames(squadIds: string[]): string[] {
    const squadList = this.squads();
    const members: string[] = [];
    squadIds.forEach(sid => {
      const squad = squadList.find(s => s.id === sid);
      if (squad?.members) {
        squad.members.forEach(m => members.push(m.fullName));
      }
    });
    return members;
  }

  ngOnInit() {
    this.load();
    this.teamMemberSvc.getAll().subscribe(members => {
      const opts = members.map(m => ({ id: m.firstName + ' ' + m.lastName, label: m.firstName + ' ' + m.lastName }));
      this.teamMembers.set(opts);
      this.filterGroups[1].options = opts;
    });
    this.squadSvc.getAll().subscribe(squads => {
      this.squads.set(squads);
      this.filterGroups[2].options = squads.map(s => ({ id: s.id, label: s.name }));
    });
  }

  load() {
    this.loading.set(true);
    this.svc.getAllAcrossSprints().subscribe(f => { this.all.set(f); this.loading.set(false); });
  }

  onFilterApply(filters: Record<string, string[]>) {
    this.statusFilters.set(filters['status'] ?? []);
    this.assigneeFilters.set(filters['assignee'] ?? []);
    this.squadFilters.set(filters['squad'] ?? []);
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

  addFeature() {
    const ref = this.dialog.open(FeatureFormDialogComponent, {
      width: '440px',
      data: {}
    });
    ref.afterClosed().subscribe(r => { if (r) this.load(); });
  }

  addTask(f: Feature) {
    const ref = this.dialog.open(TaskFormDialogComponent, {
      width: '480px',
      data: { featureId: f.id, sprintId: f.sprintId, features: this.all().filter(x => x.isActive) }
    });
    ref.afterClosed().subscribe(r => { if (r) this.load(); });
  }

  editTask(f: Feature, task: FeatureTask) {
    this.workItemSvc.getById(task.id).subscribe(workItem => {
      const ref = this.dialog.open(TaskFormDialogComponent, {
        width: '480px',
        data: { featureId: workItem.featureId, sprintId: f.sprintId, workItem, features: this.all().filter(x => x.isActive) }
      });
      ref.afterClosed().subscribe(r => { if (r) this.load(); });
    });
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
