import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RetroBoardStore } from '../retro-board.store';
import { RETRO_STYLES } from '../retro-board.styles';

@Component({
  selector: 'app-retro-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES],
  template: `
    @if (store.session(); as s) {
      <div class="phase-head"><div><h1>Retro Setup</h1><p class="sub">Configure this session, then open it so the team can start capturing.</p></div>
        @if (store.amFacilitator()) { <button class="btn primary" (click)="store.openRetro()">Open Retro →</button> }</div>

      <div class="card">
        <label class="lbl">Votes / user</label>
        <div class="row" style="gap:24px;margin-top:6px">
          <input class="f" style="width:70px" type="number" [(ngModel)]="store.edit.votes" (change)="store.saveSettings()" [disabled]="!store.amFacilitator()">
          <label class="row" style="gap:8px;cursor:pointer"><input type="checkbox" [(ngModel)]="store.edit.anon" (change)="store.saveSettings()" [disabled]="!store.amFacilitator()"> Allow anonymous notes</label>
        </div>
      </div>

      <div class="card">
        <label class="lbl">Meeting</label>
        <div class="row" style="gap:24px;margin-top:6px">
          <div><label class="lbl">Meeting length (m:ss)</label><input class="f" style="width:90px" [ngModel]="store.fmt(store.edit.d.meeting)" (change)="store.setTimer('meeting', $event)" [disabled]="!store.amFacilitator()"></div>
          <div><label class="lbl">Topics to discuss (est.)</label><input class="f" style="width:80px" type="number" min="0" [(ngModel)]="store.topicEstimate" [disabled]="!store.amFacilitator()"></div>
        </div>

        <label class="lbl" style="margin-top:18px">Phase timers (m:ss)</label>
        <div class="timers">
          @for (t of store.timerFields; track t.key) {
            <div><label class="lbl">{{ t.label }}</label>
              <input class="f" [ngModel]="store.fmt(store.edit.d[t.key])" (change)="store.setTimer(t.key, $event)" [disabled]="!store.amFacilitator()"></div>
          }
        </div>
        <div class="budget">
          <span class="muted">Allocated <b style="color:var(--text)">{{ store.fmt(store.allocated()) }}</b></span>
          <span class="muted">Remaining <b [style.color]="store.remaining() < 0 ? '#f4566b' : '#34d67f'">{{ store.fmt(store.remaining()) }}</b></span>
          <span class="muted">for <b style="color:var(--text)">{{ store.topicEstimate }}</b> topics (intro + discuss counted per topic)</span>
        </div>
      </div>

      <div class="card">
        <label class="lbl">Themes / columns</label>
        @for (c of s.columns; track c.id) {
          <div class="row between" style="margin-bottom:10px">
            <div class="row" style="gap:12px"><span class="avatar" [style.background]="c.color+'33'" [style.color]="c.color">■</span>
              <div><div style="font-weight:600">{{ c.label }}</div><div class="muted" style="font-size:12px">{{ c.description }}</div></div></div>
            @if (store.amFacilitator()) { <div class="row" style="gap:8px">
              @for (sw of store.swatches; track sw) { <span class="swatch" [class.sel]="c.color===sw" [style.background]="sw" [style.color]="sw" (click)="store.setColor(c.id, sw)"></span> }
              <button class="btn ghost sm" (click)="store.delColumn(c.id)">✕</button></div> }
          </div>
        }
        @if (store.amFacilitator()) { <div class="row" style="margin-top:12px"><input class="f" [(ngModel)]="store.newColumn" placeholder="New theme label…" (keydown.enter)="store.addColumn()"><button class="btn primary" (click)="store.addColumn()">+</button></div> }
      </div>

      <div class="card">
        <label class="lbl">Check-in questions</label>
        @for (q of s.checkinQuestions; track q.id) {
          <div class="row between" style="margin-bottom:10px">
            <div><div style="font-weight:600">{{ q.text }}</div><div class="muted" style="font-size:12px;font-style:italic">{{ q.contextText }}</div></div>
            @if (store.amFacilitator()) { <button class="btn ghost sm" (click)="store.delQuestion(q.id)">✕</button> }
          </div>
        }
        @if (store.amFacilitator()) { <div class="row" style="margin-top:12px"><input class="f" [(ngModel)]="store.newQuestion" placeholder="Add check-in question…" (keydown.enter)="store.addQuestion()"><button class="btn primary" (click)="store.addQuestion()">+</button></div> }
      </div>

      <div class="card">
        <label class="lbl">Feedback prompts</label>
        <div class="muted" style="font-size:12px;margin:-2px 0 12px">Participants rate each of these 1–5 stars after the retro and can add a comment. Ratings are anonymous — you'll see the aggregate.</div>
        @for (p of s.feedbackPrompts; track p.id) {
          <div class="row between" style="margin-bottom:10px">
            <div style="font-weight:600">{{ p.text }}</div>
            @if (store.amFacilitator()) { <button class="btn ghost sm" (click)="store.delPrompt(p.id)">✕</button> }
          </div>
        }
        @if (store.amFacilitator()) { <div class="row" style="margin-top:12px"><input class="f" [(ngModel)]="store.newPrompt" placeholder="Add feedback prompt…" (keydown.enter)="store.addPrompt()"><button class="btn primary" (click)="store.addPrompt()">+</button></div> }
      </div>

      <div class="card">
        <label class="lbl">Participants</label>
        <div class="muted" style="font-size:12px;margin:-2px 0 12px">Pick a team to add everyone on it at once. Anyone else can still join with the code.</div>
        @if (store.amFacilitator()) {
          <div style="max-width:280px">
            <label class="lbl">Team</label>
            <select class="f" [ngModel]="s.squadId" (ngModelChange)="store.setSquad($event)">
              <option [ngValue]="null">No team</option>
              @for (sq of store.squads(); track sq.id) { <option [ngValue]="sq.id">{{ sq.name }}</option> }
            </select>
          </div>
        }
        <div style="margin-top:14px">
          @for (p of s.participants; track p.id) {
            <div class="p-row" style="padding:5px 0">
              <span class="avatar" [style.background]="store.tint(p.memberId)" [style.color]="store.ink(p.memberId)">{{ store.initials(p.name) }}</span>
              <span>{{ p.name }}</span>
              @if (p.role === 'facilitator') { <span class="crown">★</span> }
            </div>
          }
          @if (s.participants.length === 0) { <p class="muted">No one has joined yet.</p> }
        </div>
      </div>
    }
  `,
})
export class RetroSetupComponent {
  store = inject(RetroBoardStore);
}
