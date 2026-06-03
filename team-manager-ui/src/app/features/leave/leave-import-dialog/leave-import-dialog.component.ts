import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HttpContext } from '@angular/common/http';
import { LeaveService } from '../../../core/services/leave.service';
import { SKIP_ERROR_TOAST } from '../../../core/interceptors/error.interceptor';
import { LeaveRecord } from '../../../core/models/leave-record.model';
import { TeamMember } from '../../../core/models/team-member.model';

type RowStatus = 'new' | 'duplicate' | 'unmatched';

interface PreviewRow {
  name: string;
  type: string;
  start: string;
  end: string;
  days: string;
  status: RowStatus;
}

@Component({
  selector: 'app-leave-import-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatInputModule,
    MatFormFieldModule, MatIconModule, MatProgressSpinnerModule, MatTabsModule, MatExpansionModule,
    MatDatepickerModule, MatTooltipModule],
  template: `
    <h2 mat-dialog-title>Import Leave</h2>
    <mat-dialog-content style="width:700px;max-width:90vw">

      @if (step() === 'input') {
        <mat-tab-group [(selectedIndex)]="activeTab">

          <!-- TAB: Fetch from Entelect -->
          <mat-tab label="Fetch from Entelect">
            <div style="padding:16px 0">
              <mat-expansion-panel style="margin-bottom:16px;background:rgba(255,255,255,0.03)">
                <mat-expansion-panel-header>
                  <mat-panel-title style="font-size:0.875rem;opacity:0.7">
                    <mat-icon style="font-size:16px;width:16px;height:16px;margin-right:8px">help_outline</mat-icon>
                    How to get your session cookie
                  </mat-panel-title>
                </mat-expansion-panel-header>
                <ol style="font-size:0.8rem;opacity:0.7;line-height:1.8;margin:0;padding-left:20px">
                  <li>Log in to <strong>employee.entelect.co.za</strong> in your browser</li>
                  <li>Open DevTools → <strong>Application</strong> → <strong>Cookies</strong> → <code>employee.entelect.co.za</code></li>
                  <li>Find the <strong>.AspNet.Cookies</strong> cookie and copy its value</li>
                  <li>Paste it below — it's only sent once and never stored</li>
                </ol>
              </mat-expansion-panel>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>.AspNet.Cookies value</mat-label>
                <textarea matInput [(ngModel)]="cookie" rows="4"
                  style="font-family:monospace;font-size:0.72rem"
                  placeholder="2s4rojM9F59Ea..."></textarea>
              </mat-form-field>

              <div style="display:flex;gap:12px;margin-bottom:4px">
                <mat-form-field appearance="outline" style="flex:1">
                  <mat-label>Start date</mat-label>
                  <input matInput [matDatepicker]="startPicker" [(ngModel)]="fetchStartDate">
                  <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
                  <mat-datepicker #startPicker></mat-datepicker>
                </mat-form-field>
                <mat-form-field appearance="outline" style="flex:1">
                  <mat-label>End date</mat-label>
                  <input matInput [matDatepicker]="endPicker" [(ngModel)]="fetchEndDate" [min]="fetchStartDate">
                  <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
                  <mat-datepicker #endPicker></mat-datepicker>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Team IDs (comma-separated)</mat-label>
                <input matInput [(ngModel)]="teamIdsInput"
                  placeholder="2155,2383,1990,2611,304,2296,2588,2578,2614,2632">
                <mat-hint>From the Entelect leave calendar URL / network request</mat-hint>
              </mat-form-field>
            </div>
          </mat-tab>

          <!-- TAB: Paste JSON -->
          <mat-tab label="Paste JSON">
            <div style="padding:16px 0">
              <p style="opacity:0.6;font-size:0.875rem;margin-top:0">
                Paste the JSON array from the Entelect API or any compatible source.
              </p>
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>JSON</mat-label>
                <textarea matInput [(ngModel)]="json" rows="14"
                  style="font-family:monospace;font-size:0.78rem"
                  placeholder='[{ "title": "John Doe - Company...", "start": "...", "end": "...", "type": "Annual", "totalDays": "5" }]'>
                </textarea>
              </mat-form-field>
              @if (parseError()) {
                <div style="color:#f44336;font-size:0.85rem;margin-top:-8px">{{ parseError() }}</div>
              }
            </div>
          </mat-tab>

        </mat-tab-group>
      }

      @if (step() === 'preview') {
        <!-- Summary counters -->
        <div style="display:flex;gap:10px;margin-bottom:16px">
          <div style="flex:1;padding:12px;border-radius:8px;background:rgba(76,175,80,0.1);text-align:center">
            <div style="font-size:1.6rem;font-weight:700;color:#4caf50">{{ newCount() }}</div>
            <div style="font-size:0.72rem;opacity:0.7;margin-top:2px">New</div>
          </div>
          <div style="flex:1;padding:12px;border-radius:8px;background:rgba(255,152,0,0.1);text-align:center">
            <div style="font-size:1.6rem;font-weight:700;color:#ff9800">{{ dupCount() }}</div>
            <div style="font-size:0.72rem;opacity:0.7;margin-top:2px">Duplicates</div>
          </div>
          <div style="flex:1;padding:12px;border-radius:8px;background:rgba(158,158,158,0.1);text-align:center">
            <div style="font-size:1.6rem;font-weight:700;color:#9e9e9e">{{ unmatchedCount() }}</div>
            <div style="font-size:0.72rem;opacity:0.7;margin-top:2px">Unknown members</div>
          </div>
        </div>

        <!-- Override toggle (only shown when duplicates exist) -->
        @if (dupCount() > 0) {
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:8px;margin-bottom:12px;border:1px solid"
               [style.background]="override() ? 'rgba(255,152,0,0.08)' : 'rgba(255,255,255,0.03)'"
               [style.borderColor]="override() ? 'rgba(255,152,0,0.4)' : 'rgba(255,255,255,0.1)'">
            <mat-icon [style.color]="override() ? '#ff9800' : 'rgba(255,255,255,0.4)'" style="flex-shrink:0">warning</mat-icon>
            <div style="flex:1;min-width:0">
              <div style="font-size:0.85rem;font-weight:600">{{ dupCount() }} duplicate{{ dupCount() !== 1 ? 's' : '' }} found</div>
              <div style="font-size:0.75rem;opacity:0.55;margin-top:2px">
                @if (override()) {
                  Existing records will be replaced with the imported data
                } @else {
                  Duplicates will be skipped — existing records kept unchanged
                }
              </div>
            </div>
            <button (click)="override.set(!override())"
                    style="padding:5px 14px;border-radius:6px;font-size:0.8rem;font-weight:600;cursor:pointer;border:1px solid;transition:all 0.15s;white-space:nowrap"
                    [style.background]="override() ? 'rgba(255,152,0,0.2)' : 'rgba(255,255,255,0.05)'"
                    [style.borderColor]="override() ? '#ff9800' : 'rgba(255,255,255,0.15)'"
                    [style.color]="override() ? '#ff9800' : 'rgba(255,255,255,0.6)'">
              {{ override() ? 'Override on' : 'Override off' }}
            </button>
          </div>
        }

        <!-- Preview table -->
        <div style="max-height:300px;overflow-y:auto;border-radius:8px;border:1px solid rgba(255,255,255,0.1)">
          <table style="width:100%;border-collapse:collapse;font-size:0.8rem">
            <thead style="position:sticky;top:0;z-index:1">
              <tr style="background:#1e2029">
                <th style="padding:8px 12px;text-align:left;opacity:0.6;font-weight:600">Member</th>
                <th style="padding:8px 12px;text-align:left;opacity:0.6;font-weight:600">Type</th>
                <th style="padding:8px 12px;text-align:left;opacity:0.6;font-weight:600">Dates</th>
                <th style="padding:8px 12px;text-align:right;opacity:0.6;font-weight:600">Days</th>
                <th style="padding:8px 8px;width:32px"></th>
              </tr>
            </thead>
            <tbody>
              @for (row of preview(); track $index) {
                <tr [style.opacity]="row.status === 'unmatched' ? '0.3' : '1'"
                    [style.background]="row.status === 'duplicate' ? 'rgba(255,152,0,0.06)' : 'transparent'">
                  <td style="padding:7px 12px">{{ row.name }}</td>
                  <td style="padding:7px 12px"><span [class]="badgeClass(row.type)">{{ row.type }}</span></td>
                  <td style="padding:7px 12px;white-space:nowrap">{{ row.start | date:'d MMM' }} – {{ row.end | date:'d MMM yy' }}</td>
                  <td style="padding:7px 12px;text-align:right;font-weight:600">{{ row.days }}</td>
                  <td style="padding:7px 8px;text-align:center">
                    @if (row.status === 'new') {
                      <mat-icon style="font-size:16px;width:16px;height:16px;color:#4caf50;vertical-align:middle">check_circle</mat-icon>
                    } @else if (row.status === 'duplicate') {
                      <mat-icon style="font-size:16px;width:16px;height:16px;color:#ff9800;vertical-align:middle"
                                [matTooltip]="override() ? 'Will replace existing record' : 'Duplicate — will be skipped'">
                        {{ override() ? 'swap_horiz' : 'skip_next' }}
                      </mat-icon>
                    } @else {
                      <mat-icon style="font-size:16px;width:16px;height:16px;color:#9e9e9e;vertical-align:middle" matTooltip="Not in system">person_off</mat-icon>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (step() === 'loading') {
        <div style="display:flex;flex-direction:column;align-items:center;padding:48px;gap:16px">
          <mat-spinner diameter="48"></mat-spinner>
          <div style="opacity:0.6;font-size:0.875rem">Fetching leave data from Entelect...</div>
        </div>
      }

      @if (step() === 'importing') {
        <div style="display:flex;flex-direction:column;align-items:center;padding:48px;gap:16px">
          <mat-spinner diameter="48"></mat-spinner>
          <div style="opacity:0.6;font-size:0.875rem">Importing records...</div>
        </div>
      }

      @if (step() === 'done') {
        <div style="text-align:center;padding:32px 0">
          <mat-icon style="font-size:4rem;width:4rem;height:4rem;color:#4caf50;display:block;margin:0 auto 16px">check_circle</mat-icon>
          <div style="font-size:1.1rem;font-weight:500;margin-bottom:8px">Import complete</div>
          <div style="opacity:0.6;font-size:0.875rem;line-height:1.8">
            @if (result()!.imported > 0) { <div>{{ result()!.imported }} new record{{ result()!.imported !== 1 ? 's' : '' }} added</div> }
            @if (result()!.overridden > 0) { <div>{{ result()!.overridden }} existing record{{ result()!.overridden !== 1 ? 's' : '' }} replaced</div> }
            @if (result()!.duplicates > 0) { <div>{{ result()!.duplicates }} duplicate{{ result()!.duplicates !== 1 ? 's' : '' }} skipped</div> }
          </div>
          @if (result()!.unknownMembers.length > 0) {
            <div style="margin-top:16px;padding:12px 16px;border-radius:8px;background:rgba(255,152,0,0.08);text-align:left">
              <div style="font-weight:600;color:#ff9800;margin-bottom:8px;font-size:0.85rem">
                Skipped — not found in system ({{ result()!.unknownMembers.length }}):
              </div>
              @for (name of result()!.unknownMembers; track name) {
                <div style="opacity:0.65;font-size:0.8rem;padding:2px 0">{{ name }}</div>
              }
            </div>
          }
        </div>
      }

      @if (fetchError()) {
        <div style="color:#f44336;font-size:0.85rem;padding:8px 0">{{ fetchError() }}</div>
      }

    </mat-dialog-content>

    <mat-dialog-actions align="end">
      @if (step() === 'done') {
        <button mat-raised-button color="primary" (click)="dialogRef.close(true)">Close</button>
      } @else if (step() === 'input') {
        <button mat-button mat-dialog-close>Cancel</button>
        @if (activeTab === 0) {
          <button mat-raised-button color="primary" (click)="fetchAndPreview()" [disabled]="!cookie.trim()">
            <mat-icon>download</mat-icon> Fetch & Preview
          </button>
        } @else {
          <button mat-raised-button color="primary" (click)="parseJson()" [disabled]="!json.trim()">Preview</button>
        }
      } @else if (step() === 'preview') {
        <button mat-stroked-button (click)="step.set('input')">Back</button>
        <button mat-raised-button color="primary" (click)="confirm()" [disabled]="importableCount() === 0">
          Import {{ importButtonLabel() }}
        </button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .leave-badge { padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:600;text-transform:uppercase;white-space:nowrap; }
    .annual              { background:rgba(76,175,80,0.15);color:#4caf50; }
    .sick                { background:rgba(244,67,54,0.15);color:#f44336; }
    .birthday            { background:rgba(156,39,176,0.15);color:#ce93d8; }
    .loyalty             { background:rgba(33,150,243,0.15);color:#64b5f6; }
    .discretionary       { background:rgba(0,188,212,0.15);color:#4dd0e1; }
    .familyresponsibility{ background:rgba(255,152,0,0.15);color:#ff9800; }
    .other               { background:rgba(158,158,158,0.15);color:#9e9e9e; }
  `]
})
export class LeaveImportDialogComponent implements OnInit {
  private svc = inject(LeaveService);
  dialogRef = inject(MatDialogRef<LeaveImportDialogComponent>);
  private data: { members: TeamMember[] } = inject(MAT_DIALOG_DATA);

