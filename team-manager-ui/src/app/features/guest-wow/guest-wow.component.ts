import { Component, OnDestroy, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { GuestWinOfTheWeekService } from './guest-wow.service';
import { clearCacheForPattern } from '../../core/interceptors/http-cache.interceptor';
import { GuestWinWeek, GuestNomination, GuestCreateNominationRequest, WowNominationDisplay, WinWeek, WinNomination } from '../../core/models/win-week.model';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { AuthService } from '../../core/auth/auth.service';
import { MobileService } from '../../core/services/mobile.service';
import { WowCurrentWeekComponent } from '../win-of-the-week/wow-current-week.component';
import { WowTieBreakSpinnerComponent } from '../../shared/components/wow-tie-break-spinner/wow-tie-break-spinner.component';
import { AppModalComponent } from '../../shared/components/app-modal/app-modal.component';
import { runTieBreakSpin } from '../../shared/utils/wow.utils';

const SESSION_ID_KEY = 'wow_guest_session_id';
// Unique sentinel so WowCurrentWeekComponent knows which nominations the guest owns
const GUEST_OWNED_ID = '__guest__';

function nameKey(token: string) { return `wow_guest_name_${token}`; }

function adaptToWinWeek(week: GuestWinWeek): WinWeek {
  const nominations: WinNomination[] = week.nominations.map(n => ({
    id: n.id,
    winWeekId: week.id,
    teamMemberId: n.isOwned ? GUEST_OWNED_ID : null,
    teamMemberName: n.nominatorDisplayName,
    isGuestNomination: true,
    nomineeMemberId: n.nomineeMemberId,
    nomineeName: n.nomineeName,
    title: n.title,
    description: n.description,
    createdAt: n.createdAt,
    voteCount: n.voteCount,
    hasVoted: n.hasVoted,
    powerUp: n.powerUp,
    chaosCard: n.chaosCard,
    hypeMeterCount: n.hypeMeterCount,
  }));
  return {
    id: week.id,
    seriesId: '',
    seriesName: '',
    weekStart: week.weekStart,
    status: week.status,
    winnerNominationId: null,
    winnerTitle: week.winnerTitle,
    winnerNomineeName: week.winnerNomineeName,
    openedAt: week.weekStart,
    closedAt: null,
    suddenDeathEndsAt: week.suddenDeathEndsAt,
    hypeBattleEndsAt: week.hypeBattleEndsAt,
    currentMemberId: GUEST_OWNED_ID,
    userVotesRemaining: week.userVotesRemaining,
    userNominationsRemaining: week.userNominationsRemaining,
    totalVotesCast: 0,
    activeMemberCount: 0,
    connectedMemberCount: 0,
    tiedNominationIds: week.tiedNominationIds,
    powerUpsEnabled: week.powerUpsEnabled,
    guestToken: null,
    winnerStory: week.winnerStory,
    nominations,
  };
}

@Component({
  selector: 'app-guest-wow',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatIconModule, MatTooltipModule, WowCurrentWeekComponent, WowTieBreakSpinnerComponent, AppModalComponent],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <app-wow-tie-break-spinner [show]="isSpinning()" [name]="spinnerName()" />

    <div class="guest-wrap" [class.sudden-death]="week()?.status === 'SuddenDeath'">

      <!-- Name capture screen -->
      @if (!guestName()) {
        <div class="name-card">
          <div class="name-card__logo">🏆</div>
          <h2 class="name-card__title">Win of the Week</h2>
          <p class="name-card__sub">Sign in for the full experience, or continue as a guest.</p>
          <button mat-raised-button color="primary" type="button" (click)="login()" style="width:100%;margin-bottom:16px">Sign In</button>
          <div class="divider"><span class="divider__label">or continue as guest</span></div>
          <form (ngSubmit)="saveName()" class="name-form" style="margin-top:16px">
            <input class="name-input" type="text" placeholder="Your name" [(ngModel)]="nameInput" name="guestName" maxlength="100" autofocus />
            <button class="btn-secondary" type="submit" [disabled]="!nameInput.trim()">Continue as Guest</button>
          </form>
        </div>
      }

      <!-- Invalid token -->
      @if (guestName() && tokenInvalid()) {
        <div class="error-card">
          <div class="error-card__icon">🔗</div>
          <h2>Link no longer valid</h2>
          <p>This guest link has expired or is invalid. Ask the host for a new link.</p>
        </div>
      }

      <!-- Loading -->
      @if (guestName() && !tokenInvalid() && loading()) {
        <div class="loading-wrap"><div class="spinner"></div></div>
      }

      <!-- Week view -->
      @if (guestName() && !tokenInvalid() && !loading() && week()) {
        <div class="week-view">
          <!-- Guest identity bar -->
          <div class="week-header">
            <button class="btn-name" type="button" (click)="changeName()" title="Change name">
              👤 {{ guestName() }}
            </button>
            <button mat-icon-button (click)="login()" matTooltip="Sign in" style="color:rgba(255,255,255,0.5)">
              <mat-icon>account_circle</mat-icon>
            </button>
          </div>

          <!-- Week content — reuses the same component as the logged-in view -->
          <app-wow-current-week
            [week]="adaptedWeek()"
            [loading]="false"
            [isHost]="false"
            [isGuest]="true"
            [isMobile]="isMobile"
            [qrDataUrl]="null"
            [currentUserId]="GUEST_OWNED_ID"
            [tokenBalance]="week()?.guestTokenBalance ?? 0"
            [powerUpsEnabled]="week()?.powerUpsEnabled ?? false"
            [activeTimerEndsAt]="activeTimerEndsAt()"
            [hypeBattleEndsAt]="hypeBattleEndsAt()"
            [reactionEvents]="reactionEvents()"
            (nominateClick)="showForm.set(true)"
            (voteClick)="vote($event)"
            (removeVoteClick)="removeVote($event)"
            (editClick)="startEdit($event)"
            (deleteClick)="deleteNomination($event)"
            (hypeClick)="tapHype($event)"
            (reactionClick)="sendReaction($event)"
            (applyPowerUpClick)="applyPowerUp($event)"
            (applyChaosCardClick)="applyChaosCard($event)"
          />
        </div>
      }
    </div>

    <!-- Nominate modal -->
    <app-modal title="Nominate a Win" [show]="showForm()" (closed)="cancelForm()">
      <div style="display:flex;flex-direction:column;gap:12px">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Who are you nominating?</mat-label>
          <mat-select [(ngModel)]="nomForm.nomineeMemberId" name="nominee">
            @for (m of members(); track m.id) {
              <mat-option [value]="m.id">{{ m.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Title</mat-label>
          <input matInput [(ngModel)]="nomForm.title" name="title" maxlength="200" placeholder="e.g. Fixed the production DB issue">
        </mat-form-field>
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Description (optional)</mat-label>
          <textarea matInput [(ngModel)]="nomForm.description" name="description" rows="3" maxlength="2000"></textarea>
        </mat-form-field>
        @if (formError()) { <p class="form-error">{{ formError() }}</p> }
      </div>
      <ng-container modal-footer>
        <button mat-stroked-button type="button" (click)="cancelForm()">Cancel</button>
        <button mat-raised-button color="primary" type="button" (click)="submitNomination()"
                [disabled]="submitting() || !nomForm.nomineeMemberId || !nomForm.title.trim()">
          {{ submitting() ? 'Submitting…' : 'Submit' }}
        </button>
      </ng-container>
    </app-modal>

    <!-- Edit modal -->
    <app-modal title="Edit Nomination" [show]="!!editingId()" (closed)="cancelEdit()">
      <div style="display:flex;flex-direction:column;gap:12px">
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Who are you nominating?</mat-label>
          <mat-select [(ngModel)]="editForm.nomineeMemberId" name="edit-nominee">
            @for (m of members(); track m.id) {
              <mat-option [value]="m.id">{{ m.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Title</mat-label>
          <input matInput [(ngModel)]="editForm.title" name="edit-title" maxlength="200">
        </mat-form-field>
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Description (optional)</mat-label>
          <textarea matInput [(ngModel)]="editForm.description" name="edit-desc" rows="3" maxlength="2000"></textarea>
        </mat-form-field>
        @if (formError()) { <p class="form-error">{{ formError() }}</p> }
      </div>
      <ng-container modal-footer>
        <button mat-stroked-button type="button" (click)="cancelEdit()">Cancel</button>
        <button mat-raised-button color="primary" type="button" (click)="saveEdit(editingId()!)"
                [disabled]="submitting() || !editForm.nomineeMemberId || !editForm.title.trim()">
          {{ submitting() ? 'Saving…' : 'Save' }}
        </button>
      </ng-container>
    </app-modal>
  `,
  styles: [`
    .guest-wrap {
      position: fixed;
      inset: 0;
      overflow-y: auto;
      background: #0f1923;
      color: #fff;
      display: flex;
      justify-content: center;
      padding: 2rem 1rem;
      font-family: inherit;
      transition: background 0.4s;
      z-index: 50;
    }
    .guest-wrap.sudden-death {
      background: #1a0000;
      animation: sd-pulse 1.5s ease-in-out infinite;
    }
    @keyframes sd-pulse {
      0%, 100% { background: #1a0000; }
      50% { background: #2d0000; }
    }

    .name-card, .error-card {
      background: #1e1e2e;
      border-radius: 12px;
      padding: 2.5rem 2rem;
      text-align: center;
      max-width: 400px;
      width: 100%;
      align-self: flex-start;
      margin-top: 4rem;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .name-card__logo { font-size: 3rem; margin-bottom: 0.5rem; }
    .name-card__title { font-size: 1.5rem; margin: 0 0 0.5rem; }
    .name-card__sub { color: rgba(255,255,255,0.6); margin: 0 0 1.5rem; font-size: 0.95rem; }
    .error-card__icon { font-size: 3rem; margin-bottom: 0.5rem; }
    .error-card h2 { margin: 0 0 0.5rem; }
    .error-card p { color: rgba(255,255,255,0.6); margin: 0; }

    .name-form { display: flex; flex-direction: column; gap: 0.75rem; }

    .name-input {
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 6px;
      color: #fff;
      padding: 0.6rem 0.9rem;
      font-size: 1rem;
      width: 100%;
      box-sizing: border-box;
      outline: none;
    }
    .name-input:focus { border-color: rgba(100,181,246,0.5); }

    .btn-secondary {
      background: transparent;
      color: rgba(255,255,255,0.7);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 6px;
      padding: 0.6rem 1.2rem;
      font-size: 0.95rem;
      cursor: pointer;
      width: 100%;
    }
    .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary:hover:not(:disabled) { background: rgba(255,255,255,0.05); }


    .btn-name {
      background: transparent;
      color: rgba(255,255,255,0.55);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 20px;
      padding: 0.2rem 0.7rem;
      font-size: 0.78rem;
      cursor: pointer;
      white-space: nowrap;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .btn-name:hover { border-color: rgba(255,255,255,0.3); color: rgba(255,255,255,0.8); }

    .divider {
      display: flex;
      align-items: center;
      gap: 8px;
      color: rgba(255,255,255,0.3);
      font-size: 0.78rem;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgba(255,255,255,0.1);
    }
    .divider__label { white-space: nowrap; }

    .loading-wrap {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 200px;
    }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: #64b5f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .week-view { max-width: 680px; width: 100%; }

    .week-header {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      margin-bottom: 1.25rem;
    }

    .form-error { color: #f44336; font-size: 0.85rem; margin: 0.25rem 0 0; }

    @media (max-width: 640px) {
      .guest-wrap { padding: 0.75rem 0.5rem; }
      .week-header { margin-bottom: 0.5rem; }
      .name-card, .error-card { margin-top: 1rem; }
    }
  `]
})
export class GuestWowComponent implements OnInit, OnDestroy {
  readonly GUEST_OWNED_ID = GUEST_OWNED_ID;

  private route    = inject(ActivatedRoute);
  private service  = inject(GuestWinOfTheWeekService);
  private auth     = inject(AuthService);
  private wsSvc    = inject(WebSocketService);
  private mobileSvc = inject(MobileService);

  get isMobile() { return this.mobileSvc.isMobile(); }

  guestName    = signal('');
  nameInput    = '';
  week         = signal<GuestWinWeek | null>(null);
  members      = signal<{ id: string; name: string }[]>([]);
  loading      = signal(false);
  tokenInvalid = signal(false);
  showForm     = signal(false);
  submitting   = signal(false);
  votingId     = signal<string | null>(null);
  editingId    = signal<string | null>(null);
  deletingId   = signal<string | null>(null);
  formError    = signal('');

  editForm: { nomineeMemberId: string; title: string; description: string } = { nomineeMemberId: '', title: '', description: '' };
  nomForm:  { nomineeMemberId: string; title: string; description: string } = { nomineeMemberId: '', title: '', description: '' };

  isSpinning      = signal(false);
  spinnerName     = signal('');
  connectedCount  = signal(0);
  activeTimerEndsAt  = signal<string | null>(null);
  hypeBattleEndsAt   = signal<string | null>(null);
  reactionEvents     = signal<{ id: string; nominationId: string; emoji: string }[]>([]);

  readonly adaptedWeek = computed(() => {
    const w = this.week();
    if (!w) return null;
    return { ...adaptToWinWeek(w), connectedMemberCount: this.connectedCount() };
  });

  private token    = '';
  private sessionId = '';
  private wsSub: Subscription | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private expiryCheckInterval: ReturnType<typeof setInterval> | null = null;
  private hypeExpiryCheckInterval: ReturnType<typeof setInterval> | null = null;
  private hypeExpiredWeekId: string | null = null;
  private timerExpiredWeekId: string | null = null;
  private suddenDeathSnapshot: { nominations: GuestNomination[]; tiedNominationIds: string[] } | null = null;

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.sessionId = this.getOrCreateSessionId();

    this.wsSub = this.wsSvc.messages$.subscribe(msg => {
      if (!msg || !this.guestName() || this.tokenInvalid()) return;
      if (msg.type === 'wow_timer_started') {
        this.activeTimerEndsAt.set(msg.data['endsAt'] as string);
      } else if (msg.type === 'wow_timer_stopped') {
        this.activeTimerEndsAt.set(null);
      } else if (msg.type === 'wow_hype_battle_started') {
        this.hypeBattleEndsAt.set(msg.data['endsAt'] as string);
      } else if (msg.type === 'wow_hype_battle_ended') {
        this.hypeBattleEndsAt.set(null);
      } else if (msg.type === 'hype_meter_tapped') {
        const nomId = msg.data['nominationId'] as string;
        const count = msg.data['count'] as number;
        if (nomId && count !== undefined) {
          this.week.update(w => w ? {
            ...w, nominations: w.nominations.map(n => n.id === nomId ? { ...n, hypeMeterCount: count } : n)
          } : w);
        }
      } else if (msg.type === 'reaction_sent') {
        const id = msg.data['id'] as string;
        const nominationId = msg.data['nominationId'] as string;
        const emoji = msg.data['emoji'] as string;
        this.reactionEvents.update(list => [...list.slice(-49), { id, nominationId, emoji }]);
      } else if (msg.type === 'voting_closed') {
        const wk = this.week();
        const snap = this.suddenDeathSnapshot;
        this.suddenDeathSnapshot = null;
        const source = wk?.status === 'SuddenDeath' ? wk : snap ?? null;
        const tiedNoms = source ? source.nominations.filter(n => source.tiedNominationIds.includes(n.id)) : [];
        if (tiedNoms.length > 0) {
          const winner = tiedNoms.find(n => n.id === (msg.data['winnerId'] as string));
          runTieBreakSpin(
            tiedNoms.map(n => n.nomineeName),
            winner?.nomineeName ?? tiedNoms[0].nomineeName,
            n => this.spinnerName.set(n),
            v => this.isSpinning.set(v),
            () => this.refreshWeek()
          );
        } else {
          this.refreshWeek();
        }
      } else if (msg.type === 'presence_changed') {
        const count = msg.data['connectedCount'] as number;
        if (typeof count === 'number') this.connectedCount.set(count);
      } else {
        this.refreshWeek();
      }
    });

    const savedName = localStorage.getItem(nameKey(this.token)) ?? '';
    if (savedName) {
      this.guestName.set(savedName);
      this.loadWeek();
    }
  }

  ngOnDestroy() {
    this.wsSub?.unsubscribe();
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.expiryCheckInterval) clearInterval(this.expiryCheckInterval);
    if (this.hypeExpiryCheckInterval) clearInterval(this.hypeExpiryCheckInterval);
  }

  login() { this.auth.login('/fun/win-of-the-week'); }

  changeName() {
    localStorage.removeItem(nameKey(this.token));
    this.guestName.set('');
    this.nameInput = '';
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.expiryCheckInterval) clearInterval(this.expiryCheckInterval);
    if (this.hypeExpiryCheckInterval) clearInterval(this.hypeExpiryCheckInterval);
  }

  saveName() {
    const name = this.nameInput.trim();
    if (!name) return;
    localStorage.setItem(nameKey(this.token), name);
    this.guestName.set(name);
    this.loadWeek();
  }

  submitNomination() {
    if (this.submitting()) return;
    this.formError.set('');
    this.submitting.set(true);
    const request: GuestCreateNominationRequest = {
      guestSessionId: this.sessionId,
      guestName: this.guestName(),
      nomineeMemberId: this.nomForm.nomineeMemberId,
      title: this.nomForm.title.trim(),
      description: this.nomForm.description.trim() || undefined
    };
    this.service.createNomination(this.token, request).subscribe({
      next: () => { this.submitting.set(false); this.showForm.set(false); this.resetForm(); this.refreshWeek(); },
      error: (err) => { this.submitting.set(false); this.formError.set(err.error?.error ?? 'Failed to submit nomination.'); }
    });
  }

  cancelForm() { this.showForm.set(false); this.resetForm(); }

  startEdit(nom: WowNominationDisplay) {
    this.editingId.set(nom.id);
    this.editForm = { nomineeMemberId: nom.nomineeMemberId, title: nom.title, description: nom.description ?? '' };
    this.formError.set('');
  }

  cancelEdit() { this.editingId.set(null); this.formError.set(''); }

  saveEdit(nominationId: string) {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.formError.set('');
    this.service.updateNomination(this.token, nominationId, this.sessionId, {
      nomineeMemberId: this.editForm.nomineeMemberId,
      title: this.editForm.title.trim(),
      description: this.editForm.description.trim() || undefined
    }).subscribe({
      next: () => { this.submitting.set(false); this.editingId.set(null); this.refreshWeek(); },
      error: (err) => { this.submitting.set(false); this.formError.set(err.error?.error ?? 'Failed to save.'); }
    });
  }

  deleteNomination(nominationId: string) {
    if (this.deletingId()) return;
    this.deletingId.set(nominationId);
    this.service.deleteNomination(this.token, nominationId, this.sessionId).subscribe({
      next: () => { this.deletingId.set(null); this.refreshWeek(); },
      error: () => { this.deletingId.set(null); }
    });
  }

  vote(nominationId: string) {
    if (this.votingId()) return;
    this.votingId.set(nominationId);
    this.service.vote(this.token, nominationId, this.sessionId).subscribe({
      next: () => { this.votingId.set(null); this.refreshWeek(); },
      error: () => { this.votingId.set(null); }
    });
  }

  removeVote(nominationId: string) {
    if (this.votingId()) return;
    this.votingId.set(nominationId);
    this.service.removeVote(this.token, nominationId, this.sessionId).subscribe({
      next: () => { this.votingId.set(null); this.refreshWeek(); },
      error: () => { this.votingId.set(null); }
    });
  }

  tapHype(nominationId: string) {
    this.service.incrementHype(this.token, nominationId).subscribe({ error: () => {} });
  }

  sendReaction(event: { nominationId: string; emoji: string }) {
    this.service.sendReaction(event.nominationId, event.emoji).subscribe({ error: () => {} });
  }

  applyPowerUp(event: { nominationId: string; type: string }) {
    this.service.applyPowerUp(this.token, event.nominationId, this.sessionId, event.type).subscribe({
      next: () => this.refreshWeek(),
      error: () => {}
    });
  }

  applyChaosCard(event: { nominationId: string; type: string }) {
    this.service.applyChaosCard(this.token, event.nominationId, this.sessionId, event.type).subscribe({
      next: () => this.refreshWeek(),
      error: () => {}
    });
  }

  private loadWeek() {
    this.loading.set(true);
    this.service.getWeek(this.token, this.sessionId).subscribe({
      next: (week) => {
        this.updateWeek(week);
        this.loading.set(false);
        if (this.members().length === 0) this.loadMembers();
        this.wsSvc.connect();
        const connSub = this.wsSvc.connected$.subscribe(connected => {
          if (connected) { this.wsSvc.send({ type: 'join_wow', sessionKey: this.token }); connSub.unsubscribe(); }
        });
      },
      error: () => { this.tokenInvalid.set(true); this.loading.set(false); }
    });
  }

  private refreshWeek() {
    clearCacheForPattern('/api/v1/guest/wow');
    this.service.getWeek(this.token, this.sessionId).subscribe({
      next: (week) => this.updateWeek(week),
      error: () => {
        if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
      }
    });
  }

  private updateWeek(week: GuestWinWeek) {
    this.week.set(week);
    this.hypeBattleEndsAt.set(week.hypeBattleEndsAt);
    if (week.status === 'SuddenDeath') {
      this.suddenDeathSnapshot = { nominations: week.nominations, tiedNominationIds: week.tiedNominationIds };
    }
    this.syncPoll(week);
    this.syncHypeExpiry(week);
  }

  private syncHypeExpiry(week: GuestWinWeek) {
    if (!week.hypeBattleEndsAt) {
      if (this.hypeExpiryCheckInterval) { clearInterval(this.hypeExpiryCheckInterval); this.hypeExpiryCheckInterval = null; }
      return;
    }
    if (this.hypeExpiryCheckInterval) clearInterval(this.hypeExpiryCheckInterval);
    const endsAt = new Date(week.hypeBattleEndsAt).getTime();
    this.hypeExpiryCheckInterval = setInterval(() => {
      if (this.hypeExpiredWeekId === week.id) return;
      if (Date.now() >= endsAt) {
        this.hypeExpiredWeekId = week.id;
        if (this.hypeExpiryCheckInterval) { clearInterval(this.hypeExpiryCheckInterval); this.hypeExpiryCheckInterval = null; }
        setTimeout(() => this.refreshWeek(), 1500);
      }
    }, 1000);
  }

  private syncPoll(week: GuestWinWeek) {
    if (week.status === 'SuddenDeath' && week.suddenDeathEndsAt) {
      if (this.pollInterval) clearInterval(this.pollInterval);
      this.pollInterval = setInterval(() => this.refreshWeek(), 5000);

      if (this.expiryCheckInterval) clearInterval(this.expiryCheckInterval);
      const endsAt = new Date(week.suddenDeathEndsAt).getTime();
      this.expiryCheckInterval = setInterval(() => {
        if (this.timerExpiredWeekId === week.id) return;
        if (Date.now() >= endsAt) {
          this.timerExpiredWeekId = week.id;
          if (this.expiryCheckInterval) { clearInterval(this.expiryCheckInterval); this.expiryCheckInterval = null; }
          setTimeout(() => this.refreshWeek(), 1500);
        }
      }, 1000);
    } else {
      if (this.expiryCheckInterval) { clearInterval(this.expiryCheckInterval); this.expiryCheckInterval = null; }
      if (this.pollInterval) clearInterval(this.pollInterval);
      this.pollInterval = setInterval(() => this.refreshWeek(), 30000);
    }
  }

  private loadMembers() {
    this.service.getMembers(this.token).subscribe({ next: (m) => this.members.set(m) });
  }

  private resetForm() {
    this.nomForm = { nomineeMemberId: '', title: '', description: '' };
    this.formError.set('');
  }

  private getOrCreateSessionId(): string {
    const key = `${SESSION_ID_KEY}_${this.token}`;
    let id = sessionStorage.getItem(key);
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(key, id); }
    return id;
  }
}
