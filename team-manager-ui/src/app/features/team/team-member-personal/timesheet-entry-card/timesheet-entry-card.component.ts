import { Component, input, output, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { TimesheetEntry, CreateTimesheetEntryRequest } from '../../../../core/models/timesheet.model';
import {
  ActivityCombo, ACTIVITY_COMBOS, DURATION_CHIPS, DURATION_CHIP_MINUTES,
  minutesToDurationLabel,
} from '../timesheet-data.constants';
import { TimesheetDefaultsService } from '../../../../core/services/timesheet-defaults.service';

const DEFAULT_LOC_ICONS: Record<string, string> = {
  'Home': 'home', 'Client': 'store', 'Other': 'location_on',
};

const LOCATIONS = ['Home', 'Client', 'Other'];

// ── Delete Confirm Dialog ─────────────────────────────────────────────────────

@Component({
  selector: 'app-ts-delete-confirm',
  standalone: true,
  imports: [MatDialogModule],
  styles: [`
    :host { display: block; }
    .wrap { padding: 24px 24px 20px; }
    .title { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
    .sub { font-size: 13px; color: rgba(255,255,255,0.45); margin-bottom: 22px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px; }
    .actions { display: flex; gap: 8px; justify-content: flex-end; }
    .btn-cancel { padding: 8px 16px; background: none; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: rgba(255,255,255,0.55); font-size: 12px; cursor: pointer; font-family: inherit; }
    .btn-cancel:hover { color: rgba(255,255,255,0.85); }
    .btn-del { padding: 8px 16px; background: #ef5350; border: none; border-radius: 6px; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
    .btn-del:hover { background: #e53935; }
  `],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="wrap">
      <div class="title">Delete entry?</div>
      <div class="sub">{{ data.category }} · {{ data.project }}</div>
      <div class="actions">
        <button class="btn-cancel" mat-dialog-close>Cancel</button>
        <button class="btn-del" (click)="dialogRef.close(true)">Delete</button>
      </div>
    </div>
  `
})
export class TsDeleteConfirmComponent {
  data: TimesheetEntry = inject(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef<TsDeleteConfirmComponent>);
}

// ── Edit Entry Dialog ─────────────────────────────────────────────────────────

@Component({
  selector: 'app-ts-edit-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatIconModule],
  styles: [`
    :host { display: block; }
    .wrap { padding: 20px 20px 16px; display: flex; flex-direction: column; gap: 14px; min-width: min(340px, 90vw); }
    .ef-lbl { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.32); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 5px; }
    .chips { display: flex; gap: 5px; flex-wrap: wrap; }
    .c-chip { padding: 4px 10px; border-radius: 16px; font-size: 12px; font-weight: 500; border: 1px solid rgba(255,255,255,0.09); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.5); cursor: pointer; transition: all 0.1s; }
    .c-chip:hover { border-color: rgba(255,255,255,0.18); color: rgba(255,255,255,0.85); }
    .c-chip.sel { border-color: rgba(100,181,246,0.7); background: rgba(100,181,246,0.1); color: rgba(255,255,255,0.9); }
    .d-chip { padding: 4px 9px; border-radius: 5px; font-size: 12px; font-weight: 600; border: 1px solid rgba(255,255,255,0.09); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.5); cursor: pointer; transition: all 0.1s; display: flex; align-items: center; gap: 5px; }
    .d-chip:hover { border-color: rgba(255,255,255,0.18); }
    .d-chip.sel { border-color: rgba(100,181,246,0.7); background: rgba(100,181,246,0.1); color: #64b5f6; }
    .e-sel { flex: 1; min-width: 110px; padding: 7px 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: inherit; font-size: 12px; font-family: inherit; outline: none; cursor: pointer; appearance: none; }
    .e-sel:focus { border-color: rgba(100,181,246,0.7); }
    .e-sel option { background: #1a1c2a; }
    .e-sel:disabled { opacity: 0.4; cursor: not-allowed; }
    .e-inp { flex: 1; padding: 7px 10px; background: rgba(255,255,255,0.04); min-width: 100px; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: inherit; font-size: 12px; font-family: inherit; outline: none; }
    .e-inp:focus { border-color: rgba(100,181,246,0.7); }
    .e-inp::placeholder { color: rgba(255,255,255,0.22); }
    .ea { display: flex; align-items: center; gap: 6px; justify-content: flex-end; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.07); }
    .save-btn { padding: 6px 16px; background: #64b5f6; border: none; border-radius: 5px; color: #0f1923; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit; }
    .save-btn:hover { background: #90caf9; }
    .cnl-btn { padding: 6px 12px; background: none; border: 1px solid rgba(255,255,255,0.12); border-radius: 5px; color: rgba(255,255,255,0.5); font-size: 12px; cursor: pointer; font-family: inherit; }
    .cnl-btn:hover { color: rgba(255,255,255,0.85); }
    .del { width: 26px; height: 26px; border: none; background: none; border-radius: 5px; flex-shrink: 0; cursor: pointer; color: rgba(255,255,255,0.4); display: flex; align-items: center; justify-content: center; transition: all 0.12s; padding: 0; margin-right: auto; }
    .del:hover { background: rgba(239,83,80,0.1); color: #ef5350; }
    .confirm-lbl { font-size: 11px; color: rgba(255,255,255,0.55); white-space: nowrap; margin-right: auto; }
    .confirm-yes { padding: 3px 10px; background: #ef5350; border: none; border-radius: 4px; color: #fff; font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit; }
    .confirm-yes:hover { background: #e53935; }
    .confirm-no { padding: 3px 8px; background: none; border: 1px solid rgba(255,255,255,0.15); border-radius: 4px; color: rgba(255,255,255,0.5); font-size: 11px; cursor: pointer; font-family: inherit; }
    .confirm-no:hover { color: rgba(255,255,255,0.85); }
  `],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="wrap">
      <div>
        <div class="ef-lbl">Activity</div>
        <div class="chips">
          @for (c of combos; track c.label) {
            <button class="c-chip" [class.sel]="eProject() === c.project && eCategory() === c.category" (click)="applyCombo(c)">{{ c.label }}</button>
          }
        </div>
      </div>
      <div>
        <div class="ef-lbl">Duration</div>
        <div class="chips">
          @for (d of durChips; track d) {
            <button class="d-chip" [class.sel]="eDurMins() === chipMins[d]" (click)="eDurMins.set(chipMins[d])">{{ d }}</button>
          }
        </div>
      </div>
      <div>
        <div class="ef-lbl">Location</div>
        <div class="chips">
          @for (loc of locs; track loc) {
            <button class="d-chip" [class.sel]="eWorkedFrom() === loc" (click)="eWorkedFrom.set(loc)">
              <mat-icon style="font-size:14px;width:14px;height:14px;line-height:14px">{{ DEFAULT_LOC_ICONS[loc] ?? 'location_on' }}</mat-icon>{{ loc }}
            </button>
          }
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <select class="e-sel" [ngModel]="eProject()" (ngModelChange)="setProject($event)">
          <option value="">Project…</option>
          @for (p of projects; track p) { <option [value]="p">{{ p }}</option> }
        </select>
        <select class="e-sel" [ngModel]="eCategory()" (ngModelChange)="eCategory.set($event)" [disabled]="!eProject()">
          <option value="">Category…</option>
          @for (c of editCats(); track c) { <option [value]="c">{{ c }}</option> }
        </select>
        <input class="e-inp" placeholder="Note (optional)"
          [ngModel]="eNote()" (ngModelChange)="eNote.set($event)"
          (keydown.enter)="save()" (keydown.escape)="dialogRef.close()" />
      </div>
      <div class="ea">
        @if (confirming()) {
          <span class="confirm-lbl">Delete?</span>
          <button class="confirm-yes" (click)="dialogRef.close({ deleted: true })">Delete</button>
          <button class="confirm-no" (click)="confirming.set(false)">Cancel</button>
        } @else {
          <button class="del" (click)="confirming.set(true)" title="Delete">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 4h10M5 4V2h4v2M6 7v3M8 7v3M3 4l1 8h6l1-8"/></svg>
          </button>
          <button class="cnl-btn" (click)="dialogRef.close()">Cancel</button>
          <button class="save-btn" (click)="save()">Save</button>
        }
      </div>
    </div>
  `
})
export class TsEditDialogComponent implements OnInit {
  data: TimesheetEntry = inject(MAT_DIALOG_DATA);
  dialogRef = inject(MatDialogRef<TsEditDialogComponent>);
  private tsd = inject(TimesheetDefaultsService);

  confirming = signal(false);
  eProject = signal('');
  eCategory = signal('');
  eDurMins = signal(60);
  eNote = signal('');
  eWorkedFrom = signal('Home');

  readonly combos = ACTIVITY_COMBOS;
  readonly durChips = DURATION_CHIPS;
  readonly chipMins = DURATION_CHIP_MINUTES;
  get projects() { return this.tsd.projects(); }
  readonly locs = LOCATIONS;

  editCats = computed(() => this.tsd.categoriesFor(this.eProject()));

  ngOnInit() {
    const e = this.data;
    this.eProject.set(e.project);
    this.eCategory.set(e.category);
    this.eDurMins.set(e.hours * 60 + e.minutes);
    this.eNote.set(e.description ?? '');
    this.eWorkedFrom.set(e.workedFrom || 'Home');
  }

  readonly DEFAULT_LOC_ICONS = DEFAULT_LOC_ICONS;

  applyCombo(c: ActivityCombo) { this.eProject.set(c.project); this.eCategory.set(c.category); }
  setProject(p: string) { this.eProject.set(p); this.eCategory.set(''); }

  save() {
    if (!this.eProject() || !this.eCategory()) return;
    const e = this.data;
    const totalMins = this.eDurMins();
    const req: CreateTimesheetEntryRequest = {
      date: e.date, project: this.eProject(), category: this.eCategory(),
      hours: Math.floor(totalMins / 60), minutes: totalMins % 60,
      billable: e.billable, workedFrom: this.eWorkedFrom(), sentiment: e.sentiment,
      description: this.eNote() || null, ticketNumber: e.ticketNumber,
    };
    this.dialogRef.close({ req });
  }
}

// ── Entry Card ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-timesheet-entry-card',
  standalone: true,
  imports: [FormsModule, MatTooltipModule, MatIconModule],
  styles: [`
    .card {
      display:flex; align-items:center; gap:10px; padding:11px 14px; border-radius:10px;
      background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07);
      cursor:pointer; transition:border-color 0.15s; animation:fadeIn 0.18s ease;
    }
    @keyframes fadeIn { from { opacity:0; transform:translateY(3px); } to { opacity:1; transform:translateY(0); } }
    .card:hover { border-color:rgba(255,255,255,0.13); }
    .card.sync-pending { box-shadow:inset 3px 0 0 rgba(255,167,38,0.65); }
    .card.sync-failed, .card.sync-unsynced { box-shadow:inset 3px 0 0 rgba(239,83,80,0.75); }
    .sync-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
    .sync-dot.is-pending { background:#ffa726; }
    .sync-dot.is-failed, .sync-dot.is-unsynced { background:#ef5350; }
    .pill { font-size:11px; font-weight:700; padding:2px 8px; border-radius:20px; flex-shrink:0; text-transform:uppercase; letter-spacing:0.03em; }
    .info { flex:1; min-width:0; }
    .info-title { font-size:13px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .info-sub { font-size:11px; color:rgba(255,255,255,0.32); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .loc-row { display:flex; align-items:center; gap:2px; flex-shrink:0; }
    .lb {
      width:26px; height:24px; display:flex; align-items:center; justify-content:center;
      border-radius:5px; border:1px solid transparent; background:none;
      cursor:pointer; color:rgba(255,255,255,0.22); transition:all 0.1s; padding:0;
      overflow:hidden; flex-shrink:0;
    }
    .lb mat-icon { font-size:14px; width:14px; height:14px; line-height:14px; overflow:visible; flex-shrink:0; }
    .lb:hover { color:rgba(255,255,255,0.7); background:rgba(255,255,255,0.06); }
    .lb.loc-active { color:#64b5f6; background:rgba(100,181,246,0.12); border-color:rgba(100,181,246,0.4); }
    .nudge { display:flex; align-items:center; flex-shrink:0; }
    .nb {
      width:22px; height:24px; display:flex; align-items:center; justify-content:center;
      background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
      cursor:pointer; color:rgba(255,255,255,0.45); font-size:13px; font-weight:600; line-height:1; transition:all 0.1s; padding:0;
    }
    .nb:first-child { border-radius:4px 0 0 4px; border-right:none; }
    .nb:last-child { border-radius:0 4px 4px 0; border-left:none; }
    .nb:hover { background:rgba(100,181,246,0.12); color:#64b5f6; border-color:rgba(100,181,246,0.5); z-index:1; }
    .nd {
      font-size:12px; font-weight:600; min-width:38px; text-align:center; padding:0 3px;
      background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);
      height:24px; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.7);
    }
    .del {
      width:26px; height:26px; border:none; background:none; border-radius:5px; flex-shrink:0;
      cursor:pointer; color:rgba(255,255,255,0.25); display:flex; align-items:center; justify-content:center;
      transition:all 0.12s; padding:0;
    }
    .del:hover { background:rgba(239,83,80,0.1); color:#ef5350; }
    .ctrls { display:flex; align-items:center; gap:8px; flex-shrink:0; }
    .m-r1 { display:none; }
    .m-r2 { display:none; }
    .m-r3 { display:none; }
    .m-r4 { display:none; }
    @media (max-width:640px) {
      .card { flex-direction:column; align-items:stretch; gap:8px; }
      .pill { display:none; }
      .info { display:none; }
      .ctrls { display:none; }
      .del { display:none; }
      .m-r1 { display:flex; align-items:center; justify-content:space-between; }
      .m-r1 .m-del { width:36px; height:36px; border:none; background:rgba(255,255,255,0.04); border-radius:7px; cursor:pointer; color:rgba(255,255,255,0.4); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
      .m-r1 .m-del:hover { background:rgba(239,83,80,0.12); color:#ef5350; }
      .m-r2 { display:flex; align-items:center; justify-content:space-between; font-size:14px; font-weight:500; }
      .m-r2 .m-del { width:36px; height:36px; border:none; background:rgba(255,255,255,0.04); border-radius:7px; cursor:pointer; color:rgba(255,255,255,0.4); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
      .m-r2 .m-del:hover { background:rgba(239,83,80,0.12); color:#ef5350; }
      .m-r3 { display:block; font-size:12px; color:rgba(255,255,255,0.45); }
      .m-r4 { display:flex; align-items:center; justify-content:space-between; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="card" [class.sync-pending]="syncStatus() === 'pending'" [class.sync-failed]="syncStatus() === 'failed'" [class.sync-unsynced]="syncStatus() === 'unsynced'" (click)="openEdit()">

      <!-- ── DESKTOP layout (hidden on mobile) ── -->
      @if (syncStatus()) {
        <span class="sync-dot"
          [class.is-pending]="syncStatus() === 'pending'"
          [class.is-failed]="syncStatus() === 'failed'"
          [class.is-unsynced]="syncStatus() === 'unsynced'"
          [matTooltip]="syncStatus() === 'pending' ? 'Sync pending' : syncStatus() === 'failed' ? 'Sync failed' : 'Not yet synced'"
          matTooltipPosition="above"></span>
      }
      <span class="pill" [style.background]="combo().bg" [style.color]="combo().color">{{ combo().label }}</span>
      <div class="info">
        <div class="info-title">{{ entry().category }}</div>
        <div class="info-sub">{{ entry().project }}</div>
        @if (entry().description) {
          <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:2px;white-space:pre-line;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;">{{ entry().description }}</div>
        }
      </div>
      <div class="ctrls" (click)="$event.stopPropagation()">
        <div class="loc-row">
          @for (loc of locs(); track loc) {
            <button class="lb" [class.loc-active]="entry().workedFrom === loc" [matTooltip]="loc" matTooltipPosition="above" (click)="switchLocation(loc)"><mat-icon>{{ locIcon(loc) }}</mat-icon></button>
          }
        </div>
        <div class="nudge">
          <button class="nb" (click)="nudge(-15)">−</button>
          <span class="nd">{{ durLabel() }}</span>
          <button class="nb" (click)="nudge(15)">+</button>
        </div>
      </div>
      <button class="del" (click)="$event.stopPropagation(); openDeleteConfirm()">
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 4h10M5 4V2h4v2M6 7v3M8 7v3M3 4l1 8h6l1-8"/></svg>
      </button>

      <!-- ── MOBILE layout (hidden on desktop) ── -->
      <!-- Row 1: pill chip -->
      <div class="m-r1">
        <span class="pill" [style.background]="combo().bg" [style.color]="combo().color">{{ combo().label }}</span>
      </div>
      <!-- Row 2: category + delete -->
      <div class="m-r2">
        <span>{{ entry().category }}</span>
        <button class="m-del" (click)="$event.stopPropagation(); openDeleteConfirm()">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 4h10M5 4V2h4v2M6 7v3M8 7v3M3 4l1 8h6l1-8"/></svg>
        </button>
      </div>
      <!-- Row 3: note -->
      @if (entry().description) { <span class="m-r3">{{ entry().description }}</span> }
      <!-- Row 4: time + location -->
      <div class="m-r4" (click)="$event.stopPropagation()">
        <div class="nudge">
          <button class="nb" (click)="nudge(-15)">−</button>
          <span class="nd">{{ durLabel() }}</span>
          <button class="nb" (click)="nudge(15)">+</button>
        </div>
        <div class="loc-row">
          @for (loc of locs(); track loc) {
            <button class="lb" [class.loc-active]="entry().workedFrom === loc" [matTooltip]="loc" matTooltipPosition="above" (click)="switchLocation(loc)"><mat-icon>{{ locIcon(loc) }}</mat-icon></button>
          }
        </div>
      </div>

    </div>
  `
})
export class TimesheetEntryCardComponent {
  private dialog = inject(MatDialog);

  entry = input.required<TimesheetEntry>();
  syncStatus = input<'pending' | 'failed' | 'unsynced' | null>(null);
  locations = input<string[]>(LOCATIONS);
  locationIcons = input<Record<string, string>>({});
  edit = output<TimesheetEntry>();
  saved = output<{ id: string; req: CreateTimesheetEntryRequest }>();
  deleted = output<string>();

  readonly locs = computed(() => this.locations());

  locIcon(loc: string): string {
    return this.locationIcons()[loc] ?? DEFAULT_LOC_ICONS[loc] ?? 'location_on';
  }

  combo = computed<ActivityCombo>(() => {
    const e = this.entry();
    return ACTIVITY_COMBOS.find(a => a.project === e.project && a.category === e.category)
      ?? { label: e.category.slice(0, 7), project: '', category: '', color: 'rgba(255,255,255,0.5)', bg: 'rgba(255,255,255,0.08)' };
  });

  durLabel = computed(() => minutesToDurationLabel(this.entry().hours * 60 + this.entry().minutes));

  openEdit() {
    this.edit.emit(this.entry());
  }

  openDeleteConfirm() {
    const ref = this.dialog.open(TsDeleteConfirmComponent, { data: this.entry() });
    ref.afterClosed().subscribe((confirmed?: boolean) => {
      if (confirmed) this.deleted.emit(this.entry().id);
    });
  }

  nudge(delta: number) {
    const curr = this.entry().hours * 60 + this.entry().minutes;
    const next = Math.min(720, Math.max(15, curr + delta));
    this.saved.emit({ id: this.entry().id, req: this.buildReq(this.entry().project, this.entry().category, next, this.entry().description, this.entry().workedFrom) });
  }

  switchLocation(loc: string) {
    if (this.entry().workedFrom === loc) return;
    this.saved.emit({ id: this.entry().id, req: this.buildReq(this.entry().project, this.entry().category, this.entry().hours * 60 + this.entry().minutes, this.entry().description, loc) });
  }

  private buildReq(project: string, category: string, totalMins: number, description: string | null | undefined, workedFrom: string): CreateTimesheetEntryRequest {
    const e = this.entry();
    return { date: e.date, project, category, hours: Math.floor(totalMins / 60), minutes: totalMins % 60, billable: e.billable, workedFrom, sentiment: e.sentiment, description: description ?? null, ticketNumber: e.ticketNumber };
  }
}