  activeTab = 0;
  json = '';
  cookie = '';
  teamIdsInput = '2296,2578,2588';
  fetchStartDate: Date = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  fetchEndDate: Date   = new Date(new Date().getFullYear(), new Date().getMonth() + 2, 0);

  step        = signal<'input' | 'preview' | 'loading' | 'importing' | 'done'>('input');
  preview     = signal<PreviewRow[]>([]);
  override    = signal(false);
  parseError  = signal('');
  fetchError  = signal('');
  result      = signal<{ imported: number; overridden: number; duplicates: number; unknownMembers: string[] } | null>(null);

  private pendingRecords: any[] = [];
  private existingSet = new Set<string>(); // "{memberName_lower}|{startDate_iso}|{type_lower}"
  private knownNames  = new Set<string>(); // member full names lowercased

  newCount       = computed(() => this.preview().filter(r => r.status === 'new').length);
  dupCount       = computed(() => this.preview().filter(r => r.status === 'duplicate').length);
  unmatchedCount = computed(() => this.preview().filter(r => r.status === 'unmatched').length);

  importableCount = computed(() =>
    this.newCount() + (this.override() ? this.dupCount() : 0)
  );

  importButtonLabel = computed(() => {
    const n = this.newCount();
    const d = this.dupCount();
    const parts: string[] = [];
    if (n > 0) parts.push(`${n} new`);
    if (this.override() && d > 0) parts.push(`${d} override${d !== 1 ? 's' : ''}`);
    if (parts.length === 0) return '0 records';
    return parts.join(' + ') + ` record${this.importableCount() !== 1 ? 's' : ''}`;
  });

