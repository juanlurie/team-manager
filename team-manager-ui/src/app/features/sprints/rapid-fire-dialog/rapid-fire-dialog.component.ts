import { Component, OnInit, inject, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MemberSprintCard } from '../../../core/models/dashboard.model';
import { Feature } from '../../../core/models/feature.model';
import { WorkItemService } from '../../../core/services/work-item.service';
import { FeatureService } from '../../../core/services/feature.service';

@Component({
  selector: 'app-rapid-fire-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatDividerModule, MatTooltipModule],
  template: `
    <div style="display:flex;align-items:center;gap:12px;padding:20px 24px 0">
      <mat-icon style="color:#ff9800">bolt</mat-icon>
      <span style="font-size:1rem;font-weight:600">Rapid Fire</span>
      <span style="flex:1"></span>
      <span style="font-size:0.78rem;opacity:0.4">{{ index() + 1 }} / {{ queue().length }}</span>
      <button mat-icon-button mat-dialog-close matTooltip="Done">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <!-- Progress bar -->
    <div style="height:3px;background:rgba(255,255,255,0.06);margin:12px 0 0">
      <div style="height:100%;background:#ff9800;transition:width 0.3s"
           [style.width.%]="((index() + 1) / queue().length) * 100"></div>
    </div>

    <mat-dialog-content style="padding:0 24px;margin:0">

      <!-- Member display -->
      <div style="display:flex;align-items:center;gap:14px;padding:20px 0 16px">
        <div style="width:44px;height:44px;border-radius:50%;background:rgba(255,152,0,0.15);
                    color:#ff9800;font-size:0.85rem;font-weight:700;display:flex;align-items:center;
                    justify-content:center;flex-shrink:0;border:1px solid rgba(255,152,0,0.3)">
          {{ initials(current().fullName) }}
        </div>
        <div>
          <div style="font-size:1.1rem;font-weight:700">{{ current().fullName }}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:2px">
            @if (current().crafts?.length) {
              <div style="font-size:0.75rem;opacity:0.45">{{ current().crafts.map(craftLabel).join(' · ') }}</div>
            }
            @if (isDeferred()) {
              <div style="font-size:0.7rem;color:#ff9800;background:rgba(255,152,0,0.12);
                          padding:1px 7px;border-radius:10px;border:1px solid rgba(255,152,0,0.3)">
                ↩ coming back
              </div>
            }
          </div>
        </div>
      </div>

      <mat-divider></mat-divider>

      <!-- Task form -->
      <div style="display:flex;flex-direction:column;gap:12px;padding:16px 0 8px">

        <div>
          <mat-form-field appearance="outline" style="width:100%">
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

          <!-- Inline feature add -->
          @if (showInlineFeature()) {
            <div style="display:flex;gap:8px;align-items:center;margin-top:-8px;margin-bottom:4px">
              <mat-form-field appearance="outline" style="flex:1">
                <mat-label>New feature title</mat-label>
                <input #newFeatureInput matInput [(ngModel)]="newFeatureTitle"
                       (keydown.enter)="saveNewFeature()"
                       (keydown.escape)="showInlineFeature.set(false)"
                       placeholder="Feature name">
              </mat-form-field>
              <button mat-icon-button color="primary"
                      [disabled]="!newFeatureTitle.trim() || newFeatureSaving()"
                      (click)="saveNewFeature()"
                      matTooltip="Save feature">
                <mat-icon>check</mat-icon>
              </button>
              <button mat-icon-button (click)="showInlineFeature.set(false)" matTooltip="Cancel">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          } @else {
            <button mat-button style="font-size:0.75rem;opacity:0.55;margin-top:-12px;margin-bottom:4px"
                    (click)="openInlineFeature()">
              <mat-icon style="font-size:16px;height:16px;width:16px;margin-right:4px">add</mat-icon>
              Add feature
            </button>
          }
        </div>

        <mat-form-field appearance="outline">
          <mat-label>Task title</mat-label>
          <input #titleInput matInput [(ngModel)]="taskTitle" placeholder="What needs to be done?"
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
    </mat-dialog-content>

    <mat-dialog-actions style="padding:8px 24px 20px;gap:8px">
      <button mat-stroked-button (click)="skip()" [disabled]="saving()">
        <mat-icon>skip_next</mat-icon> Skip
      </button>
      <button mat-stroked-button (click)="later()" [disabled]="saving() || isDeferred()"
              matTooltip="Come back to this person at the end">
        <mat-icon>update</mat-icon> Later
      </button>
      <span style="flex:1"></span>
      <button mat-raised-button color="accent" (click)="save()"
              [disabled]="!taskTitle.trim() || saving()"
              style="min-width:120px">
        <mat-icon>add_task</mat-icon>
        {{ saving() ? 'Saving…' : 'Add & Next' }}
      </button>
    </mat-dialog-actions>

    <!-- All done overlay -->
    @if (done()) {
      <div style="position:absolute;inset:0;background:rgba(15,17,23,0.95);display:flex;flex-direction:column;
                  align-items:center;justify-content:center;gap:16px;border-radius:inherit">
        <div style="font-size:2.5rem">✅</div>
        <div style="font-size:1rem;font-weight:600">All {{ queue().length }} members covered!</div>
        <div style="display:flex;gap:12px">
          <button mat-stroked-button (click)="restart()">Go again</button>
          <button mat-raised-button color="primary" mat-dialog-close>Done</button>
        </div>
      </div>
    }
  `,
  styles: [`:host { position: relative; display: block; }`]
})
export class RapidFireDialogComponent implements OnInit {
  @ViewChild('titleInput') titleInput!: ElementRef<HTMLInputElement>;
  @ViewChild('newFeatureInput') newFeatureInput!: ElementRef<HTMLInputElement>;

  private svc = inject(WorkItemService);
  private featureSvc = inject(FeatureService);
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

  private deferredIds = new Set<string>();

  selectedFeatureId: string | null = null;
  taskTitle = '';
  taskType = 'Dev';
  taskStatus = 'Planned';

  current = computed(() => this.queue()[this.index()]);
  activeFeatures = computed(() => [
    ...this.data.features.filter(f => f.isActive),
    ...this.extraFeatures()
  ]);
  isDeferred = computed(() => this.deferredIds.has(this.current()?.sprintMemberId));

  ngOnInit() {
    this.restart();
  }

  restart() {
    const shuffled = [...this.data.members].sort(() => Math.random() - 0.5);
    this.queue.set(shuffled);
    this.index.set(0);
    this.done.set(false);
    this.deferredIds.clear();
    this.resetForm();
  }

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
      next: () => { this.saving.set(false); this.advance(); },
      error: () => this.saving.set(false)
    });
  }

  skip() {
    this.advance();
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
      description: null,
      externalTicketRef: null,
      status: 'Planned',
      estimatedDays: null,
      isUnplanned: false,
      startDate: null
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
