import { Component, OnInit, inject, input, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TimesheetService } from '../../../../core/services/timesheet.service';
import { TimesheetConfigService } from '../../../../core/services/timesheet-config.service';
import { TimesheetEntry, CreateTimesheetEntryRequest } from '../../../../core/models/timesheet.model';
import { TimesheetConfig, QuickActionConfig } from '../../../../core/models/timesheet-config.model';
import {
  ActivityCombo, ACTIVITY_COMBOS,
  TIMESHEET_PROJECTS, CATEGORIES_BY_PROJECT, minutesToDurationLabel,
} from '../timesheet-data.constants';
import { TimesheetEntryCardComponent } from '../timesheet-entry-card/timesheet-entry-card.component';
import { TimesheetConfigDialogComponent } from '../timesheet-config-dialog/timesheet-config-dialog.component';

interface Recent { project: string; category: string; durationMins: number; combo: QuickActionConfig | undefined; }
const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

@Component({
  selector: 'app-timesheet-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, TimesheetEntryCardComponent],
  styles: [`
    .ts-wrap { display:flex; flex-direction:column; height:calc(100vh - 228px); min-height:400px; }
    .ts-main { display:flex; flex:1; overflow:hidden; }
    .ts-sidebar { width:346px; flex-shrink:0; border-right:1px solid rgba(255,255,255,0.07); overflow-y:auto; padding:14px 0; }
    .ts-sidebar::-webkit-scrollbar { width:3px; }
    .ts-sidebar::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
    .ts-sb-hdr { display:flex; align-items:center; justify-content:space-between; padding:0 10px 10px; font-size:12px; font-weight:600; color:rgba(255,255,255,0.45); }
    .ts-sb-btn { background:none; border:none; cursor:pointer; color:rgba(255,255,255,0.3); padding:3px; border-radius:4px; display:flex; align-items:center; }
    .ts-sb-btn:hover { color:rgba(255,255,255,0.85); background:rgba(255,255,255,0.06); }
    .ts-wk-lbl { padding:0 10px 6px; font-size:10px; font-weight:700; color:rgba(255,255,255,0.28); letter-spacing:0.07em; text-transform:uppercase; }
    .ts-day-row { display:flex; align-items:center; gap:7px; padding:8px 10px; cursor:pointer; transition:background 0.1s; position:relative; }
    .ts-day-row:hover { background:rgba(255,255,255,0.04); }
    .ts-day-row.sel { background:rgba(100,181,246,0.09); }
    .ts-day-row.sel::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:#64b5f6; border-radius:0 2px 2px 0; }
    .ts-dname { font-size:10px; font-weight:700; color:rgba(255,255,255,0.28); width:24px; letter-spacing:0.04em; text-transform:uppercase; flex-shrink:0; }
    .ts-day-row.sel .ts-dname { color:#64b5f6; }
    .ts-dnum { width:22px; height:22px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:500; border-radius:50%; flex-shrink:0; }
    .ts-dbar-w { flex:1; }
    .ts-dbar-t { height:3px; background:rgba(255,255,255,0.06); border-radius:2px; overflow:hidden; }
    .ts-dbar-f { height:100%; border-radius:2px; transition:width 0.3s; }
    .ts-dhrs { font-size:10px; color:rgba(255,255,255,0.35); flex-shrink:0; font-family:'DM Mono',monospace; }
    .ts-tot { margin:10px; padding:10px; background:rgba(255,255,255,0.04); border-radius:10px; border:1px solid rgba(255,255,255,0.07); }
    .ts-tot-lbl { font-size:10px; color:rgba(255,255,255,0.28); font-weight:700; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:3px; }
    .ts-tot-val { font-size:19px; font-weight:700; }
    .ts-tot-sub { font-size:11px; color:rgba(255,255,255,0.28); margin-top:2px; }
    .ts-detail { flex:1; display:flex; flex-direction:column; overflow:hidden; }
    .ts-det-hdr { display:flex; align-items:center; justify-content:space-between; padding:16px 22px 0; flex-shrink:0; }
    .ts-date-lbl { font-size:17px; font-weight:700; }
    .ts-day-badge { font-size:11px; font-weight:700; padding:3px 9px; border-radius:20px; background:rgba(76,175,80,0.12); color:#4caf50; }
    .ts-hdr-btns { display:flex; align-items:center; gap:6px; }
    .ts-exp-btn { display:flex; align-items:center; gap:5px; padding:6px 11px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.09); border-radius:6px; color:rgba(255,255,255,0.45); font-size:12px; font-weight:500; cursor:pointer; font-family:inherit; transition:all 0.12s; }
    .ts-exp-btn:hover { color:rgba(255,255,255,0.85); border-color:rgba(255,255,255,0.18); }
    .ts-cfg-btn { display:flex; align-items:center; justify-content:center; width:30px; height:30px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.09); border-radius:6px; color:rgba(255,255,255,0.35); cursor:pointer; transition:all 0.12s; }
    .ts-cfg-btn:hover { color:rgba(255,255,255,0.85); border-color:rgba(255,255,255,0.18); }
    .ts-entries { flex:1; overflow-y:auto; padding:10px 16px; display:flex; flex-direction:column; gap:6px; }
    .ts-entries::-webkit-scrollbar { width:4px; }
    .ts-entries::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
    .ts-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; flex:1; gap:5px; color:rgba(255,255,255,0.28); padding:40px; text-align:center; font-size:13px; }
    .ts-add-panel { border-top:1px solid rgba(100,181,246,0.2); border-bottom:1px solid rgba(100,181,246,0.2); padding:10px 16px 12px; flex-shrink:0; }
    .ts-ap-r1 { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; }
    .ts-ap-combos { display:flex; gap:4px; flex-wrap:wrap; }
    .ts-ap-durs { display:flex; flex-direction:column; gap:6px; margin-left:auto; }
    .ts-dur-row { display:flex; align-items:center; justify-content:center; gap:4px; }
    .ts-ap-r2 { display:flex; gap:6px; align-items:center; }
    .ts-chip { padding:5px 11px; border-radius:16px; font-size:12px; font-weight:500; border:1px solid rgba(255,255,255,0.09); background:rgba(255,255,255,0.03); color:rgba(255,255,255,0.45); cursor:pointer; transition:all 0.1s; white-space:nowrap; }
    .ts-chip:hover { border-color:rgba(255,255,255,0.18); color:rgba(255,255,255,0.85); }
    .ts-chip.sel { border-color:rgba(100,181,246,0.7); background:rgba(100,181,246,0.09); color:rgba(255,255,255,0.9); }
    .ts-dur-chip { padding:5px 9px; border-radius:5px; font-size:12px; font-weight:600; border:1px solid rgba(255,255,255,0.09); background:rgba(255,255,255,0.03); color:rgba(255,255,255,0.45); cursor:pointer; transition:all 0.1s; white-space:nowrap; }
    .ts-dur-chip:hover { border-color:rgba(255,255,255,0.18); }
    .ts-dur-chip.sel { border-color:rgba(100,181,246,0.7); background:rgba(100,181,246,0.09); color:#64b5f6; }
    .ts-sel { padding:8px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:inherit; font-size:12px; font-family:inherit; outline:none; cursor:pointer; appearance:none; }
    .ts-sel:focus { border-color:rgba(100,181,246,0.7); }
    .ts-sel option { background:#1a1c2a; }
    .ts-sel:disabled { opacity:0.35; cursor:not-allowed; }
    .ts-sel-proj { width:180px; flex-shrink:0; }
    .ts-sel-cat { flex:1.2; min-width:140px; }
    .ts-input { flex:2; min-width:160px; padding:8px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:inherit; font-size:12px; font-family:inherit; outline:none; }
    .ts-input:focus { border-color:rgba(100,181,246,0.7); }
    .ts-input::placeholder { color:rgba(255,255,255,0.2); }
    .ts-add-btn { padding:8px 20px; background:#64b5f6; border:none; border-radius:6px; color:#0f1923; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; flex-shrink:0; transition:all 0.12s; white-space:nowrap; }
    .ts-add-btn:hover { background:#90caf9; }
    .ts-add-btn:disabled { opacity:0.35; cursor:not-allowed; }
    .m-wk-nav, .m-day-strip, .m-recents, .m-add-bar { display:none; }
    @media (max-width:640px) {
      .ts-wrap { height:calc(100vh - 160px); }
      .ts-sidebar, .ts-add-panel, .ts-exp-btn, .ts-cfg-btn { display:none; }
      .m-wk-nav { display:flex; align-items:center; justify-content:space-between; padding:6px 14px 0; font-size:12px; font-weight:600; color:rgba(255,255,255,0.45); flex-shrink:0; }
      .m-day-strip { display:flex; gap:3px; overflow-x:auto; padding:5px 10px 0; scrollbar-width:none; flex-shrink:0; }
      .m-day-strip::-webkit-scrollbar { display:none; }
      .m-day-btn { display:flex; flex-direction:column; align-items:center; gap:1px; padding:5px 5px 4px; flex-shrink:0; min-width:38px; border-radius:8px; background:none; border:1.5px solid transparent; cursor:pointer; transition:background 0.1s; }
      .m-day-btn.sel { border-color:#64b5f6; background:rgba(100,181,246,0.09); }
      .m-dname { font-size:9px; font-weight:700; color:rgba(255,255,255,0.28); text-transform:uppercase; letter-spacing:0.05em; }
      .m-day-btn.sel .m-dname { color:#64b5f6; }
      .m-dnum { width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:500; }
      .m-dhrs { font-size:9px; color:rgba(255,255,255,0.28); }
      .m-day-btn.sel .m-dhrs { color:#64b5f6; }
      .m-recents { display:block; padding:4px 12px 5px; flex-shrink:0; }
      .m-rec-lbl { font-size:10px; font-weight:700; color:rgba(255,255,255,0.28); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px; }
      .m-rec-grid { display:grid; grid-template-columns:1fr 1fr; gap:5px; }
      .m-rec-card { padding:9px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-left:3px solid; border-radius:8px; cursor:pointer; transition:all 0.12s; }
      .m-rec-card:active { transform:scale(0.97); border-color:rgba(100,181,246,0.6); }
      .m-add-bar { display:block; border-top:1px solid rgba(255,255,255,0.07); background:rgba(14,20,30,0.98); flex-shrink:0; }
      .m-add-trigger { display:flex; align-items:center; gap:10px; padding:12px 14px; cursor:pointer; }
      .m-add-icon { width:26px; height:26px; border-radius:50%; background:#64b5f6; display:flex; align-items:center; justify-content:center; color:#0f1923; font-size:18px; font-weight:700; flex-shrink:0; }
      .m-add-day { font-size:11px; color:rgba(255,255,255,0.28); margin-left:auto; }
      .m-add-form { display:flex; flex-direction:column; gap:10px; padding:0 14px 16px; max-height:380px; overflow-y:auto; }
      .m-form-lbl { font-size:10px; font-weight:700; color:rgba(255,255,255,0.28); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:4px; }
      .m-add-btn { width:100%; padding:12px; background:#64b5f6; border:none; border-radius:8px; color:#0f1923; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; }
      .m-add-btn:disabled { opacity:0.35; cursor:not-allowed; }
      .ts-det-hdr { padding:8px 12px 0; }
      .ts-date-lbl { font-size:14px; }
      .ts-entries { padding:8px 10px; }
    }
  `],
  template: `
    <div class="ts-wrap">
      <div class="m-wk-nav">
        <button class="ts-sb-btn" (click)="prevWeek()"><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 2L4 7l5 5"/></svg></button>
        <span>{{ weekRange() }}</span>
        <button class="ts-sb-btn" (click)="nextWeek()"><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 2l5 5-5 5"/></svg></button>
      </div>
      <div class="m-day-strip">
        @for (d of week(); track d.getTime()) {
          <button class="m-day-btn" [class.sel]="isSel(d)" (click)="selectDay(d)">
            <span class="m-dname">{{ dn(d) }}</span>
            <span class="m-dnum" [style.background]="isToday(d)?'#64b5f6':'none'" [style.color]="isToday(d)?'#0f1923':''">{{ d.getDate() }}</span>
            <span class="m-dhrs">{{ dayHrsLabel(d) || '·' }}</span>
          </button>
        }
      </div>
      <div class="ts-main">
        <aside class="ts-sidebar">
          <div class="ts-sb-hdr">
            <button class="ts-sb-btn" (click)="prevWeek()"><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 2L4 7l5 5"/></svg></button>
            <span>{{ monthYear() }}</span>
            <button class="ts-sb-btn" (click)="nextWeek()"><svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 2l5 5-5 5"/></svg></button>
          </div>
          <div class="ts-wk-lbl">{{ weekRange() }}</div>
          @for (d of week(); track d.getTime()) {
            <div class="ts-day-row" [class.sel]="isSel(d)" (click)="selectDay(d)">
              <span class="ts-dname">{{ dn(d) }}</span>
              <span class="ts-dnum" [style.background]="isToday(d)?'#64b5f6':'none'" [style.color]="isToday(d)?'#0f1923':''">{{ d.getDate() }}</span>
              <div class="ts-dbar-w"><div class="ts-dbar-t"><div class="ts-dbar-f" [style.width]="dayBarPct(d)+'%'" [style.background]="dayBarPct(d)>=100?'#4caf50':'#64b5f6'"></div></div></div>
              @if (dayHrsLabel(d)) { <span class="ts-dhrs">{{ dayHrsLabel(d) }}</span> }
            </div>
          }
          <div class="ts-tot">
            <div class="ts-tot-lbl">This month</div>
            <div class="ts-tot-val">{{ monthTotal() }}</div>
            <div class="ts-tot-sub">{{ monthDaysLogged() }} day{{ monthDaysLogged()!==1?'s':'' }} logged</div>
          </div>
        </aside>
        <section class="ts-detail">
          <div class="ts-det-hdr">
            <div style="display:flex;align-items:center;gap:9px">
              <h2 class="ts-date-lbl">{{ selDateLabel() }}</h2>
              @if (dayTotal()>0) { <span class="ts-day-badge">{{ fmtDur(dayTotal()) }}</span> }
            </div>
            <div class="ts-hdr-btns">
              <button class="ts-cfg-btn" title="Timesheet settings" (click)="openConfig()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </button>
              <button class="ts-exp-btn" (click)="exportMonth()">
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7 2v7M4 6l3 3 3-3M2 11h10"/></svg>
                Export Excel
              </button>
            </div>
          </div>
          @if (recents().length>0) {
            <div class="m-recents">
              <div class="m-rec-lbl">Quick log</div>
              <div class="m-rec-grid">
                @for (r of recents().slice(0,4); track r.project+r.category) {
                  <div class="m-rec-card" [style.border-left-color]="r.combo?.color??'rgba(255,255,255,0.3)'" (click)="logRecent(r)">
                    <div style="display:flex;justify-content:space-between;margin-bottom:2px">
                      <span style="font-size:10px;font-weight:700;text-transform:uppercase" [style.color]="r.combo?.color??'rgba(255,255,255,0.5)'">{{ r.combo?.label??r.category.slice(0,8) }}</span>
                      <span style="font-size:10px;color:rgba(255,255,255,0.3)">{{ fmtDur(r.durationMins) }}</span>
                    </div>
                    <div style="font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ r.category }}</div>
                    <div style="font-size:11px;color:rgba(255,255,255,0.3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ r.project }}</div>
                  </div>
                }
              </div>
            </div>
          }
          <div class="ts-add-panel">
            <div class="ts-ap-r1">
              <div class="ts-ap-combos">
                @for (c of activeQuickActions(); track c.label) {
                  <button class="ts-chip" [class.sel]="formProject()===c.project&&formCategory()===c.category" (click)="applyCombo(c)">{{ c.label }}</button>
                }
              </div>
              <div class="ts-ap-durs">
                <div class="ts-dur-row">
                  @for (d of durChips; track d[0]) {
                    <button class="ts-dur-chip" [class.sel]="formDurMins()===d[1]" (click)="formDurMins.set(d[1])">{{ d[0] }}</button>
                  }
                </div>
                <div class="ts-dur-row">
                  <button class="ts-dur-chip" (click)="adjustDuration(-60)">-1h</button>
                  <button class="ts-dur-chip" (click)="adjustDuration(-15)">-15m</button>
                  <span style="font-size:14px;font-weight:700;color:rgba(255,255,255,0.8);min-width:60px;text-align:center;margin:0 6px;">{{ fmtDur(formDurMins()) }}</span>
                  <button class="ts-dur-chip" (click)="adjustDuration(15)">+15m</button>
                  <button class="ts-dur-chip" (click)="adjustDuration(60)">+1h</button>
                </div>
              </div>
            </div>
            <div class="ts-ap-r2">
              <select class="ts-sel ts-sel-proj" [ngModel]="formProject()" (ngModelChange)="setFormProject($event)">
                <option value="">Project…</option>
                @for (p of allProjects(); track p) { <option [value]="p">{{ p }}</option> }
              </select>
              <select class="ts-sel ts-sel-cat" [ngModel]="formCategory()" (ngModelChange)="formCategory.set($event)" [disabled]="!formProject()">
                <option value="">Category…</option>
                @for (c of formCats(); track c) { <option [value]="c">{{ c }}</option> }
              </select>
              <input class="ts-input" placeholder="Note (required)" [ngModel]="formNote()" (ngModelChange)="formNote.set($event)" (keydown.enter)="canAdd()&&addEntry()" />
              <button class="ts-add-btn" [disabled]="!canAdd()" (click)="addEntry()">Add Entry</button>
            </div>
          </div>
          <div class="ts-entries">
            @if (loading()) {
              <div style="display:flex;justify-content:center;padding:40px;color:rgba(255,255,255,0.28)">Loading…</div>
            } @else if (dayEntries().length===0) {
              <div class="ts-empty">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.4"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                <span>No entries yet</span>
                <span style="font-size:12px">Use the form above to log time</span>
              </div>
            } @else {
              @for (e of dayEntries(); track e.id) {
                <app-timesheet-entry-card [entry]="e" (saved)="handleSave($event)" (deleted)="deleteEntry($event)" />
              }
            }
          </div>
          <div class="m-add-bar">
            @if (!mobileAddOpen()) {
              <div class="m-add-trigger" (click)="mobileAddOpen.set(true)">
                <span class="m-add-icon">+</span>
                <span style="font-size:14px;color:rgba(255,255,255,0.4);flex:1">Log time…</span>
                <span class="m-add-day">{{ selDateShort() }}</span>
              </div>
            } @else {
              <div class="m-add-form">
                <div style="display:flex;justify-content:space-between;padding-top:12px">
                  <span style="font-size:14px;font-weight:600">Log time</span>
                  <button (click)="mobileAddOpen.set(false)" style="background:none;border:none;color:rgba(255,255,255,0.4);cursor:pointer;font-size:20px;line-height:1">×</button>
                </div>
                <div><div class="m-form-lbl">Activity</div><div class="ts-chips">@for (c of activeQuickActions(); track c.label) { <button class="ts-chip" [class.sel]="formProject()===c.project&&formCategory()===c.category" (click)="applyCombo(c)">{{ c.label }}</button> }</div></div>
                <div>
                  <div class="m-form-lbl">Duration</div>
                  <div class="ts-chips" style="display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; justify-content:center; gap:4px; flex-wrap:wrap;">
                      @for (d of durChips; track d[0]) {
                        <button class="ts-dur-chip" [class.sel]="formDurMins()===d[1]" (click)="formDurMins.set(d[1])">{{ d[0] }}</button>
                      }
                    </div>
                    <div style="display:flex; align-items:center; justify-content:center; gap:4px;">
                      <button class="ts-dur-chip" (click)="adjustDuration(-60)">-1h</button>
                      <button class="ts-dur-chip" (click)="adjustDuration(-15)">-15m</button>
                      <span style="font-size:16px; color:rgba(255,255,255,0.9); font-weight:700; margin:0 12px; min-width:50px; text-align:center;">{{ fmtDur(formDurMins()) }}</span>
                      <button class="ts-dur-chip" (click)="adjustDuration(15)">+15m</button>
                      <button class="ts-dur-chip" (click)="adjustDuration(60)">+1h</button>
                    </div>
                  </div>
                </div>
                <select class="ts-sel" style="width:100%" [ngModel]="formProject()" (ngModelChange)="setFormProject($event)"><option value="">Select project…</option>@for (p of allProjects(); track p) { <option [value]="p">{{ p }}</option> }</select>
                <select class="ts-sel" style="width:100%" [ngModel]="formCategory()" (ngModelChange)="formCategory.set($event)" [disabled]="!formProject()"><option value="">Select category…</option>@for (c of formCats(); track c) { <option [value]="c">{{ c }}</option> }</select>
                <input class="ts-input" style="width:100%" placeholder="Note (required)" [ngModel]="formNote()" (ngModelChange)="formNote.set($event)" />
                <button class="m-add-btn" [disabled]="!canAdd()" (click)="addEntry();mobileAddOpen.set(false)">Add Entry</button>
              </div>
            }
          </div>
        </section>
      </div>
    </div>
  `
})
export class TimesheetTabComponent implements OnInit {
  memberId = input.required<string>();
  private svc = inject(TimesheetService);
  private cfgSvc = inject(TimesheetConfigService);
  private dialog = inject(MatDialog);

