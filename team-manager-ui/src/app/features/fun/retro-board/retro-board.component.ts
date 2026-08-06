import { Component, OnInit, inject, signal, HostListener, ChangeDetectionStrategy } from '@angular/core';
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
import { RetroRailTimerComponent } from './rail-timer.component';
import { RetroParticipantRailComponent } from './participant-rail.component';

/**
 * RetroBoard container: owns nothing but the shell (topbar, rail) and delegates each phase — and
 * each rail panel — to a dedicated child component. All state and orchestration live in the per-view
 * {@link RetroBoardStore}, provided here so the container and every child share one instance.
 */
@Component({
  selector: 'app-retro-board',
  standalone: true,
  imports: [
    CommonModule,
    RetroLobbyComponent, RetroSetupComponent, RetroCheckinComponent, RetroCaptureComponent,
    RetroIntroduceComponent, RetroVoteComponent, RetroDiscussComponent, RetroReflectComponent, RetroSummaryComponent,
    RetroRailTimerComponent, RetroParticipantRailComponent,
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
          <span class="tag" style="cursor:pointer" (click)="copyCode(s.slug)" [title]="copied() ? 'Copied!' : 'Click to copy the join link'">{{ copied() ? '✓ copied' : s.slug }}</span>
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
        <span class="tag" [class.closed]="s.status==='closed'" style="cursor:pointer" (click)="copyCode(s.slug)" [title]="copied() ? 'Copied!' : 'Click to copy the join link'">{{ copied() ? '✓ copied' : (s.status==='closed' ? 'closed' : s.slug) }}</span>
        @if (store.amFacilitator()) {
          @if (s.status==='open') { <button class="btn primary sm" (click)="store.goLive()">Go Live →</button> }
          @if (s.status !== 'closed') { <button class="btn ghost sm" [class.primary]="store.editingSetup()" (click)="store.editingSetup.set(!store.editingSetup())" title="Edit questions, structure & timers mid-session">{{ store.editingSetup() ? '✓ Done' : '⚙ Setup' }}</button> }
          @if (s.status==='closed') { <button class="btn ghost sm" (click)="store.reopenCurrent()">Reopen</button> }
          @else { <button class="btn ghost sm" (click)="store.closeCurrent()">Close retro</button> }
        }
        <button class="btn ghost sm" (click)="togglePresent()" title="Maximise — fill the screen and hide the app menus">{{ presenting() ? '⤡ Minimise' : '⤢ Maximise' }}</button>
        <button class="btn ghost sm" (click)="store.leave()">Exit retro</button>
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
            <app-retro-rail-timer />
          }
          <app-retro-participant-rail />
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

  /** True while the board is in presentation view — a CSS overlay that fills the viewport and hides
   *  the surrounding app chrome (not browser F11 fullscreen). */
  presenting = signal(false);
  /** Briefly shows a "copied" tick after the share code is clicked. */
  copied = signal(false);

  ngOnInit() {
    this.store.init(this.route.snapshot.paramMap.get('id'));
  }

  /** Toggle the in-page presentation overlay. Esc exits it too. */
  togglePresent() { this.presenting.update(v => !v); }

  @HostListener('document:keydown.escape')
  onEscape() { if (this.presenting()) this.presenting.set(false); }

  /** Copy the full guest join link (not just the bare code) to the clipboard, with brief feedback —
   *  it's the shareable URL people actually paste. Matches the link the QR encodes (retro-setup's
   *  joinUrl). The tag still *shows* the short code; clicking it copies the whole link. */
  copyCode(slug: string | null) {
    if (!slug) return;
    const url = `${location.origin}/guest/retro-board/${slug}`;
    navigator.clipboard?.writeText(url).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1200);
    }).catch(() => { /* clipboard may be unavailable */ });
  }
}
