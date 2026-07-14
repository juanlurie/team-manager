import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { RetroTemplate, RETRO_TEMPLATES, ICEBREAKER_QUESTIONS, RETRO_THEMES } from './retro-constants';
import { RetroTheme, RetroCanvasLayout } from '../../../core/models/fun-retro.model';

export interface NewRetroDialogResult {
  title: string;
  templateId: string;
  icebreakerQuestion?: string;
  theme: RetroTheme;
  canvasLayout: RetroCanvasLayout;
  hideCardsOnAdd: boolean;
  votesPerUser: number | null; // null = unlimited
  maxVotesPerCard: number;
  stepDurations: { add?: number | null; vote?: number | null; discuss?: number | null } | null;
  checkinEnabled: boolean;
}

@Component({
  selector: 'app-new-retro-dialog',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatDialogModule],
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
    .theme-picker { display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px; }
    .theme-swatch {
      width:34px;height:34px;flex-shrink:0;
      background:rgba(255,255,255,0.05);border:1.5px solid rgba(255,255,255,0.12);
      border-radius:8px;cursor:pointer;color:rgba(255,255,255,0.5);
      display:flex;align-items:center;justify-content:center;
      transition:border-color .15s,background .15s;
    }
    .theme-swatch:hover { background:rgba(255,255,255,0.1); }
    .theme-swatch.selected { border-color:#64b5f6;background:rgba(100,181,246,0.12); }
    .theme-swatch-preview {
      width:22px;height:22px;background-repeat:no-repeat;background-position:center;
      background-size:contain;image-rendering:pixelated;opacity:0.85;
    }
    .setting-row {
      display:flex;align-items:center;justify-content:space-between;gap:12px;
      margin-bottom:4px;padding:8px 0;
    }
    .setting-text { font-size:0.82rem;color:rgba(255,255,255,0.85); }
    .setting-desc { font-size:0.7rem;color:rgba(255,255,255,0.35);margin-top:2px; }
    .toggle-track {
      width:38px;height:22px;border-radius:11px;background:rgba(255,255,255,0.12);
      flex-shrink:0;cursor:pointer;position:relative;transition:background 0.15s;
    }
    .toggle-track.on { background:#64b5f6; }
    .toggle-thumb {
      position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;
      background:#fff;transition:transform 0.15s;
    }
    .toggle-track.on .toggle-thumb { transform:translateX(16px); }
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

      <label class="field-label" style="margin-top:4px">Board theme (optional)</label>
      <div class="theme-picker">
        <button type="button" class="theme-swatch" [class.selected]="!selectedTheme" title="None" (click)="selectedTheme = null">
          <mat-icon style="font-size:16px;height:16px;width:16px">block</mat-icon>
        </button>
        @for (t of themes; track t.id) {
          <button type="button" class="theme-swatch" [class.selected]="selectedTheme === t.id" [title]="t.label"
                  (click)="selectedTheme = t.id">
            <span class="theme-swatch-preview" [style.background-image]="t.variantUrls[0]"></span>
          </button>
        }
      </div>

      <div class="setting-row" style="margin-top:8px">
        <div>
          <div class="setting-text">Hide cards until reveal</div>
          <div class="setting-desc">Participants only see their own cards during the add phase. Cards reveal when you move to voting or unlock them from the board.</div>
        </div>
        <div class="toggle-track" [class.on]="hideCardsOnAdd" (click)="hideCardsOnAdd = !hideCardsOnAdd">
          <div class="toggle-thumb"></div>
        </div>
      </div>

      <div class="setting-row">
        <div>
          <div class="setting-text">Limit votes per person</div>
          <div class="setting-desc">Cap how many votes each participant gets across the whole board. Off = unlimited.</div>
        </div>
        <div class="toggle-track" [class.on]="limitVotes" (click)="limitVotes = !limitVotes">
          <div class="toggle-thumb"></div>
        </div>
      </div>
      @if (limitVotes) {
        <div style="display:flex;gap:12px">
          <div style="flex:1">
            <label class="field-label">Votes per person</label>
            <input class="field" type="number" min="1" max="99" [(ngModel)]="votesPerUser" />
          </div>
          <div style="flex:1">
            <label class="field-label">Max votes per card</label>
            <input class="field" type="number" min="1" [max]="votesPerUser" [(ngModel)]="maxVotesPerCard" />
          </div>
        </div>
      }

      <div class="setting-row">
        <div>
          <div class="setting-text">Phase timers</div>
          <div class="setting-desc">Preset a timer length for each phase. When you open the timer in that phase it starts pre-filled. Total is your meeting budget.</div>
        </div>
        <div class="toggle-track" [class.on]="phaseTimers" (click)="phaseTimers = !phaseTimers">
          <div class="toggle-thumb"></div>
        </div>
      </div>
      @if (phaseTimers) {
        <div style="display:flex;gap:12px">
          <div style="flex:1">
            <label class="field-label">Add (min)</label>
            <input class="field" type="number" min="0" [(ngModel)]="addMinutes" />
          </div>
          <div style="flex:1">
            <label class="field-label">Vote (min)</label>
            <input class="field" type="number" min="0" [(ngModel)]="voteMinutes" />
          </div>
          <div style="flex:1">
            <label class="field-label">Discuss (min)</label>
            <input class="field" type="number" min="0" [(ngModel)]="discussMinutes" />
          </div>
        </div>
        <div class="setting-desc" style="margin-bottom:8px">Meeting budget: {{ (addMinutes || 0) + (voteMinutes || 0) + (discussMinutes || 0) }} min</div>
      }

      <div class="setting-row">
        <div>
          <div class="setting-text">Check-in round</div>
          <div class="setting-desc">Adds a check-in phase before adding cards. Seeded with your last retro's action items so the team can rate how each is going.</div>
        </div>
        <div class="toggle-track" [class.on]="checkinEnabled" (click)="checkinEnabled = !checkinEnabled">
          <div class="toggle-thumb"></div>
        </div>
      </div>
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
  readonly themes = RETRO_THEMES;
  title = '';
  selectedTemplateId = RETRO_TEMPLATES[0].id;
  icebreakerMode = 'random';
  customIcebreaker = '';
  selectedTheme: RetroTheme = null;
  hideCardsOnAdd = true;
  limitVotes = true;
  votesPerUser = 3;
  maxVotesPerCard = 1;
  phaseTimers = false;
  addMinutes = 5;
  voteMinutes = 3;
  discussMinutes = 10;
  checkinEnabled = false;

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
    this.dialogRef.close({
      title: this.title.trim(),
      templateId: this.selectedTemplateId,
      icebreakerQuestion,
      theme: this.selectedTheme,
      canvasLayout: 'single',
      hideCardsOnAdd: this.hideCardsOnAdd,
      votesPerUser: this.limitVotes ? Math.max(1, Math.min(99, this.votesPerUser || 1)) : null,
      maxVotesPerCard: this.limitVotes ? Math.max(1, Math.min(this.votesPerUser || 1, this.maxVotesPerCard || 1)) : 1,
      stepDurations: this.phaseTimers ? {
        add: Math.max(0, this.addMinutes || 0) * 60 || null,
        vote: Math.max(0, this.voteMinutes || 0) * 60 || null,
        discuss: Math.max(0, this.discussMinutes || 0) * 60 || null,
      } : null,
      checkinEnabled: this.checkinEnabled,
    });
  }
}
