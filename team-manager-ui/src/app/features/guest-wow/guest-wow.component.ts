import { Component, OnDestroy, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { GuestWinOfTheWeekService } from './guest-wow.service';
import { GuestWinWeek, GuestNomination, GuestCreateNominationRequest, WowNominationDisplay, WinWeek, WinNomination } from '../../core/models/win-week.model';
import { WinOfTheWeekService } from '../../core/services/win-of-the-week.service';
import { AuthService } from '../../core/auth/auth.service';
import { MobileService } from '../../core/services/mobile.service';
import { WowCurrentWeekComponent } from '../win-of-the-week/wow-current-week.component';
import { WowTieBreakSpinnerComponent } from '../../shared/components/wow-tie-break-spinner/wow-tie-break-spinner.component';
import { AppModalComponent } from '../../shared/components/app-modal/app-modal.component';
import { wowPhaseInfo, runTieBreakSpin } from '../../shared/utils/wow.utils';

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
    currentMemberId: GUEST_OWNED_ID,
    userVotesRemaining: week.userVotesRemaining,
    userNominationsRemaining: week.userNominationsRemaining,
    totalVotesCast: 0,
    activeMemberCount: 0,
    connectedMemberCount: 0,
    tiedNominationIds: week.tiedNominationIds,
    winnerStory: week.winnerStory,
    nominations,
  };
}

