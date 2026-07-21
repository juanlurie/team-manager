import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RetroBoardStore } from '../retro-board.store';
import { RETRO_STYLES } from '../retro-board.styles';
import { SessionJoinComponent } from '../../../../shared/components/session-join/session-join.component';

@Component({
  selector: 'app-retro-setup',
  standalone: true,
  imports: [CommonModule, FormsModule, SessionJoinComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES],
  template: `
    @if (store.session(); as s) {
      <div class="phase-head"><div><h1>Retro Setup</h1><p class="sub">{{ s.status === 'draft' ? 'Configure this session, then open it so the team can start capturing.' : 'Editing mid-session — changes apply live.' }}</p></div>
        @if (store.amFacilitator() && s.status === 'draft') { <button class="btn primary" (click)="store.openRetro()">{{ store.isFreeform() ? 'Start Retro →' : 'Open Retro →' }}</button> }
        @else if (store.amFacilitator()) { <button class="btn primary" (click)="store.editingSetup.set(false)">✓ Done editing</button> }
      </div>

      <div class="card">
        <label class="lbl">Session structure</label>

        <div style="margin-top:6px;max-width:320px">
          <label class="lbl">Team</label>
          <select class="f" [ngModel]="s.squadId" (ngModelChange)="store.setSquad($event)" [disabled]="!store.amFacilitator()">
            <option [ngValue]="null">No team — people join with the code</option>
            @for (sq of store.squads(); track sq.id) { <option [ngValue]="sq.id">{{ sq.name }}</option> }
          </select>
          <div class="muted" style="font-size:11.5px;margin-top:4px">Pick a team to add everyone on it at once. {{ s.participants.length }} in this retro so far.</div>
        </div>

        <div class="row between" style="margin-top:16px">
          <label class="lbl" style="margin:0">Structure level</label>
          <span class="muted" style="font-size:12px">Suggested for {{ store.teamSize() }}: <b style="color:var(--accent)">{{ store.structureLabel(store.recommendedLevel()) }}</b></span>
        </div>
        <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px">
          @for (l of store.structureLevels; track l.key) {
            <button class="btn ghost sm" [class.primary]="store.structureLevelOf(s.phaseConfig) === l.key" [disabled]="!store.amFacilitator()" (click)="store.applyStructureLevel(l.key)">{{ l.label }}</button>
          }
        </div>
        <div class="muted" style="font-size:12.5px;margin-top:8px;border-left:2px solid var(--accent);padding-left:10px">
          {{ store.structureBlurb(store.structureLevelOf(s.phaseConfig)) }}
          <a (click)="showPanel.set(!showPanel()); $event.preventDefault()" style="color:var(--accent);cursor:pointer">Read more</a>
        </div>
        @if (showPanel()) {
          <div class="card" style="margin-top:10px;background:var(--surface2)">
            <div style="font-weight:600;margin-bottom:8px">Choosing a structure level</div>
            <div class="muted" style="font-size:13px;line-height:1.65">
              <b style="color:var(--text)">Freeform</b> — Capture and Discuss stay open and you move at your own pace, no timers. Best for small groups; aids organic tangents and momentum.<br>
              <b style="color:var(--text)">Guided</b> — Phases are shown and timed, but you can advance early; Introduce and Reflect are optional. A middle ground.<br>
              <b style="color:var(--text)">Structured</b> — Hard phase gates and enforced timers, Introduce and Reflect on by default. Keeps larger groups on pace.<br><br>
              The tradeoff: structure aids focus and equal airtime; freeform aids organic discussion and pace-of-choice.
            </div>
          </div>
        }

        @if (s.status === 'draft') {
          <label class="lbl" style="margin-top:18px">Column template</label>
          <select class="f" style="max-width:360px;margin-top:4px" (change)="store.applyColumnTemplate($any($event.target).value)" [disabled]="!store.amFacilitator()">
            <option value="" disabled selected>Pick a template to pre-fill columns…</option>
            @for (t of store.columnTemplates; track t.key) { <option [value]="t.key">{{ t.name }} — {{ t.desc }}</option> }
          </select>
        }

      </div>

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

        <label class="lbl" style="margin-top:18px">Session length</label>
        <div class="row" style="gap:8px;flex-wrap:wrap">
          @for (p of store.presetOptions; track p.key) {
            @if (p.key === 'custom') {
              <span class="btn ghost sm" [class.primary]="store.presetOf(store.edit.d) === 'custom'" style="cursor:default" title="Set automatically when you edit a timer by hand">{{ p.label }}</span>
            } @else {
              <button class="btn ghost sm" [class.primary]="store.presetOf(store.edit.d) === p.key" [disabled]="!store.amFacilitator()" (click)="store.applyPreset(p.key)">{{ p.label }}</button>
            }
          }
        </div>
        <div class="muted" style="font-size:12.5px;margin-top:10px">For a team of <b style="color:var(--text)">{{ store.teamSize() }}</b>, <b style="color:var(--accent)">{{ store.presetLabel(store.recommendedPreset()) }}</b> is a good starting point.</div>

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
        <div class="row between" style="margin-bottom:2px">
          <label class="lbl" style="margin:0">Check-in questions</label>
          <label class="sw-row" style="font-size:12.5px;color:var(--dim)" title="Include the Check-in phase in this retro">
            <input type="checkbox" class="sw" [checked]="s.phaseConfig['checkin']?.enabled" (change)="store.togglePhase('checkin')" [disabled]="!store.amFacilitator()"><span class="sw-track"></span> Include
          </label>
        </div>
        <div [class.section-off]="!s.phaseConfig['checkin']?.enabled">
          @if (s.checkinQuestions.length === 0) { <div class="muted" style="font-size:11.5px;margin-bottom:8px">Auto-skipped until you add a question.</div> }
          @for (q of s.checkinQuestions; track q.id) {
            <div class="row between" style="margin-bottom:10px">
              <div><div style="font-weight:600">{{ q.text }}</div><div class="muted" style="font-size:12px;font-style:italic">{{ q.contextText }}</div></div>
              @if (store.amFacilitator()) { <button class="btn ghost sm" (click)="store.delQuestion(q.id)">✕</button> }
            </div>
          }
          @if (store.amFacilitator()) { <div class="row" style="margin-top:12px"><input class="f" [(ngModel)]="store.newQuestion" placeholder="Add check-in question…" (keydown.enter)="store.addQuestion()"><button class="btn primary" (click)="store.addQuestion()">+</button></div> }
        </div>
      </div>

      <div class="card">
        <div class="row between" style="margin-bottom:2px">
          <label class="lbl" style="margin:0">Feedback prompts</label>
          <label class="sw-row" style="font-size:12.5px;color:var(--dim)" title="Include the Reflect (feedback survey) phase in this retro">
            <input type="checkbox" class="sw" [checked]="s.phaseConfig['reflect']?.enabled" (change)="store.togglePhase('reflect')" [disabled]="!store.amFacilitator()"><span class="sw-track"></span> Include
          </label>
        </div>
        <div [class.section-off]="!s.phaseConfig['reflect']?.enabled">
          <div class="muted" style="font-size:12px;margin:-2px 0 12px">Participants rate each of these 1–5 stars after the retro and can add a comment. Ratings are anonymous — you'll see the aggregate.</div>
          @for (p of s.feedbackPrompts; track p.id) {
            <div class="row between" style="margin-bottom:10px">
              <div style="font-weight:600">{{ p.text }}</div>
              @if (store.amFacilitator()) { <button class="btn ghost sm" (click)="store.delPrompt(p.id)">✕</button> }
            </div>
          }
          @if (store.amFacilitator()) { <div class="row" style="margin-top:12px"><input class="f" [(ngModel)]="store.newPrompt" placeholder="Add feedback prompt…" (keydown.enter)="store.addPrompt()"><button class="btn primary" (click)="store.addPrompt()">+</button></div> }
        </div>
      </div>

      <div class="card">
        <label class="lbl">Participants · {{ s.participants.length }}</label>
        <div class="muted" style="font-size:12px;margin:-2px 0 12px">Set the team at the top to add everyone at once; anyone else joins with the code.</div>
        @if (joinUrl(s.slug); as ju) {
          <div style="display:flex;justify-content:center;margin:4px 0 14px">
            <app-session-join [url]="ju" [code]="s.slug" [size]="150" />
          </div>
        }
        <div style="margin-top:4px">
          @for (p of s.participants; track p.id) {
            <div class="p-row" style="padding:5px 0">
              <span class="avatar" [style.background]="store.tint(p.memberId ?? p.id)" [style.color]="store.ink(p.memberId ?? p.id)">{{ store.initials(p.name) }}</span>
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
  showPanel = signal(false);

  /** Public join link for this retro — the slug route the QR encodes and the code button copies.
   *  Points at the unguarded guest landing so a not-signed-in scanner isn't bounced to login;
   *  signed-in members are auto-recognized there and forwarded to the authed board. */
  joinUrl(slug: string | null | undefined): string | null {
    return slug ? `${location.origin}/guest/retro-board/${slug}` : null;
  }
}