  private today = new Date();
  weekOffset = signal(0);
  selectedDate = signal(new Date());
  entries = signal<TimesheetEntry[]>([]);
  loading = signal(false);

  formProject = signal('');
  formCategory = signal('');
  formDurMins = signal(60);
  formNote = signal('');
  mobileAddOpen = signal(false);

  tsConfig = signal<TimesheetConfig>({ extraProjects: [], extraCategories: {}, quickActions: [] });

  readonly durChips: [string, number][] = [['15m', 15], ['30m', 30], ['1h', 60], ['2h', 120], ['4h', 240], ['8h', 480]];
  readonly fmtDur = minutesToDurationLabel;

  activeQuickActions = computed<QuickActionConfig[]>(() => {
    const custom = this.tsConfig().quickActions;
    return custom.length > 0 ? custom : ACTIVITY_COMBOS;
  });

  allProjects = computed<string[]>(() => {
    const extras = this.tsConfig().extraProjects;
    return [...TIMESHEET_PROJECTS, ...extras.filter(p => !TIMESHEET_PROJECTS.includes(p))];
  });

  viewYear = computed(() => this.selectedDate().getFullYear());
  viewMonth = computed(() => this.selectedDate().getMonth() + 1);

  week = computed(() => {
    const base = new Date(this.today);
    base.setDate(base.getDate() + this.weekOffset() * 7);
    const dow = base.getDay();
    const mon = new Date(base);
    mon.setDate(base.getDate() - (dow === 0 ? 6 : dow - 1));
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
  });

