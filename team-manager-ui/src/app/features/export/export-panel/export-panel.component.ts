import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Sprint } from '../../../core/models/sprint.model';
import { TeamMember } from '../../../core/models/team-member.model';
import { MemberSprintCard } from '../../../core/models/dashboard.model';
import { Feature } from '../../../core/models/feature.model';
import { DiscussionPoint } from '../../../core/models/discussion-point.model';
import { LeaveRecord } from '../../../core/models/leave-record.model';
import { SprintService } from '../../../core/services/sprint.service';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { DiscussionPointService } from '../../../core/services/discussion-point.service';
import { LeaveService } from '../../../core/services/leave.service';
import { SquadService } from '../../../core/services/squad.service';
import { Squad } from '../../../core/models/squad.model';
import { buildDuplicateFirstNames, memberDisplayName } from '../../../core/utils/member-display-name';

const NAVY      = '1F3664';
const WHITE     = 'FFFFFF';
const LGRAY     = 'F4F6F8';
const MGRAY     = '8899AA';
const DARK      = '2D3748';
const GREEN     = '84BF40';
const GREEN_ACC = 'A5C249';
const GREEN_DRK = '4EA72E';

// Dark-theme slide constants
const SLIDE_BG  = '0E1B33';
const CARD_BG   = '162B50';
const TBL_HDR   = '1A3355';
const TBL_BDR   = '1F3E6A';

const STATUS_COLOR: Record<string, string> = {
  Released: '27AE60', ReadyForRelease: '8E44AD',
  Completed: '2980B9', InProgress: 'E67E22', Planned: '95A5A6',
};
const STATUS_LABEL: Record<string, string> = {
  Released: 'Released', ReadyForRelease: 'Ready for Release',
  Completed: 'Completed', InProgress: 'In Progress', Planned: 'Planned',
};
const TYPE_COLOR: Record<string, string> = {
  Dev: '2980B9', QA: '27AE60', Analysis: 'F39C12',
  Design: '9B59B6', Bug: 'E74C3C', Task: '7F8C8D', Release: '1ABC9C',
};

