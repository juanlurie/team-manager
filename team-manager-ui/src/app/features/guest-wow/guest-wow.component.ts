import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { GuestWinOfTheWeekService } from './guest-wow.service';
import { GuestWinWeek, GuestNomination, GuestCreateNominationRequest } from '../../core/models/win-week.model';
import { AuthService } from '../../core/auth/auth.service';

const SESSION_NAME_KEY = 'wow_guest_name';
const SESSION_ID_KEY = 'wow_guest_session_id';

@Component({
  selector: 'app-guest-wow',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  template: `
    <div class="guest-wrap" [class.sudden-death]="isSuddenDeath()">
      <!-- Name capture screen -->
      @if (!guestName()) {
        <div class="name-card">
          <div class="name-card__logo">🏆</div>
          <h2 class="name-card__title">Win of the Week</h2>
          <p class="name-card__sub">Sign in with your account for the full experience, or continue as a guest.</p>

          <button class="btn-primary" type="button" (click)="login()" style="width:100%;margin-bottom:16px">
            Sign In
          </button>

          <div class="divider">
            <span class="divider__label">or continue as guest</span>
          </div>

          <form (ngSubmit)="saveName()" class="name-form" style="margin-top:16px">
            <input
              class="name-input"
              type="text"
              placeholder="Your name"
              [(ngModel)]="nameInput"
              name="guestName"
              maxlength="100"
            />
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
        <div class="loading-wrap">
          <div class="spinner"></div>
        </div>
      }

      <!-- Week view -->
      @if (guestName() && !tokenInvalid() && !loading() && week()) {
        <div class="week-view">
          <div class="week-header">
            <div class="week-header__left">
              <span class="phase-badge" [style.background]="phaseBg()" [style.color]="phaseColor()">
                {{ phaseLabel() }}
              </span>
              <span class="week-label">Week of {{ formatDate(week()!.weekStart) }}</span>
            </div>
            <div class="week-header__right">
              <span class="guest-tag">Guest View</span>
              <button class="btn-login" type="button" (click)="login()">Sign In</button>
            </div>
          </div>

          <!-- Winner banner -->
          @if (week()!.status === 'Closed' && week()!.winnerNomineeName) {
            <div class="winner-banner">
              <div class="winner-banner__trophy">🏆</div>
              <div>
                <div class="winner-banner__name">{{ week()!.winnerNomineeName }}</div>
                <div class="winner-banner__title">{{ week()!.winnerTitle }}</div>
              </div>
            </div>
            @if (week()!.winnerStory) {
              <div class="winner-story">{{ week()!.winnerStory }}</div>
            }
          }

          <!-- Nominate button -->
          @if (week()!.isNominatingOpen && week()!.userNominationsRemaining > 0) {
            <div class="nominate-bar">
              <button class="btn-primary" (click)="showForm.set(true)" [disabled]="showForm()">
                + Nominate a Win
              </button>
            </div>
          }

          <!-- Nomination form -->
          @if (showForm()) {
            <div class="nom-form-card">
              <h3 class="nom-form-card__title">Submit a Nomination</h3>
              <form (ngSubmit)="submitNomination()">
                <label class="field-label">Nominee</label>
                <select class="field-input" [(ngModel)]="nomForm.nomineeMemberId" name="nominee" required>
                  <option value="">Select a team member…</option>
                  @for (m of members(); track m.id) {
                    <option [value]="m.id">{{ m.name }}</option>
                  }
                </select>

                <label class="field-label">Title / Achievement</label>
                <input
                  class="field-input"
                  type="text"
                  [(ngModel)]="nomForm.title"
                  name="title"
                  maxlength="200"
                  placeholder="What did they do?"
                  required
                />

                <label class="field-label">Description (optional)</label>
                <textarea
                  class="field-input field-textarea"
                  [(ngModel)]="nomForm.description"
                  name="description"
                  maxlength="2000"
                  placeholder="More details…"
                  rows="3"
                ></textarea>

                <div class="nom-form-card__actions">
                  <button type="button" class="btn-secondary" (click)="cancelForm()">Cancel</button>
                  <button
                    type="submit"
                    class="btn-primary"
                    [disabled]="submitting() || !nomForm.nomineeMemberId || !nomForm.title.trim()"
                  >
                    {{ submitting() ? 'Submitting…' : 'Submit' }}
                  </button>
                </div>

                @if (formError()) {
                  <p class="form-error">{{ formError() }}</p>
                }
              </form>
            </div>
          }

          <!-- Already nominated -->
          @if (week()!.isNominatingOpen && week()!.userNominationsRemaining === 0 && !showForm() && !editingId()) {
            <p class="already-nominated">You have already submitted a nomination this week.</p>
          }

          <!-- Sudden death banner -->
          @if (isSuddenDeath()) {
            <div class="sudden-death-banner">
              <span class="sudden-death-banner__icon">⚡</span>
              <span>Tie-Breaker — 1 vote only!</span>
            </div>
          }

          <!-- Nominations list -->
          @if (week()!.nominations.length === 0) {
            <p class="empty-state">No nominations yet — be the first!</p>
          }

          @if (week()!.isVotingOpen) {
            <p class="votes-remaining">
              Votes remaining: <strong>{{ week()!.userVotesRemaining }}</strong>
              @if (isSuddenDeath()) { (tie-breaker — 1 vote) }
              @else { /3 }
            </p>
          }

          @for (nom of week()!.nominations; track nom.id) {
            <div class="nom-card" [class.nom-card--voted]="nom.hasVoted" [class.nom-card--sudden-death]="isSuddenDeath()" [class.nom-card--tied]="tiedNomIds().has(nom.id)">
              <!-- Inline edit form -->
              @if (editingId() === nom.id) {
                <div class="nom-edit-form">
                  <label class="field-label">Nominee</label>
                  <select class="field-input" [(ngModel)]="editForm.nomineeMemberId" name="edit-nominee">
                    <option value="">Select a team member…</option>
                    @for (m of members(); track m.id) {
                      <option [value]="m.id">{{ m.name }}</option>
                    }
                  </select>
                  <label class="field-label">Title / Achievement</label>
                  <input class="field-input" type="text" [(ngModel)]="editForm.title" name="edit-title" maxlength="200" />
                  <label class="field-label">Description (optional)</label>
                  <textarea class="field-input field-textarea" [(ngModel)]="editForm.description" name="edit-desc" maxlength="2000" rows="2"></textarea>
                  <div class="nom-form-card__actions">
                    <button type="button" class="btn-secondary" (click)="cancelEdit()">Cancel</button>
                    <button type="button" class="btn-primary" (click)="saveEdit(nom.id)" [disabled]="submitting() || !editForm.nomineeMemberId || !editForm.title.trim()">
                      {{ submitting() ? 'Saving…' : 'Save' }}
                    </button>
                  </div>
                  @if (formError()) { <p class="form-error">{{ formError() }}</p> }
                </div>
              } @else {
                <div class="nom-card__header">
                  <span class="nom-card__nominee">{{ nom.nomineeName }}</span>
                  @if (week()!.status !== 'Nominating') {
                    <span class="nom-card__votes">{{ nom.voteCount }} vote{{ nom.voteCount !== 1 ? 's' : '' }}</span>
                  }
                </div>
                <div class="nom-card__title">{{ nom.title }}</div>
                @if (nom.description) {
                  <div class="nom-card__desc">{{ nom.description }}</div>
                }
                <div class="nom-card__footer">
                  <span class="nom-card__by">Nominated by {{ nom.nominatorDisplayName }}</span>
                  <div class="nom-card__actions">
                    @if (nom.isOwned && week()!.isNominatingOpen) {
                      <button class="btn-icon" title="Edit" (click)="startEdit(nom)"><mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px">edit</mat-icon></button>
                      <button class="btn-icon btn-icon--danger" title="Delete" (click)="deleteNomination(nom.id)" [disabled]="deletingId() === nom.id"><mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px">delete</mat-icon></button>
                    }
                    @if (week()!.isVotingOpen) {
                      @if (nom.hasVoted) {
                        <button class="btn-voted" (click)="removeVote(nom.id)" [disabled]="votingId() === nom.id">✓ Voted</button>
                      } @else if (week()!.userVotesRemaining > 0) {
                        <button class="btn-vote" (click)="vote(nom.id)" [disabled]="votingId() === nom.id">Vote</button>
                      }
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
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
    .name-input:focus, .field-input:focus {
      border-color: rgba(255,215,0,0.5);
    }
    .field-textarea { resize: vertical; min-height: 80px; }

    select.field-input option { background: #1e1e1e; }

    .btn-primary {
      background: #FFD700;
      color: #121212;
      border: none;
      border-radius: 6px;
      padding: 0.6rem 1.2rem;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      transition: opacity 0.2s;
    }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary:hover:not(:disabled) { opacity: 0.85; }

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

    .week-view {
      max-width: 640px;
      width: 100%;
    }

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
    .guest-tag {
      font-size: 0.75rem;
      color: rgba(255,255,255,0.35);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 20px;
      padding: 0.15rem 0.6rem;
    }

    .winner-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: rgba(255,215,0,0.1);
      border: 1px solid rgba(255,215,0,0.3);
      border-radius: 10px;
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;
    }
    .winner-banner__trophy { font-size: 2rem; }
    .winner-banner__name { font-size: 1.1rem; font-weight: 700; color: #FFD700; }
    .winner-banner__title { color: rgba(255,255,255,0.7); font-size: 0.9rem; }

    .winner-story {
      background: rgba(255,255,255,0.04);
      border-radius: 8px;
      padding: 1rem 1.25rem;
      color: rgba(255,255,255,0.75);
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 1rem;
      white-space: pre-line;
    }

    .nominate-bar { margin-bottom: 1rem; }

    .already-nominated {
      color: rgba(255,255,255,0.45);
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }

    .nom-form-card {
      background: #1e1e1e;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 1.25rem;
      margin-bottom: 1.25rem;
    }
    .nom-form-card__title { margin: 0 0 1rem; font-size: 1rem; }
    .nom-form-card__actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.75rem; }

    .field-label {
      display: block;
      font-size: 0.8rem;
      color: rgba(255,255,255,0.5);
      margin: 0.75rem 0 0.25rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .form-error {
      color: #f44336;
      font-size: 0.85rem;
      margin: 0.5rem 0 0;
    }

    .empty-state {
      color: rgba(255,255,255,0.4);
      text-align: center;
      padding: 2rem 0;
    }

    .nom-card {
      background: #1e1e1e;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      padding: 1rem 1.25rem;
      margin-bottom: 0.75rem;
    }
    .nom-card__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.25rem;
    }
    .nom-card__nominee { font-weight: 700; font-size: 1rem; }
    .nom-card__votes { font-size: 0.85rem; color: rgba(255,255,255,0.5); }
    .nom-card__title { color: rgba(255,255,255,0.85); font-size: 0.95rem; margin-bottom: 0.25rem; }
    .nom-card__desc { color: rgba(255,255,255,0.55); font-size: 0.88rem; margin-bottom: 0.25rem; }
    .nom-card__footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.25rem;
    }
    .nom-card__by { font-size: 0.78rem; color: rgba(255,255,255,0.35); }

    .nom-card--voted {
      border-color: rgba(76,175,80,0.35);
    }

    .btn-vote {
      background: transparent;
      border: 1px solid rgba(255,215,0,0.5);
      color: #FFD700;
      border-radius: 6px;
      padding: 0.25rem 0.75rem;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }
    .btn-vote:hover:not(:disabled) { background: rgba(255,215,0,0.1); }
    .btn-vote:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-voted {
      background: rgba(76,175,80,0.15);
      border: 1px solid rgba(76,175,80,0.4);
      color: #4caf50;
      border-radius: 6px;
      padding: 0.25rem 0.75rem;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-voted:disabled { opacity: 0.7; }

    .votes-remaining {
      font-size: 0.88rem;
      color: rgba(255,255,255,0.55);
      margin-bottom: 0.75rem;
    }
    .votes-remaining strong { color: #fff; }

    .sudden-death-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(244,67,54,0.12);
      border: 1px solid rgba(244,67,54,0.4);
      border-radius: 8px;
      padding: 0.6rem 1rem;
      color: #f44336;
      font-weight: 700;
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }
    .sudden-death-banner__icon { font-size: 1.1rem; }

    .nom-card--sudden-death {
      border-color: rgba(244,67,54,0.25);
    }

    .nom-card--tied {
      border-color: rgba(255,87,34,0.4);
      background: rgba(255,87,34,0.06);
    }

    .nom-card__actions {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .btn-icon {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 0.9rem;
      padding: 0.2rem 0.3rem;
      border-radius: 4px;
      opacity: 0.6;
      transition: opacity 0.15s;
      display: inline-flex;
      align-items: center;
      color: inherit;
    }
    .btn-icon:hover { opacity: 1; }
    .btn-icon:disabled { opacity: 0.3; cursor: not-allowed; }
    .btn-icon--danger:hover { background: rgba(244,67,54,0.15); }

    .nom-edit-form { padding: 0.25rem 0; }
  `]
})
export class GuestWowComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private service = inject(GuestWinOfTheWeekService);
  private auth = inject(AuthService);

  guestName = signal('');
  nameInput = '';
  week = signal<GuestWinWeek | null>(null);
  members = signal<{ id: string; name: string }[]>([]);
  loading = signal(false);
  tokenInvalid = signal(false);
  showForm = signal(false);
  submitting = signal(false);
  votingId = signal<string | null>(null);
  editingId = signal<string | null>(null);
  deletingId = signal<string | null>(null);
  formError = signal('');

  editForm: { nomineeMemberId: string; title: string; description: string } = {
    nomineeMemberId: '', title: '', description: ''
  };

  nomForm: { nomineeMemberId: string; title: string; description: string } = {
    nomineeMemberId: '',
    title: '',
    description: ''
  };

  private token = '';
  private sessionId = '';
  private ws: WebSocket | null = null;
  private wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.sessionId = this.getOrCreateSessionId();
    const savedName = localStorage.getItem(SESSION_NAME_KEY) ?? '';
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
  }

  login() {
    this.auth.login();
  }

  saveName() {
    const name = this.nameInput.trim();
    if (!name) return;
    localStorage.setItem(SESSION_NAME_KEY, name);
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
      next: () => {
        this.submitting.set(false);
        this.showForm.set(false);
        this.resetForm();
        this.loadWeek();
      },
      error: (err) => {
        this.submitting.set(false);
        this.formError.set(err.error?.error ?? 'Failed to submit nomination.');
      }
    });
  }

  cancelForm() {
    this.showForm.set(false);
    this.resetForm();
  }

  startEdit(nom: GuestNomination) {
    this.editingId.set(nom.id);
    this.editForm = { nomineeMemberId: nom.nomineeMemberId, title: nom.title, description: nom.description ?? '' };
    this.formError.set('');
  }

  cancelEdit() {
    this.editingId.set(null);
    this.formError.set('');
  }

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

  isSuddenDeath() {
    return this.week()?.status === 'SuddenDeath';
  }

  tiedNomIds(): Set<string> {
    const w = this.week();
    if (!w || w.nominations.length === 0) return new Set();
    if (w.status === 'SuddenDeath') return new Set(w.nominations.map(n => n.id));
    if (w.status === 'Voting') {
      const maxVotes = Math.max(...w.nominations.map(n => n.voteCount));
      if (maxVotes > 0 && w.nominations.filter(n => n.voteCount === maxVotes).length > 1)
        return new Set(w.nominations.filter(n => n.voteCount === maxVotes).map(n => n.id));
    }
    return new Set();
  }

  phaseLabel() {
    switch (this.week()?.status) {
      case 'Nominating': return 'Nominations Open';
      case 'Voting': return 'Voting Open';
      case 'SuddenDeath': return 'Tie-Breaker';
      case 'Closed': return 'Closed';
      default: return '';
    }
  }

  phaseColor() {
    switch (this.week()?.status) {
      case 'Nominating': return '#FFD700';
      case 'Voting': return '#4caf50';
      case 'SuddenDeath': return '#f44336';
      default: return '#fff';
    }
  }

  phaseBg() {
    switch (this.week()?.status) {
      case 'Nominating': return 'rgba(255,215,0,0.15)';
      case 'Voting': return 'rgba(76,175,80,0.15)';
      case 'SuddenDeath': return 'rgba(244,67,54,0.15)';
      default: return 'rgba(255,255,255,0.08)';
    }
  }

  formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    const wowEvents = new Set([
      'nomination_created', 'nomination_updated', 'nomination_deleted',
      'vote_cast', 'vote_removed',
      'voting_opened', 'voting_closed',
      'nominations_reopened', 'sudden_death_started', 'win_story_ready'
    ]);

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (wowEvents.has(msg.type)) this.refreshWeek();
      } catch { /* ignore */ }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.wsReconnectTimer = setTimeout(() => this.connectWebSocket(), 3000);
    };
  }

  private loadWeek() {
    this.loading.set(true);
    this.service.getWeek(this.token, this.sessionId).subscribe({
      next: (week) => {
        this.week.set(week);
        this.loading.set(false);
        if (this.members().length === 0) {
          this.loadMembers();
        }
        if (!this.ws) {
          this.connectWebSocket();
          // Fallback poll in case WS drops
          this.pollInterval = setInterval(() => this.refreshWeek(), 30000);
        }
      },
      error: () => {
        this.tokenInvalid.set(true);
        this.loading.set(false);
      }
    });
  }

  private refreshWeek() {
    this.service.getWeek(this.token, this.sessionId).subscribe({
      next: (week) => this.week.set(week),
      error: () => {
        if (this.pollInterval) {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
        }
      }
    });
  }

  private loadMembers() {
    this.service.getMembers(this.token).subscribe({
      next: (members) => this.members.set(members)
    });
  }

  private resetForm() {
    this.nomForm = { nomineeMemberId: '', title: '', description: '' };
    this.formError.set('');
  }

  private getOrCreateSessionId(): string {
    let id = localStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  }
}
