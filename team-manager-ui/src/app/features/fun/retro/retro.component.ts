import {
  Component, OnInit, OnDestroy, AfterViewInit, HostListener,
  inject, signal, computed, effect, ChangeDetectionStrategy, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, Subscription } from 'rxjs';
import { takeUntil, filter, take } from 'rxjs/operators';
import { Router, ActivatedRoute } from '@angular/router';
import { FunRetroService } from '../../../core/services/fun-retro.service';
import { FunRetroAnalysis, FunRetroSession, FunRetroSessionSummary, FunRetroCard, RetroColumn } from '../../../core/models/fun-retro.model';
import { WebSocketService } from '../../../core/websocket/websocket.service';
import { AvatarCircleComponent } from '../../../core/components/k-picker/avatar-circle.component';
import { AuthService } from '../../../core/auth/auth.service';
import { TextFieldModule } from '@angular/cdk/text-field';
import { PollService } from '../../../core/services/poll.service';
import { PollDetail } from '../../../core/models/poll.model';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CreatePollDialogComponent } from '../../polls/poll.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NavService } from '../../../core/nav/nav.service';

const DEFAULT_COLS: RetroColumn[] = [
  { key: 'well',   label: '✅ Went Well',      color: '#4caf50' },
  { key: 'better', label: "⚠️ Didn't Go Well", color: '#ff9800' },
  { key: 'action', label: '🎯 Action Items',    color: '#e91e8c' },
];

interface RetroTemplate {
  id: string;
  name: string;
  description: string;
  columns: RetroColumn[];
}

const RETRO_TEMPLATES: RetroTemplate[] = [
  {
    id: 'well-better-action',
    name: 'Well / Better / Action',
    description: 'Classic format',
    columns: DEFAULT_COLS,
  },
  {
    id: 'start-stop-continue',
    name: 'Start / Stop / Continue',
    description: 'Focus on behaviours',
    columns: [
      { key: 'start',    label: '🚀 Start',    color: '#4caf50' },
      { key: 'stop',     label: '🛑 Stop',     color: '#ef5350' },
      { key: 'continue', label: '✅ Continue', color: '#64b5f6' },
    ],
  },
  {
    id: '4ls',
    name: '4Ls',
    description: 'Liked / Learned / Lacked / Longed for',
    columns: [
      { key: 'liked',   label: '❤️ Liked',    color: '#e91e63' },
      { key: 'learned', label: '📚 Learned',  color: '#64b5f6' },
      { key: 'lacked',  label: '😕 Lacked',   color: '#ff9800' },
      { key: 'longed',  label: '🌟 Longed for', color: '#ab47bc' },
    ],
  },
  {
    id: 'mad-sad-glad',
    name: 'Mad / Sad / Glad',
    description: 'Emotion-driven reflection',
    columns: [
      { key: 'mad',  label: '😠 Mad',  color: '#ef5350' },
      { key: 'sad',  label: '😢 Sad',  color: '#64b5f6' },
      { key: 'glad', label: '😊 Glad', color: '#4caf50' },
    ],
  },
  {
    id: 'daki',
    name: 'DAKI',
    description: 'Drop / Add / Keep / Improve',
    columns: [
      { key: 'drop',    label: '🗑️ Drop',    color: '#ef5350' },
      { key: 'add',     label: '➕ Add',     color: '#4caf50' },
      { key: 'keep',    label: '🔒 Keep',    color: '#64b5f6' },
      { key: 'improve', label: '⬆️ Improve', color: '#ff9800' },
    ],
  },
  {
    id: 'sailboat',
    name: 'Sailboat',
    description: 'Wind / Anchor / Island / Rocks',
    columns: [
      { key: 'wind',   label: '💨 Wind (helps)',   color: '#4caf50' },
      { key: 'anchor', label: '⚓ Anchor (slows)', color: '#ef5350' },
      { key: 'island', label: '🏝️ Goal',           color: '#64b5f6' },
      { key: 'rocks',  label: '🪨 Risks',          color: '#ff9800' },
    ],
  },
];

export interface NewRetroDialogResult {
  title: string;
  templateId: string;
  icebreakerQuestion?: string;
}

