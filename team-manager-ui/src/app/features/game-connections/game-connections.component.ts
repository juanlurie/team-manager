import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GameConnectionsService } from '../../core/services/game-connections.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { ConnectionsEvent, CONNECTIONS_EVENT_TYPES } from '../../core/websocket/events/games.events';
import { FeatureAccessService } from '../../core/services/feature-access.service';
import { NavService } from '../../core/nav/nav.service';
import { GameConnectionsSession, GameConnectionsSessionSummary } from '../../core/models/game-connections.model';

const DIFFICULTY_COLORS: Record<number, string> = {
  0: '#f9df6d', // yellow
  1: '#a0c35a', // green
  2: '#b0c4ef', // blue
  3: '#ba81c5', // purple
};

@Component({
  selector: 'app-game-connections',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatSnackBarModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="page" [class.immersive]="nav.hideNav()">

      @if (!session()) {
        <!-- ── LOBBY ── -->
        <div class="lobby-header">
          <mat-icon class="lobby-icon">grid_view</mat-icon>
          <div>
            <h2 class="lobby-title">Connections</h2>
            <span class="lobby-sub">Find groups of four related words, together</span>
          </div>
          <button class="help-btn" (click)="showRules = !showRules" [class.active]="showRules" title="How to play">?</button>
          @if (canHost()) {
            <button class="create-btn" (click)="showCreate = !showCreate" [class.active]="showCreate">
              <mat-icon>add</mat-icon> New Game
            </button>
          }
        </div>

        @if (showRules) {
          <div class="rules-panel">
            <div class="rules-title">How to play Connections</div>
            <ul class="rules-list">
              <li>16 words are hidden in <strong>4 groups of 4</strong>. Find the group each word belongs to.</li>
              <li>Select exactly <strong>4 words</strong> and hit <strong>Submit</strong>.</li>
              <li>A correct group is revealed for everyone, color-coded by difficulty (<strong>yellow</strong> = easiest, <strong>purple</strong> = trickiest).</li>
              <li>Wrong guesses cost the team one of <strong>4 shared mistakes</strong> — anyone can guess, so play together.</li>
              <li>Run out of mistakes before finding all 4 groups and the puzzle is revealed.</li>
            </ul>
          </div>
        }

        @if (showCreate) {
          <div class="create-form">
            <input class="title-input" placeholder="Game title (optional)" [(ngModel)]="newTitle" />
            <div class="form-actions">
              <button class="cancel-btn" (click)="showCreate = false">Cancel</button>
              <button class="save-btn" (click)="createGame()" [disabled]="creating()">
                {{ creating() ? 'Creating…' : 'Create' }}
              </button>
            </div>
          </div>
        }

        @if (loading()) {
          <div class="loading"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>
        } @else if (sessions().length === 0) {
          <div class="empty-state">
            <mat-icon>grid_view</mat-icon>
            <p>No open games</p>
            @if (canHost()) { <p class="hint">Create one above to get started.</p> }
          </div>
        } @else {
          <div class="session-list">
            @for (s of sessions(); track s.id) {
              <div class="session-card" (click)="openSession(s.id)">
                <div class="sc-icon">CX</div>
                <div class="sc-info">
                  <div class="sc-title">{{ s.title || 'Untitled Game' }}</div>
                  <div class="sc-meta">by {{ s.createdByName }} · {{ s.playerCount }} player{{ s.playerCount !== 1 ? 's' : '' }}</div>
                </div>
                <span class="sc-status" [class]="s.status">{{ s.status === 'waiting' ? 'Waiting' : 'In progress' }}</span>
              </div>
            }
          </div>
        }

      } @else {
        <!-- ── GAME ── -->
        @let s = session()!;
        <div class="game-wrap">

          <div class="game-header">
            <button class="back-btn" (click)="backToLobby()"><mat-icon>arrow_back</mat-icon></button>
            <span class="game-title">{{ s.title || 'Connections' }}</span>
            <button class="help-btn" (click)="showRules = !showRules" [class.active]="showRules" title="How to play">?</button>
          </div>

          @if (showRules) {
            <div class="rules-panel">
              <div class="rules-title">How to play Connections</div>
              <ul class="rules-list">
                <li>16 words are hidden in <strong>4 groups of 4</strong>. Find the group each word belongs to.</li>
                <li>Select exactly <strong>4 words</strong> and hit <strong>Submit</strong>.</li>
                <li>A correct group is revealed for everyone, color-coded by difficulty (<strong>yellow</strong> = easiest, <strong>purple</strong> = trickiest).</li>
                <li>Wrong guesses cost the team one of <strong>4 shared mistakes</strong> — anyone can guess, so play together.</li>
              </ul>
            </div>
          }

          <!-- Waiting room -->
          @if (s.status === 'waiting') {
            <div class="status-bar">
              @if (s.isCreator) {
                <span>Waiting to start ({{ s.participants.length }} joined)…</span>
                @if (!alreadyJoined()) {
                  <button class="action-btn" (click)="joinGame()" [disabled]="joining()">Join</button>
                }
                <button class="action-btn primary" (click)="startGame()" [disabled]="starting()">
                  {{ starting() ? 'Starting…' : 'Start Game' }}
                </button>
              } @else if (!alreadyJoined()) {
                <span>Waiting to start…</span>
                <button class="action-btn primary" (click)="joinGame()" [disabled]="joining()">
                  {{ joining() ? 'Joining…' : 'Join Game' }}
                </button>
              } @else {
                <span>Waiting for the host to start ({{ s.participants.length }} joined)</span>
              }
            </div>
            <div class="player-list">
              @for (p of s.participants; track p.id) {
                <span class="player-chip">{{ p.displayName }}{{ p.isMe ? ' (you)' : '' }}</span>
              }
            </div>
          } @else {
            <!-- Mistakes indicator -->
            <div class="mistakes-row">
              <span class="mistakes-label">Mistakes remaining</span>
              @for (i of [0, 1, 2, 3]; track i) {
                <span class="mistake-dot" [class.used]="i < s.mistakesUsed"></span>
              }
            </div>

            <!-- Solved / revealed groups -->
            @if (s.solvedGroups.length > 0) {
              <div class="solved-stack">
                @for (g of s.solvedGroups; track g.groupIndex) {
                  <div class="solved-row" [class.revealed]="g.wasRevealed" [style.background]="difficultyColor(g.difficulty)">
                    <span class="solved-label">{{ g.label }}</span>
                    <span class="solved-words">{{ (g.words ?? []).join(', ') }}</span>
                  </div>
                }
              </div>
            }

            @if (s.status === 'inprogress') {
              <!-- Tile grid -->
              <div class="tile-grid">
                @for (idx of remainingIndices(); track idx) {
                  <button class="tile" [class.selected]="selectedIndices().has(idx)" [class.shaking]="shakeIndices().has(idx)"
                          [disabled]="submitting()" (click)="toggleTile(idx)">
                    {{ s.words[idx] }}
                  </button>
                }
              </div>

              <div class="controls-row">
                <button class="action-btn" (click)="shuffle()">Shuffle</button>
                <button class="action-btn" (click)="deselectAll()" [disabled]="selectedIndices().size === 0">Deselect all</button>
                <button class="action-btn primary" (click)="submitGuess()" [disabled]="!canSubmit()">
                  {{ submitting() ? 'Submitting…' : 'Submit' }}
                </button>
              </div>
            } @else {
              <div class="end-banner" [class.won]="s.status === 'won'" [class.lost]="s.status === 'lost'">
                @if (s.status === 'won') {
                  <mat-icon>emoji_events</mat-icon> Solved it — {{ s.mistakesUsed }} mistake{{ s.mistakesUsed !== 1 ? 's' : '' }}!
                } @else {
                  <mat-icon>sentiment_dissatisfied</mat-icon> Out of guesses — here's the answer
                }
              </div>
            }
          }
        </div>
      }

    </div>
  `,
  styles: [`
    .page { max-width: 700px; margin: 0 auto; padding: 12px 12px 80px; }
    .page.immersive { max-width: 100%; padding: 0; }
    .page.immersive .game-wrap { padding: 8px; gap: 8px; }

    /* Lobby (shared visual language with the other games) */
    .lobby-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .lobby-icon { font-size: 30px; width: 30px; height: 30px; color: #64b5f6; }
    .lobby-title { font-size: 1.3rem; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 2px; }
    .lobby-sub { font-size: 0.78rem; color: rgba(255,255,255,0.38); }
    .create-btn { margin-left: auto; display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: rgba(100,181,246,0.12); border: 1px solid rgba(100,181,246,0.35); border-radius: 8px; color: #64b5f6; font-size: 0.82rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.12s; }
    .create-btn:hover, .create-btn.active { background: rgba(100,181,246,0.22); border-color: #64b5f6; }
    .create-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .help-btn { width: 28px; height: 28px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.5); font-size: 0.85rem; font-weight: 700; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; transition: all 0.12s; flex-shrink: 0; }
    .help-btn:hover, .help-btn.active { border-color: #64b5f6; color: #64b5f6; background: rgba(100,181,246,0.1); }
    .rules-panel { background: rgba(100,181,246,0.06); border: 1px solid rgba(100,181,246,0.2); border-radius: 10px; padding: 14px 18px; margin-bottom: 16px; }
    .rules-title { font-size: 0.82rem; font-weight: 700; color: #64b5f6; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }
    .rules-list { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 5px; }
    .rules-list li { font-size: 0.82rem; color: rgba(255,255,255,0.65); line-height: 1.5; }
    .rules-list strong { color: rgba(255,255,255,0.9); }

    .create-form { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px; }
    .title-input { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px 10px; color: rgba(255,255,255,0.85); font-size: 0.85rem; font-family: inherit; outline: none; }
    .title-input:focus { border-color: rgba(100,181,246,0.4); }
    .form-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .cancel-btn { padding: 6px 14px; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: rgba(255,255,255,0.45); font-size: 0.82rem; font-family: inherit; cursor: pointer; }
    .save-btn { padding: 6px 18px; background: rgba(100,181,246,0.15); border: 1px solid rgba(100,181,246,0.4); border-radius: 6px; color: #64b5f6; font-size: 0.82rem; font-weight: 600; font-family: inherit; cursor: pointer; }
    .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .loading { display: flex; justify-content: center; gap: 6px; padding: 48px; }
    .dot { width: 7px; height: 7px; background: rgba(100,181,246,0.5); border-radius: 50%; animation: pulse 1.2s ease-in-out infinite; }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes pulse { 0%,80%,100%{opacity:0.3;transform:scale(0.8)}40%{opacity:1;transform:scale(1)} }

    .empty-state { text-align: center; padding: 60px 20px; color: rgba(255,255,255,0.3); }
    .empty-state mat-icon { font-size: 40px; width: 40px; height: 40px; margin-bottom: 12px; }
    .empty-state p { margin: 0 0 6px; font-size: 0.9rem; }
    .empty-state .hint { font-size: 0.78rem; color: rgba(255,255,255,0.2); }

    .session-list { display: flex; flex-direction: column; gap: 8px; }
    .session-card { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; cursor: pointer; transition: all 0.12s; }
    .session-card:hover { background: rgba(255,255,255,0.06); border-color: rgba(100,181,246,0.2); }
    .sc-icon { width: 42px; height: 42px; background: rgba(100,181,246,0.12); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.68rem; font-weight: 900; color: #64b5f6; flex-shrink: 0; letter-spacing: -0.5px; }
    .sc-info { flex: 1; min-width: 0; }
    .sc-title { font-size: 0.9rem; font-weight: 600; color: rgba(255,255,255,0.85); }
    .sc-meta { font-size: 0.75rem; color: rgba(255,255,255,0.35); margin-top: 2px; }
    .sc-status { font-size: 0.72rem; font-weight: 600; padding: 3px 8px; border-radius: 10px; }
    .sc-status.waiting { background: rgba(100,181,246,0.12); color: #64b5f6; }
    .sc-status.inprogress { background: rgba(255,167,38,0.12); color: #ffa726; }

    /* Game */
    .game-wrap { display: flex; flex-direction: column; gap: 14px; }
    .game-header { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .back-btn { background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 6px; cursor: pointer; color: rgba(255,255,255,0.55); display: flex; align-items: center; transition: all 0.12s; }
    .back-btn:hover { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.8); }
    .back-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .game-title { font-size: 1rem; font-weight: 700; color: rgba(255,255,255,0.85); }

    .status-bar { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; font-size: 0.82rem; color: rgba(255,255,255,0.55); flex-wrap: wrap; }
    .action-btn { padding: 5px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: rgba(255,255,255,0.7); font-size: 0.8rem; font-family: inherit; cursor: pointer; }
    .action-btn.primary { background: rgba(100,181,246,0.15); border-color: rgba(100,181,246,0.4); color: #64b5f6; font-weight: 600; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .player-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .player-chip { font-size: 0.75rem; color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 3px 10px; }

    .mistakes-row { display: flex; align-items: center; gap: 8px; }
    .mistakes-label { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin-right: 4px; }
    .mistake-dot { width: 10px; height: 10px; border-radius: 50%; background: rgba(255,255,255,0.6); }
    .mistake-dot.used { background: transparent; border: 1.5px solid rgba(255,255,255,0.25); }

    .solved-stack { display: flex; flex-direction: column; gap: 6px; }
    .solved-row {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 2px; border-radius: 8px; padding: 12px; text-align: center;
      animation: solved-in 0.3s ease-out both;
    }
    .solved-row.revealed { opacity: 0.75; }
    @keyframes solved-in { 0% { opacity: 0; transform: scale(0.94); } 100% { opacity: 1; transform: scale(1); } }
    .solved-label { font-size: 0.85rem; font-weight: 800; color: rgba(0,0,0,0.75); letter-spacing: 0.02em; }
    .solved-words { font-size: 0.75rem; font-weight: 600; color: rgba(0,0,0,0.6); }

    .tile-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
    .tile {
      aspect-ratio: 2.1; display: flex; align-items: center; justify-content: center;
      text-align: center; padding: 4px; border-radius: 8px; cursor: pointer;
      background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.85); font-size: 0.78rem; font-weight: 700; letter-spacing: 0.01em;
      font-family: inherit; text-transform: uppercase; transition: all 0.12s;
      min-width: 0; overflow-wrap: anywhere; word-break: break-word;
    }
    .tile:hover:not(:disabled) { background: rgba(255,255,255,0.11); }
    .tile.selected { background: rgba(255,255,255,0.85); color: rgba(0,0,0,0.85); border-color: rgba(255,255,255,0.85); }
    .tile:disabled { cursor: default; }
    .tile.shaking { animation: tile-shake 0.4s; }
    @keyframes tile-shake {
      10%, 90% { transform: translateX(-2px); } 20%, 80% { transform: translateX(3px); }
      30%, 50%, 70% { transform: translateX(-5px); } 40%, 60% { transform: translateX(5px); }
    }

    .controls-row { display: flex; justify-content: center; gap: 10px; }

    .end-banner {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 16px; border-radius: 10px; font-size: 0.95rem; font-weight: 600;
      background: rgba(255,255,255,0.04);
    }
    .end-banner.won { color: #a0c35a; }
    .end-banner.lost { color: rgba(255,255,255,0.5); }
  `]
})
export class GameConnectionsComponent implements OnInit, OnDestroy {
  private svc = inject(GameConnectionsService);
  private ws = inject(WebSocketService);
  private snackBar = inject(MatSnackBar);
  private featureAccess = inject(FeatureAccessService);
  nav = inject(NavService);
  private destroy$ = new Subject<void>();

  sessions = signal<GameConnectionsSessionSummary[]>([]);
  session = signal<GameConnectionsSession | null>(null);
  loading = signal(false);
  creating = signal(false);
  joining = signal(false);
  starting = signal(false);
  submitting = signal(false);

  selectedIndices = signal<Set<number>>(new Set());
  shuffledOrder = signal<number[]>(Array.from({ length: 16 }, (_, i) => i));
  shakeIndices = signal<Set<number>>(new Set());

  showCreate = false;
  showRules = false;
  newTitle = '';

  canHost = computed(() => this.featureAccess.hasAccess('connections-host'));
  alreadyJoined = computed(() => this.session()?.participants.some(p => p.isMe) ?? false);

  remainingIndices = computed(() => {
    const s = this.session();
    if (!s) return [];
    const solvedWordIdx = new Set(s.solvedGroups.flatMap(g => this.wordIndicesFor(g.words)));
    return this.shuffledOrder().filter(i => !solvedWordIdx.has(i));
  });

  canSubmit = computed(() => this.selectedIndices().size === 4 && !this.submitting());

  private wordIndicesFor(words: string[] | null): number[] {
    const s = this.session();
    if (!s || !words) return [];
    return words.map(w => s.words.indexOf(w)).filter(i => i >= 0);
  }

  // The server always returns words in group order (all of group 0, then group 1, ...),
  // which is also the answer -- shuffledOrder is what actually determines tile layout, and
  // it must be randomized the first time each session's words become visible, or the grid
  // just displays the solution. Re-shuffling on every websocket-triggered refetch would be
  // disorienting mid-game, so only randomize once per session id.
  private shuffledForSessionId: string | null = null;

  private applySession(s: GameConnectionsSession): void {
    this.session.set(s);
    if (s.words.length > 0 && this.shuffledForSessionId !== s.id) {
      this.shuffledForSessionId = s.id;
      this.shuffledOrder.set(this.randomOrder(s.words.length));
    }
  }

  private randomOrder(length: number): number[] {
    const arr = Array.from({ length }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  ngOnInit() {
    this.loadSessions();
    this.ws.roomEvents<ConnectionsEvent>(CONNECTIONS_EVENT_TYPES).pipe(takeUntil(this.destroy$)).subscribe(msg => {
      if (msg.type === 'connections_update') {
        const current = this.session();
        if (current) {
          this.svc.getSession(current.id).subscribe(s => this.applySession(s));
        } else {
          this.loadSessions();
        }
      }
    });
  }

  ngOnDestroy() {
    this.nav.hideNav.set(false);
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Lobby / session actions ──────────────────────────────────────────────────

  loadSessions() {
    this.loading.set(true);
    this.svc.getSessions().subscribe({
      next: list => { this.sessions.set(list); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  openSession(id: string) {
    this.loading.set(true);
    this.svc.getSession(id).subscribe({
      next: s => { this.applySession(s); this.loading.set(false); this.nav.hideNav.set(true); },
      error: () => { this.loading.set(false); this.snackBar.open('Failed to load game', 'OK', { duration: 3000 }); },
    });
  }

  backToLobby() {
    this.nav.hideNav.set(false);
    this.session.set(null);
    this.selectedIndices.set(new Set());
    this.loadSessions();
  }

  createGame() {
    this.creating.set(true);
    this.svc.createSession({ title: this.newTitle.trim() || undefined }).subscribe({
      next: s => {
        this.creating.set(false);
        this.showCreate = false;
        this.newTitle = '';
        this.applySession(s);
        this.nav.hideNav.set(true);
      },
      error: () => { this.creating.set(false); this.snackBar.open('Failed to create game', 'OK', { duration: 3000 }); },
    });
  }

  joinGame() {
    const s = this.session();
    if (!s) return;
    this.joining.set(true);
    this.svc.joinSession(s.id).subscribe({
      next: updated => { this.applySession(updated); this.joining.set(false); },
      error: err => { this.joining.set(false); this.snackBar.open(err?.error?.error ?? 'Failed to join game', 'OK', { duration: 3000 }); },
    });
  }

  startGame() {
    const s = this.session();
    if (!s) return;
    this.starting.set(true);
    this.svc.startSession(s.id).subscribe({
      next: updated => { this.applySession(updated); this.starting.set(false); },
      error: err => { this.starting.set(false); this.snackBar.open(err?.error?.error ?? 'Failed to start game', 'OK', { duration: 3000 }); },
    });
  }

  // ── Board interaction ────────────────────────────────────────────────────────

  toggleTile(index: number): void {
    this.selectedIndices.update(cur => {
      const next = new Set(cur);
      if (next.has(index)) next.delete(index);
      else if (next.size < 4) next.add(index);
      return next;
    });
  }

  deselectAll(): void {
    this.selectedIndices.set(new Set());
  }

  shuffle(): void {
    // Reshuffle just the still-visible tiles -- solved ones are filtered out of
    // remainingIndices() regardless of their position in shuffledOrder, so there's no need
    // to preserve or reshuffle their slots.
    const remaining = [...this.remainingIndices()];
    const order = this.randomOrder(remaining.length).map(i => remaining[i]);
    this.shuffledOrder.set(order);
  }

  submitGuess(): void {
    const s = this.session();
    if (!s || !this.canSubmit()) return;
    const indices = [...this.selectedIndices()];
    this.submitting.set(true);
    this.svc.submitGuess(s.id, indices).subscribe({
      next: updated => {
        this.submitting.set(false);
        if (updated.lastGuessResult === 'wrong' || updated.lastGuessResult === 'one_away') {
          this.shakeIndices.set(new Set(indices));
          setTimeout(() => this.shakeIndices.set(new Set()), 400);
          if (updated.lastGuessResult === 'one_away') {
            this.snackBar.open('One away!', undefined, { duration: 1500 });
          }
        }
        this.selectedIndices.set(new Set());
        this.applySession(updated);
      },
      error: err => {
        this.submitting.set(false);
        this.snackBar.open(err?.error?.error ?? 'Failed to submit guess', 'OK', { duration: 3000 });
      },
    });
  }

  difficultyColor(difficulty: number): string {
    return DIFFICULTY_COLORS[difficulty] ?? '#ccc';
  }
}