  byDate = computed(() => {
    const m: Record<string, TimesheetEntry[]> = {};
    for (const e of this.entries()) { (m[e.date] ??= []).push(e); }
    return m;
  });

  selKey = computed(() => this.dk(this.selectedDate()));
  dayEntries = computed(() => this.byDate()[this.selKey()] ?? []);
  dayTotal = computed(() => this.dayEntries().reduce((s, e) => s + e.hours * 60 + e.minutes, 0));
  monthTotal = computed(() => minutesToDurationLabel(this.entries().reduce((s, e) => s + e.hours * 60 + e.minutes, 0)));
  monthDaysLogged = computed(() => new Set(this.entries().filter(e => { const d = new Date(e.date); return d.getFullYear() === this.viewYear() && d.getMonth() + 1 === this.viewMonth(); }).map(e => e.date)).size);
  weekRange = computed(() => { const w = this.week(); return `${w[0].getDate()} ${MN[w[0].getMonth()]} – ${w[6].getDate()} ${MN[w[6].getMonth()]}`; });
  monthYear = computed(() => this.week()[3].toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }));
  selDateLabel = computed(() => this.selectedDate().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }));
  selDateShort = computed(() => this.selectedDate().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }));

  recents = computed(() => {
    const seen = new Set<string>(); const result: Recent[] = [];
    for (const e of [...this.entries()].sort((a, b) => b.date.localeCompare(a.date))) {
      const key = `${e.project}|${e.category}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ project: e.project, category: e.category, durationMins: e.hours * 60 + e.minutes, combo: this.activeQuickActions().find(c => c.project === e.project && c.category === e.category) });
      }
      if (result.length >= 4) break;
    }
    return result;
  });

  formCats = computed(() => {
    const p = this.formProject();
    if (!p) return [];
    const defaults = CATEGORIES_BY_PROJECT[p] ?? [];
    const extras = this.tsConfig().extraCategories[p] ?? [];
    return [...defaults, ...extras.filter(c => !defaults.includes(c))];
  });

  canAdd = computed(() => !!this.formProject() && !!this.formCategory() && !!this.formNote().trim());

  constructor() {
    effect(() => { this.load(this.viewYear(), this.viewMonth()); });
  }

  ngOnInit() {
    this.cfgSvc.get(this.memberId()).subscribe({
      next: cfg => this.tsConfig.set(cfg),
      error: () => {},
    });
  }

  private load(year: number, month: number) {
    this.loading.set(true);
    this.svc.getByMonth(this.memberId(), year, month).subscribe({ next: d => { this.entries.set(d); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  prevWeek() { this.weekOffset.update(n => n - 1); }
  nextWeek() { this.weekOffset.update(n => n + 1); }
  selectDay(d: Date) { this.selectedDate.set(d); this.mobileAddOpen.set(false); }
  isSel(d: Date) { return this.dk(d) === this.selKey(); }
  isToday(d: Date) { return this.dk(d) === this.dk(this.today); }
  dn(d: Date) { return DN[d.getDay()]; }
  dayMins(d: Date) { return (this.byDate()[this.dk(d)] ?? []).reduce((s, e) => s + e.hours * 60 + e.minutes, 0); }
  dayHrsLabel(d: Date) { const m = this.dayMins(d); return m ? minutesToDurationLabel(m) : ''; }
  dayBarPct(d: Date) { return Math.min(this.dayMins(d) / 480, 1) * 100; }

  addEntry() {
    if (!this.canAdd()) return;
    const config = this.tsConfig() as any;
    const isBillable = (config.billableProjects ?? []).includes(this.formProject());

    const dayName = this.selectedDate().toLocaleDateString('en-US', { weekday: 'long' });
    let workedFrom = (config.workWeek ?? {})[dayName] ?? 'Home';
    const appliedCombo = this.activeQuickActions().find(c => c.project === this.formProject() && c.category === this.formCategory()) as any;
    if (appliedCombo && appliedCombo.workedFrom) {
      workedFrom = appliedCombo.workedFrom;
    }

    const req: CreateTimesheetEntryRequest = { date: this.selKey(), project: this.formProject(), category: this.formCategory(), hours: Math.floor(this.formDurMins() / 60), minutes: this.formDurMins() % 60, billable: isBillable, workedFrom, sentiment: 'Neutral', description: this.formNote(), ticketNumber: null };
    this.svc.create(this.memberId(), req).subscribe({ next: () => {
      this.formProject.set('');
      this.formCategory.set('');
      this.formNote.set('');
      this.formDurMins.set(60);
      this.load(this.viewYear(), this.viewMonth());
    } });
  }

  handleSave({ id, req }: { id: string; req: CreateTimesheetEntryRequest }) {
    this.svc.update(this.memberId(), id, req).subscribe({ next: () => this.load(this.viewYear(), this.viewMonth()) });
  }

  deleteEntry(id: string) {
    this.svc.delete(this.memberId(), id).subscribe({ next: () => this.load(this.viewYear(), this.viewMonth()) });
  }

  applyRecent(r: Recent) { this.formProject.set(r.project); this.formCategory.set(r.category); }

  applyCombo(c: QuickActionConfig) {
    this.formProject.set(c.project);
    this.formCategory.set(c.category);
    if (c.note) this.formNote.set(c.note);
    if (c.durationMins) this.formDurMins.set(c.durationMins);
  }

  adjustDuration(minutes: number) {
    this.formDurMins.update(current => Math.max(0, current + minutes));
  }

  setFormProject(p: string) { this.formProject.set(p); this.formCategory.set(''); }

  logRecent(r: Recent) {
    const config = this.tsConfig() as any;
    const isBillable = (config.billableProjects ?? []).includes(r.project);

    const dayName = this.selectedDate().toLocaleDateString('en-US', { weekday: 'long' });
    let workedFrom = (config.workWeek ?? {})[dayName] ?? 'Home';
    if (r.combo && (r.combo as any).workedFrom) {
      workedFrom = (r.combo as any).workedFrom;
    }

    const req: CreateTimesheetEntryRequest = { date: this.selKey(), project: r.project, category: r.category, hours: Math.floor(r.durationMins / 60), minutes: r.durationMins % 60, billable: isBillable, workedFrom, sentiment: 'Neutral', description: r.category, ticketNumber: null };
    this.svc.create(this.memberId(), req).subscribe({ next: () => this.load(this.viewYear(), this.viewMonth()) });
  }

  openConfig() {
    const ref = this.dialog.open(TimesheetConfigDialogComponent, {
      data: { memberId: this.memberId(), config: this.tsConfig() },
      panelClass: 'dark-dialog',
      maxWidth: '100vw',
    });
    ref.afterClosed().subscribe(result => {
      if (result) this.tsConfig.set(result);
    });
  }

  exportMonth() {
    this.svc.exportMonth(this.memberId(), this.viewYear(), this.viewMonth()).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `timesheet-${this.viewYear()}-${String(this.viewMonth()).padStart(2,'0')}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    });
  }

  private dk(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
}
