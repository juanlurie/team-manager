import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { LeaveService } from '../../../core/services/leave.service';
import { SprintService } from '../../../core/services/sprint.service';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { LeaveRecord } from '../../../core/models/leave-record.model';
import { Sprint } from '../../../core/models/sprint.model';
import { TeamMember } from '../../../core/models/team-member.model';
import { LeaveFormDialogComponent } from '../leave-form-dialog/leave-form-dialog.component';
import { LeaveImportDialogComponent } from '../leave-import-dialog/leave-import-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

interface MemberLeaveGroup {
  teamMemberId: string;
  memberName: string;
  records: LeaveRecord[];
  totalDays: number;
  annualDays: number;
  sickDays: number;
  otherDays: number;
}

@Component({
  selector: 'app-leave-overview',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatExpansionModule, MatSelectModule, MatFormFieldModule,
    MatIconModule, MatButtonModule, MatProgressSpinnerModule, MatTooltipModule,
    MatDialogModule, MatChipsModule
  ],
  template: `
    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:24px;flex-wrap:wrap">
      <div style="flex:1;min-width:0">
        <h2 style="margin:0;font-size:1.5rem;font-weight:500">Leave Overview</h2>
        <p style="margin:4px 0 0;opacity:0.6;font-size:0.875rem">Team leave records across sprints</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <mat-form-field appearance="outline" subscriptSizing="dynamic" style="width:180px">
          <mat-label>Filter by Sprint</mat-label>
          <mat-select [(ngModel)]="selectedSprintId" (ngModelChange)="load()">
            <mat-option [value]="null">All Sprints</mat-option>
            @for (s of sprints(); track s.id) {
              <mat-option [value]="s.id">{{ s.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <button mat-stroked-button (click)="openImport()">
          <mat-icon>upload</mat-icon> Import
        </button>
        <button mat-raised-button color="primary" (click)="openAdd()">
          <mat-icon>add</mat-icon> Add Leave
        </button>
      </div>
    </div>

    @if (loading()) {
      <div style="display:flex;justify-content:center;padding:64px">
        <mat-spinner diameter="48"></mat-spinner>
      </div>
    } @else {
      <!-- Summary cards -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,150px),1fr));gap:12px;margin-bottom:24px">
        <mat-card appearance="outlined">
          <mat-card-content style="padding:20px">
            <div style="display:flex;align-items:center;gap:12px">
              <mat-icon style="font-size:2rem;width:2rem;height:2rem;opacity:0.7">people</mat-icon>
              <div>
                <div style="font-size:1.75rem;font-weight:600;line-height:1">{{ totalDays() }}</div>
                <div style="font-size:0.8rem;opacity:0.6;margin-top:2px">Total Leave Days</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card appearance="outlined">
          <mat-card-content style="padding:20px">
            <div style="display:flex;align-items:center;gap:12px">
              <mat-icon style="font-size:2rem;width:2rem;height:2rem;color:#4caf50">beach_access</mat-icon>
              <div>
                <div style="font-size:1.75rem;font-weight:600;line-height:1">{{ annualDays() }}</div>
                <div style="font-size:0.8rem;opacity:0.6;margin-top:2px">Annual</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card appearance="outlined">
          <mat-card-content style="padding:20px">
            <div style="display:flex;align-items:center;gap:12px">
              <mat-icon style="font-size:2rem;width:2rem;height:2rem;color:#f44336">sick</mat-icon>
              <div>
                <div style="font-size:1.75rem;font-weight:600;line-height:1">{{ sickDays() }}</div>
                <div style="font-size:0.8rem;opacity:0.6;margin-top:2px">Sick</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card appearance="outlined">
          <mat-card-content style="padding:20px">
            <div style="display:flex;align-items:center;gap:12px">
              <mat-icon style="font-size:2rem;width:2rem;height:2rem;color:#ff9800">event_note</mat-icon>
              <div>
                <div style="font-size:1.75rem;font-weight:600;line-height:1">{{ otherDays() }}</div>
                <div style="font-size:0.8rem;opacity:0.6;margin-top:2px">Other</div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      @if (groups().length === 0) {
        <mat-card appearance="outlined">
          <mat-card-content style="padding:48px;text-align:center;opacity:0.5">
            <mat-icon style="font-size:3rem;width:3rem;height:3rem;display:block;margin:0 auto 16px">event_busy</mat-icon>
            <div>No leave records found</div>
          </mat-card-content>
        </mat-card>
      } @else {
        <mat-accordion multi>
          @for (g of groups(); track g.teamMemberId) {
            <mat-expansion-panel [expanded]="true" style="margin-bottom:8px">
              <mat-expansion-panel-header collapsedHeight="auto" expandedHeight="auto" style="padding:12px 16px">
                <mat-panel-title style="flex-shrink:0;margin-right:8px">
                  <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:34px;height:34px;border-radius:50%;background:var(--mat-sys-primary);display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:600;flex-shrink:0">
                      {{ initials(g.memberName) }}
                    </div>
                    <span style="font-weight:500;font-size:0.9rem">{{ g.memberName }}</span>
                  </div>
                </mat-panel-title>
                <mat-panel-description style="gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end;min-width:0">
                  @if (g.annualDays > 0) {
                    <span class="leave-badge leave-annual">{{ g.annualDays }}d annual</span>
                  }
                  @if (g.sickDays > 0) {
                    <span class="leave-badge leave-sick">{{ g.sickDays }}d sick</span>
                  }
                  @if (g.otherDays > 0) {
                    <span class="leave-badge leave-other">{{ g.otherDays }}d other</span>
                  }
                  <span style="opacity:0.5;font-size:0.8rem;white-space:nowrap">{{ g.totalDays }}d total</span>
                </mat-panel-description>
              </mat-expansion-panel-header>

              <div style="display:flex;flex-direction:column;gap:6px;padding:8px 0">
                @for (r of g.records; track r.id) {
                  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;border-radius:8px;background:rgba(255,255,255,0.03)">
                    <!-- type + dates + days always stay together -->
                    <span [class]="'leave-badge leave-' + r.type.toLowerCase()">{{ r.type }}</span>
                    <span style="font-size:0.85rem;white-space:nowrap">
                      {{ r.startDate | date:'d MMM' }} – {{ r.endDate | date:'d MMM y' }}
                    </span>
                    <span style="font-weight:600;font-size:0.85rem;white-space:nowrap">{{ r.daysCount }}d</span>
                    @if (r.notes) {
                      <span style="opacity:0.55;font-size:0.8rem;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                            [matTooltip]="r.notes">{{ r.notes }}</span>
                    } @else {
                      <span style="flex:1"></span>
                    }
                    <!-- actions pinned right, won't shrink -->
                    <div style="display:flex;gap:2px;flex-shrink:0;margin-left:auto">
                      <button mat-icon-button (click)="openEdit(r)" matTooltip="Edit">
                        <mat-icon style="font-size:18px">edit</mat-icon>
                      </button>
                      <button mat-icon-button color="warn" (click)="delete(r)" matTooltip="Delete">
                        <mat-icon style="font-size:18px">delete</mat-icon>
                      </button>
                    </div>
                  </div>
                }
              </div>
            </mat-expansion-panel>
          }
        </mat-accordion>
      }
    }
  `,
  styles: [`
    .leave-badge { padding:3px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;white-space:nowrap; }
    .leave-annual { background:rgba(76,175,80,0.15);color:#4caf50; }
    .leave-sick   { background:rgba(244,67,54,0.15);color:#f44336; }
    .leave-other  { background:rgba(255,152,0,0.15);color:#ff9800; }

    /* Allow panel header to expand vertically when badges wrap on mobile */
    ::ng-deep .mat-expansion-panel-header {
      height: auto !important;
      min-height: 48px;
    }
    ::ng-deep .mat-expansion-panel-header .mat-content {
      flex-wrap: wrap;
      row-gap: 4px;
    }
  `]
})
export class LeaveOverviewComponent implements OnInit {
  private leaveSvc = inject(LeaveService);
  private sprintSvc = inject(SprintService);
  private memberSvc = inject(TeamMemberService);
  private dialog = inject(MatDialog);

