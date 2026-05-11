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
  template: `
    <div class="rf-shell">

      <!-- Top bar -->
      <div class="rf-topbar">
        <mat-icon class="rf-bolt">bolt</mat-icon>
        <span class="rf-title">Rapid Fire</span>
        <span style="flex:1"></span>
        <span class="rf-counter">{{ index() + 1 }} / {{ queue().length }}</span>
        <app-icon-btn icon="close" size="sm" tooltip="Done" (btnClick)="closeDialog()" />
      </div>

      <!-- Progress bar -->
      <div class="rf-progbar">
        <div class="rf-progfill" [style.width.%]="((index() + 1) / queue().length) * 100"></div>
      </div>

      <!-- Two-column body -->
      <div class="rf-body">

        <!-- ── Left: current work ── -->
        <div class="rf-left">
          <div class="rf-panel-label">What they're working on</div>

          @if (currentWorkItems().length === 0) {
            <div class="rf-empty">No items yet — add one on the right</div>
          }

          <div class="rf-work-list">
            @for (item of currentWorkItems(); track item.id) {
              <div class="rf-wi-card" [class.rf-wi-saving]="getState(item).saving">
                @if (item.featureTitle) {
                  <div class="rf-wi-feature">{{ item.featureTitle }}</div>
                }
                <div class="rf-wi-controls">
                  <select class="rf-sel rf-status-sel"
                          [ngModel]="getState(item).status"
                          (ngModelChange)="onStatusChange(item, $event)"
                          [style.color]="statusColor(getState(item).status)">
                    <option value="Planned">Planned</option>
                    <option value="InProgress">In Progress</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Completed">Done</option>
                    <option value="ReadyForRelease">Ready</option>
                    <option value="Released">Released</option>
                  </select>
                  <select class="rf-sel rf-type-sel"
                          [ngModel]="getState(item).type"
                          (ngModelChange)="onTypeChange(item, $event)">
                    <option value="Analysis">Analysis</option>
                    <option value="Design">Design</option>
                    <option value="Dev">Dev</option>
                    <option value="QA">QA</option>
                    <option value="Bug">Bug</option>
                    <option value="Task">Task</option>
                    <option value="Release">Release</option>
                  </select>
                </div>
                <div class="rf-wi-title-row">
                  <input class="rf-wi-input"
                         [ngModel]="getState(item).title"
                         (ngModelChange)="getState(item).title = $event"
                         (blur)="saveTitle(item)"
                         (keydown.enter)="saveTitle(item)">
                  <button class="rf-icon-btn" matTooltip="Carry over to another sprint"
                          (click)="carryOver(item)">
                    <mat-icon>move_down</mat-icon>
                  </button>
                  @if (getState(item).saving) {
                    <mat-icon class="rf-saving-spin">sync</mat-icon>
                  }
                </div>
                <app-comments entityType="WorkItem" [entityId]="item.id" [initialCount]="item.commentCount" />
              </div>
            }
          </div>
        </div>

        <!-- ── Divider ── -->
        <div class="rf-col-divider"></div>

        <!-- ── Right: member + form ── -->
        <div class="rf-right">

          <!-- Member display -->
          <div class="rf-member">
            <div class="rf-avatar">{{ initials(current().fullName) }}</div>
            <div>
              <div class="rf-member-name">{{ current().fullName }}</div>
              <div style="display:flex;align-items:center;gap:8px;margin-top:2px">
                @if (current().crafts?.length) {
                  <div class="rf-crafts">{{ current().crafts.map(craftLabel).join(' · ') }}</div>
                }
                @if (isDeferred()) {
                  <div class="rf-deferred-pill">↩ coming back</div>
                }
              </div>
            </div>
          </div>

          <mat-divider></mat-divider>

          <!-- Add task form -->
          <div class="rf-form">
            <div class="rf-section-label">Add task</div>

            <mat-form-field appearance="outline" style="width:100%;margin-top:8px">
              <mat-label>Feature <span style="opacity:0.5;font-size:0.85em">(optional)</span></mat-label>
              <mat-select [(ngModel)]="selectedFeatureId">
                <mat-option [value]="null">— No feature —</mat-option>
                @for (f of activeFeatures(); track f.id) {
                  <mat-option [value]="f.id">
                    {{ f.externalTicketRef ? f.externalTicketRef + ' · ' : '' }}{{ f.title }}
                  </mat-option>
                }
              </mat-select>
            </mat-form-field>

            @if (showInlineFeature()) {
              <div style="display:flex;gap:8px;align-items:center;margin-top:-8px;margin-bottom:4px">
                <mat-form-field appearance="outline" style="flex:1">
                  <mat-label>New feature title</mat-label>
                  <input #newFeatureInput matInput [(ngModel)]="newFeatureTitle"
                         (keydown.enter)="saveNewFeature()"
                         (keydown.escape)="showInlineFeature.set(false)">
                </mat-form-field>
                <app-icon-btn icon="check" size="sm" tooltip="Save" color="primary" [disabled]="!newFeatureTitle.trim() || newFeatureSaving()" (btnClick)="saveNewFeature()" />
                <app-icon-btn icon="close" size="sm" tooltip="Cancel" (btnClick)="showInlineFeature.set(false)" />
              </div>
            } @else {
              <button mat-button style="font-size:0.75rem;opacity:0.55;margin-top:-12px;margin-bottom:4px"
                      (click)="openInlineFeature()">
                <mat-icon style="font-size:16px;height:16px;width:16px;margin-right:4px">add</mat-icon>
                Add feature
              </button>
            }

            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>Task title</mat-label>
              <input #titleInput matInput [(ngModel)]="taskTitle"
                     placeholder="What needs to be done?"
                     (keydown.enter)="save()">
            </mat-form-field>

            <div style="display:flex;gap:12px">
              <mat-form-field appearance="outline" style="flex:1">
                <mat-label>Type</mat-label>
                <mat-select [(ngModel)]="taskType">
                  <mat-option value="Analysis">Analysis</mat-option>
                  <mat-option value="Design">Design</mat-option>
                  <mat-option value="Dev">Dev</mat-option>
                  <mat-option value="QA">QA</mat-option>
                  <mat-option value="Bug">Bug</mat-option>
                  <mat-option value="Task">Task</mat-option>
                  <mat-option value="Release">Release</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" style="flex:1">
                <mat-label>Status</mat-label>
                <mat-select [(ngModel)]="taskStatus">
                  <mat-option value="Planned">Planned</mat-option>
                  <mat-option value="InProgress">In Progress</mat-option>
                  <mat-option value="Completed">Completed</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
          </div>

          <!-- Action row -->
          <div class="rf-actions">
            <button class="rf-act-btn" (click)="back()" [disabled]="saving() || index() === 0"
                    title="Previous person">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <button class="rf-act-btn" (click)="skip()" [disabled]="saving()"
                    title="Skip">
              <mat-icon>skip_next</mat-icon>
            </button>
            <button class="rf-act-btn" (click)="later()" [disabled]="saving() || isDeferred()"
                    title="Come back to this person at the end">
              <mat-icon>update</mat-icon>
            </button>
            <span style="flex:1"></span>
            <button mat-raised-button color="accent" (click)="save()"
                    [disabled]="!taskTitle.trim() || saving()"
                    style="min-width:130px">
              <mat-icon>add_task</mat-icon>
              {{ saving() ? 'Saving…' : 'Add & Next' }}
            </button>
          </div>

        </div>
      </div>

      <!-- All done overlay -->
      @if (done()) {
        <div class="rf-done-overlay">
          <div style="font-size:2.5rem">✅</div>
          <div style="font-size:1rem;font-weight:600">All {{ queue().length }} members covered!</div>
          <div style="display:flex;gap:12px">
            <button mat-stroked-button (click)="restart()">Go again</button>
            <button mat-raised-button color="primary" mat-dialog-close>Done</button>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

    .rf-shell { display:flex;flex-direction:column;height:100%;overflow:hidden;position:relative; }

    /* Top bar */
    .rf-topbar { display:flex;align-items:center;gap:12px;padding:16px 20px 0;flex-shrink:0; }
    .rf-bolt { color:#ff9800; }
    .rf-title { font-size:1rem;font-weight:600; }
    .rf-counter { font-size:0.78rem;opacity:0.4; }

    /* Progress bar */
    .rf-progbar { height:3px;background:rgba(255,255,255,0.06);margin:12px 0 0;flex-shrink:0; }
    .rf-progfill { height:100%;background:#ff9800;transition:width 0.3s; }

    /* Two-column body */
    .rf-body { display:flex;flex:1;overflow:hidden;min-height:0; }

    /* Left column */
    .rf-left { flex:1;display:flex;flex-direction:column;padding:16px 20px;overflow:hidden;min-width:0; }
    .rf-panel-label { font-size:0.7rem;opacity:0.4;text-transform:uppercase;letter-spacing:0.08em;
                      margin-bottom:10px;flex-shrink:0; }
    .rf-empty { font-size:0.85rem;opacity:0.3;font-style:italic;padding:8px 0; }
    .rf-work-list { flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:8px;padding-right:4px; }

    /* Work item card — always editable */
    .rf-wi-card { border-radius:8px;background:rgba(255,255,255,0.04);
                  border:1px solid rgba(255,255,255,0.08);padding:10px 12px;
                  display:flex;flex-direction:column;gap:8px;
                  transition:border-color 0.15s,opacity 0.15s; }
    .rf-wi-card:hover { border-color:rgba(255,255,255,0.14); }
    .rf-wi-saving { opacity:0.6; }
    .rf-wi-feature { font-size:0.68rem;opacity:0.4;font-weight:600;text-transform:uppercase;
                     letter-spacing:0.07em; }

    /* Controls row: status + type selects */
    .rf-wi-controls { display:flex;gap:8px; }
    .rf-sel { background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);
              border-radius:6px;font-size:0.78rem;font-weight:600;padding:5px 8px;
              cursor:pointer;color:inherit;transition:background 0.15s;outline:none; }
    .rf-sel:focus { border-color:rgba(255,255,255,0.3);background:rgba(255,255,255,0.1); }
    .rf-status-sel { min-width:110px; }
    .rf-type-sel { min-width:90px; }

    /* Title row */
    .rf-wi-title-row { display:flex;align-items:center;gap:6px; }
    .rf-wi-input { flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);
                   border-radius:6px;padding:7px 10px;font-size:0.88rem;color:inherit;
                   outline:none;font-family:inherit;min-width:0; }
    .rf-wi-input:focus { border-color:rgba(255,255,255,0.3);background:rgba(255,255,255,0.08); }

    .rf-icon-btn { display:flex;align-items:center;justify-content:center;
                   width:32px;height:32px;border:none;border-radius:6px;background:transparent;
                   color:rgba(255,255,255,0.4);cursor:pointer;flex-shrink:0;
                   transition:background 0.15s,color 0.15s; }
    .rf-icon-btn:hover { background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.9); }
    .rf-icon-btn:disabled { opacity:0.3;cursor:default; }
    .rf-icon-btn mat-icon { font-size:17px;width:17px;height:17px;line-height:17px; }
    .rf-saving-spin { font-size:16px;width:16px;height:16px;line-height:16px;
                      opacity:0.4;animation:rf-spin 1s linear infinite;flex-shrink:0; }
    @keyframes rf-spin { to { transform:rotate(360deg); } }

    /* Column divider */
    .rf-col-divider { width:1px;background:rgba(255,255,255,0.07);flex-shrink:0;margin:12px 0; }

    /* Right column */
    .rf-right { width:380px;flex-shrink:0;display:flex;flex-direction:column;
                overflow:hidden;padding:16px 20px; }

    /* Member */
    .rf-member { display:flex;align-items:center;gap:14px;padding-bottom:16px;flex-shrink:0; }
    .rf-avatar { width:44px;height:44px;border-radius:50%;background:rgba(255,152,0,0.15);
                 color:#ff9800;font-size:0.85rem;font-weight:700;display:flex;align-items:center;
                 justify-content:center;flex-shrink:0;border:1px solid rgba(255,152,0,0.3); }
    .rf-member-name { font-size:1.05rem;font-weight:700; }
    .rf-crafts { font-size:0.75rem;opacity:0.45; }
    .rf-deferred-pill { font-size:0.7rem;color:#ff9800;background:rgba(255,152,0,0.12);
                        padding:1px 7px;border-radius:10px;border:1px solid rgba(255,152,0,0.3); }
    .rf-section-label { font-size:0.7rem;opacity:0.4;text-transform:uppercase;letter-spacing:0.08em; }

    /* Form */
    .rf-form { flex:1;overflow-y:auto;padding:12px 0 0; }

    /* Actions */
    .rf-actions { display:flex;align-items:center;gap:8px;padding-top:12px;flex-shrink:0;
                  border-top:1px solid rgba(255,255,255,0.06); }
    .rf-act-btn { display:flex;align-items:center;justify-content:center;
                  width:36px;height:36px;border:1px solid rgba(255,255,255,0.12);
                  border-radius:8px;background:transparent;color:rgba(255,255,255,0.55);
                  cursor:pointer;flex-shrink:0;transition:background 0.15s,color 0.15s; }
    .rf-act-btn:hover:not(:disabled) { background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.9); }
    .rf-act-btn:disabled { opacity:0.3;cursor:default; }
    .rf-act-btn mat-icon { font-size:18px;width:18px;height:18px;line-height:18px; }

    /* Done overlay */
    .rf-done-overlay { position:absolute;inset:0;background:rgba(15,17,23,0.95);display:flex;
                       flex-direction:column;align-items:center;justify-content:center;
                       gap:16px;border-radius:inherit; }

    /* Mobile: stack columns vertically */
    @media (max-width: 640px) {
      .rf-body { flex-direction:column;overflow-y:auto; }
      .rf-left { flex:0 0 auto;max-height:40vh;padding:12px 16px; }
      .rf-col-divider { width:auto;height:1px;margin:0 16px; }
      .rf-right { width:auto;flex:none;overflow:visible;padding:12px 16px; }
      .rf-form { flex:none;overflow:visible; }
      .rf-actions { position:sticky;bottom:0;background:#1a2636;padding:10px 0 4px; }
    }
  `]
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
