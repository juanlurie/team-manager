import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

import { RetroBoardStore } from './retro-board.store';
import { RETRO_STYLES } from './retro-board.styles';
import { RetroLobbyComponent } from './phases/retro-lobby.component';
import { RetroSetupComponent } from './phases/retro-setup.component';
import { RetroCheckinComponent } from './phases/retro-checkin.component';
import { RetroCaptureComponent } from './phases/retro-capture.component';
import { RetroIntroduceComponent } from './phases/retro-introduce.component';
import { RetroVoteComponent } from './phases/retro-vote.component';
import { RetroDiscussComponent } from './phases/retro-discuss.component';
import { RetroReflectComponent } from './phases/retro-reflect.component';
import { RetroSummaryComponent } from './phases/retro-summary.component';

/**
 * RetroBoard container: owns nothing but the shell (topbar, participant rail) and delegates each
 * phase to a dedicated child component. All state and orchestration live in the per-view
 * {@link RetroBoardStore}, provided here so the container and every child share one instance.
 */
@Component({
  selector: 'app-retro-board',
  standalone: true,
  imports: [
    CommonModule,
    RetroLobbyComponent, RetroSetupComponent, RetroCheckinComponent, RetroCaptureComponent,
    RetroIntroduceComponent, RetroVoteComponent, RetroDiscussComponent, RetroReflectComponent, RetroSummaryComponent,
  ],
  providers: [RetroBoardStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [RETRO_STYLES],
  template: `
  <div class="wrap">
    @if (!store.session()) {
      <app-retro-lobby />
    }

    @if (store.session(); as s) {
      <div class="topbar">
        <div class="brand">Retro<span>Board</span></div>
        <div class="stepper">
          @for (p of store.phases; track p.key; let i = $index) {
            <button class="step" [class.active]="p.key===s.phase" [class.done]="i < store.phaseIndex()"
                    [disabled]="!store.amFacilitator()" (click)="store.goPhase(p.key)">{{ p.label }}</button>
            @if (i < store.phases.length-1) { <span class="sep">›</span> }
          }
        </div>
        @if (store.timer() !== null) { <span class="clock" [class.low]="store.timer()! <= 15">⏱ {{ store.fmt(store.timer()!) }}</span> }
        @if (store.amFacilitator() && store.phaseTimerKey()) {
          @if (store.timer() === null) { <button class="btn ghost sm" (click)="store.startTimer()">▶ Start</button> }
          @else { <button class="btn ghost sm" (click)="store.stopTimer()">■ Stop</button> }
        }
        @if (s.isFacilitator) {
          <div class="seg" title="Preview the participant experience">
            <button [class.on]="store.viewAs()==='facilitator'" (click)="store.viewAs.set('facilitator')">Facilitator</button>
            <button [class.on]="store.viewAs()==='participant'" (click)="store.viewAs.set('participant')">Participant</button>
          </div>
        }
        <span class="tag" [class.closed]="s.status==='closed'">{{ s.status==='closed' ? 'closed' : s.slug }}</span>
        @if (s.isFacilitator) {
          @if (s.status==='closed') { <button class="btn ghost sm" (click)="store.reopenCurrent()">Reopen</button> }
          @else { <button class="btn ghost sm" (click)="store.closeCurrent()">Close retro</button> }
        }
        <button class="btn ghost sm" (click)="store.leave()">Leave</button>
      </div>

      @if (store.viewAs()==='participant') { <div class="live"><span class="dot"></span> Participant preview — following the facilitator (on <b>&nbsp;{{ store.phaseLabel(s.phase) }}</b>)</div> }

      <div class="body">
        <aside class="rail">
          <h4>Participants · {{ s.participants.length }}</h4>
          @for (p of s.participants; track p.id) {
            <div class="p-row">
              <span class="avatar" [style.background]="store.tint(p.memberId)" [style.color]="store.ink(p.memberId)">{{ store.initials(p.name) }}</span>
              <span>{{ store.shortName(p.name) }}</span>
              @if (p.role === 'facilitator') { <span class="crown">★</span> }
              @else if (p.completedPhases.includes(s.phase)) { <span class="tick">✓</span> }
            </div>
          }
        </aside>

        <main class="main">
          @switch (s.phase) {
            @case ('setup')     { <app-retro-setup /> }
            @case ('checkin')   { <app-retro-checkin /> }
            @case ('capture')   { <app-retro-capture /> }
            @case ('introduce') { <app-retro-introduce /> }
            @case ('vote')      { <app-retro-vote /> }
            @case ('discuss')   { <app-retro-discuss /> }
            @case ('reflect')   { <app-retro-reflect /> }
            @case ('summary')   { <app-retro-summary /> }
          }
        </main>
      </div>
    }
  </div>
  `,
})
export class RetroBoardComponent implements OnInit {
  store = inject(RetroBoardStore);
  private route = inject(ActivatedRoute);

  ngOnInit() {
    this.store.init(this.route.snapshot.paramMap.get('id'));
  }
}
