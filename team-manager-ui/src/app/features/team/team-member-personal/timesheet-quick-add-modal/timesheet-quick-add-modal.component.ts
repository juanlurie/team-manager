import { Component, AfterViewInit, ViewChild, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { QuickActionConfig } from '../../../../core/models/timesheet-config.model';
import { CreateTimesheetEntryRequest } from '../../../../core/models/timesheet.model';

export interface QuickAddData {
  date: string;
  dateLabel: string;
  allCatMap: Record<string, string[]>;
  activeQuickActions: QuickActionConfig[];
  defaultWorkedFrom: string;
  billableProjects: string[];
  prefill: { project?: string; category?: string; note?: string; durationMins?: number } | null;
  editEntryId?: string;
  workLocationOptions?: string[];
  locationIcons?: Record<string, string>;
}

interface CatResult { project: string; category: string; }

@Component({
  selector: 'app-timesheet-quick-add-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  styles: [`
    .modal { display:flex; flex-direction:column; outline:none; }
    .hdr { display:flex; align-items:center; gap:8px; padding:16px 20px 12px; border-bottom:1px solid rgba(255,255,255,0.07); }
    .hdr-title { font-size:15px; font-weight:700; flex:1; }
    .hdr-date { font-size:12px; color:rgba(255,255,255,0.4); }
    .hdr-close { background:none; border:none; color:rgba(255,255,255,0.3); cursor:pointer; font-size:22px; line-height:1; padding:2px 6px; }
    .hdr-close:hover { color:rgba(255,255,255,0.85); }
    .body { padding:14px 20px; display:flex; flex-direction:column; gap:12px; }
    .chips { display:flex; gap:5px; flex-wrap:wrap; }
    .chip { padding:4px 12px; border-radius:14px; font-size:11px; font-weight:600; border:1px solid; background:transparent; cursor:pointer; transition:opacity 0.1s; opacity:0.55; }
    .chip:hover, .chip.sel { opacity:1; }
    .inp { width:100%; padding:9px 11px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); border-radius:7px; color:inherit; font-size:13px; font-family:inherit; outline:none; box-sizing:border-box; }
    .inp:focus { border-color:rgba(100,181,246,0.7); }
    .inp::placeholder { color:rgba(255,255,255,0.2); }
    .inp:disabled { opacity:0.3; cursor:not-allowed; }
    .drop { border:1px solid rgba(100,181,246,0.3); border-top:none; border-radius:0 0 7px 7px; overflow-y:auto; max-height:200px; background:#16192a; }
    .drop::-webkit-scrollbar { width:3px; }
    .drop::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
    .drop-opt { display:flex; justify-content:space-between; align-items:baseline; gap:8px; padding:8px 13px; cursor:pointer; border-bottom:1px solid rgba(255,255,255,0.04); }
    .drop-opt:last-child { border-bottom:none; }
    .drop-opt:hover, .drop-opt.hi { background:rgba(100,181,246,0.12); }
    .opt-cat { font-size:13px; font-weight:500; color:rgba(255,255,255,0.88); }
    .opt-proj { font-size:11px; color:rgba(255,255,255,0.3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:240px; }
    .cat-tag { display:inline-flex; align-items:center; gap:6px; padding:4px 10px 4px 12px; background:rgba(100,181,246,0.1); border:1px solid rgba(100,181,246,0.3); border-radius:14px; font-size:12px; }
    .cat-tag-proj { color:rgba(255,255,255,0.32); font-size:11px; }
    .cat-tag-x { background:none; border:none; color:rgba(255,255,255,0.35); cursor:pointer; font-size:16px; line-height:1; padding:0 0 0 4px; }
    .cat-tag-x:hover { color:rgba(255,255,255,0.85); }
    .note-ta { resize:none; min-height:72px; line-height:1.6; font-size:13px; }
    .time-row { display:flex; align-items:center; gap:6px; }
    .t-btn { padding:6px 11px; border-radius:6px; font-size:12px; font-weight:600; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.03); color:rgba(255,255,255,0.5); cursor:pointer; transition:all 0.1s; flex-shrink:0; }
    .t-btn:hover { border-color:rgba(255,255,255,0.25); color:rgba(255,255,255,0.85); }
    .t-btn.hi { border-color:rgba(100,181,246,0.4); color:#64b5f6; background:rgba(100,181,246,0.07); }
    .t-btn.hi:hover { background:rgba(100,181,246,0.2); border-color:#64b5f6; }
    .t-val { font-size:16px; font-weight:700; min-width:72px; text-align:center; }
    .t-hint { font-size:10px; color:rgba(255,255,255,0.18); margin-left:auto; }
    .footer { display:flex; align-items:center; justify-content:space-between; padding:12px 20px 16px; border-top:1px solid rgba(255,255,255,0.07); }
    .f-hint { font-size:11px; color:rgba(255,255,255,0.2); }
    kbd { display:inline-block; padding:1px 5px; border:1px solid rgba(255,255,255,0.2); border-radius:3px; font-size:10px; color:rgba(255,255,255,0.35); font-family:inherit; }
    .add-btn { padding:9px 24px; background:#64b5f6; border:none; border-radius:7px; color:#0f1923; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; transition:all 0.12s; }
    .add-btn:hover { background:#90caf9; }
    .add-btn:disabled { opacity:0.35; cursor:not-allowed; }
    .star-btn { background:none; border:1px solid rgba(255,255,255,0.15); border-radius:6px; color:rgba(255,255,255,0.3); font-size:16px; width:34px; height:34px; cursor:pointer; transition:all 0.15s; line-height:1; padding:0; display:flex; align-items:center; justify-content:center; }
    .star-btn:hover { border-color:rgba(255,200,0,0.5); color:rgba(255,200,0,0.7); }
    .star-btn.starred { border-color:rgba(255,200,0,0.6); color:#ffc800; background:rgba(255,200,0,0.08); }
    .loc-row { display:flex; gap:5px; flex-wrap:wrap; }
    .loc-chip { display:flex; align-items:center; gap:4px; padding:5px 10px; border-radius:14px; font-size:11px; font-weight:600; border:1px solid rgba(255,255,255,0.12); background:transparent; color:rgba(255,255,255,0.45); cursor:pointer; transition:all 0.1s; font-family:inherit; }
    .loc-chip:hover { border-color:rgba(255,255,255,0.25); color:rgba(255,255,255,0.85); }
    .loc-chip.sel { border-color:rgba(100,181,246,0.5); color:#64b5f6; background:rgba(100,181,246,0.09); }
    .loc-icon { font-size:13px !important; width:13px !important; height:13px !important; line-height:13px !important; }
  `],
  template: `
    <div class="modal" (keydown)="onModalKey($event)" tabindex="-1">
      <div class="hdr">
        <span class="hdr-title">{{ data.editEntryId ? 'Edit Entry' : 'Quick Log' }}</span>
        <span class="hdr-date">{{ data.dateLabel }}</span>
        <button class="hdr-close" (click)="ref.close(null)">×</button>
      </div>
      <div class="body">
        @if (data.activeQuickActions.length > 0) {
          <div class="chips">
            @for (qa of data.activeQuickActions; track qa.label) {
              <button class="chip" [class.sel]="project()===qa.project&&category()===qa.category"
                      [style.border-color]="qa.color" [style.color]="qa.color"
                      (click)="applyQuickAction(qa)">{{ qa.label }}</button>
            }
          </div>
        }

        <div>
          <input #catInput class="inp" placeholder="Search category…" autocomplete="off"
                 [ngModel]="catSearch()" (ngModelChange)="onCatSearch($event)"
                 (keydown)="onCatKey($event)" />
          @if (catResults().length > 0 && !project()) {
            <div class="drop">
              @for (r of catResults(); track r.project+r.category; let i = $index) {
                <div class="drop-opt" [class.hi]="highlightIdx()===i" (mousedown)="selectCat(r)">
                  <span class="opt-cat">{{ r.category }}</span>
                  <span class="opt-proj">{{ r.project }}</span>
                </div>
              }
            </div>
          }
          @if (project() && category()) {
            <div style="margin-top:6px">
              <div class="cat-tag">
                <span>{{ category() }}</span>
                <span class="cat-tag-proj">{{ project() }}</span>
                <button class="cat-tag-x" (mousedown)="clearCat()">×</button>
              </div>
            </div>
          }
        </div>

        <textarea #noteArea class="inp note-ta"
                  placeholder="Notes…"
                  [ngModel]="note()" (ngModelChange)="note.set($event)"
                  (keydown)="onNoteKey($event)"
                  [disabled]="!project()"
                  rows="3"></textarea>

        <div class="time-row">
          <button class="t-btn" (click)="adjustDur(-60)">−1h</button>
          <button class="t-btn hi" (click)="adjustDur(-30)">−30m</button>
          <span class="t-val">{{ fmtDur() }}</span>
          <button class="t-btn hi" (click)="adjustDur(30)">+30m</button>
          <button class="t-btn" (click)="adjustDur(60)">+1h</button>
        </div>

        <div class="loc-row">
          @for (loc of locationOptions(); track loc) {
            <button class="loc-chip" [class.sel]="workedFrom() === loc" (click)="workedFrom.set(loc)" type="button">
              <mat-icon class="loc-icon">{{ locIcon(loc) }}</mat-icon>
              {{ loc }}
            </button>
          }
        </div>
      </div>
      <div class="footer">
        <span class="f-hint"><kbd>Esc</kbd> cancel &nbsp;·&nbsp; <kbd>⇧↵</kbd> add + next &nbsp;·&nbsp; <kbd>⌘↵</kbd> add</span>
        <div style="display:flex;gap:8px;align-items:center">
          @if (project() && category()) {
            <button class="star-btn" [class.starred]="isQuickAction()" [title]="isQuickAction() ? 'Saved as quick action' : 'Save as quick action'" (click)="toggleQuickAction()">★</button>
          }
          <button class="add-btn" [disabled]="!canAdd()" (click)="submit()">{{ data.editEntryId ? 'Update Entry' : 'Add Entry' }}</button>
        </div>
      </div>
    </div>
  `
})
export class TimesheetQuickAddModalComponent implements AfterViewInit {
  @ViewChild('catInput') catInput?: ElementRef<HTMLInputElement>;
  @ViewChild('noteArea') noteArea?: ElementRef<HTMLTextAreaElement>;

  ref = inject<MatDialogRef<TimesheetQuickAddModalComponent, CreateTimesheetEntryRequest | null>>(MatDialogRef);
  data = inject<QuickAddData>(MAT_DIALOG_DATA);

  private static readonly DEFAULT_LOC_ICONS: Record<string, string> = {
    Home: 'home', Client: 'store', Other: 'location_on',
  };

  catSearch = signal('');
  highlightIdx = signal(0);
  project = signal('');
  category = signal('');
  note = signal('');
  durMins = signal(60);
  workedFrom = signal(this.data.defaultWorkedFrom || 'Home');

  locationOptions = computed(() =>
    this.data.workLocationOptions?.length
      ? this.data.workLocationOptions
      : ['Home', 'Client', 'Other']
  );

  locIcon(loc: string): string {
    return (this.data.locationIcons ?? {})[loc]
      ?? TimesheetQuickAddModalComponent.DEFAULT_LOC_ICONS[loc]
      ?? 'location_on';
  }

  catResults = computed<CatResult[]>(() => {
    const q = this.catSearch().trim().toLowerCase();
    if (!q) return [];
    const results: CatResult[] = [];
    for (const [proj, cats] of Object.entries(this.data.allCatMap)) {
      for (const cat of cats) {
        if (cat.toLowerCase().includes(q) || proj.toLowerCase().includes(q)) {
          results.push({ project: proj, category: cat });
          if (results.length >= 7) return results;
        }
      }
    }
    return results;
  });

  canAdd = computed(() => !!this.project() && !!this.category() && !!this.note().trim());

  fmtDur = computed(() => {
    const h = Math.floor(this.durMins() / 60);
    const m = this.durMins() % 60;
    if (h && m) return `${h}h ${m}m`;
    if (h) return `${h}h`;
    return `${m}m`;
  });

  private cleanNote(note: string | null | undefined): string {
    if (!note) return '';
    return note.split('\n').map(l => l.replace(/^-\s*/, '')).join('\n').trim();
  }

  ngAfterViewInit() {
    const p = this.data.prefill;
    if (p?.project) this.project.set(p.project);
    if (p?.category) { this.category.set(p.category); this.catSearch.set(p.category); }
    if (p?.note) this.note.set(this.cleanNote(p.note));
    if (p?.durationMins) this.durMins.set(p.durationMins);

    setTimeout(() => {
      if (this.project()) {
        this.focusNote();
      } else {
        this.catInput?.nativeElement.focus();
      }
    }, 50);
  }

  onCatSearch(val: string) {
    this.catSearch.set(val);
    this.highlightIdx.set(0);
    if (!val) { this.project.set(''); this.category.set(''); }
  }

  onCatKey(e: KeyboardEvent) {
    const results = this.catResults();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.highlightIdx.update(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.highlightIdx.update(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[this.highlightIdx()];
      if (r) { this.selectCat(r); }
      else if (this.project() && this.category()) { this.focusNote(); }
    } else if (e.key === 'Escape') {
      this.ref.close(null);
    }
  }

  selectCat(r: CatResult) {
    this.project.set(r.project);
    this.category.set(r.category);
    this.catSearch.set(r.category);
    this.focusNote();
  }

  clearCat() {
    this.project.set('');
    this.category.set('');
    this.catSearch.set('');
    setTimeout(() => this.catInput?.nativeElement.focus());
  }

  applyQuickAction(qa: QuickActionConfig) {
    this.project.set(qa.project);
    this.category.set(qa.category);
    this.catSearch.set(qa.category);
    if (qa.note) this.note.set(this.cleanNote(qa.note));
    if (qa.durationMins) this.durMins.set(qa.durationMins);
    this.focusNote();
  }

  onNoteKey(e: KeyboardEvent) {
    if (e.shiftKey && e.key === 'Enter') { e.preventDefault(); this.submitAndContinue(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); this.submit(); return; }
  }

  onModalKey(e: KeyboardEvent) {
    if (e.key === 'Escape') { this.ref.close(null); return; }
    if (e.shiftKey && e.key === 'Enter') { e.preventDefault(); this.submitAndContinue(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); this.submit(); return; }
    const inText = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
    if (!inText) {
      if (e.key === '+' || e.key === '=' || e.key === 'ArrowUp') { e.preventDefault(); this.durMins.update(m => m + 15); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); this.durMins.update(m => Math.max(15, m - 15)); return; }
    }
    if (e.ctrlKey && e.key === 'ArrowUp') { e.preventDefault(); this.durMins.update(m => m + 30); }
    if (e.ctrlKey && e.key === 'ArrowDown') { e.preventDefault(); this.durMins.update(m => Math.max(15, m - 30)); }
  }

  adjustDur(delta: number) { this.durMins.update(m => Math.max(15, m + delta)); }

  private buildEntry(): CreateTimesheetEntryRequest & { editEntryId?: string } {
    return {
      date: this.data.date,
      project: this.project(),
      category: this.category(),
      hours: Math.floor(this.durMins() / 60),
      minutes: this.durMins() % 60,
      billable: this.data.billableProjects.includes(this.project()),
      workedFrom: this.workedFrom(),
      sentiment: 'Neutral',
      description: this.note().trim() || null,
      ticketNumber: null,
      ...(this.data.editEntryId ? { editEntryId: this.data.editEntryId } : {}),
    };
  }

  submit() {
    if (!this.canAdd()) return;
    this.ref.close(this.buildEntry());
  }

  submitAndContinue() {
    if (!this.canAdd()) return;
    this.ref.close({ ...this.buildEntry(), addAnother: true } as any);
  }

  isQuickAction(): boolean {
    return this.data.activeQuickActions.some(q =>
      q.project === this.project() &&
      q.category === this.category() &&
      (q.note ?? '') === (this.note().trim())
    );
  }

  toggleQuickAction() {
    this.ref.close({ ...this.buildEntry(), saveAsQuickAction: !this.isQuickAction() } as any);
  }

  private focusNote() {
    setTimeout(() => {
      const ta = this.noteArea?.nativeElement;
      if (!ta) return;
      if (!this.note().trim()) this.note.set('- ');
      ta.focus();
      const len = ta.value.length;
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = len; });
    });
  }
}
