import { Component, OnInit, inject, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MemberSprintCard } from '../../../core/models/dashboard.model';
import { Feature } from '../../../core/models/feature.model';
import { WorkItem } from '../../../core/models/work-item.model';
import { WorkItemService } from '../../../core/services/work-item.service';
import { FeatureService } from '../../../core/services/feature.service';
import { CommentsComponent } from '../../../shared/comments/comments.component';
import { CarryOverDialogComponent } from '../carry-over-dialog/carry-over-dialog.component';
import { IconButtonComponent } from '../../../shared/components/icon-btn/icon-btn.component';

interface ItemState {
  title: string;
  type: string;
  status: string;
  featureId: string | null;
  saving: boolean;
}

@Component({
  selector: 'app-rapid-fire-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatDividerModule, MatTooltipModule, CommentsComponent, CarryOverDialogComponent, IconButtonComponent],
  templateUrl: './rapid-fire-dialog.component.html',
  styleUrls: ['./rapid-fire-dialog.component.scss']
})
export class RapidFireDialogComponent implements OnInit {
  @ViewChild('titleInput') titleInput!: ElementRef<HTMLInputElement>;
  @ViewChild('newFeatureInput') newFeatureInput!: ElementRef<HTMLInputElement>;

  private svc = inject(WorkItemService);
  private featureSvc = inject(FeatureService);
  private dialog = inject(MatDialog);
  private dialogRef = inject(MatDialogRef<RapidFireDialogComponent>);
  data: { sprintId: string; members: MemberSprintCard[]; features: Feature[] } = inject(MAT_DIALOG_DATA);

  queue = signal<MemberSprintCard[]>([]);
  index = signal(0);
  saving = signal(false);
  done = signal(false);

  extraFeatures = signal<Feature[]>([]);
  showInlineFeature = signal(false);
  newFeatureSaving = signal(false);
  newFeatureTitle = '';

  // Per-item mutable edit state (always-editable, no modal)
  private itemStates: Record<string, ItemState> = {};

  private deferredIds = new Set<string>();

  selectedFeatureId: string | null = null;
  taskTitle = '';
  taskType = 'Dev';
  taskStatus = 'Planned';

  current = computed(() => this.queue()[this.index()]);
  currentWorkItems = computed(() => this.current()?.workItems ?? []);
  activeFeatures = computed(() => [
    ...this.data.features.filter(f => f.isActive),
    ...this.extraFeatures()
  ]);
  isDeferred = computed(() => this.deferredIds.has(this.current()?.sprintMemberId));

  ngOnInit() { this.restart(); }

  closeDialog() { this.dialogRef.close(); }

  restart() {
    const shuffled = [...this.data.members].sort(() => Math.random() - 0.5);
    this.queue.set(shuffled);
    this.index.set(0);
    this.done.set(false);
    this.deferredIds.clear();
    this.itemStates = {};
    this.resetForm();
  }

  // ── Inline edit state ──────────────────────────────────────────────────────

  getState(item: WorkItem): ItemState {
    if (!this.itemStates[item.id]) {
      this.itemStates[item.id] = {
        title: item.title, type: item.type, status: item.status,
        featureId: item.featureId, saving: false
      };
    }
    return this.itemStates[item.id];
  }

  onStatusChange(item: WorkItem, status: string) {
    const s = this.getState(item);
    const prev = s.status;
    s.status = status;
    s.saving = true;
    this.svc.updateStatus(item.id, status).subscribe({
      next: u => { this.updateItemInQueue(item.id, u); s.saving = false; },
      error: () => { s.status = prev; s.saving = false; }
    });
  }

  onTypeChange(item: WorkItem, type: string) {
    const s = this.getState(item);
    const prev = s.type;
    s.type = type;
    s.saving = true;
    this.svc.update(item.id, this.buildRequest(item, s)).subscribe({
      next: u => { this.updateItemInQueue(item.id, u); s.saving = false; },
      error: () => { s.type = prev; s.saving = false; }
    });
  }

  saveTitle(item: WorkItem) {
    const s = this.getState(item);
    const title = s.title.trim();
    if (!title || title === item.title || s.saving) return;
    s.saving = true;
    this.svc.update(item.id, this.buildRequest(item, s)).subscribe({
      next: u => { this.updateItemInQueue(item.id, u); s.saving = false; },
      error: () => { s.title = item.title; s.saving = false; }
    });
  }

  private buildRequest(item: WorkItem, s: ItemState) {
    return {
      title: s.title.trim() || item.title,
      description: item.description,
      type: s.type,
      status: s.status,
      featureId: s.featureId,
      externalTicketRef: item.externalTicketRef,
      estimatedPoints: item.estimatedPoints,
      actualPoints: item.actualPoints,
      completedDate: item.completedDate,
      blockedReason: item.blockedReason
    };
  }

