import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MilestoneService } from '../../core/services/milestone.service';
import { MilestoneRoadmap, MilestoneRoadmapItem } from '../../core/models/milestone.model';
import { MilestoneScopeBadgeComponent } from '../../shared/components/milestone-scope-badge.component';

@Component({
  selector: 'app-milestone-roadmap',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatButtonModule, MatIconModule, MatProgressBarModule,
    MatTooltipModule, MatChipsModule,
    MilestoneScopeBadgeComponent
  ],
  template: `
    @if (loading()) {
      <div style="text-align:center;padding:64px;opacity:0.35">Loading roadmap…</div>
    }

    @if (roadmap(); as r) {
      <div style="margin-bottom:24px">
        <a mat-button [routerLink]="['/pis', piId]" style="padding:0 8px 0 4px;gap:4px;color:rgba(255,255,255,0.55)">
          <mat-icon style="font-size:18px;width:18px;height:18px;line-height:18px">arrow_back</mat-icon>
          Back to PI
        </a>
      </div>

      <div style="margin-bottom:32px">
        <h2 style="margin:0 0 4px;font-size:1.4rem">Road to Product</h2>
        <p style="opacity:0.5;margin:0 0 24px;font-size:0.9rem">{{ r.piName }}</p>

        <!-- Overall Progress Card -->
        <div style="padding:24px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);margin-bottom:32px">
          <div style="font-size:0.85rem;font-weight:600;margin-bottom:12px">Overall Progress</div>
          <div style="font-size:2.5rem;font-weight:700;line-height:1;margin-bottom:12px" [style.color]="progressColor(r.overallProgressPercent)">
            {{ r.overallProgressPercent }}%
          </div>
          <mat-progress-bar mode="determinate" [value]="r.overallProgressPercent"
            style="height:12px;border-radius:6px;margin-bottom:16px"
            [color]="progressBarColor(r.overallProgressPercent)">
          </mat-progress-bar>
          <div style="display:flex;gap:24px;flex-wrap:wrap;font-size:0.78rem">
            <span style="color:#4caf50">{{ r.completedMilestones }} Done</span>
            <span style="color:#64b5f6">{{ r.inProgressMilestones }} In Progress</span>
            <span style="opacity:0.4">{{ r.upcomingMilestones }} Upcoming</span>
            <span style="opacity:0.3">{{ r.totalMilestones }} Total</span>
          </div>
        </div>

        <!-- Completed Milestones -->
        @if (done().length > 0) {
          <div style="margin-bottom:24px">
            <div style="font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;opacity:0.4;margin-bottom:12px;color:#4caf50">
              Completed
            </div>
            @for (m of done(); track m.id) {
              <div [routerLink]="['/milestones', m.id]"
                   style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-radius:8px;
                          background:rgba(255,255,255,0.02);cursor:pointer;transition:background 0.15s;margin-bottom:4px"
                   [style.border-left]="squadBorderLeft(m)">
                <mat-icon style="font-size:18px;width:18px;height:18px;line-height:18px;color:#4caf50;flex-shrink:0">check_circle</mat-icon>
                <span style="flex:1;font-size:0.88rem;font-weight:500">{{ m.title }}</span>
                <app-milestone-scope-badge [scope]="m.scope" [squadName]="m.squadName" [squadColor]="m.squadColor" />
                <span style="font-size:0.75rem;opacity:0.5;min-width:40px;text-align:right">100%</span>
                <span style="font-size:0.72rem;padding:2px 8px;border-radius:6px;background:rgba(76,175,80,0.15);color:#4caf50;font-weight:600">Done</span>
                @if (m.targetDate) {
                  <span style="font-size:0.72rem;opacity:0.35;min-width:60px;text-align:right">{{ m.targetDate | date:'d MMM' }}</span>
                }
              </div>
            }
          </div>
        }

        <!-- In Progress Milestones -->
        @if (inProgress().length > 0) {
          <div style="margin-bottom:24px">
            <div style="font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;opacity:0.4;margin-bottom:12px;color:#64b5f6">
              In Progress
            </div>
            @for (m of inProgress(); track m.id) {
              <div [routerLink]="['/milestones', m.id]"
                   style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-radius:8px;
                          background:rgba(255,255,255,0.02);cursor:pointer;transition:background 0.15s;margin-bottom:4px"
                   [style.border-left]="squadBorderLeft(m)">
                <mat-icon style="font-size:18px;width:18px;height:18px;line-height:18px;color:#64b5f6;flex-shrink:0">pending</mat-icon>
                <span style="flex:1;font-size:0.88rem;font-weight:500">{{ m.title }}</span>
                <app-milestone-scope-badge [scope]="m.scope" [squadName]="m.squadName" [squadColor]="m.squadColor" />
                <span style="font-size:0.75rem;opacity:0.6;min-width:40px;text-align:right">{{ m.progressPercent }}%</span>
                <span style="font-size:0.72rem;padding:2px 8px;border-radius:6px;background:rgba(33,150,243,0.15);color:#64b5f6;font-weight:600">In Progress</span>
                @if (m.targetDate) {
                  <span style="font-size:0.72rem;opacity:0.35;min-width:60px;text-align:right">{{ m.targetDate | date:'d MMM' }}</span>
                }
              </div>
            }
          </div>
        }

        <!-- Upcoming Milestones -->
        @if (upcoming().length > 0) {
          <div>
            <div style="font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;opacity:0.4;margin-bottom:12px">
              Upcoming
            </div>
            @for (m of upcoming(); track m.id) {
              <div [routerLink]="['/milestones', m.id]"
                   style="display:flex;align-items:center;gap:12px;padding:10px 16px;border-radius:8px;
                          background:rgba(255,255,255,0.02);cursor:pointer;transition:background 0.15s;margin-bottom:4px"
                   [style.border-left]="squadBorderLeft(m)">
                <mat-icon style="font-size:18px;width:18px;height:18px;line-height:18px;opacity:0.25;flex-shrink:0">radio_button_unchecked</mat-icon>
                <span style="flex:1;font-size:0.88rem;font-weight:500">{{ m.title }}</span>
                <app-milestone-scope-badge [scope]="m.scope" [squadName]="m.squadName" [squadColor]="m.squadColor" />
                <span style="font-size:0.75rem;opacity:0.3;min-width:40px;text-align:right">0%</span>
                <span style="font-size:0.72rem;padding:2px 8px;border-radius:6px;background:rgba(158,158,158,0.12);color:#9e9e9e;font-weight:600">Upcoming</span>
                @if (m.targetDate) {
                  <span style="font-size:0.72rem;opacity:0.35;min-width:60px;text-align:right">{{ m.targetDate | date:'d MMM' }}</span>
                }
              </div>
            }
          </div>
        }
      </div>
    }
  `
})
export class MilestoneRoadmapComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private milestoneSvc = inject(MilestoneService);

  piId = '';
  loading = signal(true);
  roadmap = signal<MilestoneRoadmap | null>(null);

  done = computed(() => this.roadmap()?.milestones.filter(m => m.status === 'Done') ?? []);
  inProgress = computed(() => this.roadmap()?.milestones.filter(m => m.status === 'InProgress') ?? []);
  upcoming = computed(() => this.roadmap()?.milestones.filter(m => m.status === 'Upcoming') ?? []);

  ngOnInit() {
    this.piId = this.route.snapshot.paramMap.get('id')!;
    this.load();
  }

  load() {
    this.loading.set(true);
    this.milestoneSvc.getRoadmap(this.piId).subscribe({
      next: r => { this.roadmap.set(r); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  progressColor(percent: number): string {
    if (percent >= 75) return '#4caf50';
    if (percent >= 50) return '#64b5f6';
    if (percent >= 25) return '#ff9800';
    return '#f44336';
  }

  progressBarColor(percent: number): 'primary' | 'accent' | 'warn' {
    if (percent >= 50) return 'primary';
    if (percent >= 25) return 'accent';
    return 'warn';
  }

  squadBorderLeft(m: MilestoneRoadmapItem): string {
    if (m.scope === 'Squad' && m.squadColor) {
      return `3px solid ${m.squadColor}`;
    }
    return '3px solid transparent';
  }
}
