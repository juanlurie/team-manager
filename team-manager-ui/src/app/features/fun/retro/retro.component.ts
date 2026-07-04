import {
  Component, OnInit, OnDestroy, AfterViewInit, HostListener,
  inject, signal, computed, effect, ChangeDetectionStrategy, ElementRef, WritableSignal, viewChild
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
import { FunRetroAnalysis, FunRetroSession, FunRetroSessionSummary, FunRetroCard, RetroColumn, RetroTheme, RetroCanvasLayout, FunRetroCardComment, FunRetroToken, FunRetroTokenSize } from '../../../core/models/fun-retro.model';
import { WebSocketService } from '../../../core/websocket/websocket.service';
import { AvatarCircleComponent } from '../../../core/components/k-picker/avatar-circle.component';
import { AuthService } from '../../../core/auth/auth.service';
import { TextFieldModule } from '@angular/cdk/text-field';
import { PollService } from '../../../core/services/poll.service';
import { PollDetail } from '../../../core/models/poll.model';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CreatePollDialogComponent } from '../../polls/poll.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NavService } from '../../../core/nav/nav.service';
import { NewRetroDialogComponent, NewRetroDialogResult } from './new-retro-dialog.component';
import { DEFAULT_COLS, RETRO_TEMPLATES, ICEBREAKER_QUESTIONS, RETRO_THEMES, RetroThemeDef, RetroBgStyle, bgStyleFor } from './retro-constants';
import { RetroSingleCanvasComponent } from './retro-single-canvas.component';

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
  positionX?: number;
  positionY?: number;
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
    RetroSingleCanvasComponent,
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
    /* position+z-index makes this a stacking-context root so .mobile-theme-bg's negative
       z-index keeps it visible behind this container's own content without falling all the
       way behind the app shell's own background (which would make it invisible). */
    .session-wrap { padding:4px 0;position:relative;z-index:0; }
    .mobile-theme-bg {
      position:fixed;inset:0;z-index:-1;pointer-events:none;
      background-repeat:no-repeat;background-position:center 45%;background-size:82vw;
      opacity:0.12;image-rendering:pixelated;
    }
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
      position:fixed;z-index:250;
      background:#2a2a2a;border:1px solid rgba(255,255,255,0.12);
      border-radius:10px;padding:14px;
      display:flex;flex-direction:column;align-items:center;gap:10px;
      width:220px;box-shadow:0 4px 16px rgba(0,0,0,0.5);
    }
    .phase-pill-wrap { position:relative; }
    .phase-pill {
      display:flex;align-items:center;gap:6px;
      padding:6px 10px 6px 8px;border-radius:8px;
      border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.04);
      cursor:pointer;font-family:inherit;font-size:0.8rem;font-weight:600;
      transition:background 0.15s;
    }
    .phase-pill:hover { background:rgba(255,255,255,0.08); }
    .phase-pill-dot { width:7px;height:7px;border-radius:50%;flex-shrink:0; }
    .phase-pill-caret { font-size:16px;height:16px;width:16px;opacity:0.5; }
    .phase-panel {
      position:absolute;top:38px;left:0;z-index:250;
      background:#2a2a2a;border:1px solid rgba(255,255,255,0.12);
      border-radius:10px;padding:14px;
      display:flex;flex-direction:column;gap:12px;
      width:320px;box-shadow:0 4px 16px rgba(0,0,0,0.5);
    }
    .phase-panel-steps { display:flex;align-items:center;gap:0; }
    .phase-panel-guide { display:flex;align-items:flex-start;gap:8px;font-size:0.78rem;line-height:1.4;color:rgba(255,255,255,0.7); }
    .phase-panel-guide mat-icon { font-size:16px;height:16px;width:16px;flex-shrink:0;margin-top:1px;opacity:0.8; }
    .session-title-row { display:flex;flex-direction:column;gap:6px; }
    .session-name { font-size:1rem;font-weight:600;color:rgba(255,255,255,0.9); }
    .session-sub { font-size:0.75rem;color:rgba(255,255,255,0.4); }
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
    .settings-row-column { flex-direction:column;align-items:stretch;gap:8px; }
    .theme-picker { display:flex;gap:6px;flex-wrap:wrap; }
    .theme-swatch {
      width:34px;height:34px;flex-shrink:0;
      background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.12);
      border-radius:8px;cursor:pointer;color:rgba(255,255,255,0.5);
      display:flex;align-items:center;justify-content:center;
      transition:border-color .15s,background .15s;
    }
    .theme-swatch:hover { background:rgba(255,255,255,0.1); }
    .theme-swatch.active { border-color:#64b5f6;background:rgba(100,181,246,0.12); }
    .theme-swatch-preview {
      width:22px;height:22px;background-repeat:no-repeat;background-position:center;
      background-size:contain;image-rendering:pixelated;opacity:0.85;
    }
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
    .reveal-now-btn {
      display:inline-flex;align-items:center;gap:5px;flex-shrink:0;
      background:rgba(100,181,246,0.16);border:1px solid rgba(100,181,246,0.4);
      border-radius:7px;color:#64b5f6;font-size:0.78rem;font-weight:600;font-family:inherit;
      padding:5px 11px;cursor:pointer;transition:background .12s;
    }
    .reveal-now-btn:hover:not(:disabled) { background:rgba(100,181,246,0.26); }
    .reveal-now-btn:disabled { opacity:0.6;cursor:default;color:rgba(255,255,255,0.5);border-color:rgba(255,255,255,0.15);background:transparent; }
    .reveal-now-btn mat-icon { font-size:16px;width:16px;height:16px;line-height:16px; }

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

    /* ── shared popovers ────────────────────────────────── */
    .sticker-palette-popover {
      position:fixed;z-index:250;width:272px;max-height:70vh;overflow-y:auto;
      padding:10px;background:#2a2a2a;border:1px solid rgba(255,255,255,0.15);
      border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.5);
    }
    .sticker-palette-category-label {
      font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;
      color:rgba(255,255,255,0.4);margin:10px 2px 6px;
    }
    .sticker-palette-category-label:first-child { margin-top:2px; }
    .sticker-palette-category-label { display:flex;align-items:center;gap:6px; }
    .sticker-palette-back {
      background:transparent;border:none;color:rgba(255,255,255,0.6);cursor:pointer;
      font-size:1rem;line-height:1;padding:0 2px;font-family:inherit;
    }
    .sticker-palette-back:hover { color:#fff; }
    .sticker-palette-grid { display:grid;grid-template-columns:repeat(6, 1fr);gap:4px; }
    .sticker-palette-swatch { border:2px solid rgba(255,255,255,0.2); }
    .sticker-palette-swatch:hover { border-color:rgba(255,255,255,0.6); }
    .sticker-palette-option {
      display:flex;align-items:center;justify-content:center;
      width:36px;height:36px;border-radius:50%;font-size:19px;cursor:pointer;
      background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.85);
      font-weight:700;line-height:1;transition:background .12s,transform .1s;
    }
    .sticker-palette-option:hover { background:rgba(255,255,255,0.16);transform:scale(1.08); }
    .sticker-palette-option mat-icon { font-size:20px;width:20px;height:20px;color:rgba(255,255,255,0.95); }
    .card-toolbar {
      position:fixed;z-index:250;
      display:flex;align-items:center;gap:2px;
      background:#2a2a2a;border:1px solid rgba(255,255,255,0.15);
      border-radius:10px;padding:4px;box-shadow:0 4px 16px rgba(0,0,0,0.5);
    }
    .toolbar-btn {
      position:relative;display:inline-flex;align-items:center;justify-content:center;
      width:32px;height:32px;border-radius:7px;
      background:transparent;border:none;color:rgba(255,255,255,0.75);cursor:pointer;
      transition:background .12s,color .12s;
    }
    .toolbar-btn:hover { background:rgba(255,255,255,0.1);color:#fff; }
    .toolbar-btn-danger:hover { background:rgba(239,83,80,0.15);color:#ef5350; }
    .toolbar-btn mat-icon { font-size:18px;width:18px;height:18px; }
    .toolbar-badge {
      position:absolute;top:-4px;right:-4px;min-width:14px;height:14px;padding:0 3px;
      border-radius:8px;background:#9c27b0;color:#fff;font-size:0.6rem;font-weight:700;
      display:flex;align-items:center;justify-content:center;
    }
    .comment-thread-popover {
      position:fixed;z-index:250;width:260px;max-height:340px;
      display:flex;flex-direction:column;
      background:#2a2a2a;border:1px solid rgba(255,255,255,0.15);
      border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,0.5);overflow:hidden;
    }
    .comment-thread-list { flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:10px;max-height:220px; }
    .comment-thread-loading, .comment-thread-empty { font-size:0.78rem;color:rgba(255,255,255,0.35);text-align:center;padding:8px 0; }
    .comment-item-head { display:flex;align-items:center;gap:6px; }
    .comment-author { font-size:0.75rem;font-weight:700;color:rgba(255,255,255,0.85); }
    .comment-time { font-size:0.68rem;color:rgba(255,255,255,0.35);flex:1; }
    .comment-delete-btn { background:transparent;border:none;color:rgba(255,255,255,0.3);cursor:pointer;font-size:15px;line-height:1;padding:0 2px; }
    .comment-delete-btn:hover { color:rgba(239,83,80,0.8); }
    .comment-text { font-size:0.8rem;color:rgba(255,255,255,0.75);line-height:1.4;margin-top:2px;overflow-wrap:anywhere; }
    .comment-thread-input { border-top:1px solid rgba(255,255,255,0.1);padding:8px 10px;display:flex;flex-direction:column;gap:6px; }
    .comment-thread-input textarea {
      width:100%;box-sizing:border-box;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);
      border-radius:6px;color:inherit;font-size:0.8rem;padding:6px 8px;outline:none;resize:none;
      font-family:inherit;min-height:32px;
    }
    .comment-thread-input textarea:focus { border-color:#64b5f6; }
    .comment-thread-actions { display:flex;justify-content:flex-end;gap:6px; }
    .comment-thread-actions button {
      font-size:0.75rem;padding:4px 12px;border-radius:6px;font-family:inherit;cursor:pointer;
      background:transparent;border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.6);
    }
    .comment-thread-actions button:last-child { background:rgba(100,181,246,0.18);border-color:rgba(100,181,246,0.4);color:#64b5f6;font-weight:600; }
    .comment-thread-actions button:disabled { opacity:0.4;cursor:default; }
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

    /* Mobile card color trigger -- a small dot that opens the shared color-picker-popover,
       instead of an always-expanded row of swatches eating vertical space on every card. */
    .card-color-trigger { display:flex;justify-content:flex-end;margin-top:6px; }
    .card-color-dot {
      width:18px;height:18px;border-radius:50%;cursor:pointer;
      border:1.5px solid rgba(0,0,0,0.25);padding:0;transition:transform .1s;
    }
    .card-color-dot:hover { transform:scale(1.15); }

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
        @if (!isDesktop() && themeBgUrl(0); as bg) {
          <!-- Mobile has no per-column canvas viewport to pin a background to (columns are
               just stacked, page-scrolling sections) -- one watermark fixed to the screen
               (using the "positive" variant, since there's no single column it belongs to)
               instead of the column, so it stays put as you scroll through columns rather
               than scrolling away or repeating per-section. -->
          <div class="mobile-theme-bg" [style.background-image]="bg"
               [style.opacity]="themeBgStyle(0)?.opacity ?? null" [style.mix-blend-mode]="themeBgStyle(0)?.blend ?? null"
               [style.background-size]="themeBgStyle(0)?.size ?? null" [style.image-rendering]="themeBgStyle(0) ? 'auto' : null"></div>
        }
        <!-- Compact header: title, timer, polls, settings, share, back, phase actions — all in one row -->
        <div class="session-header" [class.full-bleed]="isDesktop()">
          <button mat-icon-button (click)="backToList()" title="Back to list">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="session-title-row">
            <span class="session-name">{{ s.title || 'Untitled Retro' }}</span>
            <span class="session-sub">{{ s.cards.length }} card{{ s.cards.length !== 1 ? 's' : '' }}</span>
          </div>
          @if (s.phase !== 'lobby') {
            <div class="phase-pill-wrap" (mousedown)="$event.stopPropagation()">
              <button class="phase-pill" (click)="togglePhasePanel($event)" [style.color]="phaseColor(s.phase)">
                <span class="phase-pill-dot" [style.background]="phaseColor(s.phase)"></span>
                {{ phaseLabel(s.phase) }}
                <mat-icon class="phase-pill-caret">{{ phasePanelOpen() ? 'expand_less' : 'expand_more' }}</mat-icon>
              </button>
              @if (phasePanelOpen()) {
                <div class="phase-panel" (mousedown)="$event.stopPropagation()">
                  <div class="phase-panel-steps">
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
                  <div class="phase-panel-guide">
                    <mat-icon [style.color]="phaseColor(s.phase)">{{ phaseGuide(s.phase).icon }}</mat-icon>
                    <span>{{ phaseGuide(s.phase).text }}</span>
                  </div>
                </div>
              }
            </div>
          }
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
            </div>
          }
          @if (timerPopoverOpen() && timerPopoverPos(); as pos) {
                <div class="timer-popover" [style.top.px]="pos.top" [style.left.px]="pos.left" (mousedown)="$event.stopPropagation()">
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
                <div class="settings-row-label">Participation tracking</div>
                <div class="settings-row-desc">Show who has added cards in the presence bar</div>
              </div>
              <div class="toggle-track" [class.on]="s.participationTracking" (click)="toggleSetting('participationTracking')">
                <div class="toggle-thumb"></div>
              </div>
            </div>
            <div class="settings-row settings-row-column">
              <div>
                <div class="settings-row-label">Board theme</div>
                <div class="settings-row-desc">A subtle background on each canvas</div>
              </div>
              <div class="theme-picker">
                <button class="theme-swatch" [class.active]="!s.theme" title="None" (click)="setTheme(null)">
                  <mat-icon style="font-size:16px;height:16px;width:16px">block</mat-icon>
                </button>
                @for (t of retroThemes; track t.id) {
                  <button class="theme-swatch" [class.active]="s.theme === t.id" [title]="t.label"
                          (click)="setTheme(t.id)">
                    <span class="theme-swatch-preview" [style.background-image]="themeSwatchUrl(t)"></span>
                  </button>
                }
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

        <!-- Mobile: card list columns -->
        @if (!isDesktop()) {
          @if (s.phase === 'add' || s.phase === 'vote' || s.phase === 'discuss' || s.phase === 'done') {
            <div class="board">
              @for (col of cols(); track col.key) {
                <div class="col" [style.--col-accent]="col.color">
                  @let cards = cardsForCol(col.key);
                  <div class="col-header">
                    <span class="col-label" [style.color]="col.color">{{ col.label }}</span>
                    <span class="col-count">{{ cards.length }}</span>
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
                  @for (group of groupsForCol(cards); track group.groupId) {
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
                            <div class="card-color-trigger">
                              <button class="card-color-dot" [style.background]="resolveCardColor(card)"
                                      title="Change color" (click)="toggleColorPicker($event, card.id)"></button>
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                  <!-- Ungrouped cards -->
                  @for (card of ungroupedCardsForCol(cards); track card.id) {
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
                        <div class="card-color-trigger">
                          <button class="card-color-dot" [style.background]="resolveCardColor(card)"
                                  title="Change color" (click)="toggleColorPicker($event, card.id)"></button>
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

        <!-- Desktop: single shared freeform canvas (the only canvas layout now --
             canvasLayout is a legacy field, kept only so older sessions still load). -->
        @if (isDesktop() && (s.phase === 'add' || s.phase === 'vote' || s.phase === 'discuss' || s.phase === 'done')) {
          <app-retro-single-canvas
            class="full-bleed"
            [session]="s"
            [cols]="cols()"
            [voteBudget]="voteBudget()"
            [editingCardId]="editingCardId()"
            [editingText]="editingText()"
            [resolveCardColor]="resolveCardColorFn"
            [timerLabel]="timer() ? timerDisplay() : null"
            [timerDanger]="timerRemaining() <= 30 && !timerExpired() && timerRunning()"
            [timerPlaceTrigger]="timerJustStartedTick()"
            [timerActive]="timerPopoverOpen() || timerRunning()"
            [timerPosition]="timerWidgetPosition()"
            [placingStickerEmoji]="singleCanvasPlacingStickerEmoji()"
            [selectedCardId]="selectedCardId()"
            (voteToggled)="toggleVote($event)"
            (reactionToggled)="toggleReaction($event.card, $event.emoji)"
            (editStarted)="startEditCard($event)"
            (editTextChanged)="editingText.set($event)"
            (editSaved)="saveCardText($event)"
            (editCancelled)="cancelEditCard()"
            (addCardRequested)="onSingleCanvasAddCard($event)"
            (positionCommitted)="onSingleCanvasPositionCommitted($event)"
            (cardSelected)="selectCard($event.id)"
            (commentThreadRequested)="openCommentThread($event.event, $event.card)"
            (stickerPaletteRequested)="onSingleCanvasStickerPaletteRequested($event)"
            (tokenPositionCommitted)="onSingleCanvasTokenPositionCommitted($event)"
            (timerPositionCommitted)="onSingleCanvasTimerPositionCommitted($event)"
            (tokenDeleteRequested)="deleteToken($event)"
            (tokenResizeRequested)="onSingleCanvasTokenResize($event)"
            (timerToggleRequested)="toggleTimerPopover($event)"
            (timerRemoveRequested)="clearTimer()"
            (stickerPlaceRequested)="onSingleCanvasStickerPlaced($event)"
            (stickerPlacementCancelled)="singleCanvasPlacingStickerEmoji.set(null)" />
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
        @if (selectedCard(); as card) {
          @if (selectedCardToolbarPos(); as pos) {
            <div class="card-toolbar" [style.top.px]="pos.top" [style.left.px]="pos.left"
                 (mousedown)="$event.stopPropagation()" (click)="$event.stopPropagation()">
              <button class="toolbar-btn" title="Comments" (click)="openCommentThread($event, card)">
                <mat-icon>chat_bubble_outline</mat-icon>
                @if (card.commentCount > 0) { <span class="toolbar-badge">{{ card.commentCount }}</span> }
              </button>
              <button class="toolbar-btn" title="Change color" (click)="toggleColorPicker($event, card.id)">
                <mat-icon>palette</mat-icon>
              </button>
              @if ((card.isOwn || s.isCreator) && s.phase === 'add') {
                <button class="toolbar-btn toolbar-btn-danger" title="Delete" (click)="deleteCard(card)">
                  <mat-icon>delete_outline</mat-icon>
                </button>
              }
            </div>
          }
        }
        @if (commentThreadFor(); as cardId) {
          @if (commentThreadPos(); as pos) {
            <div class="comment-thread-popover" [style.top.px]="pos.top" [style.left.px]="pos.left"
                 (mousedown)="$event.stopPropagation()" (click)="$event.stopPropagation()">
              <div class="comment-thread-list">
                @if (commentThreadLoading()) {
                  <div class="comment-thread-loading">Loading…</div>
                } @else {
                  @for (c of commentThreadItems(); track c.id) {
                    <div class="comment-item">
                      <div class="comment-item-head">
                        <span class="comment-author">{{ c.authorName }}</span>
                        <span class="comment-time">{{ relativeTime(c.createdAt) }}</span>
                        @if (c.authorId === authSvc.me?.id || s.isCreator) {
                          <button class="comment-delete-btn" (click)="deleteComment(cardId, c.id)">×</button>
                        }
                      </div>
                      <div class="comment-text">{{ c.text }}</div>
                    </div>
                  }
                  @if (!commentThreadItems().length) {
                    <div class="comment-thread-empty">No comments yet.</div>
                  }
                }
              </div>
              <div class="comment-thread-input">
                <textarea [value]="newCommentText()" (input)="newCommentText.set($any($event.target).value)"
                          placeholder="Add a comment…" cdkTextareaAutosize
                          (keydown.enter)="$event.preventDefault(); postComment(cardId)"></textarea>
                <div class="comment-thread-actions">
                  <button (click)="commentThreadFor.set(null); commentThreadPos.set(null)">Cancel</button>
                  <button [disabled]="postingComment() || !newCommentText().trim()" (click)="postComment(cardId)">Save</button>
                </div>
              </div>
            </div>
          }
        }
        @if (stickerPaletteOpenFor()) {
          @if (stickerPalettePos(); as pos) {
            <div class="sticker-palette-popover" [style.top.px]="pos.top" [style.left.px]="pos.left"
                 (mousedown)="$event.stopPropagation()" (click)="$event.stopPropagation()">
              @if (pendingFaceIcon(); as icon) {
                <div class="sticker-palette-category-label">
                  <button class="sticker-palette-back" (click)="pendingFaceIcon.set(null)">‹</button>
                  Pick a color
                </div>
                <div class="sticker-palette-grid">
                  @for (hex of faceColorPalette; track hex) {
                    <div class="sticker-palette-option sticker-palette-swatch" [style.background]="hex" (click)="pickFaceColor(hex)"></div>
                  }
                </div>
              } @else {
                @for (cat of stickerCategories; track cat.label) {
                  <div class="sticker-palette-category-label">{{ cat.label }}</div>
                  <div class="sticker-palette-grid">
                    @for (item of cat.items; track item.value) {
                      @if (cat.label === 'Faces') {
                        <div class="sticker-palette-option" (click)="pendingFaceIcon.set(item.value)">
                          <mat-icon>{{ item.value }}</mat-icon>
                        </div>
                      } @else {
                        <div class="sticker-palette-option"
                             [style.background]="item.color ? item.color + '2a' : null"
                             [style.color]="item.color ?? null"
                             [style.font-size]="item.value.length > 2 ? '0.6rem' : item.value.length > 1 ? '0.85rem' : '19px'"
                             (click)="pickSticker(item.value)">{{ item.value }}</div>
                      }
                    }
                  </div>
                }
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

  // Entering edit mode (double-click a card's text) renders the edit textarea fresh each
  // time -- clicking a div doesn't hand it keyboard focus, so without this the user has to
  // click a second time before they can actually type. Mirrors the same fix already needed
  // for the new-card textarea in the single-canvas component (native `autofocus` only
  // reliably fires once per page load, not on every dynamically-inserted element).
  private editAreaEl = viewChild<ElementRef<HTMLTextAreaElement>>('editArea');
  private editAreaFocusEffect = effect(() => {
    const id = this.editingCardId();
    const el = this.editAreaEl();
    if (id && el) el.nativeElement.focus();
  });

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
  // Bumped only inside toggleTimer()'s own "start" branch, never by the synced `timer` signal
  // itself -- lets the canvas stick the widget to the cursor for just the person who started
  // it, not every participant who receives the resulting fun_retro_timer_updated broadcast.
  timerJustStartedTick = signal(0);
  // Widget position rides along in the same synced `timer` state (see TimerState.positionX/Y)
  // so every participant sees the clock in the same place once someone drags it.
  timerWidgetPosition = computed<{ x: number; y: number } | null>(() => {
    const t = this.timer();
    return t && t.positionX != null && t.positionY != null ? { x: t.positionX, y: t.positionY } : null;
  });
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

  // ── Sticker tokens ──
  // Picking a Face is two steps: an expression, then a color for it (see pendingFaceIcon /
  // pickFaceColor) -- the result is encoded as "face:<icon>:<hex>", parsed by faceIcon()/
  // faceColor() in the single-canvas component that actually renders placed tokens.
  pendingFaceIcon = signal<string | null>(null);
  readonly faceColorPalette = [
    '#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5',
    '#8e24aa', '#00acc1', '#6d4c41', '#757575', '#d81b60',
  ];

  pickFaceColor(hex: string): void {
    const icon = this.pendingFaceIcon();
    this.pendingFaceIcon.set(null);
    if (!icon) return;
    this.pickSticker(`face:${icon}:${hex}`);
  }

  readonly stickerCategories: { label: string; items: { value: string; color?: string }[] }[] = [
    {
      label: 'Emoji',
      items: ['⭐', '🔥', '💯', '👍', '👎', '❤️', '✅', '❌', '🚩', '🎯', '💡', '🤔', '😂', '🎉', '⚠️', '🏆']
        .map(value => ({ value })),
    },
    {
      // Item values here are just a Material icon name (a facial expression) -- picking one
      // opens the color-swatch step (pendingFaceIcon) instead of placing immediately.
      label: 'Faces',
      items: [
        'sentiment_very_satisfied', 'sentiment_satisfied', 'sentiment_neutral',
        'sentiment_dissatisfied', 'sentiment_very_dissatisfied', 'mood', 'mood_bad', 'sentiment_satisfied_alt',
      ].map(value => ({ value })),
    },
    {
      label: 'Story Points',
      items: [
        { value: '0', color: '#cddc39' }, { value: '1', color: '#8bc34a' }, { value: '2', color: '#4caf50' },
        { value: '3', color: '#009688' }, { value: '5', color: '#00bcd4' }, { value: '8', color: '#2196f3' },
        { value: '13', color: '#3f51b5' }, { value: '20', color: '#673ab7' }, { value: '40', color: '#9c27b0' },
        { value: '100', color: '#ab47bc' }, { value: '☕', color: '#8d6e63' }, { value: '?', color: '#ef5350' },
      ],
    },
    {
      label: 'Letters',
      items: [
        { value: 'WHO', color: '#7e57c2' }, { value: 'WHAT', color: '#42a5f5' }, { value: 'WHEN', color: '#26a69a' },
        { value: 'YES', color: '#66bb6a' }, { value: 'NO', color: '#ef5350' }, { value: 'LOL', color: '#7e57c2' },
        { value: 'WHY', color: '#66bb6a' }, { value: 'HOW', color: '#ffa726' }, { value: 'WOW', color: '#ef5350' },
        { value: 'YUP', color: '#42a5f5' }, { value: 'NOPE', color: '#ef5350' }, { value: 'IDK', color: '#7e57c2' },
        { value: 'IF', color: '#ab47bc' }, { value: 'THEN', color: '#ab47bc' }, { value: 'ELSE', color: '#ab47bc' },
        { value: 'DO', color: '#66bb6a' }, { value: 'DONT', color: '#ef5350' }, { value: 'WTF', color: '#7e57c2' },
        { value: '?', color: '#66bb6a' }, { value: '??', color: '#42a5f5' }, { value: '???', color: '#ab47bc' },
        { value: '!', color: '#66bb6a' }, { value: '!!', color: '#42a5f5' }, { value: '!!!', color: '#ab47bc' },
        { value: '-', color: '#42a5f5' }, { value: '*', color: '#42a5f5' }, { value: '/', color: '#42a5f5' }, { value: '=', color: '#42a5f5' },
      ],
    },
  ];
  stickerPaletteOpenFor = signal<string | null>(null);
  stickerPalettePos = signal<{ top: number; left: number } | null>(null);

  // Picking an emoji from the palette doesn't drop it immediately -- it switches into
  // "stuck to the cursor" placement on the canvas, confirmed by a click there instead.
  singleCanvasPlacingStickerEmoji = signal<string | null>(null);

  onSingleCanvasStickerPaletteRequested(payload: { event: MouseEvent; column: string; x: number; y: number }): void {
    this.pendingFaceIcon.set(null);
    this.togglePopover(this.stickerPaletteOpenFor, this.stickerPalettePos, payload.event, payload.column, 190);
  }

  pickSticker(emoji: string): void {
    this.stickerPaletteOpenFor.set(null);
    this.stickerPalettePos.set(null);
    if (!this.session()) return;
    this.singleCanvasPlacingStickerEmoji.set(emoji);
  }

  onSingleCanvasStickerPlaced(payload: { emoji: string; column: string; x: number; y: number; size: FunRetroTokenSize }): void {
    this.singleCanvasPlacingStickerEmoji.set(null);
    const s = this.session();
    if (!s) return;
    this.svc.addToken(s.id, payload.column, payload.emoji, payload.x, payload.y, payload.size).subscribe(token => {
      this.session.update(cur => cur ? { ...cur, tokens: [...cur.tokens, token] } : cur);
    });
  }

  onSingleCanvasTokenResize(payload: { tokenId: string; size: FunRetroTokenSize }): void {
    const s = this.session();
    if (!s) return;
    this.session.update(cur => cur
      ? { ...cur, tokens: cur.tokens.map(t => t.id === payload.tokenId ? { ...t, size: payload.size } : t) }
      : cur);
    this.svc.updateTokenSize(s.id, payload.tokenId, payload.size).subscribe();
  }


  // The single-canvas layout drags tokens fully within its own component (it owns the only
  // pan/zoom viewport there is) and only reports the final position here to persist --
  // unlike the per-column layout above, where this component owns the drag itself.
  onSingleCanvasTokenPositionCommitted(payload: { tokenId: string; x: number; y: number }): void {
    const s = this.session();
    if (s) this.svc.updateTokenPosition(s.id, payload.tokenId, payload.x, payload.y).subscribe();
  }

  onSingleCanvasTimerPositionCommitted(payload: { x: number; y: number }): void {
    const s = this.session();
    if (!s) return;
    this.timer.update(t => t ? { ...t, positionX: payload.x, positionY: payload.y } : t);
    this.svc.setTimerPosition(s.id, payload.x, payload.y).subscribe();
  }

  deleteToken(token: FunRetroToken): void {
    const s = this.session();
    if (!s) return;
    this.session.update(cur => cur ? { ...cur, tokens: cur.tokens.filter(t => t.id !== token.id) } : cur);
    this.svc.deleteToken(s.id, token.id).subscribe();
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
    // .canvas-outer lives inside the child <app-retro-single-canvas>, but querySelector
    // reaches through component boundaries fine -- only style *scoping* is encapsulated.
    const canvasOuter = el.querySelector('.canvas-outer') as HTMLElement | null;
    if (canvasOuter) {
      const bottomGutter = 16;
      const availHeight = window.innerHeight - canvasOuter.getBoundingClientRect().top - bottomGutter;
      el.style.setProperty('--canvas-height', `${Math.max(availHeight, 320)}px`);
    }
  }


  // A card-selecting click is detected on `mouseup` (see onMouseUp), but the same gesture
  // still produces a following native `click` that bubbles to document right after --
  // without this, that click would immediately hit onDocClick and close the toolbar we
  // just opened. Sibling popover triggers avoid this by calling e.stopPropagation() inside
  // their own (click) handler; selectCard() has no such click event to stop (it runs from
  // mouseup), so it sets this instead for the next doc click to consume once and skip.
  private suppressNextDocClick = false;

  @HostListener('document:click')
  onDocClick(): void {
    if (this.suppressNextDocClick) { this.suppressNextDocClick = false; return; }
    this.closeAllPickers();
  }

  // Color/emoji popovers are position:fixed, anchored to a button's screen position at the
  // moment they open. Panning or zooming the canvas underneath moves the card but not the
  // popover, so it visually detaches from what it's supposed to be editing. Close them
  // whenever the canvas view is about to move instead of leaving them stranded.
  private closeAllPickers(): void {
    if (this.colorPickerOpenFor()) { this.colorPickerOpenFor.set(null); this.colorPickerPos.set(null); }
    if (this.timerPopoverOpen()) { this.timerPopoverOpen.set(false); this.timerPopoverPos.set(null); }
    if (this.emojiPickerFor()) { this.emojiPickerFor.set(null); this.emojiPickerPos.set(null); }
    if (this.phasePanelOpen()) this.phasePanelOpen.set(false);
    if (this.selectedCardId()) { this.selectedCardId.set(null); this.selectedCardToolbarPos.set(null); }
    if (this.commentThreadFor()) { this.commentThreadFor.set(null); this.commentThreadPos.set(null); }
    if (this.stickerPaletteOpenFor()) { this.stickerPaletteOpenFor.set(null); this.stickerPalettePos.set(null); this.pendingFaceIcon.set(null); }
  }

  // ── Card selection + floating toolbar ──
  selectedCardId = signal<string | null>(null);
  selectedCardToolbarPos = signal<{ top: number; left: number } | null>(null);
  selectedCard = computed(() => {
    const id = this.selectedCardId();
    return id ? (this.session()?.cards.find(c => c.id === id) ?? null) : null;
  });

  selectCard(cardId: string): void {
    this.suppressNextDocClick = true;
    const wasSelected = this.selectedCardId() === cardId;
    this.closeAllPickers();
    if (wasSelected) return; // clicking the already-selected card again just deselects it

    const el = (this.elRef.nativeElement as HTMLElement).querySelector(`[data-card-id="${cardId}"]`);
    const rect = el?.getBoundingClientRect();
    const toolbarWidth = 116;
    this.selectedCardId.set(cardId);
    this.selectedCardToolbarPos.set(rect
      ? { top: rect.top - 46, left: Math.max(8, rect.left + rect.width / 2 - toolbarWidth / 2) }
      : null);
  }

  // ── Comment thread popover ──
  commentThreadFor = signal<string | null>(null);
  commentThreadPos = signal<{ top: number; left: number } | null>(null);
  commentThreadItems = signal<FunRetroCardComment[]>([]);
  commentThreadLoading = signal(false);
  newCommentText = signal('');
  postingComment = signal(false);

  openCommentThread(e: MouseEvent, card: FunRetroCard): void {
    e.stopPropagation();
    const opening = this.commentThreadFor() !== card.id;
    this.commentThreadFor.set(opening ? card.id : null);
    if (!opening) { this.commentThreadPos.set(null); return; }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.commentThreadPos.set({ top: rect.bottom + 8, left: Math.max(8, rect.left - 140) });
    this.commentThreadItems.set([]);
    this.newCommentText.set('');
    this.commentThreadLoading.set(true);

    const s = this.session();
    if (!s) return;
    this.svc.getCardComments(s.id, card.id).subscribe({
      next: list => { this.commentThreadItems.set(list); this.commentThreadLoading.set(false); },
      error: () => { this.commentThreadLoading.set(false); },
    });
  }

  postComment(cardId: string): void {
    const s = this.session();
    const text = this.newCommentText().trim();
    if (!s || !text || this.postingComment()) return;
    this.postingComment.set(true);
    this.svc.addCardComment(s.id, cardId, text).subscribe({
      next: comment => {
        this.commentThreadItems.update(list => [...list, comment]);
        this.newCommentText.set('');
        this.postingComment.set(false);
        // Optimistic local bump so the badge updates instantly for the poster without
        // waiting on the broadcast round-trip.
        this.session.update(cur => cur ? {
          ...cur,
          cards: cur.cards.map(c => c.id === cardId ? { ...c, commentCount: c.commentCount + 1 } : c),
        } : cur);
      },
      error: () => { this.postingComment.set(false); this.snackBar.open('Failed to post comment', 'OK', { duration: 3000 }); },
    });
  }

  deleteComment(cardId: string, commentId: string): void {
    const s = this.session();
    if (!s) return;
    this.commentThreadItems.update(list => list.filter(c => c.id !== commentId));
    this.session.update(cur => cur ? {
      ...cur,
      cards: cur.cards.map(c => c.id === cardId ? { ...c, commentCount: Math.max(0, c.commentCount - 1) } : c),
    } : cur);
    this.svc.deleteCardComment(s.id, cardId, commentId).subscribe({
      error: () => this.snackBar.open('Failed to delete comment', 'OK', { duration: 3000 }),
    });
  }

  private static readonly RELATIVE_TIME_UNITS: [number, string][] = [
    [60, 'second'], [60, 'minute'], [24, 'hour'], [7, 'day'], [4.345, 'week'], [12, 'month'], [Infinity, 'year'],
  ];

  relativeTime(iso: string): string {
    let diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 5) return 'just now';
    for (const [amount, unit] of FunRetroComponent.RELATIVE_TIME_UNITS) {
      if (diff < amount) {
        const n = Math.floor(diff);
        return `${n} ${unit}${n !== 1 ? 's' : ''} ago`;
      }
      diff /= amount;
    }
    return 'a while ago';
  }

  timerPopoverOpen = signal(false);
  // Anchored via the clicked trigger's own rect (not CSS relative-to-parent) so the same
  // popover can be opened from either the header trigger or the canvas sidebar's timer icon.
  timerPopoverPos = signal<{ top: number; left: number } | null>(null);

  toggleTimerPopover(e: MouseEvent): void {
    e.stopPropagation();
    const opening = !this.timerPopoverOpen();
    this.timerPopoverOpen.set(opening);
    if (opening) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      this.timerPopoverPos.set({ top: rect.bottom + 6, left: Math.max(8, rect.right - 220) });
    } else {
      this.timerPopoverPos.set(null);
    }
  }

  // Phase stepper + guidance text used to be two always-visible full-width rows, eating a
  // lot of vertical space above the canvas before it even starts. Folded into one compact
  // pill in the header that reveals both on demand, mirroring the "status ▾" pattern.
  phasePanelOpen = signal(false);

  togglePhasePanel(e: MouseEvent): void {
    e.stopPropagation();
    this.phasePanelOpen.update(v => !v);
  }

  readonly stickyPalette = [
    '#fff9c4', '#ffe0b2', '#fce4ec', '#c8e6c9',
    '#bbdefb', '#e1bee7', '#ffcdd2', '#b2dfdb',
    '#f5f5f5', '#ffe082', '#a5d6a7', '#90caf9',
  ];

  // Static, never mutated -- only used as a last-resort render fallback for a card that
  // somehow has no color at all (e.g. one created before colors were baked in at creation).
  // Deliberately NOT read/written by changeCardColor: that used to double as "the column's
  // shared default", so changing one card's color retroactively repainted every other
  // uncolored card in the column. nextCardColor below is the correct place for "future new
  // cards should use this" -- it only gets read once, at the moment a new card is created.
  private readonly baseColDefaultColor: Record<string, string> = {
    well: '#c8e6c9', better: '#ffe0b2', action: '#fce4ec',
  };

  // What color a newly-created card in each column should be baked with. Starts at the same
  // values as baseColDefaultColor; changeCardColor updates this so *future* cards pick up the
  // change, but it never affects cards that already exist.
  private nextCardColor: Record<string, string> = { ...this.baseColDefaultColor };

  colorPickerOpenFor = signal<string | null>(null);
  // The popover renders once at the top level (see template) instead of once per card --
  // resolve which card it's editing from the open id so it isn't nested inside the
  // pan/zoom-transformed canvas (a transformed ancestor breaks position:fixed).
  colorPickerCard = computed(() => {
    const id = this.colorPickerOpenFor();
    return id ? (this.session()?.cards.find(c => c.id === id) ?? null) : null;
  });

  resolveCardColor(card: FunRetroCard): string {
    return card.color ?? this.baseColDefaultColor[card.column] ?? '#fff9c4';
  }

  // Bound reference so RetroSingleCanvasComponent can call this as a plain function input
  // without losing `this` (an unbound method reference would break on `this.baseColDefaultColor`).
  readonly resolveCardColorFn = (card: FunRetroCard): string => this.resolveCardColor(card);

  /** The color a card added to this column right now would be created with. */
  nextCardColorFor(colKey: string): string {
    return this.nextCardColor[colKey] ?? this.baseColDefaultColor[colKey] ?? '#fff9c4';
  }

  colorPickerPos = signal<{ top: number; left: number } | null>(null);

  toggleColorPicker(e: MouseEvent, cardId: string): void {
    this.togglePopover(this.colorPickerOpenFor, this.colorPickerPos, e, cardId, 94);
  }

  changeCardColor(card: FunRetroCard, color: string): void {
    const s = this.session();
    if (!s) return;
    this.colorPickerOpenFor.set(null);
    this.colorPickerPos.set(null);
    // Only future new cards in this column pick up the change -- existing cards (this one
    // aside) are untouched.
    this.nextCardColor = { ...this.nextCardColor, [card.column]: color };
    // Optimistic local update
    this.session.update(cur => {
      if (!cur) return cur;
      return { ...cur, cards: cur.cards.map(c => c.id === card.id ? { ...c, color } : c) };
    });
    this.svc.updateCardColor(s.id, card.id, color).subscribe();
  }

  readonly emojiPalette = EMOJI_PICKER_SET;
  // 'icebreaker' or `card:${colKey}` -- identifies which text field the next pick inserts into.
  emojiPickerFor = signal<string | null>(null);
  emojiPickerPos = signal<{ top: number; left: number } | null>(null);

  toggleEmojiPicker(e: MouseEvent, target: string): void {
    this.togglePopover(this.emojiPickerFor, this.emojiPickerPos, e, target, 246);
  }

  /**
   * Shared toggle for a position:fixed popover anchored under a trigger button (used by
   * the color and emoji pickers). Positions via the viewport rect of the trigger, not the
   * scrollable canvas, so the popover can't be clipped by overflow:auto when the trigger
   * sits near the canvas's edge. widthPx should roughly match the popover's rendered width
   * so it doesn't overflow the right edge of the viewport.
   */
  private togglePopover(
    openSig: WritableSignal<string | null>,
    posSig: WritableSignal<{ top: number; left: number } | null>,
    e: MouseEvent,
    key: string,
    widthPx: number,
  ): void {
    e.stopPropagation();
    const opening = openSig() !== key;
    openSig.set(opening ? key : null);
    if (opening) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      posSig.set({ top: rect.bottom + 6, left: Math.max(8, rect.right - widthPx) });
    } else {
      posSig.set(null);
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
        case 'fun_retro_comment_added':
          if (msg.data['sessionId'] === s.id) {
            this.silentRefresh();
            // If this card's thread is already open (for either the poster -- whose own
            // optimistic append in postComment() already covers their own comment -- or
            // another participant viewing the same card), refetch its list instead of
            // trying to splice the broadcast payload in directly. Simpler and avoids any
            // dependency on the WS payload's exact shape matching the model 1:1.
            const cardId = this.commentThreadFor();
            if (cardId && cardId === msg.data['cardId']) {
              this.svc.getCardComments(s.id, cardId).subscribe(list => this.commentThreadItems.set(list));
            }
          }
          break;
        case 'fun_retro_comment_deleted':
          if (msg.data['sessionId'] === s.id) this.silentRefresh();
          break;
        case 'fun_retro_token_added':
        case 'fun_retro_token_deleted':
        case 'fun_retro_token_resized':
          if (msg.data['sessionId'] === s.id) this.silentRefresh();
          break;
        case 'fun_retro_token_moved':
          if (msg.data['sessionId'] === s.id) {
            const { tokenId, x, y } = msg.data as { tokenId: string; x: number; y: number };
            this.session.update(cur => cur
              ? { ...cur, tokens: cur.tokens.map(t => t.id === tokenId ? { ...t, positionX: x, positionY: y } : t) }
              : cur);
          }
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
          if (msg.data['sessionId'] === s.id) {
            const { cardId, x, y } = msg.data as { cardId: string; x: number; y: number };
            this.session.update(cur => cur
              ? { ...cur, cards: cur.cards.map(c => c.id === cardId ? { ...c, positionX: x, positionY: y } : c) }
              : cur);
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
            // A full refetch (not a local field patch) because hideCardsOnAdd doesn't just
            // change a setting value -- it changes which cards' text the *server* is willing
            // to send at all (hidden cards come back with text: null). Patching the setting
            // field locally left every already-loaded card's lock badge stale until something
            // else happened to trigger a refresh.
            this.silentRefresh();
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

  toggleSetting(key: 'participationTracking'): void {
    const s = this.session();
    if (!s) return;
    this.patchSettings({ [key]: !s[key] });
  }

  readonly retroThemes = RETRO_THEMES;

  /** The pixel-art background for the column at `colIndex` -- each column shows a
   *  different tone within the theme (1st = positive, 2nd = negative, 3rd+ = action). */
  themeBgUrl(colIndex: number): string | null {
    const theme = this.session()?.theme;
    if (!theme) return null;
    const def = RETRO_THEMES.find(t => t.id === theme);
    return def ? def.variantUrls[Math.min(colIndex, 2)] : null;
  }

  /** Photo/render-backed themes need a different opacity/blend/sizing than the hand-authored
   *  pixel SVGs' CSS defaults -- see RetroThemeDef.bgStyle. Null (nothing to override) for
   *  the vector themes, which keep using their existing per-element CSS untouched. */
  themeBgStyle(variantIndex: number): RetroBgStyle | null {
    const theme = this.session()?.theme;
    const def = theme ? RETRO_THEMES.find(t => t.id === theme) : undefined;
    return bgStyleFor(def, variantIndex);
  }

  /** Representative icon for the theme picker swatch -- the "positive" variant. */
  themeSwatchUrl(theme: RetroThemeDef): string {
    return theme.variantUrls[0];
  }

  setTheme(theme: RetroTheme): void {
    this.patchSettings({ theme });
  }

  /** Shared settings PATCH: merges `patch` onto the session's current settings, applies it
   *  optimistically, and persists it. Keeps every settings mutation sending the full
   *  {participationTracking, theme} shape the backend expects, in one place. */
  private patchSettings(patch: Partial<{ participationTracking: boolean; theme: RetroTheme }>): void {
    const s = this.session();
    if (!s || !s.isCreator) return;
    const updated = { participationTracking: s.participationTracking, theme: s.theme, ...patch };
    this.session.update(cur => cur ? { ...cur, ...updated } : cur);
    this.svc.updateSettings(s.id, updated).subscribe({
      next: () => this.silentRefresh(),
      error: () => this.silentRefresh(),
    });
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

  groupsForCol(cards: FunRetroCard[]): { groupId: string; cards: FunRetroCard[] }[] {
    const map = new Map<string, FunRetroCard[]>();
    for (const c of cards) {
      if (c.groupId) {
        const list = map.get(c.groupId) ?? [];
        list.push(c);
        map.set(c.groupId, list);
      }
    }
    return Array.from(map.entries()).map(([groupId, cards]) => ({ groupId, cards }));
  }

  ungroupedCardsForCol(cards: FunRetroCard[]): FunRetroCard[] {
    return cards.filter(c => !c.groupId);
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
      this.timerJustStartedTick.update(n => n + 1);
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

  // Unlike resetTimer (pauses at full duration), this removes the timer entirely -- the
  // canvas widget and header clock both disappear until someone starts a fresh one.
  clearTimer(): void {
    const s = this.session();
    if (!s) return;
    this.timer.set(null);
    this.svc.clearTimer(s.id).subscribe({
      error: () => this.snackBar.open('Failed to remove timer', 'OK', { duration: 3000 })
    });
  }

  setTimerPreset(seconds: number): void {
    this.saveTimer({ totalSeconds: seconds, startedAt: new Date().toISOString(), pausedAt: null, elapsedBeforePause: 0 });
    this.timerJustStartedTick.update(n => n + 1);
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
    const url = `${window.location.origin}/pulse/retro/${s.slug ?? s.id}`;
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
    const req: { title?: string; columns?: RetroColumn[]; icebreakerQuestion?: string; theme?: RetroTheme; canvasLayout?: RetroCanvasLayout } = {
      columns: template?.columns ?? DEFAULT_COLS,
    };
    if (result.title) req.title = result.title;
    if (result.icebreakerQuestion) req.icebreakerQuestion = result.icebreakerQuestion;
    if (result.theme) req.theme = result.theme;
    if (result.canvasLayout) req.canvasLayout = result.canvasLayout;
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
    this.svc.addCard(s.id, colKey, text, this.nextCardColorFor(colKey)).subscribe({
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

  /** Click-to-place card creation on the single shared canvas. Reuses the same addCard
   *  endpoint as submitCard, then persists the clicked position -- but bakes that position
   *  into the session update optimistically first so the new card never flashes at a
   *  fallback grid slot before jumping to where it was actually placed. */
  // Position is baked into the create request itself (AddFunRetroCardRequest.PositionX/Y)
  // rather than a separate follow-up PATCH -- an earlier create-then-patch version of this
  // relied on diffing card ids against a "before" snapshot to find "the new card" to patch,
  // which broke under rapid successive adds (a second add's stale "before" snapshot could
  // match the *first* add's card, or miss its own entirely, leaving a card's position null).
  // One atomic request has no such race.
  onSingleCanvasAddCard(req: { column: string; text: string; x: number; y: number }): void {
    const s = this.session();
    if (!s) return;
    this.svc.addCard(s.id, req.column, req.text, this.nextCardColorFor(req.column), req.x, req.y).subscribe({
      next: updated => this.session.set(updated),
      error: () => this.snackBar.open('Failed to add card', 'OK', { duration: 3000 }),
    });
  }

  /** Drag-end / Tidy commits from the single canvas -- the child already applied the new
   *  position optimistically to its own local UI state, so this only needs to persist it. */
  onSingleCanvasPositionCommitted(req: { cardId: string; x: number; y: number }): void {
    const s = this.session();
    if (!s) return;
    this.svc.updateCardPosition(s.id, req.cardId, req.x, req.y).subscribe();
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

  /** Small deterministic tilt per card (-1.5deg to 1.5deg, stable across re-renders since
   *  it's derived from the card's own id) so cards read as notes stuck on a board instead
   *  of a rigid grid. */
  cardRotation(cardId: string): number {
    let hash = 0;
    for (let i = 0; i < cardId.length; i++) hash = (hash * 31 + cardId.charCodeAt(i)) | 0;
    return ((Math.abs(hash) % 300) / 100) - 1.5;
  }

  // Starts big for a short card (reads like a bold headline) and linearly shrinks as text
  // grows, down to a floor that's still comfortably readable rather than shrinking forever.
  // Used both while typing (so it never overflows the card as you go) and on the saved,
  // read-only text (so it doesn't visually jump in size the moment you stop editing).
  private static readonly CARD_FONT_MAX_REM = 1.3;
  private static readonly CARD_FONT_MIN_REM = 0.7;
  private static readonly CARD_FONT_SHRINK_START = 40; // chars
  private static readonly CARD_FONT_SHRINK_END = 220; // chars
  cardFontSizeRem(text: string | null | undefined): number {
    const len = text?.length ?? 0;
    const { CARD_FONT_MAX_REM: max, CARD_FONT_MIN_REM: min, CARD_FONT_SHRINK_START: start, CARD_FONT_SHRINK_END: end } = FunRetroComponent;
    if (len <= start) return max;
    if (len >= end) return min;
    const t = (len - start) / (end - start);
    return max - t * (max - min);
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
