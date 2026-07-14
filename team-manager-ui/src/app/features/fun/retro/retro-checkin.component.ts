import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { FunRetroCheckinQuestion, CheckinRating } from '../../../core/models/fun-retro.model';

interface RatingOption { key: CheckinRating; label: string; color: string; }

/**
 * The optional check-in round shown before the add phase. Each question (usually carried forward
 * from last retro's actions) gets a better/same/worse/na rating from every participant, with live
 * aggregate counts. The facilitator can add or remove questions. Ported from RetroBoard.
 */
@Component({
  selector: 'app-retro-checkin',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display:block; max-width:720px; margin:0 auto; }
    .checkin-head { text-align:center; margin-bottom:16px; }
    .checkin-title { font-size:1.05rem; font-weight:600; color:rgba(255,255,255,0.9); }
    .checkin-sub { font-size:0.8rem; color:rgba(255,255,255,0.4); margin-top:4px; }
    .q-card {
      background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.1);
      border-radius:10px; padding:14px 16px; margin-bottom:10px;
    }
    .q-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
    .q-text { font-size:0.9rem; color:rgba(255,255,255,0.88); font-weight:500; }
    .q-context { font-size:0.72rem; color:rgba(255,255,255,0.38); margin-top:2px; }
    .q-del { background:none; border:none; color:rgba(255,255,255,0.3); cursor:pointer; padding:2px; }
    .q-del:hover { color:#f4566b; }
    .q-del mat-icon { font-size:16px; width:16px; height:16px; }
    .rating-row { display:flex; gap:6px; margin-top:12px; flex-wrap:wrap; }
    .rating-btn {
      display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:8px;
      border:1px solid rgba(255,255,255,0.14); background:transparent; cursor:pointer;
      color:rgba(255,255,255,0.6); font-size:0.8rem; font-family:inherit; transition:all 0.12s;
    }
    .rating-btn:hover { background:rgba(255,255,255,0.06); }
    .rating-btn.selected { color:#fff; }
    .rating-count { font-size:0.72rem; opacity:0.7; }
    .add-row { display:flex; gap:8px; margin-top:14px; }
    .add-input {
      flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.12);
      border-radius:8px; color:inherit; padding:8px 10px; font-size:0.85rem; outline:none; font-family:inherit;
    }
    .add-input:focus { border-color:#64b5f6; }
    .add-btn {
      background:rgba(100,181,246,0.15); border:1px solid rgba(100,181,246,0.4); color:#64b5f6;
      border-radius:8px; padding:0 14px; cursor:pointer; font-size:0.85rem;
    }
    .add-btn:disabled { opacity:0.4; cursor:default; }
    .empty { text-align:center; color:rgba(255,255,255,0.35); font-size:0.85rem; padding:20px 0; }
  `],
  template: `
    <div class="checkin-head">
      <div class="checkin-title">Check-in</div>
      <div class="checkin-sub">How are things going since last time? Rate each item.</div>
    </div>

    @for (q of questions(); track q.id) {
      <div class="q-card">
        <div class="q-top">
          <div>
            <div class="q-text">{{ q.text }}</div>
            @if (q.contextText) { <div class="q-context">{{ q.contextText }}</div> }
          </div>
          @if (isCreator()) {
            <button class="q-del" title="Remove question" (click)="deleteQuestion.emit(q)">
              <mat-icon>close</mat-icon>
            </button>
          }
        </div>
        <div class="rating-row">
          @for (opt of options; track opt.key) {
            <button class="rating-btn" [class.selected]="q.myRating === opt.key"
                    [style.border-color]="q.myRating === opt.key ? opt.color : null"
                    [style.background]="q.myRating === opt.key ? opt.color + '22' : null"
                    (click)="respond.emit({ question: q, rating: opt.key })">
              <span [style.color]="opt.color">{{ opt.label }}</span>
              @if (count(q, opt.key) > 0) { <span class="rating-count">{{ count(q, opt.key) }}</span> }
            </button>
          }
        </div>
      </div>
    } @empty {
      <div class="empty">No check-in items yet.@if (isCreator()) {  Add one below.}</div>
    }

    @if (isCreator()) {
      <div class="add-row">
        <input class="add-input" placeholder="Add a check-in question…"
               [(ngModel)]="draft" (keyup.enter)="submit()" />
        <button class="add-btn" [disabled]="!draft.trim()" (click)="submit()">Add</button>
      </div>
    }
  `
})
export class RetroCheckinComponent {
  questions = input.required<FunRetroCheckinQuestion[]>();
  isCreator = input.required<boolean>();

  respond = output<{ question: FunRetroCheckinQuestion; rating: CheckinRating }>();
  addQuestion = output<string>();
  deleteQuestion = output<FunRetroCheckinQuestion>();

  draft = '';
  readonly options: RatingOption[] = [
    { key: 'better', label: 'Better', color: '#2fd47e' },
    { key: 'same',   label: 'Same',   color: '#f5b544' },
    { key: 'worse',  label: 'Worse',  color: '#f4566b' },
    { key: 'na',     label: 'N/A',    color: '#8a93a2' },
  ];

  count(q: FunRetroCheckinQuestion, key: CheckinRating): number {
    return key === 'better' ? q.better : key === 'same' ? q.same : key === 'worse' ? q.worse : q.na;
  }

  submit(): void {
    const t = this.draft.trim();
    if (!t) return;
    this.addQuestion.emit(t);
    this.draft = '';
  }
}
