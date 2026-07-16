import { Component, OnInit, inject, signal, viewChild, ElementRef, HostListener, ChangeDetectionStrategy } from '@angular/core';
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
  <div class="wrap" [class.present]="presenting()" #board>
    @if (!store.session()) {
      <app-retro-lobby />
    }

    @if (store.session(); as s) {
      @if (s.status === 'draft') {
        <!-- Setup: a focused configuration screen — no stepper, live controls, or participant rail. -->
        <div class="topbar">
          <div class="brand">Retro<span>Board</span></div>
          <span class="grow"></span>
          <span class="tag" title="Share this code so the team can join">{{ s.slug }}</span>
          <button class="btn ghost sm" (click)="store.leave()">← Lobby</button>
        </div>
        <div class="body" style="grid-template-columns:1fr">
          @if (s.isFacilitator) { <main class="main setup-main"><app-retro-setup /></main> }
          @else { <main class="main" style="max-width:640px;margin:0 auto"><p class="sub" style="margin-top:48px">The facilitator is still setting up this retro. You'll be able to take part once it's opened.</p></main> }
        </div>
      } @else {

      <div class="topbar">
        <div class="brand">Retro<span>Board</span></div>
        <span class="grow"></span>
        @if (s.isFacilitator) {
          <div class="seg" title="Preview the participant experience">
            <button [class.on]="store.viewAs()==='facilitator'" (click)="store.viewAs.set('facilitator')">Facilitator</button>
            <button [class.on]="store.viewAs()==='participant'" (click)="store.viewAs.set('participant')">Participant</button>
          </div>
        }
        <span class="tag" [class.closed]="s.status==='closed'">{{ s.status==='closed' ? 'closed' : s.slug }}</span>
        @if (store.amFacilitator()) {
          @if (s.status==='open') { <button class="btn primary sm" (click)="store.goLive()">Go Live →</button> }
          @if (s.status !== 'closed') { <button class="btn ghost sm" [class.primary]="store.editingSetup()" (click)="store.editingSetup.set(!store.editingSetup())" title="Edit questions, structure & timers mid-session">{{ store.editingSetup() ? '✓ Done' : '⚙ Setup' }}</button> }
          @if (s.status==='closed') { <button class="btn ghost sm" (click)="store.reopenCurrent()">Reopen</button> }
          @else { <button class="btn ghost sm" (click)="store.closeCurrent()">Close retro</button> }
        }
        <button class="btn ghost sm" (click)="toggleFullscreen()" title="Full-screen presentation view">{{ presenting() ? '⤡ Exit' : '⤢ Present' }}</button>
        <button class="btn ghost sm" (click)="store.leave()">Leave</button>
      </div>

      @if (store.editingSetup()) {
        <!-- Facilitator editing the setup mid-session — the board is preserved underneath and returns on Done. -->
        <div class="body" style="grid-template-columns:1fr"><main class="main setup-main"><app-retro-setup /></main></div>
      } @else {

      @if (s.status === 'live') {
        <div class="stepbar">
          @for (p of store.visibleSteps(); track p.key; let last = $last) {
            <button class="step" [class.active]="p.key===store.viewPhase()" [class.done]="store.stepDone(p.key)"
                    [disabled]="!store.canNavigateTo(p.key)" (click)="store.navigate(p.key)">{{ p.label }}</button>
            @if (!last) { <span class="sep">›</span> }
          }
          @if (!store.isStructured()) {
            <span class="grow"></span>
            <button class="btn ghost sm" (click)="store.goPrevPhase()" [disabled]="!store.canGoPrev()">← Prev</button>
            <button class="btn ghost sm" (click)="store.goNextPhase()" [disabled]="!store.canGoNext()">Next →</button>
          }
        </div>
      }

      @if (s.status === 'open') { <div class="live"><span class="dot"></span> Open for pre-capture — the team can add notes now. Press <b>&nbsp;Go Live&nbsp;</b> to start the guided session.</div> }
      @else if (store.viewAs()==='participant') { <div class="live"><span class="dot"></span> Participant preview — following the facilitator (on <b>&nbsp;{{ store.phaseLabel(s.phase) }}</b>)</div> }

      <div class="body">
        <aside class="rail">
          @if (s.status !== 'closed' && store.timerAllowed() && (store.phaseTimerKey() || store.timer() !== null)) {
            <div class="rail-timer">
              <div class="rt-label">⏱ {{ store.phaseLabel(s.phase) }}</div>
              <div class="rt-time" [class.low]="store.timer() !== null && store.timer()! <= 15" [class.idle]="store.timer() === null || store.isPaused()">{{ store.timer() !== null ? store.fmt(store.timer()!) : '—:—' }}</div>
              @if (store.isPaused()) { <div class="muted" style="font-size:12px">paused</div> }
              @if (store.amFacilitator() && store.phaseTimerKey()) {
                <div class="rt-controls">
                  @if (store.timer() === null) { <button class="btn ghost sm" (click)="store.startTimer()">▶ Start</button> }
                  @else {
                    @if (store.isPaused()) { <button class="btn ghost sm" (click)="store.resumeTimer()">▶ Resume</button> }
                    @else { <button class="btn ghost sm" (click)="store.pauseTimer()">⏸ Pause</button> }
                    <button class="btn ghost sm" (click)="store.startTimer()" title="Restart this phase timer">↻ Restart</button>
                  }
                </div>
              }
            </div>
          }
          <h4>Participants · {{ s.participants.length }}</h4>
          @for (p of s.participants; track p.id) {
            <div class="p-row">
              <span class="avatar" [style.background]="store.tint(p.memberId)" [style.color]="store.ink(p.memberId)">{{ store.initials(p.name) }}</span>
              <span>{{ store.shortName(p.name) }}</span>
              @if (p.role === 'facilitator') { <span class="crown">★</span> }
              @else if (store.amFacilitator() && (s.status === 'open' || s.phase === 'checkin') && p.responded['checkin']) { <span class="tick" title="Checked in">✓</span> }
            </div>
          }
        </aside>

        <main class="main">
          @switch (store.mainView()) {
            @case ('precapture') { <app-retro-checkin /> <app-retro-capture /> }
            @case ('checkin')    { <app-retro-checkin /> }
            @case ('capture')    { <app-retro-capture /> }
            @case ('introduce')  { <app-retro-introduce /> }
            @case ('vote')       { <app-retro-vote /> }
            @case ('discuss')    { <app-retro-discuss /> }
            @case ('reflect')    { <app-retro-reflect /> }
            @case ('summary')    { <app-retro-summary /> }
          }
        </main>
      </div>
      }
      }
    }
  </div>
  `,
})
export class RetroBoardComponent implements OnInit {
  store = inject(RetroBoardStore);
  private route = inject(ActivatedRoute);

  /** True while the board is displayed fullscreen for presentation. */
  presenting = signal(false);
  private board = viewChild<ElementRef<HTMLElement>>('board');

  ngOnInit() {
    this.store.init(this.route.snapshot.paramMap.get('id'));
  }

  /** Toggle browser fullscreen on the board shell for a projector-friendly presentation view. */
  toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else this.board()?.nativeElement.requestFullscreen?.();
  }

  // Keep the flag in sync however fullscreen is exited (button, Esc, or OS chrome).
  @HostListener('document:fullscreenchange')
  onFullscreenChange() { this.presenting.set(!!document.fullscreenElement); }
}
