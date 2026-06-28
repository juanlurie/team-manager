import {
  Component, Input, OnInit, OnDestroy, signal, computed, inject, HostListener,
  ChangeDetectionStrategy
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, Subject, Subscription } from 'rxjs';

import { Sprint } from '../../../core/models/sprint.model';
import { RetroCard, RetroColumn, RetroPhase } from '../../../core/models/retro-card.model';
import { RetroAction, CreateRetroActionRequest } from '../../../core/models/retro-action.model';
import { MemberSprintCard } from '../../../core/models/dashboard.model';
import { RetroCardService } from '../../../core/services/retro-card.service';
import { RetroActionService } from '../../../core/services/retro-action.service';
import { SprintService } from '../../../core/services/sprint.service';
import { WebSocketService } from '../../../core/websocket/websocket.service';
import { IconButtonComponent } from '../../../shared/components/icon-btn/icon-btn.component';

const PHASES: RetroPhase[] = ['lobby', 'add', 'vote', 'discuss', 'actions'];
const COL_META = {
  well:   { label: '✅ Went Well',       color: '#4caf50', prompt: 'What went well this sprint?' },
  better: { label: '⚠️ Didn\'t Go Well', color: '#ff9800', prompt: "What could've gone better?" },
  action: { label: '🎯 Action Items',    color: '#e91e8c', prompt: 'What should we do differently?' },
} as const;