@Component({
  selector: 'app-export-panel',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <h2 style="margin:0 0 24px;font-size:1.2rem">Export</h2>

    <div style="max-width:560px;display:flex;flex-direction:column;gap:24px">

      <!-- ── Sprint Report ── -->
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:20px;display:flex;flex-direction:column;gap:14px">
        <div style="font-weight:600;font-size:0.9rem;opacity:0.6;text-transform:uppercase;letter-spacing:0.07em">Sprint Report (PowerPoint)</div>

        <div style="display:flex;gap:12px">
          <mat-form-field appearance="outline" style="flex:2">
            <mat-label>Sprint</mat-label>
            <mat-select [(ngModel)]="selectedSprintId">
              @for (s of sprints(); track s.id) {
                <mat-option [value]="s.id">{{ s.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex:2">
            <mat-label>Scope</mat-label>
            <mat-select [(ngModel)]="selectedTeamLeadId">
              <mat-option value="">All members</mat-option>
              @for (tl of teamLeads(); track tl.id) {
                <mat-option [value]="tl.id">{{ leadLabel(tl) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>

        <div style="display:flex;flex-direction:column;gap:4px">
          <div style="font-size:0.75rem;opacity:0.4;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px">Slides to include</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px">
            <mat-checkbox [(ngModel)]="sections.cover">Cover</mat-checkbox>
            <mat-checkbox [(ngModel)]="sections.discussion">Discussion Points</mat-checkbox>
            <mat-checkbox [(ngModel)]="sections.summary">Summary</mat-checkbox>
            <mat-checkbox [(ngModel)]="sections.leave">Planned Leave</mat-checkbox>
            <mat-checkbox [(ngModel)]="sections.features">Features</mat-checkbox>
            <mat-checkbox [(ngModel)]="sections.team">Team</mat-checkbox>
            <mat-checkbox [(ngModel)]="sections.squads">Team Composition</mat-checkbox>
          </div>
        </div>

        <button mat-raised-button color="primary"
                [disabled]="!selectedSprintId || generating() || noSectionsSelected()"
                (click)="generate()">
          <span style="display:flex;align-items:center;gap:8px;justify-content:center;padding:4px 0">
            @if (generating()) {
              <mat-spinner diameter="18"></mat-spinner>
              <span>Building slides…</span>
            } @else {
              <mat-icon>slideshow</mat-icon>
              <span>Generate PowerPoint</span>
            }
          </span>
        </button>
      </div>

      <!-- ── Leave Image ── -->
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:20px;display:flex;flex-direction:column;gap:14px">
        <div style="font-weight:600;font-size:0.9rem;opacity:0.6;text-transform:uppercase;letter-spacing:0.07em">Leave Summary (Image)</div>

        <div style="display:flex;gap:12px">
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>From</mat-label>
            <input matInput type="date" [(ngModel)]="leaveFrom">
          </mat-form-field>
          <mat-form-field appearance="outline" style="flex:1">
            <mat-label>To</mat-label>
            <input matInput type="date" [(ngModel)]="leaveTo">
          </mat-form-field>
        </div>

        <div style="font-size:0.8rem;line-height:1.7;opacity:0.5">
          Lists every team member with leave in the selected range — name, dates, and days.
        </div>

        <button mat-raised-button [disabled]="exportingLeave()" (click)="exportLeaveImage()">
          <span style="display:flex;align-items:center;gap:8px;justify-content:center;padding:4px 0">
            @if (exportingLeave()) {
              <mat-spinner diameter="18"></mat-spinner>
              <span>Building image…</span>
            } @else {
              <mat-icon>image</mat-icon>
              <span>Export Leave as Image</span>
            }
          </span>
        </button>
      </div>

    </div>
  `
})
export class ExportPanelComponent implements OnInit {
  private sprintSvc      = inject(SprintService);
  private memberSvc      = inject(TeamMemberService);
  private dashboardSvc   = inject(DashboardService);
  private discussionSvc  = inject(DiscussionPointService);
  private leaveSvc       = inject(LeaveService);
  private squadSvc       = inject(SquadService);

  sprints    = signal<Sprint[]>([]);
  teamLeads  = signal<TeamMember[]>([]);
  private leadDuplicates = computed(() => buildDuplicateFirstNames(this.teamLeads()));
  leadLabel = (tl: TeamMember) => `${memberDisplayName(tl, this.leadDuplicates())}'s team`;
  selectedSprintId    = '';
  selectedTeamLeadId  = '';
  leaveFrom = this.defaultFrom();
  leaveTo   = this.defaultTo();
  generating     = signal(false);
  exportingLeave = signal(false);

  sections = {
    cover:      true,
    summary:    true,
    discussion: true,
    features:   true,
    leave:      true,
    team:       true,
    squads:     true,
  };

  noSectionsSelected() {
    return !Object.values(this.sections).some(v => v);
  }

  private defaultFrom(): string {
    return new Date().toISOString().slice(0, 10);
  }
  private defaultTo(): string {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  }

  ngOnInit() {
    this.sprintSvc.getSprints().subscribe(s => {
      this.sprints.set(s);
      if (s.length) this.selectedSprintId = s[0].id;
    });
    this.memberSvc.getAll({ role: 'TeamLead' }).subscribe(m => this.teamLeads.set(m));
  }

  generate() {
    if (!this.selectedSprintId || this.generating()) return;
    this.generating.set(true);

    forkJoin({
      dashboard:   this.dashboardSvc.getSprintDashboard(this.selectedSprintId, this.selectedTeamLeadId || undefined),
      discussions: this.discussionSvc.getAll(),
      squads:      this.squadSvc.getAll()
    }).subscribe({
      next: async ({ dashboard, discussions, squads }) => {
        const sprint = this.sprints().find(s => s.id === this.selectedSprintId)!;
        try {
          await this.buildPptx(dashboard.features, dashboard.members, sprint, discussions, squads);
        } finally {
          this.generating.set(false);
        }
      },
      error: () => this.generating.set(false)
    });
  }

  /* ── Leave Image ───────────────────────────────────────────────── */

  exportLeaveImage() {
    if (this.exportingLeave()) return;
    this.exportingLeave.set(true);
    this.leaveSvc.getAll({ from: this.leaveFrom || undefined, to: this.leaveTo || undefined }).subscribe({
      next: records => {
        try { this.drawLeaveImage(records); } finally { this.exportingLeave.set(false); }
      },
      error: () => this.exportingLeave.set(false)
    });
  }

  private drawLeaveImage(records: LeaveRecord[]) {
    const fromLabel = this.leaveFrom ? this.fmtDate(this.leaveFrom) : '';
    const toLabel   = this.leaveTo   ? this.fmtDate(this.leaveTo)   : '';
    const rangeStr  = fromLabel && toLabel ? `${fromLabel} – ${toLabel}` : '';
    const title     = 'Planned Leave' + (rangeStr ? `  ·  ${rangeStr}` : '');

    // Group by member, sorted alphabetically
    const byMember = new Map<string, LeaveRecord[]>();
    for (const r of records) {
      if (!byMember.has(r.memberName)) byMember.set(r.memberName, []);
      byMember.get(r.memberName)!.push(r);
    }
    const members = [...byMember.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    // Layout: 4 columns — Member | From | To | Days
    const SCALE   = 2;
    const W       = 700;
    const PAD     = 32;
    const ROW_H   = 32;
    const HDR_H   = 44;
    const TITLE_H = 60;
    // col x offsets within content area
    const COL_X   = [0, 260, 390, 510]; // Member | From | To | Days

    const totalRows = members.reduce((s, [, rs]) => s + Math.max(rs.length, 1), 0);
    const H = TITLE_H + HDR_H + totalRows * ROW_H + PAD;

    const canvas = document.createElement('canvas');
    canvas.width  = W * SCALE;
    canvas.height = H * SCALE;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(SCALE, SCALE);

    // Background
    ctx.fillStyle = '#16202e';
    ctx.fillRect(0, 0, W, H);

    // Title bar
    ctx.fillStyle = '#1b3050';
    ctx.fillRect(0, 0, W, TITLE_H);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px Inter, Arial, sans-serif';
    ctx.fillText(title, PAD, TITLE_H / 2 + 7);

    // Generated date right-aligned
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '11px Inter, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(dateStr, W - PAD, TITLE_H / 2 + 6);
    ctx.textAlign = 'left';

    // Column headers
    const headers = ['Member', 'From', 'To', 'Days'];
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(0, TITLE_H, W, HDR_H);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = 'bold 10px Inter, Arial, sans-serif';
    headers.forEach((h, i) => {
      ctx.fillText(h.toUpperCase(), PAD + COL_X[i], TITLE_H + HDR_H / 2 + 4);
    });

    // Data rows
    let rowY = TITLE_H + HDR_H;

    members.forEach(([name, leaves], mi) => {
      const sorted = leaves.slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
      const rowCount = sorted.length || 1;
      const bg = mi % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent';

      ctx.fillStyle = bg;
      ctx.fillRect(0, rowY, W, rowCount * ROW_H);

      // Member name — vertically centred across their block
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 13px Inter, Arial, sans-serif';
      ctx.fillText(
        name.length > 28 ? name.slice(0, 26) + '…' : name,
        PAD + COL_X[0],
        rowY + (rowCount * ROW_H) / 2 + 5
      );

      if (!sorted.length) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = '12px Inter, Arial, sans-serif';
        ctx.fillText('—', PAD + COL_X[1], rowY + ROW_H / 2 + 5);
        rowY += ROW_H;
      } else {
        sorted.forEach(lr => {
          const cy = rowY + ROW_H / 2 + 5;
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.font = '12px Inter, Arial, sans-serif';
          ctx.fillText(this.fmtDate(lr.startDate), PAD + COL_X[1], cy);
          ctx.fillText(this.fmtDate(lr.endDate),   PAD + COL_X[2], cy);

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 12px Inter, Arial, sans-serif';
          ctx.fillText(String(lr.daysCount), PAD + COL_X[3], cy);

          // Subtle row divider
          ctx.strokeStyle = 'rgba(255,255,255,0.04)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(PAD + COL_X[1], rowY + ROW_H);
          ctx.lineTo(W - PAD, rowY + ROW_H);
          ctx.stroke();

          rowY += ROW_H;
        });
      }

      // Member separator
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, rowY);
      ctx.lineTo(W, rowY);
      ctx.stroke();
    });

    if (!members.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '15px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No leave in this range.', W / 2, TITLE_H + HDR_H + 60);
      ctx.textAlign = 'left';
    }

    const link = document.createElement('a');
    const label = (this.leaveFrom || 'all').replace(/-/g, '');
    link.download = `leave-${label}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  private fmtDate(d: string): string {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /* ── Build ─────────────────────────────────────────────────────── */

  private async buildPptx(features: Feature[], members: MemberSprintCard[], sprint: Sprint, discussions: DiscussionPoint[], squads: Squad[]) {
    const pptxgen = (await import('pptxgenjs')).default;
    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_WIDE'; // 13.33 × 7.5 in

    const activeFeatures = features.filter(f => f.isActive);
    if (this.sections.cover)      this.coverSlide(pptx, sprint);
    if (this.sections.summary)    this.summarySlide(pptx, sprint, activeFeatures);
    if (this.sections.discussion) this.discussionSlide(pptx, sprint, discussions);
    if (this.sections.features)   this.featuresSlide(pptx, sprint, activeFeatures);
    if (this.sections.leave)      this.leaveSlide(pptx, sprint, members);
    if (this.sections.team)       this.teamSlide(pptx, sprint, members);
    if (this.sections.squads)     this.squadSlide(pptx, sprint, squads, members);

    const name = sprint.name.replace(/[^a-z0-9]+/gi, '-');
    await pptx.writeFile({ fileName: `${name}-report.pptx` });
  }

  /* ── Discussion Points ──────────────────────────────────────────── */

  private discussionSlide(pptx: any, sprint: Sprint, all: DiscussionPoint[]) {
    const s = pptx.addSlide();
    s.background = { color: SLIDE_BG };

    s.addText('Discussion Points', {
      x: 0, y: 0, w: '100%', h: 0.85,
      fill: { color: NAVY }, color: WHITE, fontSize: 20, bold: true,
      align: 'left', valign: 'middle', margin: [0, 0, 0, 18]
    });
    s.addText('Items requiring leadership input', {
      x: 0, y: 0, w: '100%', h: 0.85,
      color: MGRAY, fontSize: 13, align: 'right', valign: 'middle', margin: [0, 18, 0, 0]
    });

    // Only show actionable items (not Resolved); sort High→Medium→Low, then Open before InProgress before Deferred
    const priorityRank: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
    const statusRank:   Record<string, number> = { Open: 0, InProgress: 1, Deferred: 2, Resolved: 3 };
    const items = all
      .filter(d => d.status !== 'Resolved')
      .sort((a, b) => {
        const p = (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9);
        return p !== 0 ? p : (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
      });

    if (!items.length) {
      s.addText('No open discussion points.', {
        x: 0.4, y: 3, w: 12, color: MGRAY, fontSize: 14, align: 'center'
      });
      return;
    }

    const DISC_STATUS_COLOR: Record<string, string> = {
      Open: '2980B9', InProgress: 'E67E22', Deferred: '95A5A6', Resolved: '27AE60',
    };
    const DISC_STATUS_LABEL: Record<string, string> = {
      Open: 'Open', InProgress: 'In Progress', Deferred: 'Deferred', Resolved: 'Resolved',
    };
    const PRIORITY_COLOR: Record<string, string> = { High: 'E74C3C', Medium: 'F39C12', Low: '27AE60' };

    const header = [
      { text: 'Priority', options: { bold: true, fill: { color: TBL_HDR }, color: WHITE, fontSize: 10 } },
      { text: 'Status',   options: { bold: true, fill: { color: TBL_HDR }, color: WHITE, fontSize: 10 } },
      { text: 'Topic',    options: { bold: true, fill: { color: TBL_HDR }, color: WHITE, fontSize: 10 } },
      { text: 'Notes',    options: { bold: true, fill: { color: TBL_HDR }, color: WHITE, fontSize: 10 } },
    ];

    const rows: any[][] = [header];
    const capped = items.slice(0, 18); // max rows that fit comfortably

    for (const d of capped) {
      const noteText = d.notes
        ? (d.notes.length > 160 ? d.notes.slice(0, 158) + '…' : d.notes)
        : '';
      rows.push([
        {
          text: d.priority.toUpperCase(),
          options: {
            fill: { color: PRIORITY_COLOR[d.priority] ?? '95A5A6' }, color: WHITE,
            bold: true, fontSize: 9, align: 'center', valign: 'middle'
          }
        },
        {
          text: DISC_STATUS_LABEL[d.status] ?? d.status,
          options: {
            fill: { color: DISC_STATUS_COLOR[d.status] ?? '95A5A6' }, color: WHITE,
            bold: true, fontSize: 9, align: 'center', valign: 'middle'
          }
        },
        { text: d.title,   options: { color: WHITE, fontSize: 10, bold: true, valign: 'top', margin: [3, 5, 3, 5] } },
        { text: noteText,  options: { color: MGRAY, fontSize: 9,  valign: 'top', margin: [3, 5, 3, 5] } },
      ]);
    }

    if (items.length > 18) {
      rows.push([
        { text: '', options: {} },
        { text: '', options: {} },
        { text: `… and ${items.length - 18} more items`, options: { color: MGRAY, fontSize: 9, italic: true, colspan: 2 } }
      ]);
    }

    // Row heights: fixed header + auto-scale content rows to fill the slide
    const AVAIL_H = 5.9;
    const rowH = Math.min(0.7, Math.max(0.32, AVAIL_H / rows.length));

    s.addTable(rows, {
      x: 0.3, y: 0.95, w: 12.7,
      colW: [0.9, 1.2, 3.8, 6.8],
      border: { type: 'solid', color: TBL_BDR, pt: 0.5 },
      rowH: [0.36, ...capped.map(() => rowH)],
      fontSize: 10
    });
  }

  /* ── Cover ─────────────────────────────────────────────────────── */

  private coverSlide(pptx: any, sprint: Sprint) {
    const s = pptx.addSlide();
    s.background = { color: NAVY };

    // Side accent bar
    s.addShape(pptx.ShapeType.rect, {
      x: 0, y: 2.8, w: 0.12, h: 1.5, fill: { color: GREEN }, line: { width: 0 }
    });
    s.addText('SPRINT REPORT', {
      x: 0.35, y: 2.1, w: 12, h: 0.4,
      color: GREEN_ACC, fontSize: 12, bold: true, charSpacing: 5
    });
    s.addText(sprint.name, {
      x: 0.35, y: 2.75, w: 12, h: 1.4,
      color: WHITE, fontSize: 44, bold: true, valign: 'middle'
    });
    s.addText(`${this.fmt(sprint.startDate)}  –  ${this.fmt(sprint.endDate)}`, {
      x: 0.35, y: 4.35, w: 12, h: 0.45, color: MGRAY, fontSize: 20
    });
    s.addText(
      `Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      { x: 0.35, y: 6.85, w: 12, h: 0.3, color: '445566', fontSize: 11 }
    );

    // Striped footer bar (alternating navy/green, 10 stripes)
    const stripeW = 13.33 / 10;
    for (let i = 0; i < 10; i++) {
      s.addShape(pptx.ShapeType.rect, {
        x: i * stripeW, y: 7.2, w: stripeW + 0.01, h: 0.3,
        fill: { color: i % 2 === 0 ? '162B50' : GREEN }, line: { width: 0 }
      });
    }
  }

  /* ── Features ──────────────────────────────────────────────────── */

  private featuresSlide(pptx: any, sprint: Sprint, features: Feature[]) {
    const s = pptx.addSlide();
    s.background = { color: SLIDE_BG };

    // Header bar
    s.addText('Features', {
      x: 0, y: 0, w: '100%', h: 0.85,
      fill: { color: NAVY }, color: WHITE, fontSize: 20, bold: true,
      align: 'left', valign: 'middle', margin: [0, 0, 0, 18]
    });
    s.addText(sprint.name, {
      x: 0, y: 0, w: '100%', h: 0.85,
      color: MGRAY, fontSize: 13, align: 'right', valign: 'middle', margin: [0, 18, 0, 0]
    });

    // Status summary badges
    const statusOrder = ['Released', 'ReadyForRelease', 'InProgress', 'Completed', 'Planned'];
    const boxW = 2.35, gap = 0.125;
    statusOrder.forEach((st, i) => {
      const x = 0.4 + i * (boxW + gap);
      const count = features.filter(f => f.status === st).length;
      s.addText(STATUS_LABEL[st], {
        x, y: 1.0, w: boxW, h: 0.33,
        fill: { color: STATUS_COLOR[st] }, color: WHITE,
        fontSize: 10, bold: true, align: 'center', valign: 'middle'
      });
      s.addText(String(count), {
        x, y: 1.33, w: boxW, h: 0.38,
        color: WHITE, fontSize: 24, bold: true, align: 'center', valign: 'middle'
      });
    });

    // Feature list
    const rows: any[][] = [];
    for (const st of statusOrder) {
      const group = features.filter(f => f.status === st);
      if (!group.length) continue;
      rows.push([
        {
          text: STATUS_LABEL[st],
          options: {
            colspan: 2, fill: { color: STATUS_COLOR[st] }, color: WHITE,
            bold: true, fontSize: 10, align: 'left', margin: [2, 6, 2, 6]
          }
        }
      ]);
      for (const f of group) {
        rows.push([
          { text: f.externalTicketRef ?? '', options: { color: MGRAY, fontSize: 11, align: 'center' } },
          { text: f.title, options: { color: WHITE, fontSize: 11, align: 'left', margin: [2, 4, 2, 4] } }
        ]);
      }
    }

    if (rows.length) {
      s.addTable(rows, {
        x: 0.4, y: 1.83, w: 12.5, colW: [1.3, 11.2],
        border: { type: 'solid', color: TBL_BDR, pt: 0.5 },
        rowH: 0.28, fontSize: 11
      });
    } else {
      s.addText('No features for this sprint.', {
        x: 0.4, y: 3, w: 12, color: MGRAY, fontSize: 14, align: 'center'
      });
    }
  }

  /* ── Leave ─────────────────────────────────────────────────────── */

  private leaveSlide(pptx: any, sprint: Sprint, members: MemberSprintCard[]) {
    const s = pptx.addSlide();
    s.background = { color: SLIDE_BG };

    s.addText('Planned Leave', {
      x: 0, y: 0, w: '100%', h: 0.85,
      fill: { color: NAVY }, color: WHITE, fontSize: 20, bold: true,
      align: 'left', valign: 'middle', margin: [0, 0, 0, 18]
    });
    s.addText(sprint.name, {
      x: 0, y: 0, w: '100%', h: 0.85,
      color: MGRAY, fontSize: 13, align: 'right', valign: 'middle', margin: [0, 18, 0, 0]
    });

    const allLeave = members
      .flatMap(m => m.leaveRecords.map(lr => ({ ...lr, fullName: m.fullName })))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

    if (!allLeave.length) {
      s.addText('No leave records for this sprint.', {
        x: 0.4, y: 2.5, w: 12, color: MGRAY, fontSize: 14, align: 'center'
      });
      return;
    }

    const rows: any[][] = [
      [
        { text: 'Member', options: { bold: true, fill: { color: TBL_HDR }, color: WHITE, fontSize: 11 } },
        { text: 'Type',   options: { bold: true, fill: { color: TBL_HDR }, color: WHITE, fontSize: 11, align: 'center' } },
        { text: 'From',   options: { bold: true, fill: { color: TBL_HDR }, color: WHITE, fontSize: 11, align: 'center' } },
        { text: 'To',     options: { bold: true, fill: { color: TBL_HDR }, color: WHITE, fontSize: 11, align: 'center' } },
        { text: 'Days',   options: { bold: true, fill: { color: TBL_HDR }, color: WHITE, fontSize: 11, align: 'center' } },
      ]
    ];

    for (const lr of allLeave) {
      rows.push([
        { text: lr.fullName,            options: { color: WHITE, fontSize: 11 } },
        { text: lr.type,                options: { color: WHITE, fontSize: 11, align: 'center' } },
        { text: this.fmt(lr.startDate), options: { color: WHITE, fontSize: 11, align: 'center' } },
        { text: this.fmt(lr.endDate),   options: { color: WHITE, fontSize: 11, align: 'center' } },
        { text: String(lr.daysCount),   options: { color: WHITE, fontSize: 11, align: 'center' } },
      ]);
    }

    s.addTable(rows, {
      x: 0.4, y: 1.0, w: 12.5, colW: [5.2, 1.8, 2.0, 2.0, 1.5],
      border: { type: 'solid', color: TBL_BDR, pt: 0.5 },
      rowH: 0.34, fontSize: 11
    });
  }

  /* ── Summary slide ──────────────────────────────────────────────── */

  private summarySlide(pptx: any, sprint: Sprint, features: Feature[]) {
    const s = pptx.addSlide();
    s.background = { color: SLIDE_BG };

    s.addText('Sprint Summary', {
      x: 0, y: 0, w: '100%', h: 0.85,
      fill: { color: NAVY }, color: WHITE, fontSize: 20, bold: true,
      align: 'left', valign: 'middle', margin: [0, 0, 0, 18]
    });
    s.addText(sprint.name, {
      x: 0, y: 0, w: '100%', h: 0.85,
      color: MGRAY, fontSize: 13, align: 'right', valign: 'middle', margin: [0, 18, 0, 0]
    });

    // Status count badges (5 across)
    const statusOrder = ['Released', 'ReadyForRelease', 'InProgress', 'Completed', 'Planned'];
    const boxW = 2.35, gap = 0.125;
    statusOrder.forEach((st, i) => {
      const x = 0.4 + i * (boxW + gap);
      const count = features.filter(f => f.status === st).length;
      s.addText(STATUS_LABEL[st], {
        x, y: 1.0, w: boxW, h: 0.33,
        fill: { color: STATUS_COLOR[st] }, color: WHITE,
        fontSize: 10, bold: true, align: 'center', valign: 'middle'
      });
      s.addText(String(count), {
        x, y: 1.33, w: boxW, h: 0.38,
        color: WHITE, fontSize: 24, bold: true, align: 'center', valign: 'middle'
      });
    });

    // Left column: Released + ReadyForRelease
    // Right column: InProgress + Planned + Completed
    this.summaryColumn(s, features, ['Released', 'ReadyForRelease'], 0.3,  1.83, 6.0);
    this.summaryColumn(s, features, ['InProgress', 'Planned', 'Completed'], 6.63, 1.83, 6.4);
  }

  private summaryColumn(s: any, features: Feature[], statuses: string[], x: number, y: number, w: number) {
    const rows: any[][] = [];
    for (const st of statuses) {
      const group = features.filter(f => f.status === st);
      if (!group.length) continue;
      rows.push([{
        text: STATUS_LABEL[st],
        options: {
          fill: { color: STATUS_COLOR[st] }, color: WHITE,
          bold: true, fontSize: 10, align: 'left', margin: [2, 6, 2, 6]
        }
      }]);
      for (const f of group) {
        const label = f.externalTicketRef
          ? `${f.externalTicketRef}  ${f.title}`
          : f.title;
        rows.push([{
          text: label.length > 80 ? label.slice(0, 78) + '…' : label,
          options: { color: WHITE, fontSize: 10, margin: [2, 6, 2, 6] }
        }]);
      }
    }
    if (!rows.length) {
      rows.push([{ text: 'No items', options: { color: MGRAY, fontSize: 10, italic: true, align: 'center' } }]);
    }
    const rowH = Math.min(0.55, Math.max(0.27, 5.4 / rows.length));
    s.addTable(rows, {
      x, y, w,
      border: { type: 'solid', color: TBL_BDR, pt: 0.5 },
      rowH, fontSize: 10
    });
  }

  /* ── Team slide (all members, paginated) ────────────────────────── */

  private teamSlide(pptx: any, sprint: Sprint, members: MemberSprintCard[]) {
    const sorted = [...members].sort((a, b) => a.fullName.localeCompare(b.fullName));

    const AVAIL_H = 5.95;
    const maxPerSlide = Math.floor(AVAIL_H / 0.45);
    const chunks: MemberSprintCard[][] = [];
    for (let i = 0; i < sorted.length; i += maxPerSlide) {
      chunks.push(sorted.slice(i, i + maxPerSlide));
    }

    chunks.forEach((chunk, ci) => {
      const chunkRowH     = Math.min(1.1, Math.max(0.45, AVAIL_H / chunk.length));
      const chunkFontSize = chunkRowH < 0.55 ? 9 : 10;
      const s = pptx.addSlide();
      s.background = { color: SLIDE_BG };

      const suffix = chunks.length > 1 ? `  (${ci + 1}/${chunks.length})` : '';
      s.addText('Team' + suffix, {
        x: 0, y: 0, w: '100%', h: 0.85,
        fill: { color: NAVY }, color: WHITE, fontSize: 20, bold: true,
        align: 'left', valign: 'middle', margin: [0, 0, 0, 18]
      });
      s.addText(sprint.name, {
        x: 0, y: 0, w: '100%', h: 0.85,
        color: MGRAY, fontSize: 13, align: 'right', valign: 'middle', margin: [0, 18, 0, 0]
      });

      const header = [
        { text: 'Member',      options: { bold: true, fill: { color: TBL_HDR }, color: WHITE, fontSize: chunkFontSize + 1 } },
        { text: 'In Progress', options: { bold: true, fill: { color: STATUS_COLOR['InProgress'] }, color: WHITE, fontSize: chunkFontSize + 1 } },
        { text: 'Planned',     options: { bold: true, fill: { color: STATUS_COLOR['Planned'] },    color: WHITE, fontSize: chunkFontSize + 1 } },
        { text: 'Completed',   options: { bold: true, fill: { color: STATUS_COLOR['Completed'] },  color: WHITE, fontSize: chunkFontSize + 1 } },
        { text: 'Leave',       options: { bold: true, fill: { color: TBL_HDR }, color: WHITE, fontSize: chunkFontSize + 1, align: 'center' } },
      ];

      const rows: any[][] = [header];

      for (const m of chunk) {
        const items = (status: string) =>
          m.workItems
            .filter(w => w.status === status)
            .map(w => '• ' + (w.title.length > 52 ? w.title.slice(0, 50) + '…' : w.title))
            .join('\n');

        const leaveTxt = m.leaveRecords.length
          ? m.leaveRecords.map(lr => `${lr.daysCount}d`).join(', ')
          : '—';

        rows.push([
          {
            text: [
              { text: m.fullName + '\n', options: { bold: true } },
              { text: (m.crafts ?? []).map(c => this.craftLabel(c)).join(', '), options: { color: GREEN_ACC, fontSize: chunkFontSize - 1 } },
              ...((m.squadNames ?? []).length ? [{ text: '\n' + (m.squadNames ?? []).join(', '), options: { color: GREEN_DRK, fontSize: chunkFontSize - 1 } }] : [])
            ],
            options: { color: WHITE, fontSize: chunkFontSize, valign: 'top', margin: [4, 6, 4, 6] }
          },
          { text: items('InProgress'), options: { color: 'FFB74D', fontSize: chunkFontSize, valign: 'top', margin: [4, 6, 4, 6] } },
          { text: items('Planned'),    options: { color: '90CAF9', fontSize: chunkFontSize, valign: 'top', margin: [4, 6, 4, 6] } },
          { text: items('Completed'),  options: { color: '81C784', fontSize: chunkFontSize, valign: 'top', margin: [4, 6, 4, 6] } },
          { text: leaveTxt,            options: { color: 'CE93D8', fontSize: chunkFontSize, align: 'center', valign: 'middle' } },
        ]);
      }

      s.addTable(rows, {
        x: 0.3, y: 0.95, w: 12.7,
        colW: [2.2, 3.6, 3.6, 2.5, 0.8],
        border: { type: 'solid', color: TBL_BDR, pt: 0.5 },
        rowH: [0.38, ...chunk.map(() => chunkRowH)],
        fontSize: chunkFontSize
      });
    });
  }

  /* ── Squad Composition slide ───────────────────────────────────── */

  private squadSlide(pptx: any, sprint: Sprint, squads: Squad[], sprintMembers: MemberSprintCard[]) {
    // Map teamMemberId → MemberSprintCard for sprint-presence lookup
    const memberMap = new Map(sprintMembers.map(m => [m.teamMemberId, m]));

    type Section = { name: string; color: string; members: MemberSprintCard[] };
    const sections: Section[] = [];
    const assigned = new Set<string>();

    for (const sq of squads) {
      const present = sq.members
        .map(sm => memberMap.get(sm.teamMemberId))
        .filter((m): m is MemberSprintCard => !!m && !assigned.has(m.teamMemberId));
      if (!present.length) continue;
      present.forEach(m => assigned.add(m.teamMemberId));
      sections.push({ name: sq.name, color: (sq.color ?? GREEN_DRK).replace(/^#/, ''), members: present });
    }

    const unassigned = sprintMembers.filter(m => !assigned.has(m.teamMemberId));
    if (unassigned.length) sections.push({ name: 'Unassigned', color: '5A6A7A', members: unassigned });
    if (!sections.length) return;

    const s = pptx.addSlide();
    s.background = { color: SLIDE_BG };

    s.addText('Team Composition', {
      x: 0, y: 0, w: '100%', h: 0.85,
      fill: { color: NAVY }, color: WHITE, fontSize: 20, bold: true,
      align: 'left', valign: 'middle', margin: [0, 0, 0, 18]
    });
    s.addText(sprint.name, {
      x: 0, y: 0, w: '100%', h: 0.85,
      color: MGRAY, fontSize: 13, align: 'right', valign: 'middle', margin: [0, 18, 0, 0]
    });

    const CX = 0.3, CY = 1.05, CW = 12.73, CH = 6.3, GAP = 0.2;
    const numCols = sections.length === 1 ? 1 : sections.length <= 4 ? 2 : 3;
    const numRows = Math.ceil(sections.length / numCols);
    const cardW = (CW - GAP * (numCols - 1)) / numCols;
    const cardH = (CH - GAP * (numRows - 1)) / numRows;

    // Person avatar + name stacks
    const PERSONS_PER_ROW = 4;
    const AVATAR_D = 0.48;
    const HEADER_H = 0.52;
    const PERSON_ROW_H = AVATAR_D + 0.52;

    sections.forEach((sec, idx) => {
      const col = idx % numCols;
      const row = Math.floor(idx / numCols);
      const cx = CX + col * (cardW + GAP);
      const cy = CY + row * (cardH + GAP);

      // Card background
      s.addShape(pptx.ShapeType.rect, {
        x: cx, y: cy, w: cardW, h: cardH,
        fill: { color: CARD_BG }, line: { color: TBL_BDR, width: 0.75 }
      });
      // Colored top accent strip
      s.addShape(pptx.ShapeType.rect, {
        x: cx, y: cy, w: cardW, h: 0.08,
        fill: { color: sec.color }, line: { width: 0 }
      });
      // Color dot + squad name + count
      s.addShape(pptx.ShapeType.ellipse, {
        x: cx + 0.14, y: cy + 0.15, w: 0.15, h: 0.15,
        fill: { color: sec.color }, line: { width: 0 }
      });
      s.addText(`${sec.name}`, {
        x: cx + 0.35, y: cy + 0.10, w: cardW - 0.9, h: 0.28,
        color: WHITE, fontSize: 10, bold: true, valign: 'middle'
      });
      // Member count badge
      s.addShape(pptx.ShapeType.rect, {
        x: cx + cardW - 0.42, y: cy + 0.13, w: 0.3, h: 0.2,
        fill: { color: sec.color }, line: { width: 0 }, rectRadius: 0.04
      });
      s.addText(`${sec.members.length}`, {
        x: cx + cardW - 0.42, y: cy + 0.13, w: 0.3, h: 0.2,
        color: WHITE, fontSize: 7.5, bold: true, align: 'center', valign: 'middle'
      });

      const personW = cardW / PERSONS_PER_ROW;
      const personsStartY = cy + HEADER_H;

      sec.members.forEach((m, pi) => {
        const pc = pi % PERSONS_PER_ROW;
        const pr = Math.floor(pi / PERSONS_PER_ROW);
        const px = cx + pc * personW + (personW - AVATAR_D) / 2;
        const py = personsStartY + pr * PERSON_ROW_H;

        if (py + PERSON_ROW_H > cy + cardH - 0.05) return; // clip overflow

        // Avatar circle with squad color
        s.addShape(pptx.ShapeType.ellipse, {
          x: px, y: py, w: AVATAR_D, h: AVATAR_D,
          fill: { color: sec.color }, line: { width: 0 }
        });
        // Initials
        const initials = m.fullName.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
        s.addText(initials, {
          x: px, y: py, w: AVATAR_D, h: AVATAR_D,
          color: WHITE, fontSize: 11, bold: true, align: 'center', valign: 'middle'
        });
        // First name
        const firstName = m.fullName.split(' ')[0];
        s.addText(firstName, {
          x: cx + pc * personW, y: py + AVATAR_D + 0.03, w: personW, h: 0.2,
          color: WHITE, fontSize: 7.5, align: 'center', valign: 'top'
        });
        // Other-squad indicator
        const otherSquads = (m.squadNames ?? []).filter(sn => sn !== sec.name);
        if (otherSquads.length) {
          s.addText('+' + otherSquads.join(', '), {
            x: cx + pc * personW, y: py + AVATAR_D + 0.23, w: personW, h: 0.18,
            color: MGRAY, fontSize: 5.5, italic: true, align: 'center', valign: 'top'
          });
        }
      });
    });
  }

  /* ── Helpers ────────────────────────────────────────────────────── */

  private fmt(d: string): string {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private craftLabel(craft: string): string {
    const map: Record<string, string> = {
      DevBE: 'Dev BE', DevFE: 'Dev FE', DevIOS: 'iOS', DevAndroid: 'Android',
      Dev: 'Developer', Analysis: 'Analyst', Design: 'Designer', QA: 'QA',
    };
    return map[craft] ?? craft;
  }
}