  ngOnInit() {
    this.cookie = localStorage.getItem('entelectCookie') ?? '';
    this.knownNames = new Set(
      this.data.members.map(m => `${m.firstName} ${m.lastName}`.toLowerCase())
    );
    // Load existing records to detect duplicates
    this.svc.getAll().subscribe(records => {
      this.existingSet = new Set(
        records.map(r => `${r.memberName.toLowerCase()}|${this.isoDate(r.startDate)}|${r.type.toLowerCase()}`)
      );
    });
  }


  fetchAndPreview() {
    this.fetchError.set('');
    this.step.set('loading');
    const teamIds = this.teamIdsInput.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    const toStr = (d: Date) => d.toISOString().split('T')[0];
    const ctx = new HttpContext().set(SKIP_ERROR_TOAST, true);
    this.svc.fetchPreview(this.cookie.trim(), teamIds, toStr(this.fetchStartDate), toStr(this.fetchEndDate), ctx).subscribe({
      next: records => {
        this.pendingRecords = records;
        this.buildPreview(records);
      },
      error: err => {
        this.fetchError.set(err?.error?.detail ?? err?.message ?? 'Failed to fetch from Entelect. Check your cookie.');
        this.step.set('input');
      }
    });
  }

  parseJson() {
    this.parseError.set('');
    try {
      this.pendingRecords = JSON.parse(this.json);
      if (!Array.isArray(this.pendingRecords)) throw new Error('Expected a JSON array');
    } catch (e: any) {
      this.parseError.set(e.message ?? 'Invalid JSON');
      return;
    }
    this.buildPreview(this.pendingRecords);
  }

  private buildPreview(records: any[]) {
    this.preview.set(records.map(r => {
      const name = (r.title ?? '').split(' - ')[0].trim();
      const type = r.type ?? 'Other';
      const startIso = this.isoDate(r.start);
      const isKnown = this.knownNames.has(name.toLowerCase());
      const dupKey  = `${name.toLowerCase()}|${startIso}|${type.toLowerCase()}`;
      const isDup   = isKnown && this.existingSet.has(dupKey);
      const status: RowStatus = !isKnown ? 'unmatched' : isDup ? 'duplicate' : 'new';
      return { name, type, start: r.start, end: r.end, days: r.totalDays, status };
    }));
    this.override.set(false);
    this.step.set('preview');
  }

  confirm() {
    this.step.set('importing');
    this.svc.import(this.pendingRecords, this.override()).subscribe({
      next: res => { this.result.set(res); this.step.set('done'); },
      error: () => this.step.set('preview')
    });
  }

  private isoDate(raw: string): string {
    if (!raw) return '';
    // Handles "2026-03-15", "2026-03-15T00:00:00", DateOnly from API
    return raw.slice(0, 10);
  }

  badgeClass(type: string) {
    return `leave-badge ${type.toLowerCase().replace(/\s+/g, '')}`;
  }
}
