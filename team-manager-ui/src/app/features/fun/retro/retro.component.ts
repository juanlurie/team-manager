import {
  Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild,
  inject, signal, computed, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Router, ActivatedRoute } from '@angular/router';
import { FunRetroService } from '../../../core/services/fun-retro.service';
import { FunRetroAnalysis, FunRetroSession, FunRetroSessionSummary, FunRetroCard } from '../../../core/models/fun-retro.model';
import { WebSocketService } from '../../../core/websocket/websocket.service';

const COLS = [
  { key: 'well',   label: '✅ Went Well',       color: '#4caf50' },
  { key: 'better', label: "⚠️ Didn't Go Well",  color: '#ff9800' },
  { key: 'action', label: '🎯 Action Items',     color: '#e91e8c' },
] as const;

type ColKey = typeof COLS[number]['key'];

const PHASE_META: Record<string, { label: string; color: string }> = {
  lobby:   { label: 'Lobby',         color: '#64b5f6' },
  add:     { label: 'Adding Cards',  color: '#4caf50' },
  vote:    { label: 'Voting',        color: '#ff9800' },
  discuss: { label: 'Discussion',    color: '#e91e8c' },
  done:    { label: 'Done',          color: '#ce93d8' },
};

const REACTION_EMOJIS = ['👍', '❤️', '😄'];

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
      background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);
      border-radius:10px;padding:14px 16px;cursor:pointer;
      transition:background 0.15s,border-color 0.15s;
    }
    .session-card:hover { background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.16); }
    .session-card-title { font-size:0.9rem;font-weight:600;color:rgba(255,255,255,0.9);margin-bottom:6px; }
    .session-card-meta { display:flex;gap:12px;flex-wrap:wrap;align-items:center;font-size:0.75rem;color:rgba(255,255,255,0.45); }
    .empty-state { text-align:center;padding:40px 16px;color:rgba(255,255,255,0.35);font-size:0.9rem; }

    /* new retro inline form */
    .new-retro-form {
      background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);
      border-radius:10px;padding:16px;margin-top:16px;
    }
    .new-retro-form h3 { font-size:0.9rem;font-weight:600;margin:0 0 14px;color:rgba(255,255,255,0.85); }
    .field-label { font-size:0.75rem;opacity:0.55;display:block;margin-bottom:4px; }
    .field {
      background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:6px;
      color:inherit;font-size:0.85rem;padding:8px 10px;outline:none;width:100%;
      box-sizing:border-box;margin-bottom:12px;transition:border-color 0.2s;font-family:inherit;
    }
    .field:focus { border-color:#64b5f6; }
    .form-actions { display:flex;gap:8px;justify-content:flex-end; }

    /* ── session view ────────────────────────────────────── */
    .session-wrap { padding:4px 0; }
    .session-header {
      display:flex;align-items:flex-start;justify-content:space-between;
      gap:12px;margin-bottom:16px;flex-wrap:wrap;
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
    }
    @media(max-width:700px) {
      .board { grid-template-columns:1fr; }
    }
    .col {
      background:rgba(255,255,255,0.03);border-radius:10px;
      border:1px solid rgba(255,255,255,0.07);padding:12px;
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
      flex:1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);
      border-radius:6px;color:inherit;font-size:0.82rem;padding:7px 9px;
      outline:none;transition:border-color 0.2s;font-family:inherit;
    }
    .card-input:focus { border-color:#64b5f6; }

    /* cards */
    .retro-card {
      background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.09);
      border-radius:8px;padding:10px 12px;position:relative;
    }
    .retro-card.hidden-card {
      background:rgba(255,255,255,0.03);border-style:dashed;
      opacity:0.5;
    }
    .retro-card.own-card { border-color:rgba(100,181,246,0.25); }
    .card-text { font-size:0.82rem;color:rgba(255,255,255,0.85);line-height:1.4; }
    .card-hidden-text { font-size:0.78rem;color:rgba(255,255,255,0.3);font-style:italic; }
    .card-author { font-size:0.68rem;color:rgba(255,255,255,0.35);margin-top:4px; }
    .card-footer { display:flex;align-items:center;justify-content:space-between;margin-top:8px; }
    .card-vote-btn {
      display:inline-flex;align-items:center;gap:4px;
      font-size:0.72rem;padding:3px 8px;border-radius:14px;
      border:1px solid rgba(255,255,255,0.15);background:transparent;
      color:rgba(255,255,255,0.55);cursor:pointer;transition:all 0.15s;
    }
    .card-vote-btn.voted {
      border-color:rgba(255,152,0,0.5);background:rgba(255,152,0,0.12);color:#ff9800;
    }
    .card-vote-btn:disabled { opacity:0.35;cursor:default; }
    .card-vote-btn mat-icon { font-size:14px;height:14px;width:14px; }
    .card-reactions { display:flex;gap:5px;flex-wrap:wrap;margin-top:6px; }
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
      margin-bottom:16px;
      background:rgba(255,255,255,0.03);
      border:1px solid rgba(255,255,255,0.07);
      border-radius:10px;padding:14px 16px;
      overflow-x:auto;scrollbar-width:none;
    }
    .step-bar::-webkit-scrollbar { display:none; }
    .step-item {
      display:flex;align-items:center;gap:8px;
      flex-shrink:0;
    }
    .step-circle {
      width:28px;height:28px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:0.75rem;font-weight:700;flex-shrink:0;
      border:2px solid rgba(255,255,255,0.15);
      color:rgba(255,255,255,0.3);background:transparent;
      transition:all 0.2s;
    }
    .step-circle.done-step {
      background:#4caf50;border-color:#4caf50;color:#fff;
    }
    .step-circle mat-icon { font-size:14px;height:14px;width:14px; }
    .step-circle.active-step {
      border-color:currentColor;color:inherit;
      box-shadow:0 0 0 3px currentColor;
      background:transparent;
      opacity:1;
    }
    .step-label {
      font-size:0.78rem;font-weight:600;
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
      display:flex;align-items:flex-start;gap:10px;
      padding:12px 14px;border-radius:8px;margin-bottom:14px;
      font-size:0.82rem;line-height:1.5;
      background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);
    }
    .phase-guide mat-icon { font-size:18px;height:18px;width:18px;flex-shrink:0;margin-top:1px;opacity:0.7; }

    /* advance button */
    .advance-wrap {
      display:flex;align-items:center;justify-content:flex-end;
      gap:10px;margin-top:16px;padding-top:14px;
      border-top:1px solid rgba(255,255,255,0.06);
    }
    .advance-wrap .votes-left-badge { margin-right:auto; }

    /* ── desktop canvas ─────────────────────────────────── */
    .canvas-outer {
      overflow:auto;border:1px solid rgba(255,255,255,0.07);
      border-radius:10px;background:rgba(0,0,0,0.15);
      margin-top:4px;
      /* show a subtle grid */
      background-image:
        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size:40px 40px;
      cursor:default;
    }
    .canvas-inner {
      position:relative;
      width:1680px;height:960px;
    }
    .canvas-col-band {
      position:absolute;top:0;bottom:0;width:520px;
      border-right:1px solid rgba(255,255,255,0.05);
      pointer-events:none;
    }
    .canvas-col-label {
      position:absolute;top:12px;left:16px;
      font-size:0.78rem;font-weight:700;letter-spacing:0.03em;
      opacity:0.45;
    }
    .sticky {
      position:absolute;
      width:200px;min-height:90px;
      border-radius:4px;padding:10px 12px;
      box-shadow:2px 4px 12px rgba(0,0,0,0.35);
      cursor:grab;user-select:none;
      display:flex;flex-direction:column;gap:6px;
      transition:box-shadow 0.1s;
    }
    .sticky:active, .sticky.dragging { cursor:grabbing;box-shadow:4px 8px 24px rgba(0,0,0,0.5);z-index:100; }
    .sticky.no-drag { cursor:default; }
    .sticky-text { font-size:0.8rem;color:rgba(0,0,0,0.82);line-height:1.4;flex:1; }
    .sticky-author { font-size:0.65rem;color:rgba(0,0,0,0.45);margin-top:2px; }
    .sticky-footer { display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px; }
    .sticky-vote-btn {
      display:inline-flex;align-items:center;gap:3px;
      font-size:0.68rem;padding:2px 6px;border-radius:12px;
      border:1px solid rgba(0,0,0,0.2);background:transparent;
      color:rgba(0,0,0,0.55);cursor:pointer;transition:all 0.15s;
    }
    .sticky-vote-btn.voted { border-color:#e65100;background:rgba(230,81,0,0.12);color:#e65100; }
    .sticky-vote-btn:disabled { opacity:0.35;cursor:default; }
    .sticky-vote-btn mat-icon { font-size:12px;height:12px;width:12px; }
    .sticky-reactions { display:flex;gap:3px;flex-wrap:wrap; }
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
    .canvas-add-btn {
      position:absolute;bottom:8px;right:8px;
      background:rgba(100,181,246,0.15);border:1px solid rgba(100,181,246,0.3);
      color:#64b5f6;border-radius:6px;padding:4px 10px;
      font-size:0.72rem;cursor:pointer;
    }
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
    .sticky-color-btn {
      position:absolute;top:6px;right:6px;
      width:14px;height:14px;border-radius:50%;
      border:1.5px solid rgba(0,0,0,0.25);
      cursor:pointer;background:transparent;padding:0;
      opacity:0;transition:opacity 0.15s;flex-shrink:0;
    }
    .sticky:hover .sticky-color-btn { opacity:1; }
    .color-picker-popover {
      position:absolute;top:24px;right:0;z-index:200;
      background:#2a2a2a;border:1px solid rgba(255,255,255,0.12);
      border-radius:8px;padding:8px;display:flex;gap:6px;flex-wrap:wrap;
      width:116px;box-shadow:0 4px 16px rgba(0,0,0,0.5);
    }
    .color-swatch {
      width:22px;height:22px;border-radius:50%;cursor:pointer;
      border:2px solid transparent;transition:border-color 0.1s, transform 0.1s;
    }
    .color-swatch:hover, .color-swatch.active { border-color:rgba(255,255,255,0.7);transform:scale(1.15); }

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
  `],
  template: `
    <!-- ══════════════════════════════════════════════════════ -->
    <!-- SESSION LIST                                           -->
    <!-- ══════════════════════════════════════════════════════ -->
    @if (!session()) {
      <div class="lobby-wrap">
        <div class="lobby-header">
          <span class="lobby-title">Fun Retro</span>
          <button mat-flat-button color="primary" (click)="toggleNewForm()" [disabled]="loading()">
            <mat-icon>add</mat-icon> New Retro
          </button>
        </div>

        @if (loading()) {
          <div style="text-align:center;padding:32px">
            <mat-spinner diameter="32" style="margin:0 auto" />
          </div>
        } @else {
          @if (sessions().length === 0 && !showNewForm()) {
            <div class="empty-state">No retro sessions yet. Start one!</div>
          }

          <div class="session-list">
            @for (s of sessions(); track s.id) {
              <div class="session-card" (click)="openSession(s.id)">
                <div class="session-card-title">{{ s.title || 'Untitled Retro' }}</div>
                <div class="session-card-meta">
                  <span [style.color]="phaseColor(s.phase)">{{ phaseLabel(s.phase) }}</span>
                  @if (s.sprintName) { <span>{{ s.sprintName }}</span> }
                  <span>by {{ s.createdByName }}</span>
                  <span>{{ s.cardCount }} card{{ s.cardCount !== 1 ? 's' : '' }}</span>
                </div>
              </div>
            }
          </div>

          @if (showNewForm()) {
            <div class="new-retro-form">
              <h3>New Retro</h3>
              <label class="field-label">Title (optional)</label>
              <input class="field" [(ngModel)]="newTitle" placeholder="e.g. Sprint 42 Retro" />
              <div class="form-actions">
                <button mat-button (click)="cancelNewForm()">Cancel</button>
                <button mat-flat-button color="primary" (click)="createSession()" [disabled]="creating()">
                  @if (creating()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:6px" /> }
                  Create
                </button>
              </div>
            </div>
          }
        }
      </div>
    }

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- SESSION VIEW                                           -->
    <!-- ══════════════════════════════════════════════════════ -->
    @if (session(); as s) {
      <div class="session-wrap">
        <!-- Compact header: title + back -->
        <div class="session-header">
          <div class="session-title-row">
            <span class="session-name">{{ s.title || 'Untitled Retro' }}</span>
            <span class="session-sub">{{ s.cards.length }} card{{ s.cards.length !== 1 ? 's' : '' }}</span>
          </div>
          <div class="host-controls">
            <button mat-icon-button (click)="shareSession(s)" title="Share">
              <mat-icon>share</mat-icon>
            </button>
            <button mat-icon-button (click)="backToList()" title="Back to list">
              <mat-icon>arrow_back</mat-icon>
            </button>
          </div>
        </div>

        <!-- Step bar (all phases except lobby) -->
        @if (s.phase !== 'lobby') {
          <div class="step-bar">
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
        }
        @if (s.phase !== 'lobby') {
          <div class="phase-guide" [style.border-color]="phaseColor(s.phase) + '30'" [style.color]="phaseColor(s.phase)">
            <mat-icon>{{ phaseGuide(s.phase).icon }}</mat-icon>
            <span style="color:rgba(255,255,255,0.7)">{{ phaseGuide(s.phase).text }}</span>
          </div>
        }

        <!-- Board (mobile only) -->
        @if (!isDesktop()) {
          @if (s.phase === 'add' || s.phase === 'vote' || s.phase === 'discuss') {
            <div class="board">
              @for (col of cols; track col.key) {
                <div class="col">
                  <div class="col-header">
                    <span class="col-label" [style.color]="col.color">{{ col.label }}</span>
                    <span class="col-count">{{ cardsForCol(col.key).length }}</span>
                  </div>

                  @if (s.phase === 'add') {
                    <div class="add-input-row">
                      <input class="card-input"
                             [placeholder]="'Add to ' + col.label"
                             [(ngModel)]="newCardText()[col.key]"
                             (keyup.enter)="submitCard(col.key)"
                             [disabled]="submittingCard() === col.key" />
                      <button mat-icon-button
                              [style.color]="col.color"
                              (click)="submitCard(col.key)"
                              [disabled]="!newCardText()[col.key]?.trim() || submittingCard() === col.key"
                              title="Add card">
                        @if (submittingCard() === col.key) {
                          <mat-spinner diameter="16" />
                        } @else {
                          <mat-icon>send</mat-icon>
                        }
                      </button>
                    </div>
                  }

                  @for (card of cardsForCol(col.key); track card.id) {
                    <div class="retro-card"
                         [class.hidden-card]="card.text === null"
                         [class.own-card]="card.isOwn">
                      @if (card.isOwn && s.phase === 'add') {
                        <button class="delete-card-btn" (click)="deleteCard(card)" title="Delete">
                          <mat-icon>close</mat-icon>
                        </button>
                      }
                      @if (card.text !== null) {
                        <div class="card-text" [style.padding-right]="card.isOwn && s.phase === 'add' ? '20px' : '0'">{{ card.text }}</div>
                        @if (card.authorName && (s.phase === 'vote' || s.phase === 'discuss')) {
                          <div class="card-author">— {{ card.authorName }}</div>
                        }
                      } @else {
                        <div class="card-hidden-text">🔒 Hidden</div>
                      }
                      @if (s.phase === 'vote' && card.text !== null) {
                        <div class="card-footer">
                          <span class="vote-count-chip"><mat-icon>thumb_up</mat-icon>{{ card.voteCount }}</span>
                          <button class="card-vote-btn" [class.voted]="card.myVoteCount > 0"
                                  [disabled]="voteBudget() === 0 && card.myVoteCount === 0"
                                  (click)="toggleVote(card)">
                            <mat-icon>{{ card.myVoteCount > 0 ? 'thumb_up' : 'thumb_up_off_alt' }}</mat-icon>
                            {{ card.myVoteCount > 0 ? 'Voted' : 'Vote' }}
                          </button>
                        </div>
                      }
                      @if (s.phase === 'discuss' && card.text !== null) {
                        <div class="card-footer">
                          <span class="vote-count-chip"><mat-icon>thumb_up</mat-icon>{{ card.voteCount }}</span>
                        </div>
                        <div class="card-reactions">
                          @for (emoji of reactionEmojis; track emoji) {
                            <button class="reaction-btn" [class.reacted]="getReaction(card, emoji)?.mine"
                                    (click)="toggleReaction(card, emoji)">
                              {{ emoji }}
                              @if (getReactionCount(card, emoji) > 0) { <span>{{ getReactionCount(card, emoji) }}</span> }
                            </button>
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

        <!-- Canvas (desktop, add/vote/discuss/done) -->
        @if (isDesktop() && (s.phase === 'add' || s.phase === 'vote' || s.phase === 'discuss' || s.phase === 'done')) {
          <div class="canvas-outer" #canvasOuter>
            <div class="canvas-inner" #canvasInner>

              <!-- Column bands -->
              @for (col of cols; track col.key; let i = $index) {
                <div class="canvas-col-band" [style.left.px]="i * 560">
                  <span class="canvas-col-label" [style.color]="col.color">{{ col.label }}</span>
                </div>
              }

              <!-- Add-phase inputs per column -->
              @if (s.phase === 'add') {
                @for (col of cols; track col.key; let i = $index) {
                  <div class="canvas-col-add" [style.left.px]="i * 560 + 10">
                    <input class="canvas-col-input"
                           [placeholder]="'Add to ' + col.label"
                           [(ngModel)]="newCardText()[col.key]"
                           (keyup.enter)="submitCard(col.key)"
                           [disabled]="submittingCard() === col.key" />
                    <button class="canvas-col-add-btn"
                            [disabled]="!newCardText()[col.key]?.trim() || submittingCard() === col.key"
                            (click)="submitCard(col.key)">
                      @if (submittingCard() === col.key) { … } @else { Add }
                    </button>
                  </div>
                }
              }

              <!-- Sticky cards -->
              @for (item of canvasCards(); track item.card.id) {
                @if (item.card.text !== null) {
                  <div class="sticky"
                       [class.dragging]="draggingId() === item.card.id"
                       [class.no-drag]="s.phase === 'done'"
                       [style.left.px]="item.x"
                       [style.top.px]="item.y"
                       [style.background]="resolveCardColor(item.card)"
                       (mousedown)="startDrag($event, item.card, item.x, item.y)">
                    <!-- Delete button (add phase, own cards) -->
                    @if (s.phase === 'add' && item.card.isOwn) {
                      <button class="sticky-del-btn"
                              (mousedown)="$event.stopPropagation()"
                              (click)="deleteCard(item.card)" title="Delete">×</button>
                    }
                    <!-- Colour picker button (vote/discuss phases) -->
                    @if (s.phase === 'vote' || s.phase === 'discuss') {
                      <button class="sticky-color-btn"
                              [style.background]="resolveCardColor(item.card)"
                              (mousedown)="$event.stopPropagation()"
                              (click)="toggleColorPicker($event, item.card.id)">
                      </button>
                      @if (colorPickerOpenFor() === item.card.id) {
                        <div class="color-picker-popover" (mousedown)="$event.stopPropagation()">
                          @for (swatch of stickyPalette; track swatch) {
                            <div class="color-swatch"
                                 [style.background]="swatch"
                                 [class.active]="resolveCardColor(item.card) === swatch"
                                 (click)="changeCardColor(item.card, swatch)">
                            </div>
                          }
                        </div>
                      }
                    }
                    <div class="sticky-text">{{ item.card.text }}</div>
                    @if (item.card.authorName && s.phase !== 'vote') {
                      <div class="sticky-author">— {{ item.card.authorName }}</div>
                    }
                    <div class="sticky-footer">
                      @if (s.phase === 'vote') {
                        <span class="sticky-vote-chip">
                          <mat-icon>thumb_up</mat-icon>{{ item.card.voteCount }}
                        </span>
                        <button class="sticky-vote-btn"
                                [class.voted]="item.card.myVoteCount > 0"
                                [disabled]="voteBudget() === 0 && item.card.myVoteCount === 0"
                                (mousedown)="$event.stopPropagation()"
                                (click)="toggleVote(item.card)">
                          <mat-icon>{{ item.card.myVoteCount > 0 ? 'thumb_up' : 'thumb_up_off_alt' }}</mat-icon>
                          {{ item.card.myVoteCount > 0 ? 'Voted' : 'Vote' }}
                        </button>
                      }
                      @if (s.phase === 'discuss' || s.phase === 'done') {
                        <span class="sticky-vote-chip">
                          <mat-icon>thumb_up</mat-icon>{{ item.card.voteCount }}
                        </span>
                      }
                    </div>
                    @if (s.phase === 'discuss') {
                      <div class="sticky-reactions">
                        @for (emoji of reactionEmojis; track emoji) {
                          <button class="sticky-reaction-btn"
                                  [class.reacted]="getReaction(item.card, emoji)?.mine"
                                  (mousedown)="$event.stopPropagation()"
                                  (click)="toggleReaction(item.card, emoji)">
                            {{ emoji }}
                            @if (getReactionCount(item.card, emoji) > 0) { <span>{{ getReactionCount(item.card, emoji) }}</span> }
                          </button>
                        }
                      </div>
                    }
                  </div>
                }
              }
            </div>
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

        <!-- Bottom advance bar (host only, non-done phases) -->
        @if (s.isCreator && s.phase !== 'lobby' && nextPhase()) {
          <div class="advance-wrap">
            @if (s.phase === 'vote') {
              <span class="votes-left-badge" style="margin-right:auto">{{ voteBudget() }} vote{{ voteBudget() !== 1 ? 's' : '' }} left</span>
            }
            @if (s.phase === 'discuss' || s.phase === 'done') {
              <button mat-stroked-button (click)="runAnalysis()" [disabled]="analysing()">
                @if (analysing()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:4px" /> }
                @else { <mat-icon>auto_awesome</mat-icon> }
                Analyse with AI
              </button>
            }
            <button mat-flat-button color="accent" (click)="advancePhase()" [disabled]="advancingPhase()">
              @if (advancingPhase()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:4px" /> }
              Next: {{ phaseLabel(nextPhase()!) }}
              <mat-icon>arrow_forward</mat-icon>
            </button>
          </div>
        }
        @if (s.isCreator && s.phase === 'done') {
          <div class="advance-wrap">
            <button mat-stroked-button (click)="runAnalysis()" [disabled]="analysing()">
              @if (analysing()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:4px" /> }
              @else { <mat-icon>auto_awesome</mat-icon> }
              Analyse with AI
            </button>
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
      </div>
    }
  `
})
export class FunRetroComponent implements OnInit, OnDestroy {
  private svc = inject(FunRetroService);
  private wsSvc = inject(WebSocketService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  cols = COLS;
  reactionEmojis = REACTION_EMOJIS;

  sessions = signal<FunRetroSessionSummary[]>([]);
  session = signal<FunRetroSession | null>(null);
  loading = signal(false);

  showNewForm = signal(false);
  newTitle = '';
  creating = signal(false);

  newCardText = signal<Record<string, string>>({ well: '', better: '', action: '' });
  submittingCard = signal<string | null>(null);

  advancingPhase = signal(false);
  revealing = signal(false);
  analysing = signal(false);

  // Canvas state
  isDesktop = signal(typeof window !== 'undefined' ? window.innerWidth >= 800 : false);
  localPositions = signal<Record<string, { x: number; y: number }>>({});
  draggingId = signal<string | null>(null);
  private dragState: { id: string; startMouseX: number; startMouseY: number; startX: number; startY: number } | null = null;

  @ViewChild('canvasInner') canvasInner?: ElementRef<HTMLElement>;

  // Auto-layout: evenly distribute by column when no saved position
  canvasCards = computed(() => {
    const s = this.session();
    if (!s) return [];
    const colOrder: Record<string, number> = { well: 0, better: 1, action: 2 };
    const colCounts: Record<string, number> = { well: 0, better: 0, action: 0 };
    const localPos = this.localPositions();

    return s.cards
      .filter(c => c.text !== null)
      .map(card => {
        const local = localPos[card.id];
        if (local) return { card, x: local.x, y: local.y };
        if (card.positionX != null && card.positionY != null)
          return { card, x: card.positionX, y: card.positionY };

        const col = colOrder[card.column] ?? 0;
        const idx = colCounts[card.column] ?? 0;
        colCounts[card.column] = idx + 1;
        const row = Math.floor(idx / 2);
        const offset = (idx % 2) * 220;
        const yStart = s.phase === 'add' ? 110 : 60;
        return { card, x: col * 560 + 20 + offset, y: yStart + row * 190 };
      });
  });

  @HostListener('window:resize')
  onResize(): void {
    this.isDesktop.set(window.innerWidth >= 800);
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    if (!this.dragState) return;
    const dx = e.clientX - this.dragState.startMouseX;
    const dy = e.clientY - this.dragState.startMouseY;
    const x = Math.max(0, this.dragState.startX + dx);
    const y = Math.max(0, this.dragState.startY + dy);
    this.localPositions.update(p => ({ ...p, [this.dragState!.id]: { x, y } }));
  }

  @HostListener('document:click')
  onDocClick(): void {
    if (this.colorPickerOpenFor()) this.colorPickerOpenFor.set(null);
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (!this.dragState) return;
    const { id } = this.dragState;
    const s = this.session();
    const pos = this.localPositions()[id];
    if (s && pos) {
      this.svc.updateCardPosition(s.id, id, pos.x, pos.y).subscribe();
    }
    this.dragState = null;
    this.draggingId.set(null);
  }

  startDrag(e: MouseEvent, card: FunRetroCard, x: number, y: number): void {
    const s = this.session();
    if (e.button !== 0 || s?.phase === 'done') return;
    e.preventDefault();
    this.dragState = { id: card.id, startMouseX: e.clientX, startMouseY: e.clientY, startX: x, startY: y };
    this.draggingId.set(card.id);
  }

  readonly stickyPalette = [
    '#fff9c4', '#ffe0b2', '#fce4ec', '#c8e6c9',
    '#bbdefb', '#e1bee7', '#ffcdd2', '#b2dfdb',
    '#f5f5f5', '#ffe082', '#a5d6a7', '#90caf9',
  ];

  private readonly colDefaultColor: Record<string, string> = {
    well: '#c8e6c9', better: '#ffe0b2', action: '#fce4ec',
  };

  colorPickerOpenFor = signal<string | null>(null);

  resolveCardColor(card: FunRetroCard): string {
    return card.color ?? this.colDefaultColor[card.column] ?? '#fff9c4';
  }

  toggleColorPicker(e: MouseEvent, cardId: string): void {
    e.stopPropagation();
    this.colorPickerOpenFor.update(cur => cur === cardId ? null : cardId);
  }

  changeCardColor(card: FunRetroCard, color: string): void {
    const s = this.session();
    if (!s) return;
    this.colorPickerOpenFor.set(null);
    // Optimistic local update
    this.session.update(cur => {
      if (!cur) return cur;
      return { ...cur, cards: cur.cards.map(c => c.id === card.id ? { ...c, color } : c) };
    });
    this.svc.updateCardColor(s.id, card.id, color).subscribe();
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
          if (msg.data['sessionId'] === s.id) this.silentRefresh();
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
        case 'fun_retro_revealed':
          if (msg.data['sessionId'] === s.id) {
            this.revealing.set(true);
            setTimeout(() => { this.revealing.set(false); this.silentRefresh(); }, 1500);
          }
          break;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSessions(): void {
    this.loading.set(true);
    this.svc.getSessions().subscribe({
      next: list => { this.sessions.set(list); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Failed to load sessions', 'OK', { duration: 3000 }); }
    });
  }

  openSession(id: string): void {
    this.loading.set(true);
    this.svc.getSession(id).subscribe({
      next: s => {
        this.session.set(s);
        this.loading.set(false);
        this.router.navigate(['/pulse/retro', id], { replaceUrl: true });
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load session', 'OK', { duration: 3000 });
        this.loadSessions();
      }
    });
  }

  silentRefresh(): void {
    const s = this.session();
    if (!s) return;
    this.svc.getSession(s.id).subscribe({
      next: updated => this.session.set(updated),
      error: () => {}
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

  toggleNewForm(): void {
    this.showNewForm.set(!this.showNewForm());
    if (!this.showNewForm()) {
      this.newTitle = '';
      }
  }

  cancelNewForm(): void {
    this.showNewForm.set(false);
    this.newTitle = '';
  }

  createSession(): void {
    this.creating.set(true);
    const req: { title?: string } = {};
    if (this.newTitle.trim()) req.title = this.newTitle.trim();
    this.svc.createSession(req).subscribe({
      next: s => {
        this.creating.set(false);
        this.showNewForm.set(false);
        this.newTitle = '';
            this.session.set(s);
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
      next: updated => { this.session.set(updated); this.advancingPhase.set(false); },
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