@Component({
  selector: 'app-sprint-retro',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatTooltipModule, IconButtonComponent],
  styles: [`
    :host { display:flex; flex-direction:column; min-width:0; overflow:hidden; }

    /* ── Shared ───────────────────────────────── */
    .retro-wrap {
      display:flex; flex-direction:column; gap:0;
      height: calc(100vh - 220px);
      min-height: 400px;
      overflow: hidden;
      min-width: 0;
    }
    .phase-header { display:flex; align-items:center; gap:10px; padding:12px 16px 10px;
      border-bottom:1px solid rgba(255,255,255,0.07); flex-wrap:wrap; }
    .phase-badge { padding:3px 12px; border-radius:20px; font-size:11px; font-weight:700;
      text-transform:uppercase; letter-spacing:.06em; flex-shrink:0; }
    .phase-badge.lobby   { background:rgba(100,181,246,.15); color:#64b5f6; }
    .phase-badge.add     { background:rgba(76,175,80,.15);   color:#4caf50; }
    .phase-badge.vote    { background:rgba(255,152,0,.15);   color:#ff9800; }
    .phase-badge.discuss { background:rgba(233,30,140,.15);  color:#e91e8c; }
    .phase-badge.actions { background:rgba(206,147,216,.15); color:#ce93d8; }
    .phase-title { font-size:14px; font-weight:600; flex:1; min-width:0; }
    .phase-btn { display:flex; align-items:center; gap:5px; padding:6px 14px;
      background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12);
      border-radius:7px; color:rgba(255,255,255,0.7); font-size:12px; font-weight:600;
      cursor:pointer; font-family:inherit; transition:all .12s; white-space:nowrap; }
    .phase-btn:hover { background:rgba(255,255,255,0.1); color:#fff; }
    .phase-btn.primary { background:rgba(100,181,246,.15); border-color:rgba(100,181,246,.4); color:#64b5f6; }
    .phase-btn.primary:hover { background:rgba(100,181,246,.25); }
    .phase-btn:disabled { opacity:.35; cursor:not-allowed; }
    .budget { font-size:12px; font-weight:700; padding:3px 10px; border-radius:20px;
      background:rgba(255,152,0,.12); color:#ff9800; border:1px solid rgba(255,152,0,.25); white-space:nowrap; }

    /* ── Living Board (desktop) ───────────────── */
    .board { display:none; }
    @media (min-width:900px) {
      .board {
        display:grid;
        grid-template-columns:repeat(3,1fr);
        grid-template-rows:1fr;
        flex:1;
        min-height:0;
        overflow:hidden;
        width:100%;
        min-width:0;
      }
      .stepper { display:none; }
    }
    .col { display:flex; flex-direction:column; border-right:1px solid rgba(255,255,255,0.06);
      overflow:hidden; min-width:0; }
    .col:last-child { border-right:none; }
    .col-hdr { padding:10px 14px 8px; display:flex; align-items:center; gap:7px; flex-shrink:0; }
    .col-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; }
    .col-cards { flex:1; overflow-y:auto; padding:4px 10px 6px; display:flex;
      flex-direction:column; gap:5px; }
    .col-cards::-webkit-scrollbar { width:3px; }
    .col-cards::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
    .col-add { padding:6px 10px 10px; flex-shrink:0; }
    .add-input { width:100%; padding:7px 10px; background:rgba(255,255,255,.05);
      border:1px solid rgba(255,255,255,.1); border-radius:6px; color:inherit;
      font-family:inherit; font-size:12px; outline:none; box-sizing:border-box;
      resize:none; line-height:1.4; }
    .add-input:focus { border-color:rgba(100,181,246,.6); }
    .add-input::placeholder { color:rgba(255,255,255,.2); }
    .add-row { display:flex; justify-content:flex-end; margin-top:5px; }
    .add-submit { padding:4px 12px; background:#64b5f6; border:none; border-radius:5px;
      color:#0f1923; font-size:11px; font-weight:700; cursor:pointer; font-family:inherit; }
    .add-submit:disabled { opacity:.35; cursor:not-allowed; }

    /* ── Card ─────────────────────────────────── */
    .card { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
      border-radius:8px; padding:9px 11px; transition:all .12s; }
    .card.spotlight { border-color:rgba(233,30,140,.6); background:rgba(233,30,140,.07);
      box-shadow:0 0 0 1px rgba(233,30,140,.3); }
    .card.dimmed { opacity:.4; }
    .card-text { font-size:13px; line-height:1.45; margin-bottom:5px; }
    .card-meta { display:flex; align-items:center; justify-content:space-between; gap:6px; }
    .card-author { font-size:10px; color:rgba(255,255,255,.3); }
    .card-actions { display:flex; align-items:center; gap:4px; margin-left:auto; }
    .vote-btn { display:flex; align-items:center; gap:4px; padding:3px 8px; border-radius:12px;
      border:1px solid rgba(255,255,255,.12); background:transparent; color:rgba(255,255,255,.5);
      font-size:11px; font-weight:600; cursor:pointer; transition:all .1s; }
    .vote-btn.voted { border-color:rgba(255,152,0,.5); color:#ff9800; background:rgba(255,152,0,.1); }
    .vote-btn:disabled { opacity:.35; cursor:not-allowed; }
    .vote-btn:not(:disabled):hover { border-color:rgba(255,255,255,.3); color:rgba(255,255,255,.8); }
    .vote-count { font-size:11px; font-weight:700; color:rgba(255,255,255,.35); }
    .to-action-btn { padding:3px 9px; background:rgba(233,30,140,.12);
      border:1px solid rgba(233,30,140,.3); border-radius:5px; color:#e91e8c;
      font-size:10px; font-weight:600; cursor:pointer; font-family:inherit; white-space:nowrap; }
    .to-action-btn:hover { background:rgba(233,30,140,.22); }
    .del-btn { background:none; border:none; color:rgba(255,255,255,.2); cursor:pointer;
      font-size:14px; line-height:1; padding:2px 4px; flex-shrink:0; }
    .del-btn:hover { color:#ef5350; }

    /* ── Stepper (mobile) ─────────────────────── */
    .stepper { display:flex; flex-direction:column; flex:1; min-height:0; overflow:hidden; }
    @media (min-width:900px) { .stepper { display:none; } }
    .step-pips { display:flex; align-items:center; justify-content:center; gap:6px;
      padding:10px 16px 8px; }
    .pip { width:28px; height:28px; border-radius:50%; border:2px solid rgba(255,255,255,.2);
      display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700;
      color:rgba(255,255,255,.3); flex-shrink:0; }
    .pip.done { border-color:#4caf50; background:#4caf50; color:#fff; font-size:9px; }
    .pip.active { border-color:#64b5f6; background:#64b5f6; color:#0f1923; }
    .pip-line { flex:1; height:1px; background:rgba(255,255,255,.1); max-width:24px; }
    .step-body { padding:10px 14px; flex:1; overflow-y:auto; }
    .step-footer { display:flex; gap:8px; padding:10px 14px 14px; border-top:1px solid rgba(255,255,255,.07); }
    .step-btn { flex:1; padding:10px; border:none; border-radius:8px; font-size:13px;
      font-weight:700; cursor:pointer; font-family:inherit; }
    .step-back { background:rgba(255,255,255,.07); color:rgba(255,255,255,.6); }
    .step-next { background:#64b5f6; color:#0f1923; }
    .step-next:disabled { opacity:.35; cursor:not-allowed; }

    /* ── Mobile column tabs ───────────────────── */
    .col-tabs { display:flex; gap:0; border-bottom:1px solid rgba(255,255,255,.07); margin-bottom:8px; }
    .col-tab { flex:1; padding:7px 4px; text-align:center; font-size:11px; font-weight:600;
      background:none; border:none; color:rgba(255,255,255,.35); cursor:pointer;
      border-bottom:2px solid transparent; }
    .col-tab.active { color:#fff; border-bottom-color:var(--tab-color,#64b5f6); }

    /* ── Lobby / actions misc ─────────────────── */
    .lobby-body { display:flex; flex-direction:column; align-items:center; gap:14px;
      padding:32px 20px; text-align:center; }
    .lobby-avatars { display:flex; gap:-4px; }
    .avatar { width:32px; height:32px; border-radius:50%; background:rgba(100,181,246,.2);
      border:2px solid rgba(100,181,246,.3); display:flex; align-items:center; justify-content:center;
      font-size:12px; font-weight:700; color:#64b5f6; flex-shrink:0; }
    .start-btn { padding:10px 28px; background:#64b5f6; border:none; border-radius:8px;
      color:#0f1923; font-size:14px; font-weight:700; cursor:pointer; font-family:inherit; }

    /* ── Action items section ─────────────────── */
    .actions-list { display:flex; flex-direction:column; gap:0; }
    .action-item { display:flex; align-items:flex-start; gap:8px; padding:8px 0;
      border-bottom:1px solid rgba(255,255,255,.05); }
    .action-item:last-child { border-bottom:none; }
    .status-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; margin-top:3px; cursor:pointer; }
    .owner-select { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);
      border-radius:5px; color:inherit; font-size:11px; padding:2px 6px; font-family:inherit;
      outline:none; cursor:pointer; }
    .action-input { flex:1; background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1);
      border-radius:5px; padding:4px 8px; font-family:inherit; font-size:12px; color:inherit;
      outline:none; }
    .action-input:focus { border-color:rgba(100,181,246,.6); }
    .new-action-row { display:flex; gap:6px; margin-top:10px; align-items:center; }
  `],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
<div class="retro-wrap">

  <!-- ── Phase header ── -->
  <div class="phase-header">
    <span class="phase-badge" [class]="phase()">{{ phaseLabel() }}</span>
    <span class="phase-title" style="color:rgba(255,255,255,.5);font-size:12px">
      @if (phase() === 'vote') {
        <span class="budget">{{ budget() }} vote{{ budget() !== 1 ? 's' : '' }} left</span>
      }
    </span>
    @if (phase() !== 'lobby') {
      <button class="phase-btn" (click)="regressPhase()" [disabled]="phase() === 'add'">← Back</button>
    }
    <button class="phase-btn primary" (click)="advancePhase()" [disabled]="phase() === 'actions'">
      {{ phase() === 'lobby' ? '▶ Start Retro' : phase() === 'actions' ? '✓ Done' : 'Next →' }}
    </button>
  </div>

  <!-- ══════════════════════════════════════════ -->
  <!-- DESKTOP: Living Board                      -->
  <!-- ══════════════════════════════════════════ -->
  <div class="board">
    @for (col of cols; track col.key) {
      <div class="col">
        <div class="col-hdr">
          <span style="font-size:14px">{{ col.icon }}</span>
          <span class="col-label" [style.color]="col.color">{{ col.label }}</span>
          <span style="font-size:10px;color:rgba(255,255,255,.2);margin-left:auto">
            {{ cardsByCol()[col.key]?.length ?? 0 }}
          </span>
        </div>

        @if (phase() === 'lobby') {
          <div style="padding:16px 14px;color:rgba(255,255,255,.2);font-size:12px;font-style:italic">
            Waiting for retro to start…
          </div>
        }

        <div class="col-cards">
          @for (card of sortedCards()[col.key] ?? []; track card.id) {
            <div class="card"
                 [class.spotlight]="phase() === 'discuss' && isSpotlight(card)"
                 [class.dimmed]="phase() === 'discuss' && !isSpotlight(card)">
              <div class="card-text">{{ card.text }}</div>
              <div class="card-meta">
                <span class="card-author">{{ card.authorName }}</span>
                <div class="card-actions">
                  @if (phase() === 'vote' || phase() === 'discuss') {
                    <button class="vote-btn" [class.voted]="card.myVoteCount > 0"
                            [disabled]="budget() === 0 && card.myVoteCount === 0"
                            (click)="toggleVote(card)"
                            [matTooltip]="card.myVoteCount > 0 ? 'Remove vote' : 'Vote'">
                      🔥 {{ card.voteCount }}
                    </button>
                  } @else if (phase() === 'add') {
                    <span class="vote-count">{{ card.voteCount > 0 ? card.voteCount : '' }}</span>
                  }
                  @if (phase() === 'discuss' && isSpotlight(card)) {
                    <button class="to-action-btn" (click)="convertToAction(card)">→ Action</button>
                  }
                  @if (phase() === 'add' && card.authorId === currentMemberId) {
                    <button class="del-btn" (click)="deleteCard(card)" matTooltip="Delete">×</button>
                  }
                </div>
              </div>
            </div>
          }
        </div>

        @if (phase() === 'add' || phase() === 'lobby' && false) {
          <div class="col-add">
            <textarea class="add-input" rows="2"
                      [placeholder]="col.prompt"
                      [(ngModel)]="addTexts[col.key]"
                      (keydown.enter)="$event.preventDefault(); submitCard(col.key)"></textarea>
            <div class="add-row">
              <button class="add-submit" [disabled]="!addTexts[col.key]?.trim()"
                      (click)="submitCard(col.key)">Add</button>
            </div>
          </div>
        }

        @if (phase() === 'discuss') {
          <div style="padding:6px 14px 10px;border-top:1px solid rgba(255,255,255,.06);flex-shrink:0;display:flex;gap:6px">
            <button class="phase-btn" [disabled]="spotlightIndex() === 0" (click)="prevSpotlight()">← Prev</button>
            <span style="flex:1;text-align:center;font-size:11px;color:rgba(255,255,255,.3);align-self:center">
              {{ spotlightIndex()+1 }} / {{ discussionQueue().length }}
            </span>
            <button class="phase-btn" [disabled]="spotlightIndex() >= discussionQueue().length-1" (click)="nextSpotlight()">Next →</button>
          </div>
        }

        @if (phase() === 'actions') {
          <div class="col-add" style="flex:1;overflow-y:auto">
            <div class="actions-list">
              @for (action of actions(); track action.id) {
                <div class="action-item">
                  <span class="status-dot" [style.background]="statusColor(action.status)"
                        [matTooltip]="nextStatusLabel(action.status)"
                        (click)="cycleStatus(action)"></span>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:12px;line-height:1.4"
                         [style.text-decoration]="action.status === 'Done' ? 'line-through' : ''"
                         [style.opacity]="action.status === 'Done' ? '.5' : '1'">{{ action.title }}</div>
                    @if (action.assignedTo) {
                      <div style="font-size:10px;opacity:.4;margin-top:2px">{{ action.assignedTo }}</div>
                    }
                  </div>
                  <select class="owner-select" [ngModel]="action.assignedTo ?? ''"
                          (ngModelChange)="assignOwner(action, $event)">
                    <option value="">Assign…</option>
                    @for (m of members; track m.teamMemberId) {
                      <option [value]="m.fullName">{{ m.fullName }}</option>
                    }
                  </select>
                  <app-icon-btn icon="delete_outline" size="sm" [danger]="true" (btnClick)="deleteAction(action)" />
                </div>
              }
            </div>
            <div class="new-action-row">
              <input class="action-input" placeholder="New action item…" [(ngModel)]="newActionTitle"
                     (keydown.enter)="addAction()" />
              <button class="add-submit" [disabled]="!newActionTitle.trim()" (click)="addAction()">Add</button>
            </div>
          </div>
        }
      </div>
    }
  </div>

  <!-- ══════════════════════════════════════════ -->
  <!-- MOBILE: Guided Stepper                     -->
  <!-- ══════════════════════════════════════════ -->
  <div class="stepper">
    <div class="step-pips">
      @for (p of phases; track p; let i = $index) {
        <div class="pip"
             [class.done]="phaseIndex() > i"
             [class.active]="phaseIndex() === i">
          {{ phaseIndex() > i ? '✓' : (i + 1) }}
        </div>
        @if (i < phases.length - 1) { <div class="pip-line"></div> }
      }
    </div>

    <div class="step-body">

      <!-- Lobby -->
      @if (phase() === 'lobby') {
        <div class="lobby-body">
          <div style="font-size:15px;font-weight:700">Ready to start the retro?</div>
          <div class="lobby-avatars">
            @for (m of members.slice(0,5); track m.teamMemberId) {
              <div class="avatar" [matTooltip]="m.fullName">{{ m.fullName.slice(0,1) }}</div>
            }
          </div>
          <div style="font-size:12px;color:rgba(255,255,255,.4)">{{ members.length }} participants</div>
        </div>
      }

      <!-- Add phase (mobile) -->
      @if (phase() === 'add') {
        <div class="col-tabs">
          @for (col of cols; track col.key) {
            <button class="col-tab" [class.active]="mobileCol() === col.key"
                    [style.--tab-color]="col.color"
                    (click)="mobileCol.set(col.key)">{{ col.shortLabel }}</button>
          }
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          @for (card of cardsByCol()[mobileCol()] ?? []; track card.id) {
            <div class="card">
              <div class="card-text">{{ card.text }}</div>
              <div class="card-meta">
                <span class="card-author">{{ card.authorName }}</span>
                @if (card.authorId === currentMemberId) {
                  <button class="del-btn" (click)="deleteCard(card)">×</button>
                }
              </div>
            </div>
          }
          <textarea class="add-input" rows="2" [placeholder]="colMeta[mobileCol()].prompt"
                    [(ngModel)]="addTexts[mobileCol()]"
                    (keydown.enter)="$event.preventDefault(); submitCard(mobileCol())"></textarea>
          <button class="add-submit" style="align-self:flex-end"
                  [disabled]="!addTexts[mobileCol()]?.trim()"
                  (click)="submitCard(mobileCol())">Add</button>
        </div>
      }

      <!-- Vote phase (mobile) -->
      @if (phase() === 'vote') {
        <div style="font-size:11px;color:rgba(255,255,255,.4);margin-bottom:10px;text-align:center">
          <span class="budget">{{ budget() }} votes left</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          @for (card of allCards(); track card.id) {
            <div class="card">
              <div class="card-text">{{ card.text }}</div>
              <div class="card-meta">
                <span class="card-author">{{ card.authorName }}</span>
                <button class="vote-btn" [class.voted]="card.myVoteCount > 0"
                        [disabled]="budget() === 0 && card.myVoteCount === 0"
                        (click)="toggleVote(card)">🔥 {{ card.voteCount }}</button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Discuss phase (mobile) -->
      @if (phase() === 'discuss') {
        @if (discussionQueue().length > 0) {
          <div style="font-size:11px;color:rgba(255,255,255,.35);margin-bottom:8px;text-align:center">
            {{ spotlightIndex()+1 }} / {{ discussionQueue().length }} — sorted by votes
          </div>
          <div class="card spotlight" style="margin-bottom:12px">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#e91e8c;margin-bottom:6px">Now discussing</div>
            <div class="card-text" style="font-size:14px">{{ discussionQueue()[spotlightIndex()]?.text }}</div>
            <div class="card-meta">
              <span class="card-author">{{ discussionQueue()[spotlightIndex()]?.authorName }}</span>
              <span class="budget" style="font-size:10px">{{ discussionQueue()[spotlightIndex()]?.voteCount }} votes</span>
            </div>
            <div style="margin-top:8px">
              <button class="to-action-btn" (click)="convertToAction(discussionQueue()[spotlightIndex()])">→ Turn into action</button>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-bottom:12px">
            <button class="phase-btn" style="flex:1" [disabled]="spotlightIndex()===0" (click)="prevSpotlight()">← Prev</button>
            <button class="phase-btn" style="flex:1" [disabled]="spotlightIndex()>=discussionQueue().length-1" (click)="nextSpotlight()">Next →</button>
          </div>
          <div style="font-size:10px;font-weight:700;color:rgba(255,255,255,.3);text-transform:uppercase;margin-bottom:6px">Up next</div>
          @for (card of discussionQueue().slice(spotlightIndex()+1); track card.id) {
            <div class="card dimmed" style="margin-bottom:4px">
              <div class="card-text">{{ card.text }}</div>
              <div class="card-meta">
                <span class="card-author">{{ card.authorName }}</span>
                <span class="vote-count">{{ card.voteCount }} votes</span>
              </div>
            </div>
          }
        } @else {
          <div style="text-align:center;padding:30px;color:rgba(255,255,255,.3)">No cards to discuss</div>
        }
      }

      <!-- Actions phase (mobile) -->
      @if (phase() === 'actions') {
        <div class="actions-list">
          @for (action of actions(); track action.id) {
            <div class="action-item">
              <span class="status-dot" [style.background]="statusColor(action.status)"
                    (click)="cycleStatus(action)"></span>
              <div style="flex:1;min-width:0">
                <div style="font-size:13px;line-height:1.4">{{ action.title }}</div>
              </div>
              <select class="owner-select" [ngModel]="action.assignedTo ?? ''"
                      (ngModelChange)="assignOwner(action, $event)">
                <option value="">Assign…</option>
                @for (m of members; track m.teamMemberId) {
                  <option [value]="m.fullName">{{ m.fullName }}</option>
                }
              </select>
            </div>
          }
        </div>
        <div class="new-action-row" style="margin-top:12px">
          <input class="action-input" placeholder="New action item…" [(ngModel)]="newActionTitle"
                 (keydown.enter)="addAction()" />
          <button class="add-submit" [disabled]="!newActionTitle.trim()" (click)="addAction()">Add</button>
        </div>
      }

    </div>

    <div class="step-footer">
      @if (phase() !== 'lobby') {
        <button class="step-btn step-back" (click)="regressPhase()">← Back</button>
      }
      <button class="step-btn step-next" (click)="advancePhase()" [disabled]="phase() === 'actions'">
        {{ phase() === 'lobby' ? '▶ Start' : 'Next →' }}
      </button>
    </div>
  </div>

</div>
  `
})
export class SprintRetroComponent implements OnInit, OnDestroy {
  @Input({ required: true }) sprintId!: string;
  @Input() sprint: Sprint | null = null;
  @Input() members: MemberSprintCard[] = [];
  @Input() currentMemberId = '';
  @Input() currentMemberName = '';

  private cardSvc   = inject(RetroCardService);
  private actionSvc = inject(RetroActionService);
  private wsSvc     = inject(WebSocketService);

  cards   = signal<RetroCard[]>([]);
  actions = signal<RetroAction[]>([]);
  phase   = signal<RetroPhase>('lobby');
  spotlightIndex = signal(0);
  mobileCol = signal<RetroColumn>('well');

  addTexts: Record<string, string> = { well: '', better: '', action: '' };
  newActionTitle = '';

  readonly phases = PHASES;
  readonly colMeta = COL_META;
  readonly cols = [
    { key: 'well'   as RetroColumn, label: 'Went Well',       shortLabel: '✅ Well',   icon: '✅', color: '#4caf50', prompt: COL_META.well.prompt },
    { key: 'better' as RetroColumn, label: "Didn't Go Well",  shortLabel: '⚠️ Better', icon: '⚠️', color: '#ff9800', prompt: COL_META.better.prompt },
    { key: 'action' as RetroColumn, label: 'Action Items',    shortLabel: '🎯 Actions',icon: '🎯', color: '#e91e8c', prompt: COL_META.action.prompt },
  ];

  phaseIndex = computed(() => PHASES.indexOf(this.phase()));

  budget = computed(() => {
    const used = this.cards().reduce((s, c) => s + c.myVoteCount, 0);
    return Math.max(0, 3 - used);
  });

  cardsByCol = computed(() => {
    const map: Record<string, RetroCard[]> = { well: [], better: [], action: [] };
    for (const c of this.cards()) (map[c.column] ??= []).push(c);
    return map;
  });

  sortedCards = computed(() => {
    const map: Record<string, RetroCard[]> = { well: [], better: [], action: [] };
    for (const c of this.cards()) (map[c.column] ??= []).push(c);
    if (this.phase() === 'discuss') {
      for (const col of Object.keys(map))
        map[col] = [...map[col]].sort((a, b) => b.voteCount - a.voteCount);
    }
    return map;
  });

  allCards = computed(() =>
    [...this.cards()].sort((a, b) => b.voteCount - a.voteCount)
  );

  discussionQueue = computed(() =>
    [...this.cards()].filter(c => c.column !== 'action').sort((a, b) => b.voteCount - a.voteCount)
  );

  phaseLabel = computed(() => ({
    lobby: 'Lobby', add: 'Adding Cards', vote: 'Voting',
    discuss: 'Discussion', actions: 'Action Items',
  })[this.phase()] ?? this.phase());

  private wsSub?: Subscription;
  private resize$ = new Subject<void>();
  private resizeSub?: Subscription;

  ngOnInit() {
    this.phase.set((this.sprint?.retroPhase as RetroPhase | null) ?? 'lobby');

    this.cardSvc.getBySprintId(this.sprintId).subscribe(cards => this.cards.set(cards));
    this.actionSvc.getBySprintId(this.sprintId).subscribe(a => this.actions.set(a));

    this.wsSvc.connect();
    this.wsSub = this.wsSvc.messages$.subscribe(msg => {
      if (!msg) return;
      const d = msg.data as any;
      if (d?.sprintId !== this.sprintId) return;

      if (msg.type === 'retro_card_added') {
        const card = d.card as RetroCard;
        if (!this.cards().find(c => c.id === card.id))
          this.cards.update(cs => [...cs, card]);
      }
      if (msg.type === 'retro_card_deleted') {
        this.cards.update(cs => cs.filter(c => c.id !== d.cardId));
      }
      if (msg.type === 'retro_voted') {
        this.cards.update(cs => cs.map(c =>
          c.id === d.cardId ? { ...c, voteCount: d.voteCount } : c
        ));
      }
      if (msg.type === 'retro_phase_changed') {
        this.phase.set(d.phase ?? 'lobby');
        this.spotlightIndex.set(0);
      }
      if (['retro_action_created', 'retro_action_updated', 'retro_action_deleted'].includes(msg.type)) {
        this.actionSvc.getBySprintId(this.sprintId).subscribe(a => this.actions.set(a));
      }
    });
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
    this.resizeSub?.unsubscribe();
  }

  // ── Phase control ──────────────────────────────
  advancePhase() {
    const idx = PHASES.indexOf(this.phase());
    if (idx < PHASES.length - 1) this.setPhase(PHASES[idx + 1]);
  }

  regressPhase() {
    const idx = PHASES.indexOf(this.phase());
    if (idx > 0) this.setPhase(PHASES[idx - 1]);
  }

  private setPhase(p: RetroPhase) {
    this.phase.set(p);
    this.spotlightIndex.set(0);
    this.cardSvc.updatePhase(this.sprintId, p).subscribe();
  }

  // ── Cards ──────────────────────────────────────
  submitCard(col: RetroColumn) {
    const text = (this.addTexts[col] ?? '').trim();
    if (!text) return;
    this.addTexts[col] = '';
    this.cardSvc.create({
      sprintId: this.sprintId,
      column: col,
      text,
      authorName: this.currentMemberName || 'Anonymous',
    }).subscribe(card => {
      if (!this.cards().find(c => c.id === card.id))
        this.cards.update(cs => [...cs, card]);
    });
  }

  deleteCard(card: RetroCard) {
    this.cards.update(cs => cs.filter(c => c.id !== card.id));
    this.cardSvc.delete(card.id, this.sprintId).subscribe();
  }

  // ── Voting ─────────────────────────────────────
  toggleVote(card: RetroCard) {
    this.cardSvc.toggleVote(card.id, this.sprintId).subscribe(res => {
      this.cards.update(cs => cs.map(c =>
        c.id === card.id ? { ...c, voteCount: res.voteCount, myVoteCount: res.myVoteCount } : c
      ));
    });
  }

  // ── Discuss ────────────────────────────────────
  prevSpotlight() { this.spotlightIndex.update(i => Math.max(0, i - 1)); }
  nextSpotlight() { this.spotlightIndex.update(i => Math.min(this.discussionQueue().length - 1, i + 1)); }

  isSpotlight(card: RetroCard): boolean {
    return this.discussionQueue()[this.spotlightIndex()]?.id === card.id;
  }

  convertToAction(card: RetroCard | undefined) {
    if (!card) return;
    const req: CreateRetroActionRequest = {
      sprintId: this.sprintId,
      title: card.text,
      notes: null,
      assignedTo: null,
      status: 'Open',
      dueDate: null,
    };
    this.actionSvc.create(req).subscribe(a =>
      this.actions.update(list => [...list, a])
    );
  }

  // ── Actions ────────────────────────────────────
  addAction() {
    const title = this.newActionTitle.trim();
    if (!title) return;
    this.newActionTitle = '';
    const req: CreateRetroActionRequest = {
      sprintId: this.sprintId, title, notes: null,
      assignedTo: null, status: 'Open', dueDate: null,
    };
    this.actionSvc.create(req).subscribe(a =>
      this.actions.update(list => [...list, a])
    );
  }

  deleteAction(action: RetroAction) {
    this.actionSvc.delete(action.id).subscribe(() =>
      this.actions.update(list => list.filter(a => a.id !== action.id))
    );
  }

  assignOwner(action: RetroAction, owner: string) {
    const req: CreateRetroActionRequest = {
      sprintId: action.sprintId, title: action.title, notes: action.notes,
      assignedTo: owner || null, status: action.status, dueDate: action.dueDate,
    };
    this.actionSvc.update(action.id, req).subscribe(updated =>
      this.actions.update(list => list.map(a => a.id === updated.id ? updated : a))
    );
  }

  cycleStatus(action: RetroAction) {
    const cycle: Record<string, string> = { Open: 'InProgress', InProgress: 'Done', Done: 'Open' };
    const req: CreateRetroActionRequest = {
      sprintId: action.sprintId, title: action.title, notes: action.notes,
      assignedTo: action.assignedTo, status: cycle[action.status] ?? 'Open', dueDate: action.dueDate,
    };
    this.actionSvc.update(action.id, req).subscribe(updated =>
      this.actions.update(list => list.map(a => a.id === updated.id ? updated : a))
    );
  }

  statusColor(s: string) {
    return { Open: '#64b5f6', InProgress: '#ffb74d', Done: '#81c784' }[s] ?? '#aaa';
  }

  nextStatusLabel(s: string) {
    return { Open: 'Mark In Progress', InProgress: 'Mark Done', Done: 'Reopen' }[s] ?? '';
  }
}