@Component({
  selector: 'app-guest-wow',
  standalone: true,
  imports: [FormsModule, MatButtonModule, WowCurrentWeekComponent, WowTieBreakSpinnerComponent, AppModalComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
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
          <!-- Header -->
          <div class="week-header">
            <div class="week-header__left">
              @let phase = phaseInfo();
              <span class="phase-badge" [style.background]="phase.bg" [style.color]="phase.text">{{ phase.label }}</span>
              <span class="week-label">Week of {{ formatDate(week()!.weekStart) }}</span>
            </div>
            <div class="week-header__right">
              <button class="btn-name" type="button" (click)="changeName()" title="Change name">
                👤 {{ guestName() }}
              </button>
              <button class="btn-login" type="button" (click)="login()">Sign In</button>
            </div>
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
            [tokenBalance]="0"
            (nominateClick)="showForm.set(true)"
            (voteClick)="vote($event)"
            (removeVoteClick)="removeVote($event)"
            (editClick)="startEdit($event)"
            (deleteClick)="deleteNomination($event)"
            (hypeClick)="tapHype($event)"
          />
        </div>
      }
    </div>

    <!-- Nominate modal -->
    <app-modal title="Nominate a Win" [show]="showForm()" (closed)="cancelForm()">
      <div style="display:flex;flex-direction:column;gap:10px">
        <label class="field-label">Nominee</label>
        <select class="field-input" [(ngModel)]="nomForm.nomineeMemberId" name="nominee">
          <option value="">Select a team member…</option>
          @for (m of members(); track m.id) { <option [value]="m.id">{{ m.name }}</option> }
        </select>
        <label class="field-label">Title / Achievement</label>
        <input class="field-input" type="text" [(ngModel)]="nomForm.title" name="title" maxlength="200" placeholder="What did they do?" />
        <label class="field-label">Description (optional)</label>
        <textarea class="field-input field-textarea" [(ngModel)]="nomForm.description" name="description" maxlength="2000" placeholder="More details…" rows="3"></textarea>
        @if (formError()) { <p class="form-error">{{ formError() }}</p> }
      </div>
      <ng-container modal-footer>
        <button class="btn-secondary-sm" type="button" (click)="cancelForm()">Cancel</button>
        <button class="btn-primary-sm" type="button" (click)="submitNomination()"
                [disabled]="submitting() || !nomForm.nomineeMemberId || !nomForm.title.trim()">
          {{ submitting() ? 'Submitting…' : 'Submit' }}
        </button>
      </ng-container>
    </app-modal>

    <!-- Edit modal -->
    <app-modal title="Edit Nomination" [show]="!!editingId()" (closed)="cancelEdit()">
      <div style="display:flex;flex-direction:column;gap:10px">
        <label class="field-label">Nominee</label>
        <select class="field-input" [(ngModel)]="editForm.nomineeMemberId" name="edit-nominee">
          <option value="">Select a team member…</option>
          @for (m of members(); track m.id) { <option [value]="m.id">{{ m.name }}</option> }
        </select>
        <label class="field-label">Title / Achievement</label>
        <input class="field-input" type="text" [(ngModel)]="editForm.title" name="edit-title" maxlength="200" />
        <label class="field-label">Description (optional)</label>
        <textarea class="field-input field-textarea" [(ngModel)]="editForm.description" name="edit-desc" maxlength="2000" rows="3"></textarea>
        @if (formError()) { <p class="form-error">{{ formError() }}</p> }
      </div>
      <ng-container modal-footer>
        <button class="btn-secondary-sm" type="button" (click)="cancelEdit()">Cancel</button>
        <button class="btn-primary-sm" type="button" (click)="saveEdit(editingId()!)"
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
      background: #121212;
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
      background: #1e1e1e;
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

    .name-input, .field-input {
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
    .name-input:focus, .field-input:focus { border-color: rgba(255,215,0,0.5); }
    .field-textarea { resize: vertical; min-height: 80px; }
    select.field-input option { background: #1e1e1e; }

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

    .btn-primary-sm {
      background: #FFD700;
      color: #121212;
      border: none;
      border-radius: 6px;
      padding: 0.5rem 1.1rem;
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
    }
    .btn-primary-sm:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary-sm:hover:not(:disabled) { opacity: 0.85; }

    .btn-secondary-sm {
      background: transparent;
      color: rgba(255,255,255,0.7);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 6px;
      padding: 0.5rem 1.1rem;
      font-size: 0.88rem;
      cursor: pointer;
    }
    .btn-secondary-sm:hover { background: rgba(255,255,255,0.05); }

    .btn-login {
      background: #FFD700;
      color: #121212;
      border: none;
      border-radius: 5px;
      padding: 0.3rem 0.75rem;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .btn-login:hover { opacity: 0.85; }

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
      border-top-color: #FFD700;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .week-view { max-width: 680px; width: 100%; }

    .week-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }
    .week-header__left { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
    .week-header__right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

    .phase-badge {
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.2rem 0.6rem;
      border-radius: 20px;
      letter-spacing: 0.03em;
    }
    .week-label { color: rgba(255,255,255,0.5); font-size: 0.9rem; }

    .field-label {
      display: block;
      font-size: 0.8rem;
      color: rgba(255,255,255,0.5);
      margin: 0.25rem 0 0.15rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .form-error { color: #f44336; font-size: 0.85rem; margin: 0.25rem 0 0; }
  `]
})
export class GuestWowComponent implements OnInit, OnDestroy {
  readonly GUEST_OWNED_ID = GUEST_OWNED_ID;

  private route    = inject(ActivatedRoute);
  private service  = inject(GuestWinOfTheWeekService);
  private auth     = inject(AuthService);
  private winSvc   = inject(WinOfTheWeekService);
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

  isSpinning   = signal(false);
  spinnerName  = signal('');

  readonly adaptedWeek = computed(() => {
    const w = this.week();
    return w ? adaptToWinWeek(w) : null;
  });

  private token    = '';
  private sessionId = '';
  private ws: WebSocket | null = null;
  private wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private expiryCheckInterval: ReturnType<typeof setInterval> | null = null;
  private timerExpiredWeekId: string | null = null;
  private suddenDeathSnapshot: { nominations: GuestNomination[]; tiedNominationIds: string[] } | null = null;

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.sessionId = this.getOrCreateSessionId();
    const savedName = localStorage.getItem(nameKey(this.token)) ?? '';
    if (savedName) {
      this.guestName.set(savedName);
      this.loadWeek();
    }
  }

  ngOnDestroy() {
    if (this.wsReconnectTimer) clearTimeout(this.wsReconnectTimer);
    this.ws?.close();
    this.ws = null;
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.expiryCheckInterval) clearInterval(this.expiryCheckInterval);
  }

  login() { this.auth.login('/fun/win-of-the-week'); }

  changeName() {
    localStorage.removeItem(nameKey(this.token));
    this.guestName.set('');
    this.nameInput = '';
    if (this.wsReconnectTimer) clearTimeout(this.wsReconnectTimer);
    this.ws?.close();
    this.ws = null;
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.expiryCheckInterval) clearInterval(this.expiryCheckInterval);
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
    this.winSvc.incrementHypeMeter(nominationId).subscribe({ error: () => {} });
  }

  phaseInfo() { return wowPhaseInfo(this.week()?.status); }

  formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private connectWebSocket() {
    if (this.wsReconnectTimer) { clearTimeout(this.wsReconnectTimer); this.wsReconnectTimer = null; }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'hype_meter_tapped') {
          const nomId = msg.data?.nominationId as string;
          const count = msg.data?.count as number;
          if (nomId && count !== undefined) {
            this.week.update(w => w ? {
              ...w,
              nominations: w.nominations.map(n => n.id === nomId ? { ...n, hypeMeterCount: count } : n)
            } : w);
          }
          return;
        }
        if (msg.type === 'voting_closed') {
          const wk = this.week();
          const snap = this.suddenDeathSnapshot;
          this.suddenDeathSnapshot = null;
          const source = wk?.status === 'SuddenDeath' ? wk : snap ?? null;
          const tiedNoms = source ? source.nominations.filter(n => source.tiedNominationIds.includes(n.id)) : [];
          if (tiedNoms.length > 0) {
            const winner = tiedNoms.find(n => n.id === (msg.data?.winnerId as string));
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
        } else {
          this.refreshWeek();
        }
      } catch { /* ignore */ }
    };

    this.ws.onerror = () => { /* onclose will fire next and schedule reconnect */ };

    this.ws.onclose = () => {
      this.ws = null;
      this.wsReconnectTimer = setTimeout(() => this.connectWebSocket(), 3000);
    };
  }

  private loadWeek() {
    this.loading.set(true);
    this.service.getWeek(this.token, this.sessionId).subscribe({
      next: (week) => {
        this.updateWeek(week);
        this.loading.set(false);
        if (this.members().length === 0) this.loadMembers();
        if (!this.ws) this.connectWebSocket();
      },
      error: () => { this.tokenInvalid.set(true); this.loading.set(false); }
    });
  }

  private refreshWeek() {
    this.service.getWeek(this.token, this.sessionId).subscribe({
      next: (week) => this.updateWeek(week),
      error: () => {
        if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; }
      }
    });
  }

  private updateWeek(week: GuestWinWeek) {
    this.week.set(week);
    if (week.status === 'SuddenDeath') {
      this.suddenDeathSnapshot = { nominations: week.nominations, tiedNominationIds: week.tiedNominationIds };
    }
    this.syncPoll(week);
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
    let id = localStorage.getItem(SESSION_ID_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(SESSION_ID_KEY, id); }
    return id;
  }
}
