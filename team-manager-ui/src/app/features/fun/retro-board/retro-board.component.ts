import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, EMPTY, takeUntil, debounceTime, switchMap, catchError } from 'rxjs';

import { RetroBoardService } from '../../../core/services/retro-board.service';
import { TeamMemberService } from '../../../core/services/team-member.service';
import { WebSocketService } from '../../../core/websocket/websocket.service';
import { AuthService } from '../../../core/auth/auth.service';
import { RetroBoardSession, RetroBoardSummary, RetroPhase, RetroBoardNote, RetroBoardFeedbackPrompt } from '../../../core/models/retro-board.model';

const PHASES: { key: RetroPhase; label: string }[] = [
  { key: 'setup', label: 'Setup' }, { key: 'checkin', label: 'Check-in' }, { key: 'capture', label: 'Capture' },
  { key: 'introduce', label: 'Introduce' }, { key: 'vote', label: 'Vote' }, { key: 'discuss', label: 'Discuss' },
  { key: 'reflect', label: 'Reflect' }, { key: 'summary', label: 'Summary' },
];
const RATINGS = [
  { v: 'better', label: 'Better', color: '#34d67f' }, { v: 'same', label: 'Same', color: '#f5b544' },
  { v: 'worse', label: 'Worse', color: '#f4566b' }, { v: 'na', label: 'N/A', color: '#7c8195' },
];
const TIMER_FIELDS: { key: keyof RetroBoardSession['stepDurations']; label: string }[] = [
  { key: 'checkin', label: 'Check-in' }, { key: 'capture', label: 'Capture' }, { key: 'introduceRead', label: 'Read / flag' },
  { key: 'introduceTopic', label: 'Per topic intro' }, { key: 'vote', label: 'Vote' }, { key: 'discussTopic', label: 'Discuss / topic' },
  { key: 'reflect', label: 'Reflect' },
];
// phase -> which timer duration applies when the facilitator starts the clock
const PHASE_TIMER: Record<string, keyof RetroBoardSession['stepDurations']> = {
  checkin: 'checkin', capture: 'capture', introduce: 'introduceRead', vote: 'vote', discuss: 'discussTopic', reflect: 'reflect',
};

interface Member { id: string; name: string; }