  selectedSprintId: string | null = null;
  loading = signal(true);
  records = signal<LeaveRecord[]>([]);
  sprints = signal<Sprint[]>([]);
  members = signal<TeamMember[]>([]);

  groups = computed<MemberLeaveGroup[]>(() => {
    const map = new Map<string, MemberLeaveGroup>();
    for (const r of this.records()) {
      if (!map.has(r.teamMemberId)) {
        map.set(r.teamMemberId, { teamMemberId: r.teamMemberId, memberName: r.memberName, records: [], totalDays: 0, annualDays: 0, sickDays: 0, otherDays: 0 });
      }
      const g = map.get(r.teamMemberId)!;
      g.records.push(r);
      g.totalDays += r.daysCount;
      if (r.type === 'Annual') g.annualDays += r.daysCount;
      else if (r.type === 'Sick') g.sickDays += r.daysCount;
      else g.otherDays += r.daysCount;
    }
    return Array.from(map.values()).sort((a, b) => a.memberName.localeCompare(b.memberName));
  });

  totalDays  = computed(() => this.records().reduce((s, r) => s + r.daysCount, 0));
  annualDays = computed(() => this.records().filter(r => r.type === 'Annual').reduce((s, r) => s + r.daysCount, 0));
  sickDays   = computed(() => this.records().filter(r => r.type === 'Sick').reduce((s, r) => s + r.daysCount, 0));
  otherDays  = computed(() => this.records().filter(r => r.type === 'Other').reduce((s, r) => s + r.daysCount, 0));

  ngOnInit() {
    this.sprintSvc.getSprints().subscribe(s => this.sprints.set(s));
    this.memberSvc.getAll({ isActive: true }).subscribe(m => this.members.set(m));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.leaveSvc.getAll(this.selectedSprintId ? { sprintId: this.selectedSprintId } : undefined)
      .subscribe(r => { this.records.set(r); this.loading.set(false); });
  }

  openImport() {
    this.dialog.open(LeaveImportDialogComponent, { width: '740px', data: { members: this.members() } })
      .afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  openAdd() {
    this.dialog.open(LeaveFormDialogComponent, { width: '500px', data: { members: this.members() } })
      .afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  openEdit(record: LeaveRecord) {
    this.dialog.open(LeaveFormDialogComponent, { width: '500px', data: { members: this.members(), record } })
      .afterClosed().subscribe(saved => { if (saved) this.load(); });
  }

  delete(record: LeaveRecord) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: 'Delete leave record?', message: `Remove leave entry for ${record.memberName}?`, danger: true }
    }).afterClosed().subscribe(ok => {
      if (ok) this.leaveSvc.delete(record.id).subscribe(() => this.load());
    });
  }

  initials(name: string) {
    return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }
}