@Component({
  selector: 'app-new-retro-dialog',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatDialogModule],
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    .field-label { font-size:0.75rem;opacity:0.55;display:block;margin-bottom:4px; }
    .field {
      background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:6px;
      color:inherit;font-size:0.85rem;padding:8px 10px;outline:none;width:100%;
      box-sizing:border-box;margin-bottom:12px;transition:border-color 0.2s;font-family:inherit;
    }
    .field:focus { border-color:#64b5f6; }
    .template-grid { display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:4px; }
    .template-card {
      border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:10px 12px 10px 13px;
      border-left:3px solid var(--tpl-accent, rgba(255,255,255,0.1));
      cursor:pointer;transition:border-color 0.15s,background 0.15s;
    }
    .template-card:hover { background:color-mix(in srgb, var(--tpl-accent, #fff) 6%, transparent); }
    .template-card.selected {
      border-color:var(--tpl-accent);
      background:color-mix(in srgb, var(--tpl-accent) 10%, transparent);
    }
    .template-name { font-size:0.82rem;font-weight:600;color:rgba(255,255,255,0.85);margin-bottom:2px; }
    .template-desc { font-size:0.7rem;color:rgba(255,255,255,0.35);margin-bottom:6px; }
    .template-cols { display:flex;flex-wrap:wrap;gap:4px; }
    .template-col-chip { font-size:0.65rem;padding:2px 6px;border-radius:10px;font-weight:500; }
    select.field { appearance:auto; }
  `],
  template: `
    <h2 mat-dialog-title style="font-size:1rem;margin:0 0 4px">New Retro</h2>
    <mat-dialog-content style="padding-top:12px;min-width:340px">
      <label class="field-label">Title (optional)</label>
      <input class="field" [(ngModel)]="title" placeholder="e.g. Sprint 42 Retro" (keyup.enter)="submit()" />

      <label class="field-label" style="margin-top:4px">Board template</label>
      <div class="template-grid">
        @for (t of templates; track t.id) {
          <div class="template-card" [class.selected]="selectedTemplateId === t.id"
               [style.--tpl-accent]="templateAccent(t)"
               (click)="selectedTemplateId = t.id">
            <div class="template-name">{{ t.name }}</div>
            <div class="template-desc">{{ t.description }}</div>
            <div class="template-cols">
              @for (c of t.columns; track c.key) {
                <span class="template-col-chip" [style.background]="c.color + '22'" [style.color]="c.color">{{ c.label }}</span>
              }
            </div>
          </div>
        }
      </div>

      <label class="field-label" style="margin-top:4px">Icebreaker question</label>
      <select class="field" [(ngModel)]="icebreakerMode">
        <option value="random">Random (default)</option>
        @for (q of icebreakerQuestions; track q) {
          <option [value]="q">{{ q }}</option>
        }
        <option value="__custom__">Write my own…</option>
      </select>
      @if (icebreakerMode === '__custom__') {
        <input class="field" [(ngModel)]="customIcebreaker" placeholder="Type your own icebreaker question" (keyup.enter)="submit()" />
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="margin-top:8px">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button color="primary" (click)="submit()">Create</button>
    </mat-dialog-actions>
  `
})
export class NewRetroDialogComponent {
  dialogRef = inject(MatDialogRef<NewRetroDialogComponent, NewRetroDialogResult>);
  readonly templates = RETRO_TEMPLATES;
  readonly icebreakerQuestions = ICEBREAKER_QUESTIONS;
  title = '';
  selectedTemplateId = RETRO_TEMPLATES[0].id;
  icebreakerMode = 'random';
  customIcebreaker = '';

  templateAccent(t: RetroTemplate): string {
    return t.columns[0]?.color ?? '#64b5f6';
  }

  submit(): void {
    let icebreakerQuestion: string | undefined;
    if (this.icebreakerMode === '__custom__') {
      icebreakerQuestion = this.customIcebreaker.trim() || undefined;
    } else if (this.icebreakerMode !== 'random') {
      icebreakerQuestion = this.icebreakerMode;
    }
    this.dialogRef.close({ title: this.title.trim(), templateId: this.selectedTemplateId, icebreakerQuestion });
  }
}

const PHASE_META: Record<string, { label: string; color: string }> = {
  lobby:   { label: 'Lobby',         color: '#64b5f6' },
  add:     { label: 'Adding Cards',  color: '#4caf50' },
  vote:    { label: 'Voting',        color: '#ff9800' },
  discuss: { label: 'Discussion',    color: '#e91e8c' },
  done:    { label: 'Done',          color: '#ce93d8' },
};

const REACTION_EMOJIS = ['👍', '😅', '🔥', '😬', '💯'];

const EMOJI_PICKER_SET = [
  '😀', '😂', '😅', '😊', '🙂', '😉', '😍', '🤔',
  '😬', '😭', '😢', '😡', '😱', '🥳', '😴', '🤯',
  '👍', '👎', '👏', '🙌', '🙏', '💪', '🤝', '👀',
  '❤️', '🔥', '💯', '⭐', '✅', '❌', '⚠️', '🎉',
  '🚀', '💡', '🐛', '🎯', '⏰', '📌', '☕', '🎈',
];

const ICEBREAKER_QUESTIONS = [
  "What's one word that describes this session?",
  "If this retro were a weather forecast, what would it be?",
  "What's one thing you wish you'd known at the start?",
  "On a scale of 🐢 to 🚀 how was your productivity?",
  "What's the best thing that happened outside of work this sprint?",
  "What song best describes your last two weeks?",
  "If this sprint were a movie, what genre would it be?",
  "What's one habit you want to build next sprint?",
  "Rate your energy this sprint: 🪫 🔋 ⚡ 🚀",
  "What's a superpower you wish you had this sprint?",
  "One emoji that sums up your sprint:",
  "What's something the team did that you're proud of?",
  "What would you do differently if you started over?",
  "What's your biggest win (personal or team)?",
  "Name a challenge you overcame this sprint:",
  "What's one thing that surprised you?",
  "If you could add one hour to your day next sprint, how would you use it?",
  "What's one thing you learned?",
  "How full is your motivation tank right now? 0–10",
  "What's one thing you want to celebrate from this sprint?",
];

function hashStr(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

interface TimerState {
  totalSeconds: number;
  startedAt: string | null;
  pausedAt: string | null;
  elapsedBeforePause: number;
}

@Component({
  selector: 'app-fun-retro',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    TextFieldModule,
    AvatarCircleComponent,
  ],
  changeDetection: ChangeDetectionStrategy.Default,
  styles: [`
    :host { display:block; }

    /* ── lobby list ─────────────────────────────────────── */
    .lobby-wrap { padding:8px 0; }
    .lobby-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:16px; }
    .lobby-title { font-size:1.1rem;font-weight:600;color:rgba(255,255,255,0.9); }
    .session-list { display:flex;flex-direction:column;gap:10px;margin-bottom:20px; }
    .session-card {
      display:flex;align-items:flex-start;justify-content:space-between;gap:8px;
      background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
      border-radius:10px;padding:14px 16px;cursor:pointer;
      transition:background 0.15s,border-color 0.15s;
    }
    .session-card:hover { background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.16); }
    .session-card-title { font-size:0.9rem;font-weight:600;color:rgba(255,255,255,0.9);margin-bottom:6px; }
    .session-card-meta { display:flex;gap:12px;flex-wrap:wrap;align-items:center;font-size:0.75rem;color:rgba(255,255,255,0.45); }
    .session-card-delete { color:rgba(255,255,255,0.3); flex-shrink:0; }
    .session-card-delete:hover { color:#ef5350; }
    .empty-state { text-align:center;padding:40px 16px;color:rgba(255,255,255,0.35);font-size:0.9rem; }

    /* ── session view ────────────────────────────────────── */
    .session-wrap { padding:4px 0; }
    .session-header {
      display:flex;align-items:center;
      gap:8px;padding:10px 20px;margin-bottom:8px;flex-wrap:wrap;
      background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07);
      border-radius:10px;
    }
    .header-spacer { flex:1; }
    .polls-toggle-btn {
      font-size:0.75rem;color:#64b5f6;border:1px solid rgba(100,181,246,0.3);
      border-radius:20px;padding:2px 12px;height:28px;line-height:28px;
    }
    .timer-trigger-wrap { position:relative; }
    .timer-trigger {
      display:flex;align-items:center;gap:6px;
      padding:6px 12px;border-radius:8px;
      border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.04);
      color:rgba(255,255,255,0.7);cursor:pointer;font-family:inherit;
      font-size:0.8rem;font-variant-numeric:tabular-nums;transition:all 0.15s;
    }
    .timer-trigger:hover { background:rgba(255,255,255,0.08); }
    .timer-trigger.timer-danger { border-color:rgba(239,83,80,0.4); }
    .timer-trigger.timer-expired { border-color:rgba(100,181,246,0.4); }
    .timer-trigger-icon { font-size:16px;height:16px;width:16px; }
    .timer-popover {
      position:absolute;top:38px;right:0;z-index:250;
      background:#2a2a2a;border:1px solid rgba(255,255,255,0.12);
      border-radius:10px;padding:14px;
      display:flex;flex-direction:column;align-items:center;gap:10px;
      width:220px;box-shadow:0 4px 16px rgba(0,0,0,0.5);
    }
    .session-title-row { display:flex;flex-direction:column;gap:6px; }
    .session-name { font-size:1rem;font-weight:600;color:rgba(255,255,255,0.9); }
    .session-sub { font-size:0.75rem;color:rgba(255,255,255,0.4); }
    .phase-badge {
      display:inline-flex;align-items:center;gap:5px;
      padding:4px 10px;border-radius:20px;font-size:0.72rem;font-weight:600;
      border:1px solid;
    }
    .host-controls { display:flex;align-items:center;gap:8px;flex-wrap:wrap; }
    /* settings panel */
    .settings-panel {
      border:1px solid rgba(255,255,255,0.08);border-radius:10px;
      padding:12px 14px;margin-bottom:12px;background:rgba(255,255,255,0.02);
    }
    .settings-panel-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:10px; }
    .settings-panel-title { font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:rgba(255,255,255,0.4); }
    .settings-row { display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05); }
    .settings-row:last-child { border-bottom:none;padding-bottom:0; }
    .settings-row-label { font-size:0.82rem;color:rgba(255,255,255,0.75); }
    .settings-row-desc { font-size:0.7rem;color:rgba(255,255,255,0.35);margin-top:1px; }
    .toggle-track {
      width:36px;height:20px;border-radius:10px;background:rgba(255,255,255,0.12);
      position:relative;cursor:pointer;transition:background .2s;flex-shrink:0;
    }
    .toggle-track.on { background:#64b5f6; }
    .toggle-thumb {
      position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;
      background:#fff;transition:left .2s;box-shadow:0 1px 3px rgba(0,0,0,0.3);
    }
    .toggle-track.on .toggle-thumb { left:18px; }

    /* card grouping */
    .card-group-cluster {
      border:1.5px dashed rgba(100,181,246,0.35);border-radius:12px;
      padding:8px;margin-bottom:8px;background:rgba(100,181,246,0.03);
      position:relative;
    }
    .card-group-label {
      font-size:0.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
      color:rgba(100,181,246,0.6);padding:2px 6px;margin-bottom:6px;
      display:flex;align-items:center;gap:6px;
    }
    .card-group-label button { color:rgba(255,255,255,0.3);padding:0;margin:0; }
    .card-group-cluster .sticky { margin-bottom:6px; }
    .card-group-cluster .sticky:last-child { margin-bottom:0; }
    .grouping-active .sticky:not(.grouping-source) { cursor:pointer;outline:2px dashed rgba(100,181,246,0.5);border-radius:10px; }
    .grouping-active .sticky:not(.grouping-source):hover { outline-color:#64b5f6;background:rgba(100,181,246,0.08) !important; }
    .grouping-source { outline:2px solid #64b5f6 !important;border-radius:10px; }
    .group-btn { opacity:0;transition:opacity .15s; }
    .sticky:hover .group-btn { opacity:1; }

    /* polls panel */
    .polls-panel {
      border:1px solid rgba(255,255,255,0.08);border-radius:10px;
      padding:12px 14px;margin-bottom:12px;background:rgba(255,255,255,0.02);
    }
    .polls-panel-header { display:flex;align-items:center;justify-content:space-between;margin-bottom:10px; }
    .polls-panel-title { font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:rgba(255,255,255,0.4); }
    .poll-item { border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:10px 12px;margin-bottom:8px;background:rgba(255,255,255,0.03); }
    .poll-item:last-child { margin-bottom:0; }
    .poll-question { font-size:0.85rem;font-weight:600;color:rgba(255,255,255,0.85);margin-bottom:8px; }
    .poll-options { display:flex;flex-direction:column;gap:5px; }
    .poll-option-btn {
      display:flex;align-items:center;gap:8px;width:100%;text-align:left;
      background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:6px;
      padding:6px 10px;color:rgba(255,255,255,0.7);cursor:pointer;transition:all 0.15s;
      font-size:0.78rem;font-family:inherit;
    }
    .poll-option-btn:hover:not(:disabled) { background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.2); }
    .poll-option-btn.selected { border-color:#64b5f6;background:rgba(100,181,246,0.1);color:#64b5f6; }
    .poll-option-btn:disabled { cursor:default; }
    .poll-option-label { flex:1; }
    .poll-option-bar-wrap { flex:1;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden; }
    .poll-option-bar { height:100%;border-radius:2px;background:#64b5f6;transition:width 0.4s ease; }
    .poll-option-pct { font-size:0.7rem;color:rgba(255,255,255,0.4);min-width:30px;text-align:right; }
    .poll-meta { display:flex;align-items:center;justify-content:space-between;margin-top:8px;font-size:0.7rem;color:rgba(255,255,255,0.3); }
    .poll-closed-badge { font-size:0.65rem;padding:1px 6px;border-radius:8px;background:rgba(239,83,80,0.15);color:#ef5350;border:1px solid rgba(239,83,80,0.3); }

    .presence-bar {
      display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap;
    }
    .presence-label { font-size:0.68rem;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:.05em;margin-right:2px; }
    .presence-avatars { display:flex;align-items:center;gap:-4px; }
    .presence-avatar-wrap {
      display:inline-flex;align-items:center;gap:5px;
      background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);
      border-radius:20px;padding:2px 8px 2px 3px;font-size:0.7rem;
      color:rgba(255,255,255,0.6);position:relative;transition:border-color .2s;
    }
    .presence-avatar-wrap.has-cards { border-color:rgba(76,175,80,0.4);background:rgba(76,175,80,0.06); }
    .presence-avatar-wrap.no-cards { border-color:rgba(255,152,0,0.3);background:rgba(255,152,0,0.04); }
    .presence-check {
      font-size:11px;height:11px;width:11px;color:#66bb6a;
    }
    .presence-pending {
      width:6px;height:6px;border-radius:50%;background:rgba(255,152,0,0.7);flex-shrink:0;
    }
    .participation-summary {
      font-size:0.7rem;color:rgba(255,255,255,0.3);margin-left:4px;white-space:nowrap;
    }
    .votes-left-badge {
      padding:4px 10px;border-radius:20px;font-size:0.72rem;font-weight:600;
      background:rgba(255,152,0,0.12);border:1px solid rgba(255,152,0,0.3);color:#ff9800;
    }

    /* reveal banner */
    .reveal-banner {
      background:rgba(76,175,80,0.15);border:1px solid rgba(76,175,80,0.3);
      border-radius:8px;padding:12px 16px;margin-bottom:16px;
      text-align:center;font-size:0.9rem;color:#4caf50;font-weight:600;
      animation:pulse 0.6s ease-in-out infinite alternate;
    }
    @keyframes pulse { from { opacity:0.7; } to { opacity:1; } }

    /* columns */
    .board {
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:12px;
      align-items:start;
    }
    @media(max-width:700px) {
      .board { grid-template-columns:1fr; }
    }
    @media(min-width:701px) {
      .session-wrap { max-width:100%; }
    }
    .col {
      background:color-mix(in srgb, var(--col-accent, #fff) 4%, rgba(255,255,255,0.03));
      border-radius:10px;
      border:1px solid rgba(255,255,255,0.07);border-top:3px solid var(--col-accent, rgba(255,255,255,0.07));
      padding:12px;
      display:flex;flex-direction:column;gap:8px;min-height:180px;
    }
    .col-header {
      display:flex;align-items:center;justify-content:space-between;
      margin-bottom:4px;
    }
    .col-label { font-size:0.82rem;font-weight:700; }
    .col-count {
      font-size:0.7rem;padding:2px 7px;border-radius:12px;
      background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.5);
    }

    /* add-phase input */
    .add-input-row { display:flex;gap:6px;margin-bottom:4px; }
    .card-input {
      flex:1;background:rgba(100,181,246,0.08);border:1.5px solid rgba(100,181,246,0.35);
      border-radius:8px;color:inherit;font-size:0.85rem;padding:9px 11px;
      outline:none;transition:border-color 0.2s,background 0.2s;font-family:inherit;
      resize:none;line-height:1.4;max-height:160px;
    }
    .card-input::placeholder { color:rgba(255,255,255,0.45); }
    .card-input:focus { border-color:#64b5f6;background:rgba(100,181,246,0.14); }

    /* cards */
    .retro-card {
      background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.09);
      border-radius:10px;padding:10px 12px;position:relative;
      transition:border-color 0.15s, background 0.15s;
    }
    .retro-card:hover { background:rgba(255,255,255,0.08); }
    .retro-card.hidden-card {
      background:rgba(255,255,255,0.03);border-style:dashed;opacity:0.5;
    }
    .retro-card.own-card { border-color:rgba(100,181,246,0.25); }
    .card-header { display:flex;align-items:center;gap:7px;margin-bottom:7px; }
    .card-author-name { font-size:0.72rem;font-weight:600;color:rgba(255,255,255,0.55); }
    .card-text { font-size:0.85rem;color:rgba(255,255,255,0.9);line-height:1.5;overflow-wrap:anywhere;word-break:break-word; }
    .card-hidden-text { font-size:0.78rem;color:rgba(255,255,255,0.3);font-style:italic; }
    .card-author { font-size:0.68rem;color:rgba(255,255,255,0.35);margin-top:4px; }
    .card-footer { display:flex;align-items:center;justify-content:space-between;margin-top:10px;gap:6px; }
    .card-reactions { display:flex;gap:4px;flex-wrap:wrap;flex:1; }
    .reaction-btn {
      display:inline-flex;align-items:center;gap:3px;
      font-size:0.72rem;padding:3px 7px;border-radius:14px;
      border:1px solid rgba(255,255,255,0.1);background:transparent;
      color:rgba(255,255,255,0.55);cursor:pointer;transition:all 0.15s;
    }
    .reaction-btn.reacted {
      border-color:rgba(100,181,246,0.4);background:rgba(100,181,246,0.1);color:#64b5f6;
    }
    .reaction-btn:hover { background:rgba(255,255,255,0.08); }
    .card-vote-row { display:flex;align-items:center;gap:0; flex-shrink:0; }
    .card-vote-count {
      min-width:26px;text-align:center;font-size:0.78rem;font-weight:700;
      color:rgba(255,255,255,0.75);font-variant-numeric:tabular-nums;
    }
    .card-vote-count.has-votes { color:#ff9800; }
    .vote-inc-btn, .vote-dec-btn {
      display:inline-flex;align-items:center;justify-content:center;
      width:26px;height:26px;border-radius:50%;border:1px solid rgba(255,255,255,0.13);
      background:transparent;color:rgba(255,255,255,0.45);cursor:pointer;
      font-size:16px;line-height:1;transition:all 0.15s;padding:0;
    }
    .vote-inc-btn:hover:not(:disabled) { background:rgba(255,152,0,0.15);border-color:rgba(255,152,0,0.4);color:#ff9800; }
    .vote-dec-btn:hover:not(:disabled) { background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.2);color:rgba(255,255,255,0.7); }
    .vote-inc-btn:disabled, .vote-dec-btn:disabled { opacity:0.25;cursor:default; }
    .delete-card-btn {
      position:absolute;top:6px;right:6px;
      background:transparent;border:none;cursor:pointer;
      color:rgba(255,255,255,0.25);padding:2px;display:flex;align-items:center;
      transition:color 0.15s;border-radius:4px;
    }
    .delete-card-btn:hover { color:rgba(255,80,80,0.8); }
    .delete-card-btn mat-icon { font-size:14px;height:14px;width:14px; }

    /* vote count on cards */
    .vote-count-chip {
      display:inline-flex;align-items:center;gap:3px;
      font-size:0.7rem;color:rgba(255,255,255,0.45);
    }
    .vote-count-chip mat-icon { font-size:13px;height:13px;width:13px; }

    /* done phase */
    .done-banner {
      text-align:center;padding:32px 16px;
    }
    .done-banner .done-icon { font-size:2.5rem;margin-bottom:12px; }
    .done-banner h2 { font-size:1.1rem;color:rgba(255,255,255,0.85);margin:0 0 6px; }
    .done-banner p { font-size:0.82rem;color:rgba(255,255,255,0.4);margin:0; }

    /* lobby phase overlay inside session */
    .lobby-phase-info {
      text-align:center;padding:24px 16px 0;
      color:rgba(255,255,255,0.4);font-size:0.85rem;
    }

    /* ── step bar ───────────────────────────────────────── */
    .step-bar {
      display:flex;align-items:center;gap:0;
      margin-bottom:8px;
      background:rgba(255,255,255,0.03);
      border:1px solid rgba(255,255,255,0.07);
      border-radius:8px;padding:6px 12px;
      overflow-x:auto;scrollbar-width:none;
    }
    .step-bar::-webkit-scrollbar { display:none; }
    .step-item {
      display:flex;align-items:center;gap:6px;
      flex-shrink:0;
    }
    .step-circle {
      width:22px;height:22px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:0.68rem;font-weight:700;flex-shrink:0;
      border:2px solid rgba(255,255,255,0.15);
      color:rgba(255,255,255,0.3);background:transparent;
      transition:all 0.2s;
    }
    .step-circle.done-step {
      background:#4caf50;border-color:#4caf50;color:#fff;
    }
    .step-circle mat-icon { font-size:12px;height:12px;width:12px; }
    .step-circle.active-step {
      border-color:currentColor;color:inherit;
      box-shadow:0 0 0 3px currentColor;
      background:transparent;
      opacity:1;
    }
    .step-label {
      font-size:0.72rem;font-weight:600;
      color:rgba(255,255,255,0.25);white-space:nowrap;
    }
    .step-label.active-label { color:inherit; }
    .step-label.done-label { color:rgba(255,255,255,0.5); }
    .step-connector {
      flex:1;min-width:20px;height:1px;
      background:rgba(255,255,255,0.08);margin:0 10px;
    }
    .step-connector.done-conn { background:rgba(76,175,80,0.4); }

    /* phase guidance */
    .phase-guide {
      display:flex;align-items:center;gap:8px;
      padding:5px 10px;border-radius:6px;margin-bottom:6px;
      font-size:0.78rem;line-height:1.4;
      background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);
    }
    .phase-guide mat-icon { font-size:15px;height:15px;width:15px;flex-shrink:0;opacity:0.7; }

    /* Breaks an element out of the page-wrap max-width to match the canvases below it on desktop */
    .full-bleed {
      margin-left:var(--canvas-ml, 0px);
      margin-right:var(--canvas-mr, 0px);
    }

    /* ── desktop canvas ─────────────────────────────────── */
    .canvases-row {
      display:flex;gap:8px;align-items:flex-start;
      /* margins set dynamically via --canvas-ml / --canvas-mr (see updateCanvasMargins) */
      margin-left:var(--canvas-ml, 0px);
      margin-right:var(--canvas-mr, 0px);
    }
    .canvas-col-wrap {
      flex:1;min-width:0;display:flex;flex-direction:column;gap:6px;
    }
    .canvas-col-header {
      display:flex;align-items:center;justify-content:space-between;
      padding:0 4px;
    }
    .canvas-col-title {
      font-size:0.82rem;font-weight:700;
    }
    .canvas-col-wrap.expanded { flex:1 1 100%; }
    .canvas-tidy-btn {
      display:inline-flex;align-items:center;gap:3px;
      background:transparent;border:none;
      border-radius:6px;color:rgba(255,255,255,0.7);cursor:pointer;
      font-size:0.7rem;font-family:inherit;font-weight:600;padding:0 7px 0 5px;
      height:26px;transition:background .12s,color .12s;
    }
    .canvas-tidy-btn:hover { background:rgba(255,255,255,0.12);color:#fff; }
    .canvas-tidy-btn mat-icon { font-size:14px;width:14px;height:14px;line-height:14px; }
    .canvas-expand-btn {
      display:inline-flex;align-items:center;justify-content:center;
      min-width:26px;height:26px;flex-shrink:0;
      background:transparent;border:none;
      border-radius:6px;color:rgba(255,255,255,0.7);cursor:pointer;
      transition:background .12s,color .12s;
    }
    .canvas-expand-btn:hover { background:rgba(255,255,255,0.12);color:#fff; }
    .canvas-expand-btn mat-icon { font-size:14px;width:14px;height:14px;line-height:14px; }
    .canvas-add-row {
      display:flex;gap:6px;align-items:flex-end;
    }
    .canvas-add-input {
      flex:1;background:rgba(100,181,246,0.08);border:1.5px solid rgba(100,181,246,0.35);
      border-radius:8px;color:inherit;font-size:0.85rem;padding:8px 11px;
      outline:none;font-family:inherit;transition:border-color 0.2s,background 0.2s;
      resize:none;line-height:1.4;max-height:160px;
    }
    .canvas-add-input::placeholder { color:rgba(255,255,255,0.45); }
    .canvas-add-input:focus { border-color:#64b5f6;background:rgba(100,181,246,0.14); }
    .canvas-add-btn {
      padding:7px 14px;background:rgba(100,181,246,0.18);border:1.5px solid rgba(100,181,246,0.4);
      border-radius:8px;color:#64b5f6;font-size:0.82rem;font-weight:600;font-family:inherit;cursor:pointer;
    }
    .canvas-add-btn:disabled { opacity:0.4;cursor:not-allowed; }
    .canvas-outer {
      position:relative;
      overflow:hidden;border:1px solid rgba(255,255,255,0.07);
      border-top:3px solid var(--col-accent, rgba(255,255,255,0.07));
      border-radius:10px;background:color-mix(in srgb, var(--col-accent, #000) 6%, rgba(0,0,0,0.15));
      background-image:
        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size:40px 40px;
      height:var(--canvas-height, calc(100vh - 260px));
      min-height:320px;
      cursor:grab;
    }
    .canvas-outer.panning { cursor:grabbing; }
    .canvas-inner {
      position:absolute;top:0;left:0;
      transform-origin:0 0;will-change:transform;
      width:100%;min-height:100%;
    }
    .canvas-zoom-controls {
      position:absolute;bottom:10px;right:10px;z-index:200;
      display:flex;align-items:center;gap:2px;
      background:rgba(20,20,24,0.85);border:1px solid rgba(255,255,255,0.12);
      border-radius:8px;padding:2px;backdrop-filter:blur(4px);
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
    }
    .cz-btn {
      display:inline-flex;align-items:center;justify-content:center;
      min-width:26px;height:26px;padding:0 6px;
      background:transparent;border:none;border-radius:6px;cursor:pointer;
      color:rgba(255,255,255,0.7);font-size:1rem;font-family:inherit;line-height:1;
      transition:background .12s,color .12s;
    }
    .cz-btn:hover { background:rgba(255,255,255,0.12);color:#fff; }
    .cz-pct { font-size:0.72rem;font-weight:600;min-width:42px;font-variant-numeric:tabular-nums; }
    .cz-fit mat-icon { font-size:16px;width:16px;height:16px;line-height:16px; }
    .cz-divider { width:1px;height:16px;background:rgba(255,255,255,0.15);margin:0 2px;flex-shrink:0; }
    .sticky {
      position:absolute;box-sizing:border-box;
      width:200px;min-height:90px;
      border-radius:4px;padding:10px 12px;
      box-shadow:2px 4px 12px rgba(0,0,0,0.35);
      cursor:grab;user-select:none;
      display:flex;flex-direction:column;gap:6px;
      transition:box-shadow 0.1s;
    }
    .sticky:active, .sticky.dragging { cursor:grabbing;box-shadow:4px 8px 24px rgba(0,0,0,0.5);z-index:100; }
    .sticky.no-drag { cursor:default; }
    .sticky-text { font-size:0.8rem;color:rgba(0,0,0,0.82);line-height:1.4;flex:1;overflow-wrap:anywhere;word-break:break-word; }
    .sticky-author { font-size:0.65rem;color:rgba(0,0,0,0.45); }
    .sticky-footer { display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px; }
    .sticky-vote-row { display:flex;align-items:center;gap:0;margin-top:4px; }
    .sticky-vote-count { min-width:22px;text-align:center;font-size:0.7rem;font-weight:700;color:rgba(0,0,0,0.45);font-variant-numeric:tabular-nums; }
    .sticky-vote-count.has-votes { color:#e65100; }
    .sticky-vinc-btn, .sticky-vdec-btn {
      display:inline-flex;align-items:center;justify-content:center;
      width:22px;height:22px;border-radius:50%;
      border:1px solid rgba(0,0,0,0.18);background:transparent;
      color:rgba(0,0,0,0.4);cursor:pointer;font-size:14px;line-height:1;
      transition:all 0.15s;padding:0;
    }
    .sticky-vinc-btn:hover:not(:disabled) { background:rgba(230,81,0,0.12);border-color:rgba(230,81,0,0.4);color:#e65100; }
    .sticky-vdec-btn:hover:not(:disabled) { background:rgba(0,0,0,0.06);color:rgba(0,0,0,0.65); }
    .sticky-vinc-btn:disabled, .sticky-vdec-btn:disabled { opacity:0.25;cursor:default; }
    .sticky-reactions { display:flex;gap:3px;flex-wrap:wrap;margin-top:4px; }
    .sticky-reaction-btn {
      display:inline-flex;align-items:center;gap:2px;
      font-size:0.68rem;padding:2px 5px;border-radius:10px;
      border:1px solid rgba(0,0,0,0.15);background:transparent;
      color:rgba(0,0,0,0.55);cursor:pointer;
    }
    .sticky-reaction-btn.reacted { border-color:rgba(0,0,0,0.3);background:rgba(0,0,0,0.1); }
    .sticky-vote-chip {
      display:inline-flex;align-items:center;gap:2px;
      font-size:0.65rem;color:rgba(0,0,0,0.45);
    }
    .sticky-vote-chip mat-icon { font-size:11px;height:11px;width:11px; }
    .canvas-col-add {
      position:absolute;display:flex;gap:6px;align-items:center;
      top:40px;padding:0 10px 0 0;box-sizing:border-box;width:540px;
    }
    .canvas-col-input {
      flex:1;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);
      border-radius:6px;color:#fff;font-size:0.78rem;padding:6px 9px;
      outline:none;font-family:inherit;transition:border-color 0.2s;
    }
    .canvas-col-input:focus { border-color:rgba(100,181,246,0.6); }
    .canvas-col-input::placeholder { color:rgba(255,255,255,0.3); }
    .canvas-col-add-btn {
      background:rgba(100,181,246,0.15);border:1px solid rgba(100,181,246,0.3);
      border-radius:6px;color:#64b5f6;padding:5px 10px;
      font-size:0.75rem;font-family:inherit;cursor:pointer;white-space:nowrap;
    }
    .canvas-col-add-btn:disabled { opacity:0.35;cursor:default; }
    .sticky-del-btn {
      position:absolute;top:6px;right:6px;
      background:transparent;border:none;color:rgba(0,0,0,0.35);
      cursor:pointer;font-size:16px;line-height:1;padding:2px;
      border-radius:4px;transition:color 0.15s;
    }
    .sticky-del-btn:hover { color:rgba(200,0,0,0.7); }
    .sticky-header { display:flex;align-items:center;gap:5px;margin-bottom:6px; }
    .sticky-edit-area {
      width:100%;box-sizing:border-box;border:none;outline:none;resize:none;
      background:transparent;font-size:0.8rem;color:rgba(0,0,0,0.82);line-height:1.4;
      font-family:inherit;padding:0;margin:0;flex:1;min-height:48px;
    }
    .sticky-text-editable { cursor:text; }
    .sticky-text-editable:hover { background:rgba(0,0,0,0.04);border-radius:4px; }
    .sticky-color-trigger { position:relative; margin-left:auto; }
    .sticky-color-dot {
      width:14px;height:14px;border-radius:50%;cursor:pointer;
      border:1.5px solid rgba(0,0,0,0.25);padding:0;transition:transform .1s;
    }
    .sticky-color-dot:hover { transform:scale(1.2); }
    .color-picker-popover {
      /* fixed (not absolute) so it can't be clipped by the canvas's overflow:auto
         when the card sits near the top/edge of the scrollable canvas */
      position:fixed;z-index:1000;
      background:#2a2a2a;border:1px solid rgba(255,255,255,0.12);
      border-radius:8px;padding:8px;
      display:grid;grid-template-columns:repeat(3, 22px);gap:6px;
      width:max-content;box-shadow:0 4px 16px rgba(0,0,0,0.5);
    }
    .color-swatch {
      width:22px;height:22px;border-radius:50%;cursor:pointer;
      box-sizing:border-box;
      border:2px solid transparent;transition:border-color 0.1s, transform 0.1s;
    }
    .color-swatch:hover, .color-swatch.active { border-color:rgba(255,255,255,0.7);transform:scale(1.15); }

    .emoji-picker-btn {
      display:inline-flex;align-items:center;justify-content:center;
      width:30px;height:30px;flex-shrink:0;
      background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);
      border-radius:6px;cursor:pointer;font-size:0.95rem;font-family:inherit;
      transition:background .12s;
    }
    .emoji-picker-btn:hover { background:rgba(255,255,255,0.12); }
    .emoji-picker-popover {
      /* fixed so it isn't clipped by a scrollable/zoomed canvas ancestor */
      position:fixed;z-index:1000;
      background:#2a2a2a;border:1px solid rgba(255,255,255,0.12);
      border-radius:8px;padding:8px;
      display:grid;grid-template-columns:repeat(8, 26px);gap:2px;
      width:max-content;max-width:246px;box-shadow:0 4px 16px rgba(0,0,0,0.5);
    }
    .emoji-picker-option {
      width:26px;height:26px;display:flex;align-items:center;justify-content:center;
      border-radius:5px;cursor:pointer;font-size:1.05rem;transition:background .1s;
    }
    .emoji-picker-option:hover { background:rgba(255,255,255,0.12); }

    /* AI analysis panel */
    .ai-panel {
      margin-top:16px;
      background:rgba(100,181,246,0.06);border:1px solid rgba(100,181,246,0.2);
      border-radius:10px;padding:16px;
    }
    .ai-panel-header {
      display:flex;align-items:center;gap:8px;margin-bottom:14px;
    }
    .ai-badge {
      display:inline-flex;align-items:center;gap:4px;
      font-size:0.68rem;font-weight:600;letter-spacing:0.04em;
      padding:3px 8px;border-radius:10px;
      background:rgba(100,181,246,0.15);border:1px solid rgba(100,181,246,0.3);
      color:#64b5f6;
    }
    .ai-panel-title {
      font-size:0.9rem;font-weight:600;color:rgba(255,255,255,0.85);
    }
    .ai-section { margin-bottom:14px; }
    .ai-section:last-child { margin-bottom:0; }
    .ai-section-label {
      font-size:0.72rem;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;
      margin-bottom:6px;opacity:0.6;
    }
    .ai-chips {
      display:flex;flex-wrap:wrap;gap:6px;
    }
    .ai-chip {
      font-size:0.78rem;padding:4px 10px;border-radius:14px;
      background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);
      color:rgba(255,255,255,0.8);
    }
    .ai-list {
      display:flex;flex-direction:column;gap:5px;
    }
    .ai-list-item {
      font-size:0.82rem;color:rgba(255,255,255,0.75);line-height:1.4;
      padding-left:12px;position:relative;
    }
    .ai-list-item::before {
      content:'•';position:absolute;left:0;color:rgba(100,181,246,0.6);
    }

    /* Timer popover */
    .timer-ring-wrap { position:relative; width:80px; height:80px; flex-shrink:0; }
    .timer-svg { width:80px; height:80px; }
    .timer-track { fill:none; stroke:rgba(255,255,255,0.08); stroke-width:5; }
    .timer-arc { fill:none; stroke-width:5; stroke-linecap:round; transition:stroke-dashoffset 1s linear, stroke 0.5s ease; }
    .timer-center { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); display:flex; flex-direction:column; align-items:center; line-height:1; }
    .timer-time { font-size:18px; font-weight:800; font-variant-numeric:tabular-nums; transition:color 0.5s; }
    .timer-label { font-size:9px; text-transform:uppercase; letter-spacing:.06em; color:rgba(255,255,255,0.3); margin-top:3px; }
    .timer-expired-icon { font-size:28px; height:28px; width:28px; color:#64b5f6; }
    .timer-ring-wrap.timer-danger-anim { animation:timer-glow 0.9s ease-in-out infinite alternate; }
    .timer-ring-wrap.timer-expired-anim { animation:timer-pulse 0.5s ease-in-out infinite alternate; }
    @keyframes timer-glow { from { filter:drop-shadow(0 0 3px rgba(239,83,80,0.3)); } to { filter:drop-shadow(0 0 10px rgba(239,83,80,0.7)); } }
    @keyframes timer-pulse { from { opacity:1; } to { opacity:0.35; } }
    .timer-controls { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .timer-btn {
      font-size:13px; padding:6px 14px; border-radius:8px;
      border:1px solid rgba(255,255,255,0.15); background:transparent;
      color:rgba(255,255,255,0.65); cursor:pointer; font-family:inherit;
      transition:all 0.1s; display:flex; align-items:center; gap:4px;
    }
    .timer-btn:hover { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.95); border-color:rgba(255,255,255,0.25); }
    .timer-icon { font-size:18px; height:18px; width:18px; }

    /* Icebreaker */
    .icebreaker-box { background:rgba(100,181,246,0.05); border:1px solid rgba(100,181,246,0.18); border-radius:10px; padding:14px 16px; margin:14px 0 0; }
    .icebreaker-q { font-size:0.88rem; font-weight:600; margin-bottom:10px; }
    .q-emoji { cursor:pointer;border-radius:5px;padding:0 2px;transition:background .12s; }
    .q-emoji:hover { background:rgba(100,181,246,0.22); }
    .icebreaker-input-row { display:flex; gap:6px; }
    .icebreaker-input { flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12); border-radius:6px; color:inherit; font-size:0.82rem; padding:7px 9px; outline:none; font-family:inherit; }
    .icebreaker-input:focus { border-color:#64b5f6; }
    .icebreaker-send { padding:5px 12px; background:rgba(100,181,246,0.15); border:1px solid rgba(100,181,246,0.3); border-radius:6px; color:#64b5f6; font-size:0.8rem; font-family:inherit; cursor:pointer; }
    .icebreaker-send:disabled { opacity:0.4; cursor:not-allowed; }
    .answer-chips { display:flex; flex-wrap:wrap; gap:5px; margin-top:8px; }
    .answer-chip { font-size:0.72rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:100px; padding:3px 10px; }

    /* Mobile card color swatches */
    .card-color-row { display:flex; gap:5px; flex-wrap:wrap; margin-top:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.06); }
    .card-swatch { width:20px; height:20px; border-radius:50%; cursor:pointer; border:2px solid transparent; flex-shrink:0; transition:border-color 0.1s, transform 0.1s; }
    .card-swatch:hover, .card-swatch.active { border-color:rgba(255,255,255,0.7); transform:scale(1.15); }

    /* Author row with avatar */
    .card-author-row { display:flex; align-items:center; gap:5px; margin-top:4px; font-size:0.68rem; color:rgba(255,255,255,0.35); }
    .sticky-author-row { display:flex; align-items:center; gap:4px; margin-top:2px; }

    /* Prev actions */
    .prev-actions-box { border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:12px 14px; margin-top:14px; }
    .prev-actions-title { font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:rgba(255,255,255,.35); margin-bottom:8px; }
    .prev-action-row { display:flex; align-items:center; gap:8px; padding:5px 0; border-bottom:1px solid rgba(255,255,255,0.04); }
    .prev-action-text { flex:1; font-size:0.8rem; color:rgba(255,255,255,0.8); }
    .prev-carry-btn { font-size:0.72rem; padding:3px 8px; border-radius:6px; border:1px solid rgba(100,181,246,0.3); background:rgba(100,181,246,0.08); color:#64b5f6; cursor:pointer; font-family:inherit; white-space:nowrap; }
  `],
  template: `
    <!-- ══════════════════════════════════════════════════════ -->
    <!-- SESSION LIST                                           -->
    <!-- ══════════════════════════════════════════════════════ -->
    @if (!session()) {
      <div class="lobby-wrap">
        <div class="lobby-header">
          <span class="lobby-title">Fun Retro</span>
          <button mat-flat-button color="primary" (click)="openNewRetroDialog()" [disabled]="loading()">
            <mat-icon>add</mat-icon> New Retro
          </button>
        </div>

        @if (loading()) {
          <div style="text-align:center;padding:32px">
            <mat-spinner diameter="32" style="margin:0 auto" />
          </div>
        } @else {
          @if (sessions().length === 0) {
            <div class="empty-state">No retro sessions yet. Start one!</div>
          }

          <div class="session-list">
            @for (s of sessions(); track s.id) {
              <div class="session-card" (click)="openSession(s.id)">
                <div>
                  <div class="session-card-title">{{ s.title || 'Untitled Retro' }}</div>
                  <div class="session-card-meta">
                    <span [style.color]="phaseColor(s.phase)">{{ phaseLabel(s.phase) }}</span>
                    @if (s.sprintName) { <span>{{ s.sprintName }}</span> }
                    <span>by {{ s.createdByName }}</span>
                    <span>{{ s.cardCount }} card{{ s.cardCount !== 1 ? 's' : '' }}</span>
                  </div>
                </div>
                @if (s.createdByMemberId === authSvc.me?.id) {
                  <button mat-icon-button class="session-card-delete" title="Delete retro"
                          (click)="deleteSession($event, s)">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                }
              </div>
            }
          </div>
        }
      </div>
    }

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- SESSION VIEW                                           -->
    <!-- ══════════════════════════════════════════════════════ -->
    @if (session(); as s) {
      <div class="session-wrap">
        <!-- Compact header: title, timer, polls, settings, share, back, phase actions — all in one row -->
        <div class="session-header" [class.full-bleed]="isDesktop()">
          <button mat-icon-button (click)="backToList()" title="Back to list">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="session-title-row">
            <span class="session-name">{{ s.title || 'Untitled Retro' }}</span>
            <span class="session-sub">{{ s.cards.length }} card{{ s.cards.length !== 1 ? 's' : '' }}</span>
          </div>
          <div class="header-spacer"></div>
          @if (s.phase !== 'lobby') {
            <div class="timer-trigger-wrap" (mousedown)="$event.stopPropagation()">
              <button class="timer-trigger"
                      [class.timer-danger]="timerRemaining() <= 30 && !timerExpired() && timerRunning()"
                      [class.timer-expired]="timerExpired()"
                      (click)="toggleTimerPopover($event)" title="Timer">
                @if (timerExpired()) {
                  <mat-icon class="timer-trigger-icon">alarm</mat-icon>
                } @else {
                  <mat-icon class="timer-trigger-icon" [style.color]="timer() ? timerColor() : null">timer</mat-icon>
                  <span class="timer-trigger-time" [style.color]="timer() ? timerColor() : null">{{ timerDisplay() }}</span>
                }
              </button>
              @if (timerPopoverOpen()) {
                <div class="timer-popover" (mousedown)="$event.stopPropagation()">
                  <div class="timer-ring-wrap"
                       [class.timer-danger-anim]="timerRemaining() <= 30 && !timerExpired() && timerRunning()"
                       [class.timer-expired-anim]="timerExpired()">
                    <svg class="timer-svg" viewBox="0 0 80 80">
                      <circle class="timer-track" cx="40" cy="40" r="32"/>
                      @if (timer()) {
                        <circle class="timer-arc"
                                cx="40" cy="40" r="32"
                                transform="rotate(-90 40 40)"
                                [style.stroke]="timerColor()"
                                [attr.stroke-dasharray]="201.06"
                                [attr.stroke-dashoffset]="201.06 * timerProgress()"/>
                      }
                    </svg>
                    <div class="timer-center">
                      @if (timerExpired()) {
                        <mat-icon class="timer-expired-icon">alarm</mat-icon>
                      } @else {
                        <span class="timer-time" [style.color]="timer() ? timerColor() : 'rgba(255,255,255,0.25)'">
                          {{ timerDisplay() }}
                        </span>
                        <span class="timer-label">{{ timerRunning() ? 'running' : timer() ? 'paused' : 'timer' }}</span>
                      }
                    </div>
                  </div>
                  @if (s.isCreator) {
                    <div class="timer-controls">
                      @if (!timer()) {
                        <button class="timer-btn" (click)="setTimerPreset(300)">5 min</button>
                        <button class="timer-btn" (click)="setTimerPreset(480)">8 min</button>
                        <button class="timer-btn" (click)="setTimerPreset(600)">10 min</button>
                      } @else {
                        <button class="timer-btn" (click)="toggleTimer()">
                          <mat-icon class="timer-icon">{{ timerRunning() ? 'pause' : 'play_arrow' }}</mat-icon>
                          {{ timerRunning() ? 'Pause' : 'Resume' }}
                        </button>
                        <button class="timer-btn" (click)="addTimerMinutes(-2)">-2 min</button>
                        <button class="timer-btn" (click)="addTimerMinutes(2)">+2 min</button>
                        <button class="timer-btn" (click)="resetTimer()">
                          <mat-icon class="timer-icon">restart_alt</mat-icon>
                          Reset
                        </button>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
          <button mat-button class="polls-toggle-btn" (click)="showPollsPanel.update(v => !v)">
            <mat-icon style="font-size:14px;height:14px;width:14px;vertical-align:middle;margin-right:4px">poll</mat-icon>
            Polls @if (retroPolls().length > 0) { ({{ retroPolls().length }}) }
          </button>
          <div class="host-controls">
            @if (s.isCreator) {
              <button mat-icon-button (click)="showSettings.set(!showSettings())" title="Session settings"
                      [style.color]="showSettings() ? '#64b5f6' : null">
                <mat-icon>settings</mat-icon>
              </button>
            }
            <button mat-icon-button (click)="shareSession(s)" title="Share">
              <mat-icon>share</mat-icon>
            </button>
          </div>
          @if (s.phase === 'vote') {
            <span class="votes-left-badge">{{ voteBudget() }} vote{{ voteBudget() !== 1 ? 's' : '' }} left</span>
          }
          @if (s.isCreator && (s.phase === 'discuss' || s.phase === 'done')) {
            <button mat-stroked-button (click)="runAnalysis()" [disabled]="analysing()">
              @if (analysing()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:4px" /> }
              @else { <mat-icon>auto_awesome</mat-icon> }
              Analyse with AI
            </button>
          }
          @if (s.isCreator && s.phase !== 'lobby' && nextPhase()) {
            <button mat-flat-button color="accent" (click)="advancePhase()" [disabled]="advancingPhase()">
              @if (advancingPhase()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:4px" /> }
              Next: {{ phaseLabel(nextPhase()!) }}
              <mat-icon>arrow_forward</mat-icon>
            </button>
          }
        </div>

        <!-- Settings panel (creator only) -->
        @if (showSettings() && s.isCreator) {
          <div class="settings-panel">
            <div class="settings-panel-header">
              <span class="settings-panel-title">Session Settings</span>
            </div>
            <div class="settings-row">
              <div>
                <div class="settings-row-label">Hide cards during add phase</div>
                <div class="settings-row-desc">Participants can only see their own cards until you reveal</div>
              </div>
              <div class="toggle-track" [class.on]="s.hideCardsOnAdd" (click)="toggleSetting('hideCardsOnAdd')">
                <div class="toggle-thumb"></div>
              </div>
            </div>
            <div class="settings-row">
              <div>
                <div class="settings-row-label">Participation tracking</div>
                <div class="settings-row-desc">Show who has added cards in the presence bar</div>
              </div>
              <div class="toggle-track" [class.on]="s.participationTracking" (click)="toggleSetting('participationTracking')">
                <div class="toggle-thumb"></div>
              </div>
            </div>
          </div>
        }

        <!-- Presence bar -->
        @if (presence().length > 0) {
          <div class="presence-bar">
            <span class="presence-label">Participants</span>
            @for (p of presence(); track p.memberId) {
              @let hasCard = s.participationTracking && membersWithCards().has(p.memberId);
              @let showPending = s.participationTracking && !hasCard && s.phase === 'add';
              <div class="presence-avatar-wrap" [class.has-cards]="hasCard" [class.no-cards]="showPending">
                <app-avatar-circle [memberId]="p.memberId" [name]="p.memberName" [size]="18" />
                <span>{{ p.memberName }}</span>
                @if (hasCard) {
                  <mat-icon class="presence-check">check_circle</mat-icon>
                } @else if (showPending) {
                  <div class="presence-pending" title="No cards yet"></div>
                }
              </div>
            }
            @if (s.participationTracking && s.phase === 'add') {
              @let doneCount = membersWithCards().size;
              @let totalCount = presence().length;
              <span class="participation-summary">{{ doneCount }}/{{ totalCount }} added cards</span>
            }
          </div>
        }

        <!-- Grouping mode banner -->
        @if (groupingCardId() !== null) {
          <div style="display:flex;align-items:center;gap:8px;background:rgba(100,181,246,0.1);border:1px solid rgba(100,181,246,0.3);border-radius:8px;padding:8px 12px;margin-bottom:8px;font-size:0.78rem;color:#64b5f6">
            <mat-icon style="font-size:16px;height:16px;width:16px">link</mat-icon>
            Click another card to group it together, or click the link icon again to cancel.
            <button mat-icon-button style="margin-left:auto;width:24px;height:24px;line-height:24px" (click)="groupingCardId.set(null)">
              <mat-icon style="font-size:16px;height:16px;width:16px">close</mat-icon>
            </button>
          </div>
        }


        <!-- Polls panel -->
        @if (showPollsPanel()) {
          <div class="polls-panel">
            <div class="polls-panel-header">
              <span class="polls-panel-title">Polls ({{ retroPolls().length }})</span>
              <div style="display:flex;gap:6px;align-items:center">
                @if (s.isCreator) {
                  <button mat-icon-button style="width:28px;height:28px;line-height:28px" title="New poll" (click)="openPollDialog()">
                    <mat-icon style="font-size:18px;height:18px;width:18px">add</mat-icon>
                  </button>
                }
                <button mat-icon-button style="width:28px;height:28px;line-height:28px" (click)="showPollsPanel.set(false)" title="Hide polls">
                  <mat-icon style="font-size:18px;height:18px;width:18px">close</mat-icon>
                </button>
              </div>
            </div>
            @if (retroPolls().length === 0) {
              <div style="font-size:0.78rem;color:rgba(255,255,255,0.3);text-align:center;padding:12px 0">
                No polls yet. @if (s.isCreator) { Click + to create one. }
              </div>
            }
            @for (poll of retroPolls(); track poll.id) {
              <div class="poll-item">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
                  <div class="poll-question">{{ poll.question }}</div>
                  @if (poll.isCreator) {
                    <div style="display:flex;gap:2px;flex-shrink:0">
                      @if (!poll.isClosed) {
                        <button mat-icon-button style="width:24px;height:24px;line-height:24px" title="Close poll" (click)="closePoll(poll)">
                          <mat-icon style="font-size:14px;height:14px;width:14px">lock</mat-icon>
                        </button>
                      }
                      <button mat-icon-button style="width:24px;height:24px;line-height:24px" title="Delete" (click)="deletePoll(poll)">
                        <mat-icon style="font-size:14px;height:14px;width:14px">delete</mat-icon>
                      </button>
                    </div>
                  }
                </div>
                <div class="poll-options">
                  @for (opt of poll.options; track opt.id) {
                    <button class="poll-option-btn"
                            [class.selected]="poll.myOptionId === opt.id"
                            [disabled]="poll.isClosed"
                            (click)="votePoll(poll, opt.id)">
                      <span class="poll-option-label">{{ opt.text }}</span>
                      @if (poll.resultsVisible) {
                        <div class="poll-option-bar-wrap">
                          <div class="poll-option-bar" [style.width.%]="opt.percentage"></div>
                        </div>
                        <span class="poll-option-pct">{{ opt.percentage }}%</span>
                      }
                    </button>
                  }
                </div>
                <div class="poll-meta">
                  <span>{{ poll.totalVotes }} vote{{ poll.totalVotes !== 1 ? 's' : '' }}</span>
                  @if (poll.isClosed) { <span class="poll-closed-badge">Closed</span> }
                  @else if (poll.hideResultsUntilClosed) { <span>Results hidden</span> }
                </div>
              </div>
            }
          </div>
        }

        <!-- Step bar (all phases except lobby) -->
        @if (s.phase !== 'lobby') {
          <div class="step-bar" [class.full-bleed]="isDesktop()">
            @for (step of retroSteps; track step.phase; let i = $index) {
              @let stepState = stepStateFor(s.phase, step.phase);
              <div class="step-item">
                <div class="step-circle"
                     [class.done-step]="stepState === 'done'"
                     [class.active-step]="stepState === 'active'"
                     [style.color]="stepState === 'active' ? phaseColor(step.phase) : null">
                  @if (stepState === 'done') {
                    <mat-icon>check</mat-icon>
                  } @else {
                    {{ i + 1 }}
                  }
                </div>
                <span class="step-label"
                      [class.active-label]="stepState === 'active'"
                      [class.done-label]="stepState === 'done'"
                      [style.color]="stepState === 'active' ? phaseColor(step.phase) : null">
                  {{ step.label }}
                </span>
              </div>
              @if (i < retroSteps.length - 1) {
                <div class="step-connector" [class.done-conn]="stepState === 'done'"></div>
              }
            }
          </div>
        }

        <!-- Reveal banner -->
        @if (revealing()) {
          <div class="reveal-banner">🎉 Revealing cards…</div>
        }

        <!-- Phase guidance -->
        @if (s.phase === 'lobby') {
          <div class="icebreaker-box">
            <div class="icebreaker-q">
              Icebreaker —
              @for (part of icebreakerQuestionParts(); track $index) {
                @if (part.emoji) {
                  <span class="q-emoji" title="Use this emoji as your answer" (click)="pickIcebreakerEmoji(part.text)">{{ part.text }}</span>
                } @else {
                  <span>{{ part.text }}</span>
                }
              }
            </div>
            <div class="icebreaker-input-row">
              <input class="icebreaker-input" placeholder="Your answer…"
                     [(ngModel)]="icebreakerInput"
                     (keyup.enter)="submitIcebreaker()"
                     [disabled]="submittingIcebreaker()" />
              <button class="emoji-picker-btn" title="Insert emoji" type="button"
                      (click)="toggleEmojiPicker($event, 'icebreaker')">😊</button>
              <button class="icebreaker-send" (click)="submitIcebreaker()"
                      [disabled]="!icebreakerInput.trim() || submittingIcebreaker()">Send</button>
            </div>
            @if (icebreakerAnswers().length) {
              <div class="answer-chips">
                @for (a of icebreakerAnswers(); track a.memberId) {
                  <span class="answer-chip"><strong>{{ a.memberName }}:</strong> {{ a.answer }}</span>
                }
              </div>
            }
          </div>
          <div class="lobby-phase-info">
            <mat-icon style="font-size:2rem;height:2rem;width:2rem;color:rgba(255,255,255,0.2);display:block;margin:0 auto 10px">hourglass_empty</mat-icon>
            @if (s.isCreator) {
              Everyone's ready. Start the session when you're good to go.
            } @else {
              Waiting for the host to start the session.
            }
          </div>
          @if (s.isCreator) {
            <div style="display:flex;justify-content:center;margin-top:20px">
              <button mat-flat-button color="primary" (click)="advancePhase()" [disabled]="advancingPhase()">
                @if (advancingPhase()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:6px" /> }
                Start Retro
              </button>
            </div>
          }
          @if (prevActions().length) {
            <div class="prev-actions-box">
              <div class="prev-actions-title">From last retro — action items</div>
              @for (a of prevActions(); track a.id) {
                <div class="prev-action-row">
                  <span class="prev-action-text">
                    {{ a.text }}
                    @if (a.authorName) { <span style="opacity:0.5"> — {{ a.authorName }}</span> }
                  </span>
                  <button class="prev-carry-btn" (click)="carryForward(a)">⤴ Carry forward</button>
                </div>
              }
            </div>
          }
        }
        @if (s.phase !== 'lobby') {
          <div class="phase-guide" [class.full-bleed]="isDesktop()" [style.border-color]="phaseColor(s.phase) + '30'" [style.color]="phaseColor(s.phase)">
            <mat-icon>{{ phaseGuide(s.phase).icon }}</mat-icon>
            <span style="color:rgba(255,255,255,0.7)">{{ phaseGuide(s.phase).text }}</span>
          </div>
        }

        <!-- Mobile: card list columns -->
        @if (!isDesktop()) {
          @if (s.phase === 'add' || s.phase === 'vote' || s.phase === 'discuss' || s.phase === 'done') {
            <div class="board">
              @for (col of cols(); track col.key) {
                <div class="col" [style.--col-accent]="col.color">
                  <div class="col-header">
                    <span class="col-label" [style.color]="col.color">{{ col.label }}</span>
                    <span class="col-count">{{ cardsForCol(col.key).length }}</span>
                  </div>
                  @if (s.phase === 'add') {
                    <div class="add-input-row">
                      <textarea class="card-input" placeholder="Add a card…" rows="1"
                                [(ngModel)]="newCardText()[col.key]"
                                (keydown.enter)="$event.preventDefault(); submitCard(col.key)"
                                [disabled]="submittingCard() === col.key"
                                cdkTextareaAutosize cdkAutosizeMaxRows="6"></textarea>
                      <button class="emoji-picker-btn" title="Insert emoji" type="button"
                              (click)="toggleEmojiPicker($event, 'card:' + col.key)">😊</button>
                      <button mat-icon-button [style.color]="col.color"
                              (click)="submitCard(col.key)"
                              [disabled]="!newCardText()[col.key]?.trim() || submittingCard() === col.key">
                        @if (submittingCard() === col.key) { <mat-spinner diameter="16" /> }
                        @else { <mat-icon>send</mat-icon> }
                      </button>
                    </div>
                  }
                  <!-- Grouped card clusters -->
                  @for (group of groupsForCol(col.key); track group.groupId) {
                    <div class="card-group-cluster">
                      <div class="card-group-label">
                        <mat-icon style="font-size:12px;height:12px;width:12px">link</mat-icon>
                        Group ({{ group.cards.length }})
                      </div>
                      @for (card of group.cards; track card.id) {
                        <div class="retro-card" [class.hidden-card]="card.text === null" [class.own-card]="card.isOwn"
                             [class.grouping-source]="groupingCardId() === card.id"
                             [style.border-left]="card.text !== null ? '3px solid ' + resolveCardColor(card) : null"
                             (click)="groupingCardId() !== null && groupingCardId() !== card.id ? mergeIntoGroup(card) : null">
                          @if (card.isOwn && s.phase === 'add') { <button class="delete-card-btn" (click)="deleteCard(card)"><mat-icon>close</mat-icon></button> }
                          @if (card.text !== null) {
                            <div style="display:flex;align-items:flex-start;justify-content:space-between">
                              @if (card.authorName) {
                                <div class="card-header">
                                  <app-avatar-circle [memberId]="card.authorId" [name]="card.authorName" [avatarSeed]="card.authorAvatarSeed" [size]="20" />
                                  <span class="card-author-name">{{ card.authorName }}</span>
                                </div>
                              }
                              @if (s.isCreator && (s.phase === 'vote' || s.phase === 'discuss')) {
                                <button mat-icon-button class="group-btn" style="width:22px;height:22px;line-height:22px;flex-shrink:0"
                                        title="Ungroup" (click)="$event.stopPropagation(); ungroupCard(card.id)">
                                  <mat-icon style="font-size:13px;height:13px;width:13px">link_off</mat-icon>
                                </button>
                              }
                            </div>
                            <div class="card-text">{{ card.text }}</div>
                            @if (s.phase === 'vote' || s.phase === 'discuss' || s.phase === 'done') {
                              <div class="card-footer">
                                @if (s.phase === 'discuss') {
                                  <div class="card-reactions">
                                    @for (emoji of reactionEmojis; track emoji) {
                                      <button class="reaction-btn" [class.reacted]="getReaction(card, emoji)?.mine" (click)="toggleReaction(card, emoji)">
                                        {{ emoji }} @if (getReactionCount(card, emoji) > 0) { <span>{{ getReactionCount(card, emoji) }}</span> }
                                      </button>
                                    }
                                  </div>
                                } @else { <span></span> }
                                <div class="card-vote-row">
                                  @if (s.phase === 'vote') { <button class="vote-dec-btn" [disabled]="card.myVoteCount === 0" (click)="toggleVote(card)">−</button> }
                                  <span class="card-vote-count" [class.has-votes]="card.voteCount > 0">{{ card.voteCount }}</span>
                                  @if (s.phase === 'vote') { <button class="vote-inc-btn" [disabled]="voteBudget() === 0 && card.myVoteCount === 0" (click)="toggleVote(card)">+</button> }
                                </div>
                              </div>
                            }
                          } @else {
                            <div class="card-header">
                              <app-avatar-circle [memberId]="card.authorId" [name]="card.authorName ?? ''" [avatarSeed]="card.authorAvatarSeed" [size]="20" />
                              <span class="card-author-name">{{ card.authorName }}</span>
                            </div>
                            <div class="card-hidden-text">🔒 Hidden until reveal</div>
                          }
                          @if (card.text !== null && (card.isOwn || s.phase === 'vote' || s.phase === 'discuss')) {
                            <div class="card-color-row">
                              @for (swatch of stickyPalette; track swatch) {
                                <div class="card-swatch" [style.background]="swatch" [class.active]="resolveCardColor(card) === swatch" (click)="changeCardColor(card, swatch)"></div>
                              }
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                  <!-- Ungrouped cards -->
                  @for (card of ungroupedCardsForCol(col.key); track card.id) {
                    <div class="retro-card" [class.hidden-card]="card.text === null" [class.own-card]="card.isOwn"
                         [class.grouping-source]="groupingCardId() === card.id"
                         [style.border-left]="card.text !== null ? '3px solid ' + resolveCardColor(card) : null"
                         (click)="groupingCardId() !== null && groupingCardId() !== card.id ? mergeIntoGroup(card) : null">
                      @if (card.isOwn && s.phase === 'add') { <button class="delete-card-btn" (click)="deleteCard(card)"><mat-icon>close</mat-icon></button> }
                      @if (card.text !== null) {
                        <div style="display:flex;align-items:flex-start;justify-content:space-between">
                          @if (card.authorName) {
                            <div class="card-header">
                              <app-avatar-circle [memberId]="card.authorId" [name]="card.authorName" [avatarSeed]="card.authorAvatarSeed" [size]="20" />
                              <span class="card-author-name">{{ card.authorName }}</span>
                            </div>
                          }
                          @if (s.isCreator && (s.phase === 'vote' || s.phase === 'discuss')) {
                            <button mat-icon-button class="group-btn" style="width:22px;height:22px;line-height:22px;flex-shrink:0"
                                    [class.grouping-source]="groupingCardId() === card.id"
                                    title="{{ groupingCardId() === card.id ? 'Cancel grouping' : 'Group with another card' }}"
                                    (click)="$event.stopPropagation(); startGrouping(card.id)">
                              <mat-icon style="font-size:13px;height:13px;width:13px">{{ groupingCardId() === card.id ? 'link_off' : 'link' }}</mat-icon>
                            </button>
                          }
                        </div>
                        <div class="card-text">{{ card.text }}</div>
                        @if (s.phase === 'vote' || s.phase === 'discuss' || s.phase === 'done') {
                          <div class="card-footer">
                            @if (s.phase === 'discuss') {
                              <div class="card-reactions">
                                @for (emoji of reactionEmojis; track emoji) {
                                  <button class="reaction-btn" [class.reacted]="getReaction(card, emoji)?.mine" (click)="toggleReaction(card, emoji)">
                                    {{ emoji }} @if (getReactionCount(card, emoji) > 0) { <span>{{ getReactionCount(card, emoji) }}</span> }
                                  </button>
                                }
                              </div>
                            } @else { <span></span> }
                            <div class="card-vote-row">
                              @if (s.phase === 'vote') { <button class="vote-dec-btn" [disabled]="card.myVoteCount === 0" (click)="toggleVote(card)">−</button> }
                              <span class="card-vote-count" [class.has-votes]="card.voteCount > 0">{{ card.voteCount }}</span>
                              @if (s.phase === 'vote') { <button class="vote-inc-btn" [disabled]="voteBudget() === 0 && card.myVoteCount === 0" (click)="toggleVote(card)">+</button> }
                            </div>
                          </div>
                        }
                      } @else { <div class="card-hidden-text">🔒 Hidden</div> }
                      @if (card.text !== null && (card.isOwn || s.phase === 'vote' || s.phase === 'discuss')) {
                        <div class="card-color-row">
                          @for (swatch of stickyPalette; track swatch) {
                            <div class="card-swatch" [style.background]="swatch" [class.active]="resolveCardColor(card) === swatch" (click)="changeCardColor(card, swatch)"></div>
                          }
                        </div>
                      }
                    </div>
                  }
                  @if (s.phase === 'add') {
                    @let hiddenCount = hiddenCardCountForCol(col.key);
                    @if (hiddenCount > 0) {
                      <div style="font-size:0.72rem;color:rgba(255,255,255,0.3);text-align:center;padding:4px 0;">
                        +{{ hiddenCount }} hidden card{{ hiddenCount !== 1 ? 's' : '' }} from others
                      </div>
                    }
                  }
                </div>
              }
            </div>
          }
        }

        <!-- Desktop: 3 separate sticky canvases side by side -->
        @if (isDesktop() && (s.phase === 'add' || s.phase === 'vote' || s.phase === 'discuss' || s.phase === 'done')) {
          <div class="canvases-row" [class.has-expanded]="expandedCol()">
            @for (col of cols(); track col.key; let ci = $index) {
              @if (!expandedCol() || expandedCol() === col.key) {
              <div class="canvas-col-wrap" [class.expanded]="expandedCol() === col.key">
                <div class="canvas-col-header">
                  <span class="canvas-col-title" [style.color]="col.color">{{ col.label }}</span>
                  <span class="col-count">{{ cardsForCol(col.key).length }}</span>
                </div>
                @if (s.phase === 'add') {
                  <div class="canvas-add-row">
                    <textarea class="canvas-add-input" placeholder="Add a card…" rows="1"
                              [(ngModel)]="newCardText()[col.key]"
                              (keydown.enter)="$event.preventDefault(); submitCard(col.key)"
                              [disabled]="submittingCard() === col.key"
                              cdkTextareaAutosize cdkAutosizeMaxRows="6"></textarea>
                    <button class="emoji-picker-btn" title="Insert emoji" type="button"
                            (click)="toggleEmojiPicker($event, 'card:' + col.key)">😊</button>
                    <button class="canvas-add-btn" [style.color]="col.color"
                            [disabled]="!newCardText()[col.key]?.trim() || submittingCard() === col.key"
                            (click)="submitCard(col.key)">
                      @if (submittingCard() === col.key) { … } @else { Add }
                    </button>
                  </div>
                }
                <div class="canvas-outer" [attr.data-col]="col.key" [style.--col-accent]="col.color"
                     [class.panning]="panningCol() === col.key"
                     [style.background-position]="viewFor(col.key).panX + 'px ' + viewFor(col.key).panY + 'px'"
                     [style.background-size]="(40 * viewFor(col.key).zoom) + 'px ' + (40 * viewFor(col.key).zoom) + 'px'"
                     (wheel)="onCanvasWheel($event, col.key)"
                     (mousedown)="startPan($event, col.key)">
                  <div class="canvas-inner"
                       [style.height.px]="canvasHeight(col.key)"
                       [style.transform]="'translate(' + viewFor(col.key).panX + 'px,' + viewFor(col.key).panY + 'px) scale(' + viewFor(col.key).zoom + ')'">
                    @for (item of canvasCardsForCol(col.key); track item.card.id) {
                      <div class="sticky"
                           [class.dragging]="draggingId() === item.card.id"
                           [class.no-drag]="s.phase === 'done'"
                           [style.left.px]="item.x"
                           [style.top.px]="item.y"
                           [style.background]="resolveCardColor(item.card)"
                           (mousedown)="startDrag($event, item.card, item.x, item.y, col.key)">
                          @if (item.card.text === null) {
                          <!-- Hidden card: show who wrote it, not what -->
                          <div class="sticky-header">
                            <app-avatar-circle [memberId]="item.card.authorId" [name]="item.card.authorName ?? ''" [avatarSeed]="item.card.authorAvatarSeed" [size]="18" />
                            <span class="sticky-author" style="flex:1">{{ item.card.authorName }}</span>
                          </div>
                          <div style="display:flex;align-items:center;gap:5px;opacity:0.4;margin-top:6px">
                            <mat-icon style="font-size:14px;height:14px;width:14px">lock</mat-icon>
                            <span style="font-size:0.7rem;color:rgba(0,0,0,0.6)">Hidden until reveal</span>
                          </div>
                        } @else {
                        <!-- Header: avatar + name + delete -->
                        @if (item.card.authorName) {
                          <div class="sticky-header">
                            <app-avatar-circle [memberId]="item.card.authorId" [name]="item.card.authorName" [avatarSeed]="item.card.authorAvatarSeed" [size]="18" />
                            <span class="sticky-author" style="flex:1">{{ item.card.authorName }}</span>
                            @if (s.phase === 'add' && item.card.isOwn) {
                              <button class="sticky-del-btn" (mousedown)="$event.stopPropagation()" (click)="deleteCard(item.card)">×</button>
                            }
                          </div>
                        }
                        <!-- Card text / inline edit -->
                        @if (editingCardId() === item.card.id) {
                          <textarea class="sticky-edit-area"
                                    [value]="editingText()"
                                    (input)="editingText.set($any($event.target).value)"
                                    (blur)="saveCardText(item.card)"
                                    (keydown.enter)="$event.preventDefault(); saveCardText(item.card)"
                                    (keydown.escape)="cancelEditCard()"
                                    (mousedown)="$event.stopPropagation()"
                                    cdkTextareaAutosize></textarea>
                        } @else {
                          <div class="sticky-text"
                               [class.sticky-text-editable]="item.card.isOwn || s.isCreator"
                               (mousedown)="$event.stopPropagation()"
                               (click)="(item.card.isOwn || s.isCreator) && item.card.text !== null ? startEditCard(item.card) : null">
                            {{ item.card.text }}
                          </div>
                        }
                        <!-- Footer: votes + color picker -->
                        <div class="sticky-footer">
                          @if (s.phase === 'vote' || s.phase === 'discuss' || s.phase === 'done') {
                            <div class="sticky-vote-row">
                              @if (s.phase === 'vote') {
                                <button class="sticky-vdec-btn"
                                        [disabled]="item.card.myVoteCount === 0"
                                        (mousedown)="$event.stopPropagation()" (click)="toggleVote(item.card)">−</button>
                              }
                              <span class="sticky-vote-count" [class.has-votes]="item.card.voteCount > 0">{{ item.card.voteCount }}</span>
                              @if (s.phase === 'vote') {
                                <button class="sticky-vinc-btn"
                                        [disabled]="voteBudget() === 0 && item.card.myVoteCount === 0"
                                        (mousedown)="$event.stopPropagation()" (click)="toggleVote(item.card)">+</button>
                              }
                            </div>
                          }
                          @if (s.phase === 'add' || s.phase === 'vote' || s.phase === 'discuss') {
                            <div class="sticky-color-trigger" (mousedown)="$event.stopPropagation()">
                              <button class="sticky-color-dot" [style.background]="resolveCardColor(item.card)"
                                      title="Change color" (click)="toggleColorPicker($event, item.card.id)"></button>
                            </div>
                          }
                        </div>
                        @if (s.phase === 'discuss') {
                          <div class="sticky-reactions">
                            @for (emoji of reactionEmojis; track emoji) {
                              <button class="sticky-reaction-btn" [class.reacted]="getReaction(item.card, emoji)?.mine"
                                      (mousedown)="$event.stopPropagation()" (click)="toggleReaction(item.card, emoji)">
                                {{ emoji }} @if (getReactionCount(item.card, emoji) > 0) { <span>{{ getReactionCount(item.card, emoji) }}</span> }
                              </button>
                            }
                          </div>
                        }
                        } <!-- end @else hidden -->
                      </div>
                    }
                  </div>
                  <div class="canvas-zoom-controls"
                       (mousedown)="$event.stopPropagation()" (wheel)="$event.stopPropagation()">
                    @if (cardsForCol(col.key).length > 1) {
                      <button class="canvas-tidy-btn" title="Arrange cards neatly"
                              (click)="arrangeColumn(col.key)">
                        <mat-icon>grid_view</mat-icon>Tidy
                      </button>
                    }
                    <button class="canvas-expand-btn" [title]="expandedCol() === col.key ? 'Show all columns' : 'Expand this column'"
                            (click)="toggleExpandColumn(col.key)">
                      <mat-icon>{{ expandedCol() === col.key ? 'close_fullscreen' : 'open_in_full' }}</mat-icon>
                    </button>
                    <span class="cz-divider"></span>
                    <button class="cz-btn" title="Zoom out" (click)="zoomBy(col.key, 0.8)">−</button>
                    <button class="cz-btn cz-pct" title="Reset zoom" (click)="resetView(col.key)">{{ zoomPercent(col.key) }}%</button>
                    <button class="cz-btn" title="Zoom in" (click)="zoomBy(col.key, 1.25)">+</button>
                    <button class="cz-btn cz-fit" title="Fit to cards" (click)="fitCanvas(col.key)">
                      <mat-icon>fit_screen</mat-icon>
                    </button>
                  </div>
                </div>
              </div>
              }
            }
          </div>
        }
        <!-- Done banner -->
        @if (s.phase === 'done') {
          <div class="done-banner">
            <div class="done-icon">🎉</div>
            <h2>Retro Complete</h2>
            <p>Great work team!</p>
          </div>
        }

        <!-- AI Analysis panel -->
        @if (s.aiAnalysis) {
          <div class="ai-panel">
            <div class="ai-panel-header">
              <span class="ai-badge"><mat-icon style="font-size:12px;height:12px;width:12px">auto_awesome</mat-icon>AI-generated</span>
              <span class="ai-panel-title">Retro Analysis</span>
            </div>

            @if (s.aiAnalysis.wellThemes.length) {
              <div class="ai-section">
                <div class="ai-section-label" style="color:#4caf50">What went well</div>
                <div class="ai-chips">
                  @for (t of s.aiAnalysis.wellThemes; track t) {
                    <span class="ai-chip">{{ t }}</span>
                  }
                </div>
              </div>
            }
            @if (s.aiAnalysis.betterThemes.length) {
              <div class="ai-section">
                <div class="ai-section-label" style="color:#ff9800">Areas to improve</div>
                <div class="ai-chips">
                  @for (t of s.aiAnalysis.betterThemes; track t) {
                    <span class="ai-chip">{{ t }}</span>
                  }
                </div>
              </div>
            }
            @if (s.aiAnalysis.keyInsights.length) {
              <div class="ai-section">
                <div class="ai-section-label">Key insights</div>
                <div class="ai-list">
                  @for (i of s.aiAnalysis.keyInsights; track i) {
                    <div class="ai-list-item">{{ i }}</div>
                  }
                </div>
              </div>
            }
            @if (s.aiAnalysis.suggestedActions.length) {
              <div class="ai-section">
                <div class="ai-section-label" style="color:#e91e8c">Suggested actions</div>
                <div class="ai-list">
                  @for (a of s.aiAnalysis.suggestedActions; track a) {
                    <div class="ai-list-item">{{ a }}</div>
                  }
                </div>
              </div>
            }
          </div>
        }
        @if (emojiPickerFor() && emojiPickerPos(); as pos) {
          <div class="emoji-picker-popover" [style.top.px]="pos.top" [style.left.px]="pos.left"
               (mousedown)="$event.stopPropagation()" (click)="$event.stopPropagation()">
            @for (emoji of emojiPalette; track emoji) {
              <div class="emoji-picker-option" (click)="pickEmoji(emoji)">{{ emoji }}</div>
            }
          </div>
        }
        @if (colorPickerCard(); as card) {
          @if (colorPickerPos(); as pos) {
            <div class="color-picker-popover" [style.top.px]="pos.top" [style.left.px]="pos.left"
                 (mousedown)="$event.stopPropagation()" (click)="$event.stopPropagation()">
              @for (swatch of stickyPalette; track swatch) {
                <div class="color-swatch" [style.background]="swatch"
                     [class.active]="resolveCardColor(card) === swatch"
                     (click)="changeCardColor(card, swatch)"></div>
              }
            </div>
          }
        }
      </div>
    }
  `
})
export class FunRetroComponent implements OnInit, AfterViewInit, OnDestroy {
  private svc = inject(FunRetroService);
  private wsSvc = inject(WebSocketService);
  authSvc = inject(AuthService);
  private pollSvc = inject(PollService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private elRef = inject(ElementRef);
  private navSvc = inject(NavService);

  cols = computed(() => {
    const s = this.session();
    if (s?.columns?.length) return s.columns;
    return DEFAULT_COLS;
  });
  reactionEmojis = REACTION_EMOJIS;

  sessions = signal<FunRetroSessionSummary[]>([]);
  session = signal<FunRetroSession | null>(null);
  loading = signal(false);

  /** Hide the Pulse hub's tab row while a retro session is open, to save vertical space. */
  private hideSubNavEffect = effect(() => {
    this.navSvc.hideSubNav.set(!!this.session());
    // Hiding/showing the hub's tab row changes the available width without firing a
    // window resize event, so the full-bleed canvas margins need a manual recompute.
    requestAnimationFrame(() => this.updateCanvasMargins());
  });

  creating = signal(false);

  newCardText = signal<Record<string, string>>({});
  submittingCard = signal<string | null>(null);

  advancingPhase = signal(false);
  revealing = signal(false);
  analysing = signal(false);

  // ── Phase timer ──
  timer = signal<TimerState | null>(null);
  private nowTick = signal(Date.now());
  private timerInterval?: ReturnType<typeof setInterval>;

  timerRemaining = computed(() => {
    const t = this.timer();
    this.nowTick(); // live dependency
    if (!t) return 0;
    if (!t.startedAt) return t.totalSeconds;
    const start = new Date(t.startedAt).getTime();
    if (t.pausedAt) {
      const paused = new Date(t.pausedAt).getTime();
      return Math.max(0, Math.round(t.totalSeconds - t.elapsedBeforePause - (paused - start) / 1000));
    }
    return Math.max(0, Math.round(t.totalSeconds - t.elapsedBeforePause - (Date.now() - start) / 1000));
  });
  timerExpired = computed(() => this.timerRemaining() <= 0 && !!this.timer()?.startedAt);
  timerRunning = computed(() => !!this.timer()?.startedAt && !this.timer()?.pausedAt && !this.timerExpired());
  timerDisplay = computed(() => this.formatTime(this.timerRemaining()));
  timerProgress = computed(() => Math.min(1, Math.max(0, 1 - this.timerRemaining() / (this.timer()?.totalSeconds ?? 1))));
  timerColor = computed(() => {
    const t = this.timer();
    if (!t) return '#64b5f6';
    const pct = this.timerRemaining() / t.totalSeconds;
    if (pct > 0.25) return '#64b5f6';
    if (pct > 0.1) return '#ff9800';
    return '#ef5350';
  });

  // ── Icebreaker ──
  icebreakerAnswers = signal<{ memberId: string; memberName: string; answer: string }[]>([]);
  icebreakerInput = '';
  submittingIcebreaker = signal(false);
  icebreakerQuestion = computed(() => {
    const s = this.session();
    if (s?.icebreakerQuestion) return s.icebreakerQuestion;
    const id = s?.id ?? '';
    return ICEBREAKER_QUESTIONS[hashStr(id) % ICEBREAKER_QUESTIONS.length];
  });

  // Some icebreaker questions embed a scale/prompt as emoji (e.g. "🐢 to 🚀", "🪫 🔋 ⚡ 🚀") --
  // split the question into text/emoji runs so the emoji can be rendered as clickable answer
  // shortcuts instead of just decorating the question.
  private static readonly EMOJI_RE = /\p{Extended_Pictographic}/u;
  icebreakerQuestionParts = computed(() => {
    const q = this.icebreakerQuestion();
    const parts: { text: string; emoji: boolean }[] = [];
    for (const ch of q) {
      const isEmoji = FunRetroComponent.EMOJI_RE.test(ch);
      const last = parts[parts.length - 1];
      if (last && last.emoji === isEmoji) last.text += ch;
      else parts.push({ text: ch, emoji: isEmoji });
    }
    return parts;
  });

  pickIcebreakerEmoji(emoji: string): void {
    this.icebreakerInput = (this.icebreakerInput ?? '') + emoji;
  }

  // ── Previous actions ──
  prevActions = signal<{ id: string; text: string; authorName: string | null }[]>([]);

  isDesktop = signal(typeof window !== 'undefined' ? window.innerWidth >= 800 : false);
  presence = signal<{ memberId: string; memberName: string }[]>([]);
  retroPolls = signal<PollDetail[]>([]);
  showPollsPanel = signal(false);
  showSettings = signal(false);
  groupingCardId = signal<string | null>(null);
  membersWithCards = computed(() => new Set(this.session()?.cards.map(c => c.authorId) ?? []));
  editingCardId = signal<string | null>(null);
  editingText = signal('');
  localPositions = signal<Record<string, { x: number; y: number }>>({});
  draggingId = signal<string | null>(null);
  private dragState: { id: string; col: string; startMouseX: number; startMouseY: number; startX: number; startY: number } | null = null;

  // ── Per-column Miro-style pan/zoom viewport ──
  canvasView = signal<Record<string, { zoom: number; panX: number; panY: number }>>({});
  panningCol = signal<string | null>(null);
  private panState: { col: string; startMouseX: number; startMouseY: number; startPanX: number; startPanY: number } | null = null;
  private readonly MIN_ZOOM = 0.3;
  private readonly MAX_ZOOM = 2;

  viewFor(col: string): { zoom: number; panX: number; panY: number } {
    return this.canvasView()[col] ?? { zoom: 1, panX: 0, panY: 0 };
  }
  private setView(col: string, v: { zoom: number; panX: number; panY: number }): void {
    const { panX, panY } = this.clampPan(col, v.zoom, v.panX, v.panY);
    this.canvasView.update(m => ({ ...m, [col]: { zoom: v.zoom, panX, panY } }));
  }

  /**
   * The canvas background/grid is visually endless, but there's nothing to see past the
   * cards -- without a bound, panning or zooming out lets you drift into empty space
   * indefinitely. Keep the content within `margin` px of the viewport edge instead.
   */
  private clampPan(col: string, zoom: number, panX: number, panY: number): { panX: number; panY: number } {
    const outer = this.outerEl(col);
    if (!outer) return { panX, panY };
    const outerW = outer.clientWidth || 400;
    const outerH = outer.clientHeight || 400;
    const items = this.canvasCardsForCol(col);
    const cardW = 200;
    const margin = 200;
    const contentMaxX = items.length ? Math.max(...items.map(i => i.x + cardW)) + 20 : 400;
    const contentMaxY = this.canvasHeight(col);
    const scaledW = contentMaxX * zoom;
    const scaledH = contentMaxY * zoom;
    const maxPanX = margin;
    const minPanX = Math.min(margin, outerW - scaledW - margin);
    const maxPanY = margin;
    const minPanY = Math.min(margin, outerH - scaledH - margin);
    return {
      panX: Math.min(maxPanX, Math.max(minPanX, panX)),
      panY: Math.min(maxPanY, Math.max(minPanY, panY)),
    };
  }
  private clampZoom(z: number): number {
    return Math.min(this.MAX_ZOOM, Math.max(this.MIN_ZOOM, z));
  }
  private outerEl(col: string): HTMLElement | null {
    return (this.elRef.nativeElement as HTMLElement)
      .querySelector(`.canvas-outer[data-col="${col}"]`) as HTMLElement | null;
  }
  zoomPercent(col: string): number {
    return Math.round(this.viewFor(col).zoom * 100);
  }
  resetView(col: string): void {
    this.closeAllPickers();
    this.setView(col, { zoom: 1, panX: 0, panY: 0 });
  }

  /** Zoom keeping the world point under (cx,cy) — viewport-local px — fixed. */
  private zoomAt(col: string, factor: number, cx: number, cy: number): void {
    const v = this.viewFor(col);
    const z = this.clampZoom(v.zoom * factor);
    const wx = (cx - v.panX) / v.zoom;
    const wy = (cy - v.panY) / v.zoom;
    this.setView(col, { zoom: z, panX: cx - wx * z, panY: cy - wy * z });
  }

  onCanvasWheel(e: WheelEvent, col: string): void {
    e.preventDefault();
    this.closeAllPickers();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.zoomAt(col, e.deltaY < 0 ? 1.1 : 0.9, e.clientX - rect.left, e.clientY - rect.top);
  }

  zoomBy(col: string, factor: number): void {
    this.closeAllPickers();
    const outer = this.outerEl(col);
    this.zoomAt(col, factor, (outer?.clientWidth ?? 0) / 2, (outer?.clientHeight ?? 0) / 2);
  }

  startPan(e: MouseEvent, col: string): void {
    if (e.button !== 0) return;
    const t = e.target as HTMLElement;
    if (t.closest('.sticky') || t.closest('.canvas-zoom-controls')) return;
    this.closeAllPickers();
    const v = this.viewFor(col);
    this.panState = { col, startMouseX: e.clientX, startMouseY: e.clientY, startPanX: v.panX, startPanY: v.panY };
    this.panningCol.set(col);
  }

  /** Reset zoom/pan and frame all of a column's cards within its viewport. */
  fitCanvas(col: string): void {
    this.closeAllPickers();
    const outer = this.outerEl(col);
    const items = this.canvasCardsForCol(col);
    if (!outer || items.length === 0) { this.setView(col, { zoom: 1, panX: 0, panY: 0 }); return; }
    const inner = outer.querySelector('.canvas-inner') as HTMLElement | null;
    const stickies = inner
      ? (Array.from(inner.querySelectorAll(':scope > .sticky')) as HTMLElement[])
      : [];
    const cardW = 200;
    const pad = 20;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach((item, i) => {
      const h = stickies[i]?.offsetHeight || 90;
      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);
      maxX = Math.max(maxX, item.x + cardW);
      maxY = Math.max(maxY, item.y + h);
    });
    const contentW = (maxX - minX) + pad * 2;
    const contentH = (maxY - minY) + pad * 2;
    const zoom = this.clampZoom(Math.min(outer.clientWidth / contentW, outer.clientHeight / contentH, 1));
    const slackX = outer.clientWidth - contentW * zoom;
    const slackY = outer.clientHeight - contentH * zoom;
    const offX = slackX > 0 ? slackX / 2 : 0;
    const offY = slackY > 0 ? slackY / 2 : 8;
    this.setView(col, { zoom, panX: offX - (minX - pad) * zoom, panY: offY - (minY - pad) * zoom });
  }

  // Real rendered .sticky width is 200px (see CSS) -- also used by arrangeColumn/fitCanvas.
  // STICKY_GAP mirrors arrangeColumn's card spacing so the fallback grid and Tidy agree.
  private readonly STICKY_W = 200;
  private readonly STICKY_GAP = 16;
  private readonly STICKY_MARGIN = 10;

  canvasCardsForCol(colKey: string) {
    const s = this.session();
    if (!s) return [];
    const localPos = this.localPositions();
    const occupied: { x: number; y: number }[] = [];
    const result: { card: FunRetroCard; x: number; y: number }[] = [];
    let idx = 0;
    for (const card of s.cards.filter(c => c.column === colKey)) {
      const local = localPos[card.id];
      if (local) {
        result.push({ card, x: local.x, y: local.y });
        occupied.push(local);
        continue;
      }
      if (card.positionX != null && card.positionY != null) {
        const pos = { x: card.positionX, y: card.positionY };
        result.push({ card, x: pos.x, y: pos.y });
        occupied.push(pos);
        continue;
      }
      // Skip any grid slot already taken by a dragged/persisted card so new
      // cards never land directly on top of one.
      let x: number, y: number;
      do {
        const col = idx % 2;
        const row = Math.floor(idx / 2);
        x = col * (this.STICKY_W + this.STICKY_GAP) + this.STICKY_MARGIN;
        y = 10 + row * 190;
        idx++;
      } while (occupied.some(p => Math.abs(p.x - x) < (this.STICKY_W + this.STICKY_GAP) && Math.abs(p.y - y) < 190));
      result.push({ card, x, y });
      occupied.push({ x, y });
    }
    return result;
  }

  canvasHeight(colKey: string): number {
    const cards = this.canvasCardsForCol(colKey);
    if (cards.length === 0) return 400;
    const maxY = Math.max(...cards.map(c => c.y + 200));
    return Math.max(400, maxY + 20);
  }

  private canvasResizeObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    this.updateCanvasMargins();
    // Any reflow above the canvas (settings/polls panels, phase banners, etc.) changes
    // how much vertical space is left for it — recompute instead of leaving dead space.
    if (typeof ResizeObserver !== 'undefined') {
      this.canvasResizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => this.updateCanvasMargins());
      });
      this.canvasResizeObserver.observe(this.elRef.nativeElement);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isDesktop.set(window.innerWidth >= 800);
    this.updateCanvasMargins();
  }

  private updateCanvasMargins(): void {
    const el = this.elRef.nativeElement as HTMLElement;
    const rect = el.getBoundingClientRect();
    const gutter = 8;
    const contentEl = el.closest('.content') as HTMLElement | null;
    const contentLeft = contentEl ? contentEl.getBoundingClientRect().left : 0;
    const contentRight = contentEl ? contentEl.getBoundingClientRect().right : window.innerWidth;
    el.style.setProperty('--canvas-ml', `-${rect.left - contentLeft - gutter}px`);
    el.style.setProperty('--canvas-mr', `-${contentRight - rect.right - gutter}px`);

    // Let the canvas fill whatever vertical space is actually left below it, instead of
    // a fixed height guess that leaves dead space once the chrome above it shrinks/grows.
    // Measured from .canvas-outer itself (not .canvases-row) since each column's own
    // header + add-card input sit above it within the row.
    const canvasOuter = el.querySelector('.canvas-outer') as HTMLElement | null;
    if (canvasOuter) {
      const bottomGutter = 16;
      const availHeight = window.innerHeight - canvasOuter.getBoundingClientRect().top - bottomGutter;
      el.style.setProperty('--canvas-height', `${Math.max(availHeight, 320)}px`);
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (this.panState) {
      const p = this.panState;
      const v = this.viewFor(p.col);
      this.setView(p.col, {
        zoom: v.zoom,
        panX: p.startPanX + (e.clientX - p.startMouseX),
        panY: p.startPanY + (e.clientY - p.startMouseY),
      });
      return;
    }
    if (!this.dragState) return;
    // Mouse deltas are in screen px; convert to canvas px by the column's zoom.
    const zoom = this.viewFor(this.dragState.col).zoom;
    const dx = (e.clientX - this.dragState.startMouseX) / zoom;
    const dy = (e.clientY - this.dragState.startMouseY) / zoom;
    const x = Math.max(0, this.dragState.startX + dx);
    const y = Math.max(0, this.dragState.startY + dy);
    this.localPositions.update(p => ({ ...p, [this.dragState!.id]: { x, y } }));
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (this.panState) {
      this.panState = null;
      this.panningCol.set(null);
      return;
    }
    if (!this.dragState) return;
    const { id } = this.dragState;
    const s = this.session();
    const pos = this.localPositions()[id];
    if (s && pos) this.svc.updateCardPosition(s.id, id, pos.x, pos.y).subscribe();
    this.dragState = null;
    this.draggingId.set(null);
  }

  /**
   * Re-pack a column's cards into a tidy, non-overlapping masonry grid.
   * Uses each card's real rendered height (cards vary in height with text /
   * votes / reactions), placing each into the currently shortest grid column
   * so nothing overlaps and vertical gaps stay minimal. New positions are
   * applied optimistically and persisted.
   */
  arrangeColumn(colKey: string): void {
    const s = this.session();
    if (!s) return;
    const items = this.canvasCardsForCol(colKey);
    if (items.length === 0) return;
    this.closeAllPickers();

    const el = this.elRef.nativeElement as HTMLElement;
    const inner = el.querySelector(
      `.canvas-outer[data-col="${colKey}"] .canvas-inner`,
    ) as HTMLElement | null;
    const stickies = inner
      ? (Array.from(inner.querySelectorAll(':scope > .sticky')) as HTMLElement[])
      : [];

    const cardW = 200;
    const gap = 16;
    const margin = this.STICKY_MARGIN;
    const innerW = inner?.clientWidth ?? cardW * 2 + gap + margin * 2;
    const numCols = Math.max(1, Math.floor((innerW - margin * 2 + gap) / (cardW + gap)));

    // Bottom Y of the content already placed in each grid column.
    const colBottom = new Array(numCols).fill(margin);
    const updates: { id: string; x: number; y: number }[] = [];

    items.forEach((item, i) => {
      // Prefer the real measured height; fall back to the CSS min-height.
      const h = stickies[i]?.offsetHeight || 90;
      let target = 0;
      for (let c = 1; c < numCols; c++) {
        if (colBottom[c] < colBottom[target]) target = c;
      }
      const x = margin + target * (cardW + gap);
      const y = colBottom[target];
      colBottom[target] = y + h + gap;
      updates.push({ id: item.card.id, x, y });
    });

    // Apply optimistically so the layout snaps immediately, then persist.
    this.localPositions.update(p => {
      const next = { ...p };
      for (const u of updates) next[u.id] = { x: u.x, y: u.y };
      return next;
    });
    for (const u of updates) {
      this.svc.updateCardPosition(s.id, u.id, u.x, u.y).subscribe();
    }
  }

  startDrag(e: MouseEvent, card: FunRetroCard, x: number, y: number, col: string): void {
    const s = this.session();
    if (e.button !== 0 || s?.phase === 'done') return;
    e.preventDefault();
    this.dragState = { id: card.id, col, startMouseX: e.clientX, startMouseY: e.clientY, startX: x, startY: y };
    this.draggingId.set(card.id);
  }

  @HostListener('document:click')
  onDocClick(): void {
    this.closeAllPickers();
  }

  // Color/emoji popovers are position:fixed, anchored to a button's screen position at the
  // moment they open. Panning or zooming the canvas underneath moves the card but not the
  // popover, so it visually detaches from what it's supposed to be editing. Close them
  // whenever the canvas view is about to move instead of leaving them stranded.
  private closeAllPickers(): void {
    if (this.colorPickerOpenFor()) { this.colorPickerOpenFor.set(null); this.colorPickerPos.set(null); }
    if (this.timerPopoverOpen()) this.timerPopoverOpen.set(false);
    if (this.emojiPickerFor()) { this.emojiPickerFor.set(null); this.emojiPickerPos.set(null); }
  }

  timerPopoverOpen = signal(false);

  toggleTimerPopover(e: MouseEvent): void {
    e.stopPropagation();
    this.timerPopoverOpen.update(v => !v);
  }

  readonly stickyPalette = [
    '#fff9c4', '#ffe0b2', '#fce4ec', '#c8e6c9',
    '#bbdefb', '#e1bee7', '#ffcdd2', '#b2dfdb',
    '#f5f5f5', '#ffe082', '#a5d6a7', '#90caf9',
  ];

  private colDefaultColor: Record<string, string> = {
    well: '#c8e6c9', better: '#ffe0b2', action: '#fce4ec',
  };

  colorPickerOpenFor = signal<string | null>(null);
  // The popover renders once at the top level (see template) instead of once per card --
  // resolve which card it's editing from the open id so it isn't nested inside the
  // pan/zoom-transformed canvas (a transformed ancestor breaks position:fixed).
  colorPickerCard = computed(() => {
    const id = this.colorPickerOpenFor();
    return id ? (this.session()?.cards.find(c => c.id === id) ?? null) : null;
  });

  resolveCardColor(card: FunRetroCard): string {
    return card.color ?? this.colDefaultColor[card.column] ?? '#fff9c4';
  }

  colorPickerPos = signal<{ top: number; left: number } | null>(null);

  toggleColorPicker(e: MouseEvent, cardId: string): void {
    e.stopPropagation();
    const opening = this.colorPickerOpenFor() !== cardId;
    this.colorPickerOpenFor.set(opening ? cardId : null);
    if (opening) {
      // Position via the viewport (not the scrollable canvas) so the popover can't be
      // clipped by the canvas's overflow:auto when the card sits near its top edge.
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      this.colorPickerPos.set({ top: rect.bottom + 6, left: Math.max(8, rect.right - 94) });
    } else {
      this.colorPickerPos.set(null);
    }
  }

  changeCardColor(card: FunRetroCard, color: string): void {
    const s = this.session();
    if (!s) return;
    this.colorPickerOpenFor.set(null);
    this.colorPickerPos.set(null);
    // Remember this as the default for the column so new cards inherit it.
    this.colDefaultColor = { ...this.colDefaultColor, [card.column]: color };
    // Optimistic local update
    this.session.update(cur => {
      if (!cur) return cur;
      return { ...cur, cards: cur.cards.map(c => c.id === card.id ? { ...c, color } : c) };
    });
    this.svc.updateCardColor(s.id, card.id, color).subscribe();
  }

  // When set, only this column's canvas renders in the desktop 3-up row -- the
  // other two are hidden so the visible one gets the full width for a closer look.
  expandedCol = signal<string | null>(null);

  toggleExpandColumn(colKey: string): void {
    this.closeAllPickers();
    this.expandedCol.update(cur => (cur === colKey ? null : colKey));
    // Give the DOM a tick to reflow to the new width before recomputing canvas height.
    requestAnimationFrame(() => this.updateCanvasMargins());
  }

  readonly emojiPalette = EMOJI_PICKER_SET;
  // 'icebreaker' or `card:${colKey}` -- identifies which text field the next pick inserts into.
  emojiPickerFor = signal<string | null>(null);
  emojiPickerPos = signal<{ top: number; left: number } | null>(null);

  toggleEmojiPicker(e: MouseEvent, target: string): void {
    e.stopPropagation();
    const opening = this.emojiPickerFor() !== target;
    this.emojiPickerFor.set(opening ? target : null);
    if (opening) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      this.emojiPickerPos.set({ top: rect.bottom + 6, left: Math.max(8, rect.right - 246) });
    } else {
      this.emojiPickerPos.set(null);
    }
  }

  pickEmoji(emoji: string): void {
    const target = this.emojiPickerFor();
    if (!target) return;
    if (target === 'icebreaker') {
      this.icebreakerInput = (this.icebreakerInput ?? '') + emoji;
    } else if (target.startsWith('card:')) {
      const colKey = target.slice('card:'.length);
      this.newCardText.update(m => ({ ...m, [colKey]: (m[colKey] ?? '') + emoji }));
    }
    this.emojiPickerFor.set(null);
    this.emojiPickerPos.set(null);
  }

  myCards = computed(() => this.session()?.cards.filter(c => c.isOwn) ?? []);
  voteBudget = computed(() => {
    const s = this.session();
    if (!s) return 3;
    const used = s.cards.reduce((n, c) => n + c.myVoteCount, 0);
    return Math.max(0, 3 - used);
  });

  phases = ['lobby', 'add', 'vote', 'discuss', 'done'] as const;
  nextPhase = computed(() => {
    const s = this.session();
    if (!s) return null;
    const idx = this.phases.indexOf(s.phase as any);
    return idx >= 0 && idx < this.phases.length - 1 ? this.phases[idx + 1] : null;
  });

  private destroy$ = new Subject<void>();
  private wsSub?: Subscription;

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.openSession(id);
    } else {
      this.loadSessions();
    }
    this.timerInterval = setInterval(() => this.nowTick.set(Date.now()), 1000);
    // Every other WS-consuming feature calls connect() on init (e.g. sprint-dashboard).
    // Retro never did -- it only worked when some other page had already opened the
    // singleton socket first. Anyone landing here directly (shared link, fresh tab,
    // page refresh) never got real-time updates.
    this.wsSvc.connect();
    this.wsSub = this.wsSvc.messages$.pipe(takeUntil(this.destroy$)).subscribe(msg => {
      if (!msg) return;
      const s = this.session();
      if (!s) return;
      switch (msg.type) {
        case 'fun_retro_card_added':
        case 'fun_retro_voted':
        case 'fun_retro_reacted':
          if (msg.data['sessionId'] === s.id) this.silentRefresh();
          break;
        case 'fun_retro_phase_changed':
          if (msg.data['sessionId'] === s.id) {
            this.timer.set(null); // reset timer on phase change
            this.silentRefresh();
          }
          break;
        case 'fun_retro_timer_updated':
          if (msg.data['sessionId'] === s.id) {
            const tj = msg.data['timerJson'] as string | null;
            this.timer.set(tj ? JSON.parse(tj) : null);
          }
          break;
        case 'fun_retro_icebreaker_answered':
          if (msg.data['sessionId'] === s.id) {
            const memberId = msg.data['memberId'] as string;
            const memberName = msg.data['memberName'] as string;
            const answer = msg.data['answer'] as string;
            this.icebreakerAnswers.update(list => [
              ...list.filter(a => a.memberId !== memberId),
              { memberId, memberName, answer },
            ]);
          }
          break;
        case 'fun_retro_analysed':
          if (msg.data['sessionId'] === s.id) this.silentRefresh();
          break;
        case 'fun_retro_card_moved':
          if (msg.data['sessionId'] === s.id && this.dragState?.id !== msg.data['cardId']) {
            const { cardId, x, y } = msg.data as { cardId: string; x: number; y: number };
            this.localPositions.update(p => ({ ...p, [cardId]: { x, y } }));
          }
          break;
        case 'fun_retro_card_color_changed':
          if (msg.data['sessionId'] === s.id) {
            const cardId = msg.data['cardId'] as string;
            const color = msg.data['color'] as string | null;
            this.session.update(cur => {
              if (!cur) return cur;
              return { ...cur, cards: cur.cards.map(c => c.id === cardId ? { ...c, color } : c) };
            });
          }
          break;
        case 'fun_retro_settings_updated':
          if (msg.data['sessionId'] === s.id) {
            this.session.update(cur => cur ? {
              ...cur,
              hideCardsOnAdd: msg.data['hideCardsOnAdd'] as boolean,
              participationTracking: msg.data['participationTracking'] as boolean,
            } : cur);
          }
          break;
        case 'fun_retro_card_text_updated':
          if (msg.data['sessionId'] === s.id) {
            const cardId = msg.data['cardId'] as string;
            const text = msg.data['text'] as string;
            this.session.update(cur => {
              if (!cur) return cur;
              return { ...cur, cards: cur.cards.map(c => c.id === cardId ? { ...c, text } : c) };
            });
          }
          break;
        case 'fun_retro_card_grouped':
          if (msg.data['sessionId'] === s.id) {
            const cardId = msg.data['cardId'] as string;
            const groupId = msg.data['groupId'] as string | null;
            this.session.update(cur => {
              if (!cur) return cur;
              return { ...cur, cards: cur.cards.map(c => c.id === cardId ? { ...c, groupId } : c) };
            });
          }
          break;
        case 'fun_retro_revealed':
          if (msg.data['sessionId'] === s.id) {
            this.revealing.set(true);
            setTimeout(() => { this.revealing.set(false); this.silentRefresh(); }, 1500);
          }
          break;
        case 'fun_retro_presence':
          if (msg.data['sessionId'] === s.id) {
            this.presence.set(msg.data['members'] as { memberId: string; memberName: string }[]);
          }
          break;
        case 'poll_created':
        case 'poll_vote_cast':
        case 'poll_closed':
        case 'poll_deleted':
          if (msg.data['retroSessionId'] === s.id) {
            this.loadRetroPolls(s.id);
          }
          break;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.wsSvc.send({ type: 'leave_retro' });
    this.navSvc.hideSubNav.set(false);
    this.canvasResizeObserver?.disconnect();
  }

  loadSessions(): void {
    this.loading.set(true);
    this.svc.getSessions().subscribe({
      next: list => { this.sessions.set(list); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Failed to load sessions', 'OK', { duration: 3000 }); }
    });
  }

  deleteSession(event: Event, s: FunRetroSessionSummary): void {
    event.stopPropagation();
    this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: { title: `Delete "${s.title || 'Untitled Retro'}"?`, message: "This can't be undone.", danger: true }
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.svc.deleteSession(s.id).subscribe({
        next: () => {
          this.sessions.update(list => list.filter(x => x.id !== s.id));
          this.snackBar.open('Retro deleted', 'OK', { duration: 2000 });
        },
        error: () => this.snackBar.open('Failed to delete retro', 'OK', { duration: 3000 })
      });
    });
  }

  openSession(id: string): void {
    this.loading.set(true);
    this.svc.getSession(id).subscribe({
      next: s => {
        this.session.set(s);
        this.applyExtras(s, true);
        this.loading.set(false);
        this.router.navigate(['/pulse/retro', id], { replaceUrl: true });
        this.joinRetroPresence(id);
        this.loadRetroPolls(id);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load session', 'OK', { duration: 3000 });
        this.loadSessions();
      }
    });
  }

  private joinRetroPresence(sessionId: string): void {
    const me = this.authSvc.me;
    const memberName = me ? `${me.firstName} ${me.lastName}`.trim() : null;
    // send() silently drops the message if the socket isn't OPEN yet -- a real risk right
    // after ngOnInit's own connect() call, since the HTTP session fetch above often resolves
    // before the WS handshake finishes. Wait for an actual open connection instead of racing it.
    this.wsSvc.connected$.pipe(filter(c => c), take(1), takeUntil(this.destroy$)).subscribe(() => {
      this.wsSvc.send({ type: 'join_retro', sessionId, memberName });
    });
  }

  loadRetroPolls(sessionId: string): void {
    this.pollSvc.getRetroPolls(sessionId).subscribe({
      next: polls => this.retroPolls.set(polls),
      error: () => {}
    });
  }

  openPollDialog(): void {
    const s = this.session();
    if (!s) return;
    const ref = this.dialog.open(CreatePollDialogComponent, { width: '460px', panelClass: 'dark-dialog' });
    ref.afterClosed().subscribe(result => {
      if (!result) return;
      this.pollSvc.create({ ...result, retroSessionId: s.id }).subscribe({
        next: poll => this.retroPolls.update(list => [poll, ...list]),
        error: () => this.snackBar.open('Failed to create poll', 'OK', { duration: 3000 })
      });
    });
  }

  votePoll(poll: PollDetail, optionId: string): void {
    this.pollSvc.vote(poll.id, optionId).subscribe({
      next: updated => this.retroPolls.update(list => list.map(p => p.id === updated.id ? updated : p)),
      error: () => {}
    });
  }

  closePoll(poll: PollDetail): void {
    this.pollSvc.close(poll.id).subscribe({
      next: updated => this.retroPolls.update(list => list.map(p => p.id === updated.id ? updated : p)),
      error: () => {}
    });
  }

  deletePoll(poll: PollDetail): void {
    this.pollSvc.delete(poll.id).subscribe({
      next: () => this.retroPolls.update(list => list.filter(p => p.id !== poll.id)),
      error: () => {}
    });
  }

  startGrouping(cardId: string): void {
    const current = this.groupingCardId();
    if (current === cardId) {
      this.groupingCardId.set(null);
      return;
    }
    this.groupingCardId.set(cardId);
  }

  mergeIntoGroup(targetCard: FunRetroCard): void {
    const sourceId = this.groupingCardId();
    const s = this.session();
    if (!sourceId || !s || sourceId === targetCard.id) {
      this.groupingCardId.set(null);
      return;
    }
    // Assign the same groupId (use targetCard's existing groupId or its id as the group anchor)
    const groupId = targetCard.groupId ?? targetCard.id;
    this.groupingCardId.set(null);
    this.svc.setCardGroup(s.id, sourceId, groupId).subscribe({
      next: () => {
        this.session.update(cur => {
          if (!cur) return cur;
          return { ...cur, cards: cur.cards.map(c => c.id === sourceId ? { ...c, groupId } : c) };
        });
      }
    });
    // Also assign sourceCard to the group if targetCard has no group yet
    if (!targetCard.groupId) {
      this.svc.setCardGroup(s.id, targetCard.id, groupId).subscribe({
        next: () => {
          this.session.update(cur => {
            if (!cur) return cur;
            return { ...cur, cards: cur.cards.map(c => c.id === targetCard.id ? { ...c, groupId } : c) };
          });
        }
      });
    }
  }

  ungroupCard(cardId: string): void {
    const s = this.session();
    if (!s) return;
    this.svc.setCardGroup(s.id, cardId, null).subscribe({
      next: () => {
        this.session.update(cur => {
          if (!cur) return cur;
          return { ...cur, cards: cur.cards.map(c => c.id === cardId ? { ...c, groupId: null } : c) };
        });
      }
    });
  }

  getGroupedCards(cards: { id: string; groupId: string | null }[]): Map<string, typeof cards> {
    const groups = new Map<string, typeof cards>();
    for (const card of cards) {
      if (card.groupId) {
        const list = groups.get(card.groupId) ?? [];
        list.push(card);
        groups.set(card.groupId, list);
      }
    }
    return groups;
  }

  toggleSetting(key: 'hideCardsOnAdd' | 'participationTracking'): void {
    const s = this.session();
    if (!s || !s.isCreator) return;
    const updated = { hideCardsOnAdd: s.hideCardsOnAdd, participationTracking: s.participationTracking, [key]: !s[key] };
    this.session.update(cur => cur ? { ...cur, ...updated } : cur);
    this.svc.updateSettings(s.id, updated).subscribe({ error: () => this.silentRefresh() });
  }

  startEditCard(card: FunRetroCard): void {
    this.editingCardId.set(card.id);
    this.editingText.set(card.text ?? '');
  }

  saveCardText(card: FunRetroCard): void {
    const s = this.session();
    if (!s) return;
    const text = this.editingText().trim();
    this.editingCardId.set(null);
    if (!text || text === card.text) return;
    this.svc.updateCardText(s.id, card.id, text).subscribe({
      next: () => {
        this.session.update(cur => {
          if (!cur) return cur;
          return { ...cur, cards: cur.cards.map(c => c.id === card.id ? { ...c, text } : c) };
        });
      }
    });
  }

  cancelEditCard(): void {
    this.editingCardId.set(null);
    this.editingText.set('');
  }

  groupsForCol(colKey: string): { groupId: string; cards: FunRetroCard[] }[] {
    const cards = this.cardsForCol(colKey);
    const map = new Map<string, typeof cards>();
    for (const c of cards) {
      if (c.groupId) {
        const list = map.get(c.groupId) ?? [];
        list.push(c);
        map.set(c.groupId, list);
      }
    }
    return Array.from(map.entries()).map(([groupId, cards]) => ({ groupId, cards }));
  }

  ungroupedCardsForCol(colKey: string) {
    return this.cardsForCol(colKey).filter(c => !c.groupId);
  }

  silentRefresh(): void {
    const s = this.session();
    if (!s) return;
    this.svc.getSession(s.id).subscribe({
      next: updated => {
        this.session.set(updated);
        // WS owns the timer signal; only re-sync icebreaker answers here
        this.applyExtras(updated, false);
      },
      error: () => {}
    });
  }

  /** Sync timer (optional) + icebreaker answers from a freshly loaded session; load prev actions in lobby. */
  private applyExtras(s: FunRetroSession, syncTimer: boolean): void {
    this.icebreakerAnswers.set(s.icebreakerAnswers ?? []);
    if (syncTimer) {
      this.timer.set(s.timerJson ? JSON.parse(s.timerJson) : null);
      const cols = s.columns?.length ? s.columns : DEFAULT_COLS;
      const blank: Record<string, string> = {};
      cols.forEach(c => blank[c.key] = '');
      this.newCardText.set(blank);
    }
    if (s.phase === 'lobby') {
      this.loadPrevActions(s.id);
    } else {
      this.prevActions.set([]);
    }
  }

  private loadPrevActions(sessionId: string): void {
    this.svc.getPreviousActions(sessionId).subscribe({
      next: list => this.prevActions.set(list),
      error: () => {}
    });
  }

  // ── Timer controls (creator only) ──
  private saveTimer(state: TimerState): void {
    this.timer.set(state);
    const s = this.session();
    if (!s) return;
    this.svc.setTimer(s.id, state).subscribe({
      error: () => this.snackBar.open('Failed to update timer', 'OK', { duration: 3000 })
    });
  }

  toggleTimer(): void {
    const t = this.timer();
    const total = t?.totalSeconds ?? 300;
    if (!t || !t.startedAt) {
      // start (or first start)
      this.saveTimer({ totalSeconds: total, startedAt: new Date().toISOString(), pausedAt: null, elapsedBeforePause: t?.elapsedBeforePause ?? 0 });
    } else if (t.pausedAt) {
      // resume — accumulate the paused segment
      const start = new Date(t.startedAt).getTime();
      const paused = new Date(t.pausedAt).getTime();
      const elapsed = (t.elapsedBeforePause ?? 0) + (paused - start) / 1000;
      this.saveTimer({ totalSeconds: total, startedAt: new Date().toISOString(), pausedAt: null, elapsedBeforePause: elapsed });
    } else {
      // running — pause
      this.saveTimer({ ...t, pausedAt: new Date().toISOString() });
    }
  }

  addTimerMinutes(mins: number): void {
    const t = this.timer() ?? { totalSeconds: 300, startedAt: null, pausedAt: null, elapsedBeforePause: 0 };
    this.saveTimer({ ...t, totalSeconds: Math.max(60, t.totalSeconds + mins * 60) });
  }

  resetTimer(): void {
    this.saveTimer({ totalSeconds: this.timer()?.totalSeconds ?? 300, startedAt: null, pausedAt: null, elapsedBeforePause: 0 });
  }

  setTimerPreset(seconds: number): void {
    this.saveTimer({ totalSeconds: seconds, startedAt: new Date().toISOString(), pausedAt: null, elapsedBeforePause: 0 });
  }

  formatTime(totalSecs: number): string {
    const s = Math.max(0, Math.floor(totalSecs));
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  // ── Icebreaker ──
  submitIcebreaker(): void {
    const s = this.session();
    if (!s) return;
    const ans = this.icebreakerInput.trim();
    if (!ans) return;
    this.submittingIcebreaker.set(true);
    this.svc.submitIcebreakerAnswer(s.id, ans).subscribe({
      next: list => {
        this.icebreakerAnswers.set(list);
        this.icebreakerInput = '';
        this.submittingIcebreaker.set(false);
      },
      error: () => {
        this.submittingIcebreaker.set(false);
        this.snackBar.open('Failed to submit answer', 'OK', { duration: 3000 });
      }
    });
  }

  // ── Previous actions ──
  carryForward(a: { id: string; text: string; authorName: string | null }): void {
    const s = this.session();
    if (!s) return;
    this.svc.addCard(s.id, 'action', a.text).subscribe({
      next: updated => {
        this.session.set(updated);
        this.prevActions.update(list => list.filter(x => x.id !== a.id));
      },
      error: () => this.snackBar.open('Failed to carry forward', 'OK', { duration: 3000 })
    });
  }

  shareSession(s: FunRetroSession): void {
    const url = `${window.location.origin}/pulse/retro/${s.id}`;
    const title = s.title || 'Retro Session';
    const text = `Join our retro — "${title}"`;

    if (navigator.share) {
      navigator.share({ title, text, url }).catch(() => {});
    } else {
      const wa = `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`;
      window.open(wa, '_blank');
    }
  }

  backToList(): void {
    this.session.set(null);
    this.loadSessions();
    this.router.navigate(['/pulse/retro'], { replaceUrl: true });
  }

  openNewRetroDialog(): void {
    this.dialog.open(NewRetroDialogComponent, { width: '640px' })
      .afterClosed().subscribe((result?: NewRetroDialogResult) => {
        if (!result) return;
        this.createSession(result);
      });
  }

  private createSession(result: NewRetroDialogResult): void {
    this.creating.set(true);
    const template = RETRO_TEMPLATES.find(t => t.id === result.templateId);
    const req: { title?: string; columns?: RetroColumn[]; icebreakerQuestion?: string } = {
      columns: template?.columns ?? DEFAULT_COLS,
    };
    if (result.title) req.title = result.title;
    if (result.icebreakerQuestion) req.icebreakerQuestion = result.icebreakerQuestion;
    this.svc.createSession(req).subscribe({
      next: s => {
        this.creating.set(false);
        this.session.set(s);
        this.applyExtras(s, true);
      },
      error: () => {
        this.creating.set(false);
        this.snackBar.open('Failed to create session', 'OK', { duration: 3000 });
      }
    });
  }

  cardsForCol(colKey: string): FunRetroCard[] {
    const s = this.session();
    if (!s) return [];
    const cards = s.cards.filter(c => c.column === colKey);
    if (s.phase === 'discuss') {
      return [...cards].sort((a, b) => b.voteCount - a.voteCount);
    }
    return cards;
  }

  hiddenCardCountForCol(colKey: string): number {
    const s = this.session();
    if (!s) return 0;
    return s.cards.filter(c => c.column === colKey && c.text === null).length;
  }

  submitCard(colKey: string): void {
    const s = this.session();
    if (!s) return;
    const text = this.newCardText()[colKey]?.trim();
    if (!text) return;
    this.submittingCard.set(colKey);
    this.svc.addCard(s.id, colKey, text).subscribe({
      next: updated => {
        this.session.set(updated);
        this.newCardText.update(m => ({ ...m, [colKey]: '' }));
        this.submittingCard.set(null);
      },
      error: () => {
        this.submittingCard.set(null);
        this.snackBar.open('Failed to add card', 'OK', { duration: 3000 });
      }
    });
  }

  deleteCard(card: FunRetroCard): void {
    const s = this.session();
    if (!s) return;
    this.svc.deleteCard(s.id, card.id).subscribe({
      next: () => this.silentRefresh(),
      error: () => this.snackBar.open('Failed to delete card', 'OK', { duration: 3000 })
    });
  }

  runAnalysis(): void {
    const s = this.session();
    if (!s) return;
    this.analysing.set(true);
    this.svc.analyse(s.id).subscribe({
      next: analysis => {
        this.analysing.set(false);
        this.session.update(cur => cur ? { ...cur, aiAnalysis: analysis } : cur);
      },
      error: () => {
        this.analysing.set(false);
        this.snackBar.open('AI analysis failed — check that an AnalyseRetroCards prompt is configured', 'OK', { duration: 5000 });
      }
    });
  }

  advancePhase(): void {
    const s = this.session();
    const next = this.nextPhase();
    if (!s || !next) return;
    this.advancingPhase.set(true);
    this.svc.setPhase(s.id, next).subscribe({
      next: updated => { this.session.set(updated); this.timer.set(null); this.prevActions.set([]); this.advancingPhase.set(false); },
      error: () => { this.advancingPhase.set(false); this.snackBar.open('Failed to advance phase', 'OK', { duration: 3000 }); }
    });
  }

  toggleVote(card: FunRetroCard): void {
    const s = this.session();
    if (!s) return;
    this.svc.toggleVote(s.id, card.id).subscribe({
      next: () => this.silentRefresh(),
      error: () => this.snackBar.open('Failed to vote', 'OK', { duration: 3000 })
    });
  }

  toggleReaction(card: FunRetroCard, emoji: string): void {
    const s = this.session();
    if (!s) return;
    this.svc.toggleReaction(s.id, card.id, emoji).subscribe({
      next: () => this.silentRefresh(),
      error: () => this.snackBar.open('Failed to react', 'OK', { duration: 3000 })
    });
  }

  getReaction(card: FunRetroCard, emoji: string) {
    return card.reactions?.find(r => r.emoji === emoji);
  }

  getReactionCount(card: FunRetroCard, emoji: string): number {
    return card.reactions?.find(r => r.emoji === emoji)?.count ?? 0;
  }

  readonly retroSteps = [
    { phase: 'add',     label: 'Add Cards' },
    { phase: 'vote',    label: 'Vote' },
    { phase: 'discuss', label: 'Discuss' },
    { phase: 'done',    label: 'Done' },
  ];

  stepStateFor(currentPhase: string, stepPhase: string): 'done' | 'active' | 'pending' {
    const order = ['add', 'vote', 'discuss', 'done'];
    const cur = order.indexOf(currentPhase);
    const step = order.indexOf(stepPhase);
    if (cur > step) return 'done';
    if (cur === step) return 'active';
    return 'pending';
  }

  phaseGuide(phase: string): { icon: string; text: string } {
    const guides: Record<string, { icon: string; text: string }> = {
      add:     { icon: 'edit_note',    text: 'Add your thoughts to each column. Your cards are hidden from others until the host moves on.' },
      vote:    { icon: 'how_to_vote',  text: 'Cards are now revealed. Use your 3 votes on the items that matter most to you.' },
      discuss: { icon: 'forum',        text: 'Work through the top-voted items together. React to cards as you discuss each one.' },
      done:    { icon: 'task_alt',     text: 'Retro complete! Review the summary and make sure action items are captured.' },
    };
    return guides[phase] ?? { icon: 'info', text: '' };
  }

  phaseLabel(phase: string): string {
    return PHASE_META[phase]?.label ?? phase;
  }

  phaseColor(phase: string): string {
    return PHASE_META[phase]?.color ?? '#64b5f6';
  }
}