@Component({
  selector: 'app-retro-board',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display:block; --bg:#0a0b11; --surface:#12131d; --surface2:#171827; --border:#24263a; --text:#e9eaf2; --dim:#9a9db2; --mute:#63677e; --accent:#7d5cff; --flag:#8f72ff; color:var(--text); font-size:15px; }
    :host *, :host *::before, :host *::after { box-sizing:border-box; }
    .wrap { background:var(--bg); min-height:100%; border-radius:14px; overflow:hidden; }
    .topbar { display:flex; align-items:center; gap:12px; padding:12px 18px; border-bottom:1px solid var(--border); flex-wrap:wrap; }
    .brand { font-weight:700; font-size:17px; } .brand span{ color:var(--accent); }
    .stepper { display:flex; align-items:center; gap:2px; flex:1; overflow-x:auto; min-width:0; }
    .step { border:0; background:none; color:var(--mute); font-size:12.5px; padding:6px 10px; border-radius:8px; white-space:nowrap; cursor:pointer; }
    .step.done { color:var(--dim); } .step.active { background:var(--accent); color:#fff; }
    .step:disabled { cursor:default; } .sep { color:var(--mute); opacity:.5; }
    .seg { display:inline-flex; background:var(--surface); border:1px solid var(--border); border-radius:9px; padding:3px; }
    .seg button { border:0; background:none; color:var(--dim); font-size:12px; font-weight:600; padding:5px 11px; border-radius:6px; cursor:pointer; }
    .seg button.on { background:var(--accent); color:#fff; }
    .clock { font-family:monospace; font-size:14px; padding:5px 10px; border:1px solid var(--border); border-radius:8px; }
    .clock.low { color:#f4566b; border-color:#f4566b; }
    .live { display:flex; align-items:center; gap:8px; padding:8px 18px; background:#171029; border-bottom:1px solid var(--border); font-size:13px; color:var(--dim); }
    .dot { width:8px; height:8px; border-radius:50%; background:#f4566b; }
    .body { display:grid; grid-template-columns:220px 1fr; min-height:500px; }
    .rail { border-right:1px solid var(--border); padding:16px 12px; }
    .rail h4 { font-size:11px; letter-spacing:.1em; color:var(--mute); margin:0 0 12px 6px; text-transform:uppercase; }
    .p-row { display:flex; align-items:center; gap:10px; padding:7px; border-radius:9px; }
    .avatar { width:28px; height:28px; border-radius:50%; display:grid; place-items:center; font-size:11px; font-weight:700; flex-shrink:0; }
    .crown { margin-left:auto; color:#f5b544; font-size:12px; } .tick { margin-left:auto; color:#34d67f; }
    .main { padding:26px 30px; overflow-y:auto; }
    h1 { font-size:25px; margin:0 0 4px; } .sub { color:var(--dim); margin:0 0 22px; }
    .row { display:flex; align-items:center; gap:12px; flex-wrap:wrap; } .between { justify-content:space-between; }
    .btn { border:1px solid transparent; border-radius:10px; font-weight:600; padding:10px 16px; background:var(--surface2); color:var(--text); cursor:pointer; font-size:14px; }
    .btn:hover { filter:brightness(1.15); } .btn.primary { background:var(--accent); color:#fff; } .btn.ghost { background:transparent; border-color:var(--border); color:var(--dim); }
    .btn:disabled { opacity:.4; cursor:default; } .btn.sm { padding:6px 11px; font-size:12.5px; }
    .card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:20px; margin-bottom:16px; }
    label.lbl { font-size:11px; letter-spacing:.1em; color:var(--mute); text-transform:uppercase; display:block; margin-bottom:6px; }
    input.f, textarea.f, select.f { width:100%; background:var(--surface2); border:1px solid var(--border); border-radius:9px; padding:10px 12px; color:var(--text); font:inherit; }
    input.f:focus, textarea.f:focus { outline:none; border-color:var(--accent); }
    .grid { display:grid; gap:14px; } .g2{ grid-template-columns:1fr 1fr; } .g4{ grid-template-columns:repeat(4,1fr); }
    .timers { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
    .budget { display:flex; gap:18px; margin-top:14px; font-size:13px; }
    .cols { display:grid; grid-template-columns:repeat(2,1fr); gap:18px; }
    .col { border:1px solid var(--border); border-radius:12px; padding:14px; min-width:0; }
    .col h3 { margin:0 0 4px; font-size:15px; } .col .desc{ color:var(--mute); font-size:12px; margin:0 0 10px; }
    .note { background:var(--surface2); border:1px solid var(--border); border-radius:10px; padding:12px 13px; margin-bottom:10px; }
    .note .meta { color:var(--dim); font-size:12px; margin-top:8px; display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
    .rate { border:1px solid var(--border); background:var(--surface2); border-radius:10px; padding:14px; cursor:pointer; color:var(--dim); font-weight:600; text-align:center; }
    .swatch { width:20px; height:20px; border-radius:50%; border:2px solid transparent; cursor:pointer; display:inline-block; }
    .swatch.sel { box-shadow:0 0 0 2px var(--bg),0 0 0 4px currentColor; }
    .pill { display:inline-flex; align-items:center; gap:6px; border:1px solid var(--border); border-radius:20px; padding:5px 11px; font-size:12.5px; cursor:pointer; background:var(--surface2); color:var(--dim); }
    .pill.on { color:#fff; border-color:var(--flag); background:color-mix(in srgb,var(--flag) 25%, transparent); }
    .muted { color:var(--mute); } .intro-by { color:var(--flag); font-weight:600; }
    .lobby-card { display:flex; align-items:center; gap:12px; padding:14px 16px; border:1px solid var(--border); border-radius:12px; margin-bottom:10px; background:var(--surface); }
    .lobby-card .lc-main { flex:1; cursor:pointer; min-width:0; }
    .lobby-card:hover { border-color:var(--accent); }
    .tag { font-size:11px; padding:2px 8px; border-radius:20px; background:var(--surface2); color:var(--dim); font-family:monospace; }
    .tag.draft { color:#f5b544; } .tag.live { color:#34d67f; } .tag.closed { color:var(--mute); }
    .err { color:#f4566b; }
    .vote-dots { display:inline-flex; gap:3px; } .vote-dots i{ width:9px; height:9px; border-radius:50%; background:var(--surface2); } .vote-dots i.on{ background:var(--accent); }
    .chips { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0; }
    .chip { display:inline-flex; align-items:center; gap:6px; background:color-mix(in srgb,var(--accent) 18%, transparent); border:1px solid var(--accent); border-radius:20px; padding:3px 10px; font-size:12.5px; }
    .chip b { cursor:pointer; opacity:.7; }
    .ta { position:relative; }
    .ta-list { position:absolute; z-index:5; left:0; right:0; background:var(--surface2); border:1px solid var(--border); border-radius:9px; margin-top:4px; overflow:hidden; }
    .ta-item { padding:8px 12px; cursor:pointer; font-size:13.5px; } .ta-item:hover { background:var(--accent); color:#fff; }
    .stars { display:inline-flex; gap:4px; } .stars.sm { gap:2px; }
    .star { color:var(--surface2); cursor:pointer; font-size:26px; line-height:1; transition:color .1s; -webkit-text-stroke:1px var(--border); }
    .stars.sm .star { font-size:16px; cursor:default; }
    .star.on { color:#f5b544; -webkit-text-stroke:0; } .star:hover { color:#f5b544; }
    .stars.sm .star:hover { color:var(--surface2); } .stars.sm .star.on:hover { color:#f5b544; }
    .bar-row { display:flex; align-items:center; gap:8px; margin:2px 0; }
    .bar-track { flex:1; height:8px; border-radius:4px; background:var(--surface2); overflow:hidden; }
    .bar-fill { display:block; height:100%; background:#f5b544; }
    @media (max-width: 760px) {
      .body { grid-template-columns:1fr; }
      .rail { border-right:0; border-bottom:1px solid var(--border); display:flex; gap:8px; overflow-x:auto; padding:10px; }
      .rail h4 { display:none; } .p-row { flex-direction:column; gap:3px; padding:4px; min-width:56px; text-align:center; }
      .p-row span:not(.avatar) { font-size:11px; } .crown,.tick { margin:0; }
      .main { padding:18px 16px; } h1 { font-size:21px; }
      .cols, .g2, .g4, .timers { grid-template-columns:1fr !important; }
      .stepper { order:3; width:100%; } .topbar { gap:8px; }
    }
  `],
  template: `
  <div class="wrap">
    <!-- ============ LOBBY ============ -->
    @if (!session()) {
      <div class="main" style="max-width:720px;margin:0 auto">
        <h1>RetroBoard</h1>
        <p class="sub">Start a new retrospective or join an open one.</p>
        <div class="card">
          <label class="lbl">Retro name</label>
          <div class="row"><input class="f" [(ngModel)]="newTitle" placeholder="Sprint 8 Retrospective" (keydown.enter)="create()">
            <button class="btn primary" (click)="create()" [disabled]="creating()">Create</button></div>
        </div>
        <h3 style="margin:24px 0 12px">Open retros</h3>
        @if (summaries().length === 0) { <p class="muted">None yet.</p> }
        @for (s of summaries(); track s.id) {
          <div class="lobby-card">
            <div class="lc-main" (click)="open(s.id)">
              <div style="font-weight:600">{{ s.title || 'Untitled retro' }}</div>
              <div class="muted" style="font-size:12.5px">{{ s.createdByName }} · {{ s.noteCount }} notes · {{ s.participantCount }} joined</div>
            </div>
            <span class="tag" [class.draft]="s.status==='draft'" [class.live]="s.status==='live'" [class.closed]="s.status==='closed'">{{ s.status }}</span>
            @if (s.isFacilitator && s.status==='closed') {
              <button class="btn ghost sm" (click)="reopen(s.id, $event)">Reopen</button>
              <button class="btn ghost sm" (click)="archive(s.id, $event)">Archive</button>
            }
            @if (s.status==='draft' && s.createdByMemberId===myId) { <button class="btn ghost sm" title="Delete draft" (click)="del(s.id, $event)">✕</button> }
          </div>
        }

        <div class="row between" style="margin:24px 0 12px">
          <h3 style="margin:0">Archived</h3>
          <button class="btn ghost sm" (click)="toggleArchived()">{{ showArchived() ? 'Hide' : 'Show' }}</button>
        </div>
        @if (showArchived()) {
          @if (archived().length === 0) { <p class="muted">No archived retros.</p> }
          @for (s of archived(); track s.id) {
            <div class="lobby-card">
              <div class="lc-main" (click)="open(s.id)">
                <div style="font-weight:600">{{ s.title || 'Untitled retro' }}</div>
                <div class="muted" style="font-size:12.5px">{{ s.createdByName }} · {{ s.noteCount }} notes · {{ s.participantCount }} joined</div>
              </div>
              <span class="tag closed">{{ s.status }}</span>
              @if (s.isFacilitator) { <button class="btn ghost sm" (click)="unarchive(s.id, $event)">Restore</button> }
              @if (s.createdByMemberId===myId) { <button class="btn ghost sm" title="Delete permanently" (click)="del(s.id, $event)">✕</button> }
            </div>
          }
        }
        @if (error()) { <p class="err">{{ error() }}</p> }
      </div>
    }

    <!-- ============ SESSION ============ -->
    @if (session(); as s) {
      <div class="topbar">
        <div class="brand">Retro<span>Board</span></div>
        <div class="stepper">
          @for (p of phases; track p.key; let i = $index) {
            <button class="step" [class.active]="p.key===s.phase" [class.done]="i < phaseIndex()"
                    [disabled]="!amFacilitator()" (click)="goPhase(p.key)">{{ p.label }}</button>
            @if (i < phases.length-1) { <span class="sep">›</span> }
          }
        </div>
        @if (timer() !== null) { <span class="clock" [class.low]="timer()! <= 15">⏱ {{ fmt(timer()!) }}</span> }
        @if (amFacilitator() && phaseTimerKey()) {
          @if (timer() === null) { <button class="btn ghost sm" (click)="startTimer()">▶ Start</button> }
          @else { <button class="btn ghost sm" (click)="stopTimer()">■ Stop</button> }
        }
        @if (s.isFacilitator) {
          <div class="seg" title="Preview the participant experience">
            <button [class.on]="viewAs()==='facilitator'" (click)="viewAs.set('facilitator')">Facilitator</button>
            <button [class.on]="viewAs()==='participant'" (click)="viewAs.set('participant')">Participant</button>
          </div>
        }
        <span class="tag" [class.closed]="s.status==='closed'">{{ s.status==='closed' ? 'closed' : s.slug }}</span>
        @if (s.isFacilitator) {
          @if (s.status==='closed') { <button class="btn ghost sm" (click)="reopenCurrent()">Reopen</button> }
          @else { <button class="btn ghost sm" (click)="closeCurrent()">Close retro</button> }
        }
        <button class="btn ghost sm" (click)="leave()">Leave</button>
      </div>

      @if (viewAs()==='participant') { <div class="live"><span class="dot"></span> Participant preview — following the facilitator (on <b>&nbsp;{{ phaseLabel(s.phase) }}</b>)</div> }

      <div class="body">
        <aside class="rail">
          <h4>Participants · {{ s.participants.length }}</h4>
          @for (p of s.participants; track p.id) {
            <div class="p-row">
              <span class="avatar" [style.background]="tint(p.memberId)" [style.color]="ink(p.memberId)">{{ initials(p.name) }}</span>
              <span>{{ shortName(p.name) }}</span>
              @if (p.role === 'facilitator') { <span class="crown">★</span> }
              @else if (p.completedPhases.includes(s.phase)) { <span class="tick">✓</span> }
            </div>
          }
        </aside>

        <main class="main">
          @switch (s.phase) {

            <!-- SETUP -->
            @case ('setup') {
              <div class="row between"><div><h1>Retro Setup</h1><p class="sub">Configure this session before participants join</p></div>
                @if (amFacilitator()) { <button class="btn primary" (click)="goPhase('checkin')">Start Retro →</button> }</div>

              <div class="card">
                <div class="row" style="gap:24px">
                  <div><label class="lbl">Votes / user</label><input class="f" style="width:70px" type="number" [(ngModel)]="edit.votes" (change)="saveSettings()" [disabled]="!amFacilitator()"></div>
                  <label class="row" style="gap:8px;cursor:pointer"><input type="checkbox" [(ngModel)]="edit.anon" (change)="saveSettings()" [disabled]="!amFacilitator()"> Allow anonymous notes</label>
                  <div><label class="lbl">Meeting length (m:ss)</label><input class="f" style="width:90px" [ngModel]="fmt(edit.d.meeting)" (change)="setTimer('meeting', $event)" [disabled]="!amFacilitator()"></div>
                </div>
                <label class="lbl" style="margin-top:18px">Phase timers (m:ss)</label>
                <div class="timers">
                  @for (t of timerFields; track t.key) {
                    <div><label class="lbl">{{ t.label }}</label>
                      <input class="f" [ngModel]="fmt(edit.d[t.key])" (change)="setTimer(t.key, $event)" [disabled]="!amFacilitator()"></div>
                  }
                </div>
                <div class="budget">
                  <span class="muted">Allocated <b style="color:var(--text)">{{ fmt(allocated()) }}</b></span>
                  <span class="muted">Remaining <b [style.color]="remaining() < 0 ? '#f4566b' : '#34d67f'">{{ fmt(remaining()) }}</b></span>
                </div>
              </div>

              <div class="card">
                <label class="lbl">Themes / columns</label>
                @for (c of s.columns; track c.id) {
                  <div class="row between" style="margin-bottom:10px">
                    <div class="row" style="gap:12px"><span class="avatar" [style.background]="c.color+'33'" [style.color]="c.color">■</span>
                      <div><div style="font-weight:600">{{ c.label }}</div><div class="muted" style="font-size:12px">{{ c.description }}</div></div></div>
                    @if (amFacilitator()) { <div class="row" style="gap:8px">
                      @for (sw of swatches; track sw) { <span class="swatch" [class.sel]="c.color===sw" [style.background]="sw" [style.color]="sw" (click)="setColor(c.id, sw)"></span> }
                      <button class="btn ghost sm" (click)="delColumn(c.id)">✕</button></div> }
                  </div>
                }
                @if (amFacilitator()) { <div class="row" style="margin-top:12px"><input class="f" [(ngModel)]="newColumn" placeholder="New theme label…" (keydown.enter)="addColumn()"><button class="btn primary" (click)="addColumn()">+</button></div> }
              </div>

              <div class="card">
                <label class="lbl">Check-in questions</label>
                @for (q of s.checkinQuestions; track q.id) {
                  <div class="row between" style="margin-bottom:10px">
                    <div><div style="font-weight:600">{{ q.text }}</div><div class="muted" style="font-size:12px;font-style:italic">{{ q.contextText }}</div></div>
                    @if (amFacilitator()) { <button class="btn ghost sm" (click)="delQuestion(q.id)">✕</button> }
                  </div>
                }
                @if (amFacilitator()) { <div class="row" style="margin-top:12px"><input class="f" [(ngModel)]="newQuestion" placeholder="Add check-in question…" (keydown.enter)="addQuestion()"><button class="btn primary" (click)="addQuestion()">+</button></div> }
              </div>

              <div class="card">
                <label class="lbl">Feedback prompts</label>
                <div class="muted" style="font-size:12px;margin:-2px 0 12px">Participants rate each of these 1–5 stars after the retro and can add a comment. Ratings are anonymous — you'll see the aggregate.</div>
                @for (p of s.feedbackPrompts; track p.id) {
                  <div class="row between" style="margin-bottom:10px">
                    <div style="font-weight:600">{{ p.text }}</div>
                    @if (amFacilitator()) { <button class="btn ghost sm" (click)="delPrompt(p.id)">✕</button> }
                  </div>
                }
                @if (amFacilitator()) { <div class="row" style="margin-top:12px"><input class="f" [(ngModel)]="newPrompt" placeholder="Add feedback prompt…" (keydown.enter)="addPrompt()"><button class="btn primary" (click)="addPrompt()">+</button></div> }
              </div>
            }

            <!-- CHECK-IN -->
            @case ('checkin') {
              <div class="row between"><div><h1>Sprint Check-in</h1><p class="sub">Rate how things have changed since last retro</p></div>
                @if (amFacilitator()) { <button class="btn primary" (click)="goPhase('capture')">Continue to Capture →</button> }</div>
              @for (q of s.checkinQuestions; track q.id) {
                <div class="card">
                  <div style="font-weight:700;font-size:17px">{{ q.text }}</div>
                  <div class="muted" style="font-style:italic;margin:4px 0 16px">{{ q.contextText }}</div>
                  <div class="grid g4">
                    @for (r of ratings; track r.v) {
                      <div class="rate" [style.borderColor]="q.myRating===r.v ? r.color : null" [style.color]="q.myRating===r.v ? r.color : null" (click)="respond(q.id, r.v)">{{ r.label }}</div>
                    }
                  </div>
                </div>
              }
              @if (s.checkinQuestions.length === 0) { <p class="muted">No check-in questions yet.</p> }
              @if (checkinDone()) { <button class="btn" disabled>✓ Responded — waiting for others</button> }
              @else { <button class="btn primary" (click)="markDone('checkin')">Done — I've responded</button> }
            }

            <!-- CAPTURE -->
            @case ('capture') {
              <div class="row between"><div><h1>Capture Notes</h1><p class="sub">Add your thoughts to each category</p></div>
                @if (amFacilitator()) { <div class="row" style="gap:8px">
                  <button class="btn ghost" (click)="reveal()" [disabled]="s.notesRevealed">{{ s.notesRevealed ? '✓ Revealed' : 'Reveal to all' }}</button>
                  <button class="btn primary" (click)="goPhase('introduce')">Continue →</button></div> }
              </div>
              <div class="cols">
                @for (c of s.columns; track c.id) {
                  <div class="col" [style.borderColor]="c.color+'55'">
                    <h3 [style.color]="c.color">{{ c.label }}</h3><p class="desc">{{ notesFor(c.id).length }} notes</p>
                    <textarea class="f" rows="2" [(ngModel)]="draft[c.id]" placeholder="Add a note…"></textarea>
                    <div class="row between" style="margin:8px 0 12px">
                      <label class="row muted" style="gap:6px;cursor:pointer;font-size:13px"><input type="checkbox" [(ngModel)]="draftAnon[c.id]"> anon</label>
                      <button class="btn primary sm" (click)="addNote(c.id)">+ Add</button>
                    </div>
                    @for (n of notesFor(c.id); track n.id) {
                      <div class="note">
                        <div>{{ masked(n) ? '•••' : n.text }}</div>
                        <div class="meta">
                          @if (masked(n)) { <span class="muted">hidden until reveal</span> }
                          @else if (n.isAnonymous) { <span class="muted">anon</span> }
                          @else { <span>{{ n.authorName }}{{ n.isOwn ? ' · you' : '' }}</span> }
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <!-- INTRODUCE -->
            @case ('introduce') {
              <div class="row between"><div><h1>Introduce Topics</h1><p class="sub">Read the notes and flag anything that needs the owner to explain it</p></div>
                @if (amFacilitator()) { <button class="btn primary" (click)="goPhase('vote')">Continue to Vote →</button> }</div>
              @if (flagged().length) { <div class="card" style="border-color:color-mix(in srgb,var(--flag) 40%, transparent)"><div style="color:var(--flag);font-size:12px;letter-spacing:.08em">{{ flagged().length }} FLAGGED TO DISCUSS</div>
                @for (n of flagged(); track n.id) { <div style="margin-top:6px">• {{ n.text }} <span class="intro-by">— {{ introducer(n) }}</span></div> }</div> }
              <div class="cols">
                @for (c of s.columns; track c.id) {
                  <div class="col" [style.borderColor]="c.color+'55'"><h3 [style.color]="c.color">{{ c.label }}</h3>
                    @for (n of notesFor(c.id); track n.id) {
                      <div class="note" [style.borderColor]="n.flagged ? 'var(--flag)' : null">
                        <div>{{ n.text }}</div>
                        @if (n.clarification) { <div class="muted" style="font-style:italic;margin-top:6px">↳ {{ n.clarification }}</div> }
                        <div class="meta">
                          @if (n.isAnonymous) { <span class="muted">anon</span> } @else { <span>{{ n.authorName }}</span> }
                          @if (n.flagged) { <span class="intro-by">will introduce</span> }
                          <span class="pill" [class.on]="n.flagged" (click)="toggleFlag(n)">⚑ {{ n.flagged ? 'Flagged to discuss' : 'Flag to discuss' }}</span>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            }

            <!-- VOTE (grouped by category; stable order) -->
            @case ('vote') {
              <div class="row between"><div><h1>Vote</h1><p class="sub">Up to 3 votes per topic — spend on what matters most</p></div>
                @if (amFacilitator()) { <button class="btn primary" (click)="goPhase('discuss')">Continue to Discuss →</button> }</div>
              <div class="card row" style="gap:8px">You have <b>{{ s.votesPerUser - s.myVotesUsed }}</b> of <b>{{ s.votesPerUser }}</b> votes left</div>
              @for (c of s.columns; track c.id) {
                <h3 [style.color]="c.color" style="margin:18px 0 8px">{{ c.label }}</h3>
                @for (n of notesFor(c.id); track n.id) {
                  <div class="card row between" style="padding:12px 16px;margin-bottom:10px">
                    <div style="flex:1">{{ n.text }} <span class="muted" style="font-size:12px">· {{ n.voteCount }} total</span></div>
                    <div class="row" style="gap:10px">
                      <span class="vote-dots">@for (d of [0,1,2]; track d) { <i [class.on]="d < n.myVoteCount"></i> }</span>
                      <button class="btn ghost sm" (click)="unvote(n)" [disabled]="n.myVoteCount===0">−</button>
                      <button class="btn ghost sm" (click)="vote(n)" [disabled]="n.myVoteCount>=3 || s.myVotesUsed>=s.votesPerUser">+</button>
                    </div>
                  </div>
                }
              }
            }

            <!-- DISCUSS -->
            @case ('discuss') {
              <div class="row between"><div><h1>Discuss</h1><p class="sub">Top-voted first — turn topics into action items</p></div>
                @if (amFacilitator()) { <button class="btn primary" (click)="goPhase('reflect')">Continue to Reflect →</button> }</div>
              <div class="grid g2" style="align-items:start">
                <div>
                  @for (n of sortedByVotes(); track n.id) {
                    <div class="card" style="padding:14px 16px">
                      <div class="row between"><div class="row" style="gap:12px"><span class="avatar" style="background:#7d5cff22;color:#8f72ff">{{ n.voteCount }}</span>
                        <div><div>{{ n.text }}</div><div class="muted" style="font-size:12px">{{ n.columnKey }}{{ n.isAnonymous ? '' : ' · ' + n.authorName }}</div></div></div>
                        @if (amFacilitator()) { <button class="btn ghost sm" (click)="startAction(n)">+ Action</button> }</div>
                      @if (actionDraft()?.noteId === n.id) {
                        <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
                          <input class="f" [(ngModel)]="actionDraft()!.title" placeholder="Action…">
                          <ng-container [ngTemplateOutlet]="assignPicker" [ngTemplateOutletContext]="{ draft: actionDraft() }"></ng-container>
                          <div class="row" style="margin-top:10px"><button class="btn primary sm" (click)="saveAction()">Add action</button><button class="btn ghost sm" (click)="actionDraft.set(null)">Cancel</button></div>
                        </div>
                      }
                    </div>
                  }
                </div>
                <div class="card">
                  <h3 style="margin:0 0 12px">Action items</h3>
                  @for (a of s.actions; track a.id) {
                    <div class="note"><div class="row between"><span>{{ a.title }}</span>@if (amFacilitator()) { <button class="btn ghost sm" (click)="delAction(a.id)">✕</button> }</div>
                      @if (a.assigneeMemberIds.length) { <div class="chips">@for (m of a.assigneeMemberIds; track m) { <span class="tag">{{ memberName(m) }}</span> }</div> }</div>
                  }
                  @if (s.actions.length === 0) { <p class="muted">No actions yet.</p> }
                  @if (amFacilitator()) {
                    <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px">
                      <input class="f" [(ngModel)]="manual.title" placeholder="Add an action…">
                      <ng-container [ngTemplateOutlet]="assignPicker" [ngTemplateOutletContext]="{ draft: manual }"></ng-container>
                      <button class="btn primary sm" style="margin-top:10px" (click)="addManual()">+ Add action</button>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- REFLECT -->
            @case ('reflect') {
              <div class="row between"><div><h1>Reflect</h1><p class="sub">AI synthesis of the board</p></div>
                @if (amFacilitator() && s.aiSummary) { <button class="btn primary" (click)="goPhase('summary')">Continue to Summary →</button> }</div>
              <div class="card">
                @if (!s.aiSummary) {
                  <p class="muted">{{ amFacilitator() ? 'Generate a summary of themes, insights and suggested actions.' : 'The facilitator is generating the summary…' }}</p>
                  @if (amFacilitator()) { <button class="btn primary" (click)="analyse()" [disabled]="analysing()">{{ analysing() ? 'Synthesizing…' : 'Generate AI summary' }}</button> }
                  @if (error()) { <p class="err">{{ error() }}</p> }
                } @else {
                  <div class="grid g2">
                    <div><label class="lbl">Strength themes</label>@for (t of s.aiSummary.strengthThemes; track t) { <span class="pill" style="margin:3px">{{ t }}</span> }</div>
                    <div><label class="lbl">Improvement themes</label>@for (t of s.aiSummary.improveThemes; track t) { <span class="pill" style="margin:3px">{{ t }}</span> }</div>
                  </div>
                  <label class="lbl" style="margin-top:16px">Key insights</label>@for (t of s.aiSummary.insights; track t) { <div style="margin:6px 0">◆ {{ t }}</div> }
                  <label class="lbl" style="margin-top:16px">Suggested actions</label>@for (t of s.aiSummary.suggestedActions; track t) { <div style="margin:6px 0">→ {{ t }}</div> }
                }
              </div>
            }

            <!-- SUMMARY -->
            @case ('summary') {
              <h1>Summary</h1><p class="sub">{{ s.title }} — recap</p>
              <div class="card"><h3 style="margin:0 0 12px">Action items</h3>
                @for (a of s.actions; track a.id) {
                  <div class="note">{{ a.title }}
                    @if (a.assigneeMemberIds.length) { <div class="chips">@for (m of a.assigneeMemberIds; track m) { <span class="tag">{{ memberName(m) }}</span> }</div> }</div>
                }
                @if (s.actions.length === 0) { <p class="muted">No actions captured.</p> }
              </div>
              <div class="card"><h3 style="margin:0 0 12px">Check-in sentiment</h3>
                @for (q of s.checkinQuestions; track q.id) {
                  <div style="margin-bottom:10px"><div style="font-size:13px;margin-bottom:4px">{{ q.text }}</div>
                    <div class="row" style="height:16px;border-radius:5px;overflow:hidden;background:var(--surface2);gap:0">
                      <span [style.width.%]="pct(q.better,q)" style="background:#34d67f"></span>
                      <span [style.width.%]="pct(q.same,q)" style="background:#f5b544"></span>
                      <span [style.width.%]="pct(q.worse,q)" style="background:#f4566b"></span>
                    </div></div>
                }
              </div>

              @if (s.feedbackPrompts.length) {
                @if (amFacilitator()) {
                  <!-- Facilitator: anonymous aggregate -->
                  <div class="card"><h3 style="margin:0 0 4px">Session feedback</h3>
                    <p class="muted" style="margin:0 0 18px">Anonymous ratings from participants.</p>
                    @for (p of s.feedbackPrompts; track p.id) {
                      <div style="margin-bottom:22px">
                        <div class="row between">
                          <div style="font-weight:600">{{ p.text }}</div>
                          <div class="row" style="gap:8px;align-items:center">
                            <span class="stars sm">@for (n of starScale; track n) { <span class="star" [class.on]="(p.averageScore ?? 0) >= n - 0.4">★</span> }</span>
                            <b>{{ avgFb(p) }}</b><span class="muted" style="font-size:12px">({{ p.responseCount }})</span>
                          </div>
                        </div>
                        <div style="margin-top:8px">
                          @for (n of starScaleDesc; track n) {
                            <div class="bar-row"><span class="muted" style="width:26px;font-size:12px">{{ n }}★</span>
                              <div class="bar-track"><span class="bar-fill" [style.width.%]="distPct(p, n)"></span></div>
                              <span class="muted" style="width:20px;font-size:12px;text-align:right">{{ p.distribution[n-1] }}</span></div>
                          }
                        </div>
                        @if (p.comments.length) { <div style="margin-top:10px">
                          @for (c of p.comments; track $index) { <div class="note" style="font-style:italic">“{{ c }}”</div> }
                        </div> }
                      </div>
                    }
                  </div>
                } @else {
                  <!-- Participant: rate the session -->
                  <div class="card"><h3 style="margin:0 0 4px">How did we do?</h3>
                    <p class="muted" style="margin:0 0 18px">Your ratings are anonymous — only the aggregate is shared with the facilitator.</p>
                    @for (p of s.feedbackPrompts; track p.id) {
                      <div style="margin-bottom:20px">
                        <div style="font-weight:600;margin-bottom:6px">{{ p.text }}</div>
                        <div class="stars">
                          @for (n of starScale; track n) { <span class="star" [class.on]="(p.myScore ?? 0) >= n" (click)="rateFeedback(p.id, n)">★</span> }
                          @if (p.myScore) { <span class="muted" style="font-size:12px;margin-left:8px;align-self:center">{{ p.myScore }}/5</span> }
                        </div>
                        <textarea class="f" rows="2" style="margin-top:8px" [placeholder]="p.myScore ? 'Optional comment…' : 'Rate first, then add a comment'"
                          [disabled]="!p.myScore" [(ngModel)]="fbComments[p.id]" (change)="commentFeedback(p.id)"></textarea>
                      </div>
                    }
                    @if (feedbackDone()) { <div class="muted">✓ Thanks — your feedback has been recorded. You can still adjust it above.</div> }
                  </div>
                }
              }
            }
          }
        </main>
      </div>
    }
  </div>

  <!-- reusable assignee typeahead: bind to an object with { assignees: string[] } -->
  <ng-template #assignPicker let-draft="draft">
    @if (draft.assignees.length) { <div class="chips">
      @for (id of draft.assignees; track id) { <span class="chip">{{ memberName(id) }} <b (click)="removeAssignee(draft, id)">✕</b></span> }
    </div> }
    <div class="ta">
      <input class="f" [(ngModel)]="assigneeQuery" placeholder="Assign — type a name…">
      @if (assigneeQuery.trim()) { <div class="ta-list">
        @for (m of filterMembers(assigneeQuery, draft.assignees); track m.id) { <div class="ta-item" (click)="addAssignee(draft, m.id)">{{ m.name }}</div> }
        @if (filterMembers(assigneeQuery, draft.assignees).length === 0) { <div class="ta-item muted">No matches</div> }
      </div> }
    </div>
  </ng-template>
  `,
})
export class RetroBoardComponent implements OnInit, OnDestroy {
  private svc = inject(RetroBoardService);
  private memberSvc = inject(TeamMemberService);
  private ws = inject(WebSocketService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroy$ = new Subject<void>();
  // Coalesces refetches: bursts of rb_* events (and rapid local actions) collapse into a single
  // full-session GET, and switchMap cancels any in-flight fetch so the latest result always wins.
  private refresh$ = new Subject<string>();

  readonly phases = PHASES;
  readonly ratings = RATINGS;
  readonly timerFields = TIMER_FIELDS;
  readonly swatches = ['#2fd47e', '#f4566b', '#f5b544', '#5b9dff', '#b07cff', '#f5934a', '#2dd4bf', '#f472b6'];
  readonly starScale = [1, 2, 3, 4, 5];
  readonly starScaleDesc = [5, 4, 3, 2, 1];

  session = signal<RetroBoardSession | null>(null);
  summaries = signal<RetroBoardSummary[]>([]);
  archived = signal<RetroBoardSummary[]>([]);
  showArchived = signal(false);
  members = signal<Member[]>([]);
  error = signal<string | null>(null);
  creating = signal(false);
  analysing = signal(false);
  viewAs = signal<'facilitator' | 'participant'>('facilitator');
  actionDraft = signal<{ noteId: string; title: string; assignees: string[] } | null>(null);
  private timerNow = signal(Date.now());

  readonly myId = this.auth.me?.id ?? '';
  amFacilitator = computed(() => !!this.session()?.isFacilitator && this.viewAs() === 'facilitator');
  phaseIndex = computed(() => this.phases.findIndex(p => p.key === this.session()?.phase));
  flagged = computed(() => this.session()?.notes.filter(n => n.flagged) ?? []);
  sortedByVotes = computed(() => [...(this.session()?.notes ?? [])].sort((a, b) => b.voteCount - a.voteCount));
  checkinDone = computed(() => !!this.session()?.participants.find(p => p.memberId === this.myId)?.completedPhases.includes('checkin'));
  feedbackDone = computed(() => { const ps = this.session()?.feedbackPrompts ?? []; return ps.length > 0 && ps.every(p => p.myScore != null); });
  phaseTimerKey = computed(() => PHASE_TIMER[this.session()?.phase ?? '']);
  timer = computed(() => {
    const s = this.session(); if (!s?.liveStateJson) return null;
    try {
      const st = JSON.parse(s.liveStateJson) as { startedAt?: string; seconds?: number };
      if (!st.startedAt || !st.seconds) return null;
      const rem = Math.round(st.seconds - (this.timerNow() - new Date(st.startedAt).getTime()) / 1000);
      return rem > 0 ? rem : 0;
    } catch { return null; }
  });

  newTitle = '';
  edit = { votes: 6, anon: true, d: { meeting: 3600, checkin: 180, capture: 480, introduceRead: 60, introduceTopic: 30, vote: 300, discussTopic: 120, reflect: 120 } };
  newColumn = ''; newQuestion = ''; newPrompt = '';
  fbComments: Record<string, string> = {};
  manual = { title: '', assignees: [] as string[] };
  assigneeQuery = '';
  draft: Record<string, string> = {}; draftAnon: Record<string, boolean> = {};
  private joinedId: string | null = null;
  private tick?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.memberSvc.getAll({ isActive: true }).subscribe({ next: ms => this.members.set(ms.map(m => ({ id: m.id, name: `${m.firstName} ${m.lastName}`.trim() }))) });
    this.ws.connect();
    this.refresh$.pipe(
      debounceTime(150),
      switchMap(id => this.svc.getSession(id).pipe(catchError(() => EMPTY))),
      takeUntil(this.destroy$),
    ).subscribe({ next: s => this.setSession(s) });
    this.ws.messages$.pipe(takeUntil(this.destroy$)).subscribe(msg => {
      if (!msg) return;
      const s = this.session();
      if (s && typeof msg.type === 'string' && msg.type.startsWith('rb_') && msg.data?.['sessionId'] === s.id) this.refresh(s.id);
    });
    this.tick = setInterval(() => this.timerNow.set(Date.now()), 1000);
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.load(id); else this.loadLobby();
  }
  ngOnDestroy() { this.leaveWs(); if (this.tick) clearInterval(this.tick); this.destroy$.next(); this.destroy$.complete(); }

  private loadLobby() { this.svc.getLobbySessions().subscribe({ next: v => this.summaries.set(v), error: () => this.error.set('Could not load retros.') }); }
  private loadArchived() { this.svc.getArchivedSessions().subscribe({ next: v => this.archived.set(v) }); }
  private reloadLists() { this.loadLobby(); if (this.showArchived()) this.loadArchived(); }
  toggleArchived() { const next = !this.showArchived(); this.showArchived.set(next); if (next) this.loadArchived(); }
  private load(idOrSlug: string) { this.svc.join(idOrSlug).subscribe({ next: s => { this.setSession(s); this.joinWs(s.id); }, error: () => this.error.set('Could not open retro.') }); }
  private refresh(id: string) { this.refresh$.next(id); }
  private setSession(s: RetroBoardSession) {
    this.session.set(s); this.edit.votes = s.votesPerUser; this.edit.anon = s.allowAnonymous; this.edit.d = { ...s.stepDurations };
    // Seed local comment drafts once so in-progress typing survives WS refreshes.
    for (const p of s.feedbackPrompts) if (this.fbComments[p.id] === undefined) this.fbComments[p.id] = p.myComment ?? '';
  }

  create() {
    const t = this.newTitle.trim(); this.creating.set(true);
    this.svc.createSession({ title: t || undefined }).subscribe({
      next: s => { this.creating.set(false); this.router.navigate(['/pulse/retro-board', s.id]); this.setSession(s); this.joinWs(s.id); },
      error: () => { this.creating.set(false); this.error.set('Create failed.'); },
    });
  }
  open(id: string) { this.router.navigate(['/pulse/retro-board', id]); this.load(id); }
  del(id: string, ev: Event) { ev.stopPropagation(); if (!confirm('Delete this retro permanently? This cannot be undone.')) return; this.svc.deleteSession(id).subscribe({ next: () => this.reloadLists() }); }
  leave() { this.leaveWs(); this.session.set(null); this.viewAs.set('facilitator'); this.router.navigate(['/pulse/retro-board']); this.reloadLists(); }

  // ---- lobby lifecycle actions ----
  reopen(id: string, ev: Event) { ev.stopPropagation(); this.svc.reopen(id).subscribe({ next: () => this.reloadLists() }); }
  archive(id: string, ev: Event) { ev.stopPropagation(); this.svc.archive(id).subscribe({ next: () => this.reloadLists() }); }
  unarchive(id: string, ev: Event) { ev.stopPropagation(); this.svc.unarchive(id).subscribe({ next: () => this.reloadLists() }); }
  // ---- in-session lifecycle actions ----
  closeCurrent() { const s = this.session(); if (s && confirm('Close this retro? It will be marked closed. You can reopen or archive it anytime.')) this.svc.close(s.id).subscribe({ next: r => this.setSession(r) }); }
  reopenCurrent() { const s = this.session(); if (s) this.svc.reopen(s.id).subscribe({ next: r => this.setSession(r) }); }

  private joinWs(id: string) { this.joinedId = id; const me = this.auth.me; this.ws.send({ type: 'join_retro', sessionId: id, memberName: me ? `${me.firstName} ${me.lastName}`.trim() : '' }); }
  private leaveWs() { if (this.joinedId) { this.ws.send({ type: 'leave_retro' }); this.joinedId = null; } }

  goPhase(p: RetroPhase) { const s = this.session(); if (!s || !this.amFacilitator()) return; this.svc.setPhase(s.id, p).subscribe({ next: r => { this.setSession(r); this.autoStartTimer(r); } }); }
  // Auto-start the phase clock on advance so every participant sees a running timer without the facilitator starting it.
  private autoStartTimer(s: RetroBoardSession) { const key = PHASE_TIMER[s.phase]; if (!key) return; this.svc.setLiveState(s.id, JSON.stringify({ startedAt: new Date().toISOString(), seconds: s.stepDurations[key] })).subscribe({ next: () => this.refresh(s.id) }); }
  saveSettings() { const s = this.session(); if (s) this.svc.updateSettings(s.id, { votesPerUser: this.edit.votes, allowAnonymous: this.edit.anon, stepDurations: this.edit.d }).subscribe({ next: () => this.refresh(s.id) }); }
  setTimer(key: keyof RetroBoardSession['stepDurations'], ev: Event) { this.edit.d[key] = this.parse((ev.target as HTMLInputElement).value); this.saveSettings(); }
  reveal() { const s = this.session(); if (s) this.svc.reveal(s.id).subscribe({ next: () => this.refresh(s.id) }); }

  startTimer() { const s = this.session(); const key = this.phaseTimerKey(); if (!s || !key) return; this.svc.setLiveState(s.id, JSON.stringify({ startedAt: new Date().toISOString(), seconds: s.stepDurations[key] })).subscribe({ next: () => this.refresh(s.id) }); }
  stopTimer() { const s = this.session(); if (s) this.svc.setLiveState(s.id, null).subscribe({ next: () => this.refresh(s.id) }); }

  setColor(columnId: string, color: string) { const s = this.session(); const c = s?.columns.find(x => x.id === columnId); if (s && c) this.svc.updateColumn(s.id, columnId, { label: c.label, description: c.description, color, icon: c.icon }).subscribe({ next: () => this.refresh(s.id) }); }
  addColumn() { const s = this.session(); const v = this.newColumn.trim(); if (!s || !v) return; this.svc.addColumn(s.id, { label: v, color: '#5b9dff', icon: 'star' }).subscribe({ next: () => { this.newColumn = ''; this.refresh(s.id); } }); }
  delColumn(id: string) { const s = this.session(); if (s) this.svc.deleteColumn(s.id, id).subscribe({ next: () => this.refresh(s.id) }); }

  addQuestion() { const s = this.session(); const v = this.newQuestion.trim(); if (!s || !v) return; this.svc.addCheckinQuestion(s.id, { text: v }).subscribe({ next: () => { this.newQuestion = ''; this.refresh(s.id); } }); }
  delQuestion(id: string) { const s = this.session(); if (s) this.svc.deleteCheckinQuestion(s.id, id).subscribe({ next: () => this.refresh(s.id) }); }
  respond(qid: string, rating: string) { const s = this.session(); if (s) this.svc.respondCheckin(s.id, qid, rating).subscribe({ next: () => this.refresh(s.id) }); }
  markDone(phase: string) { const s = this.session(); if (s) this.svc.setProgress(s.id, phase, true).subscribe({ next: () => this.refresh(s.id) }); }

  addPrompt() { const s = this.session(); const v = this.newPrompt.trim(); if (!s || !v) return; this.svc.addFeedbackPrompt(s.id, { text: v }).subscribe({ next: () => { this.newPrompt = ''; this.refresh(s.id); } }); }
  delPrompt(id: string) { const s = this.session(); if (s) this.svc.deleteFeedbackPrompt(s.id, id).subscribe({ next: () => this.refresh(s.id) }); }
  rateFeedback(pid: string, score: number) { const s = this.session(); if (!s) return; this.svc.respondFeedback(s.id, pid, score, (this.fbComments[pid] || '').trim() || null).subscribe({ next: () => this.refresh(s.id) }); }
  commentFeedback(pid: string) { const s = this.session(); const p = s?.feedbackPrompts.find(x => x.id === pid); if (!s || !p?.myScore) return; this.svc.respondFeedback(s.id, pid, p.myScore, (this.fbComments[pid] || '').trim() || null).subscribe({ next: () => this.refresh(s.id) }); }
  avgFb(p: RetroBoardFeedbackPrompt) { return p.averageScore != null ? p.averageScore.toFixed(1) : '—'; }
  distPct(p: RetroBoardFeedbackPrompt, star: number) { return p.responseCount ? (p.distribution[star - 1] / p.responseCount) * 100 : 0; }

  notesFor(colId: string) { return this.session()?.notes.filter(n => n.columnId === colId) ?? []; }
  masked(n: RetroBoardNote) { const s = this.session(); return this.viewAs() === 'participant' && !!s && s.phase === 'capture' && s.hideNotesUntilReveal && !s.notesRevealed && !n.isOwn; }
  introducer(n: RetroBoardNote) { return n.isAnonymous ? 'facilitator' : this.shortName(n.authorName ?? '?'); }
  addNote(colId: string) { const s = this.session(); const v = (this.draft[colId] || '').trim(); if (!s || !v) return; this.svc.addNote(s.id, colId, v, !!this.draftAnon[colId]).subscribe({ next: r => { this.draft[colId] = ''; this.setSession(r); } }); }
  toggleFlag(n: RetroBoardNote) { const s = this.session(); if (s) this.svc.flagNote(s.id, n.id, !n.flagged).subscribe({ next: () => this.refresh(s.id) }); }

  vote(n: { id: string }) { const s = this.session(); if (s) this.svc.addVote(s.id, n.id).subscribe({ next: () => this.refresh(s.id), error: () => {} }); }
  unvote(n: { id: string }) { const s = this.session(); if (s) this.svc.removeVote(s.id, n.id).subscribe({ next: () => this.refresh(s.id) }); }

  startAction(n: RetroBoardNote) { this.actionDraft.set({ noteId: n.id, title: n.text ?? '', assignees: [] }); this.assigneeQuery = ''; }
  addAssignee(draft: { assignees: string[] }, id: string) { if (!draft.assignees.includes(id)) draft.assignees.push(id); this.assigneeQuery = ''; this.actionDraft.set(this.actionDraft()); }
  removeAssignee(draft: { assignees: string[] }, id: string) { const i = draft.assignees.indexOf(id); if (i >= 0) draft.assignees.splice(i, 1); this.actionDraft.set(this.actionDraft()); }
  saveAction() { const s = this.session(); const d = this.actionDraft(); if (!s || !d || !d.title.trim()) return; this.svc.addAction(s.id, d.title.trim(), { sourceNoteId: d.noteId, assigneeMemberIds: d.assignees }).subscribe({ next: () => { this.actionDraft.set(null); this.refresh(s.id); } }); }
  addManual() { const s = this.session(); const v = this.manual.title.trim(); if (!s || !v) return; this.svc.addAction(s.id, v, { assigneeMemberIds: this.manual.assignees }).subscribe({ next: () => { this.manual = { title: '', assignees: [] }; this.assigneeQuery = ''; this.refresh(s.id); } }); }
  delAction(id: string) { const s = this.session(); if (s) this.svc.deleteAction(s.id, id).subscribe({ next: () => this.refresh(s.id) }); }

  analyse() { const s = this.session(); if (!s) return; this.analysing.set(true); this.error.set(null); this.svc.analyse(s.id).subscribe({ next: () => { this.analysing.set(false); this.refresh(s.id); }, error: e => { this.analysing.set(false); this.error.set(e?.error?.error || 'AI summary unavailable.'); } }); }

  // helpers
  filterMembers(query: string, exclude: string[]): Member[] { const q = query.trim().toLowerCase(); if (!q) return []; return this.members().filter(m => !exclude.includes(m.id) && m.name.toLowerCase().includes(q)).slice(0, 6); }
  allocated() { const d = this.edit.d; return d.checkin + d.capture + d.introduceRead + d.introduceTopic + d.vote + d.discussTopic + d.reflect; }
  remaining() { return (this.edit.d.meeting || 0) - this.allocated(); }
  phaseLabel(p: string) { return this.phases.find(x => x.key === p)?.label ?? p; }
  memberName(id: string) { const m = this.members().find(x => x.id === id); if (m) return this.shortName(m.name); return this.shortName(this.session()?.participants.find(p => p.memberId === id)?.name ?? '?'); }
  shortName(name: string) { return (name || '').split(' ')[0] || '—'; }
  initials(name: string) { return (name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase(); }
  private hue(id: string) { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
  tint(id: string) { return `hsl(${this.hue(id)} 45% 22%)`; }
  ink(id: string) { return `hsl(${this.hue(id)} 70% 70%)`; }
  pct(v: number, q: { better: number; same: number; worse: number }) { const t = q.better + q.same + q.worse; return t ? (v / t) * 100 : 0; }
  fmt(sec: number) { const s = Math.max(0, sec); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  parse(str: string): number { const parts = (str || '').split(':'); if (parts.length >= 2) return (+parts[0] || 0) * 60 + (+parts[1] || 0); return (+parts[0] || 0) * 60; }
}