  carryOver(item: WorkItem) {
    this.dialog.open(CarryOverDialogComponent, {
      width: '400px',
      data: { workItem: item, currentSprintId: this.data.sprintId }
    });
  }

  // ── Add new task ───────────────────────────────────────────────────────────

  save() {
    if (!this.taskTitle.trim() || this.saving()) return;
    this.saving.set(true);
    this.svc.create(this.current().sprintMemberId, {
      title: this.taskTitle.trim(),
      description: null,
      type: this.taskType,
      status: this.taskStatus,
      featureId: this.selectedFeatureId,
      externalTicketRef: null,
      estimatedPoints: null,
      actualPoints: null,
      completedDate: null,
      blockedReason: null
    }).subscribe({
      next: (item) => { this.addItemToQueue(item); this.saving.set(false); this.advance(); },
      error: () => this.saving.set(false)
    });
  }

  skip() { this.advance(); }

  back() {
    if (this.index() === 0) return;
    this.index.update(i => i - 1);
    this.resetForm();
  }

  later() {
    if (this.isDeferred()) return;
    const q = [...this.queue()];
    const member = q.splice(this.index(), 1)[0];
    this.deferredIds.add(member.sprintMemberId);
    q.push(member);
    this.queue.set(q);
    this.resetForm();
    setTimeout(() => this.titleInput?.nativeElement?.focus(), 50);
  }

  openInlineFeature() {
    this.newFeatureTitle = '';
    this.showInlineFeature.set(true);
    setTimeout(() => this.newFeatureInput?.nativeElement?.focus(), 50);
  }

  saveNewFeature() {
    if (!this.newFeatureTitle.trim() || this.newFeatureSaving()) return;
    this.newFeatureSaving.set(true);
    this.featureSvc.create(this.data.sprintId, {
      title: this.newFeatureTitle.trim(),
      description: null, externalTicketRef: null,
      status: 'Planned', estimatedDays: null, isUnplanned: false, startDate: null
    }).subscribe({
      next: (feature) => {
        this.extraFeatures.update(f => [...f, feature]);
        this.selectedFeatureId = feature.id;
        this.showInlineFeature.set(false);
        this.newFeatureTitle = '';
        this.newFeatureSaving.set(false);
        setTimeout(() => this.titleInput?.nativeElement?.focus(), 50);
      },
      error: () => this.newFeatureSaving.set(false)
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private addItemToQueue(item: WorkItem) {
    const id = this.current().sprintMemberId;
    this.queue.update(q => q.map(m =>
      m.sprintMemberId === id ? { ...m, workItems: [...m.workItems, item] } : m
    ));
  }

  private updateItemInQueue(itemId: string, changes: Partial<WorkItem>) {
    const id = this.current().sprintMemberId;
    this.queue.update(q => q.map(m =>
      m.sprintMemberId === id
        ? { ...m, workItems: m.workItems.map(wi => wi.id === itemId ? { ...wi, ...changes } : wi) }
        : m
    ));
  }

  private advance() {
    const next = this.index() + 1;
    if (next >= this.queue().length) {
      this.done.set(true);
    } else {
      this.index.set(next);
      this.resetForm();
      setTimeout(() => this.titleInput?.nativeElement?.focus(), 50);
    }
  }

  private resetForm() {
    this.selectedFeatureId = null;
    this.taskTitle = '';
    this.taskType = this.craftToTaskType(this.current()?.crafts?.[0]);
    this.taskStatus = 'Planned';
    this.showInlineFeature.set(false);
    this.newFeatureTitle = '';
    setTimeout(() => this.titleInput?.nativeElement?.focus(), 50);
  }

  statusColor(status: string): string {
    const map: Record<string, string> = {
      Planned: 'rgba(255,255,255,0.55)', InProgress: '#64b5f6', Blocked: '#f44336',
      Completed: '#4caf50', ReadyForRelease: '#ffd54f', Released: '#ce93d8'
    };
    return map[status] ?? 'rgba(255,255,255,0.55)';
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      Planned: 'Planned', InProgress: 'In Progress', Blocked: 'Blocked',
      Completed: 'Done', ReadyForRelease: 'Ready', Released: 'Released'
    };
    return labels[status] ?? status;
  }

  initials(name: string) {
    return name.split(' ').filter(p => p).slice(0, 2).map(p => p[0].toUpperCase()).join('');
  }

  craftLabel(craft: string) {
    const map: Record<string, string> = {
      DevBE: 'Dev BE', DevFE: 'Dev FE', DevIOS: 'iOS', DevAndroid: 'Android',
      Dev: 'Developer', Analysis: 'Analyst', Design: 'Designer', QA: 'QA',
    };
    return map[craft] ?? craft;
  }

  craftToTaskType(craft: string | null | undefined): string {
    if (!craft) return 'Dev';
    return craft.startsWith('Dev') ? 'Dev' : craft;
  }
}
