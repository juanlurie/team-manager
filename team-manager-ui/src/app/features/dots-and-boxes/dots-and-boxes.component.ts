import { Component, inject, signal, computed, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DotsAndBoxesService } from '../../core/services/dots-and-boxes.service';
import { WebSocketService } from '../../core/websocket/websocket.service';
import { FeatureAccessService } from '../../core/services/feature-access.service';
import { DotsAndBoxesSession, DotsAndBoxesSessionSummary } from '../../core/models/dots-and-boxes.model';

const PLAYER_COLORS = ['#64b5f6', '#ffa726', '#81c784', '#f48fb1'];
const PLAYER_COLORS_DIM = ['rgba(100,181,246,0.18)', 'rgba(255,167,38,0.18)', 'rgba(129,199,132,0.18)', 'rgba(244,143,177,0.18)'];

@Component({
  selector: 'app-dots-and-boxes',
  standalone: true,
  imports: [FormsModule, MatIconModule, MatSnackBarModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="dab-page">

      @if (!session()) {
        <!-- ── LOBBY ── -->
        <div class="lobby-header">
          <mat-icon class="lobby-icon">grid_4x4</mat-icon>
          <div>
            <h2 class="lobby-title">Dots & Boxes</h2>
            <span class="lobby-sub">Claim boxes, outscore your team</span>
          </div>
          @if (canHost()) {
            <button class="create-btn" (click)="showCreate = !showCreate" [class.active]="showCreate">
              <mat-icon>add</mat-icon> New Game
            </button>
          }
        </div>

        @if (showCreate) {
          <div class="create-form">
            <div class="form-row">
              <input class="title-input" placeholder="Game title (optional)" [(ngModel)]="newTitle" />
            </div>
            <div class="form-row size-row">
              <span class="size-label">Grid size</span>
              @for (size of gridSizes; track size) {
                <button class="size-btn" [class.active]="newGridSize === size" (click)="newGridSize = size">
                  {{ size }}×{{ size }}
                </button>
              }
            </div>
            <div class="form-row">
              <label class="ai-toggle" (click)="withAi = !withAi">
                <span class="ai-check" [class.checked]="withAi">
                  @if (withAi) { <mat-icon>check</mat-icon> }
                </span>
                <mat-icon class="ai-icon">smart_toy</mat-icon>
                <span class="ai-label">Play vs AI</span>
              </label>
            </div>
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
            <mat-icon>grid_4x4</mat-icon>
            <p>No open games</p>
            @if (canHost()) { <p class="hint">Create one above to get started.</p> }
          </div>
        } @else {
          <div class="session-list">
            @for (s of sessions(); track s.id) {
              <div class="session-card" (click)="openSession(s.id)">
                <div class="sc-grid">{{ s.gridSize }}×{{ s.gridSize }}</div>
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
            <span class="game-title">{{ s.title || 'Dots & Boxes' }}</span>
          </div>

          <!-- Scoreboard -->
          <div class="scoreboard">
            @for (p of s.participants; track p.id) {
              <div class="player-chip" [class.active-turn]="p.isCurrentTurn" [style.border-color]="playerColor(p.order)">
                @if (p.isAi) {
                  <mat-icon class="player-ai-icon">smart_toy</mat-icon>
                } @else {
                  <span class="player-dot" [style.background]="playerColor(p.order)"></span>
                }
                <span class="player-name">{{ p.displayName }}{{ p.isMe ? ' (you)' : '' }}</span>
                <span class="player-score">{{ p.score }}</span>
              </div>
            }
          </div>

          <!-- Status bar -->
          <div class="status-bar">
            @if (s.status === 'waiting') {
              @if (s.isCreator) {
                <span>Waiting for players ({{ s.participants.length }}/4)…</span>
                @if (!alreadyJoined()) {
                  <button class="action-btn" (click)="joinGame()">Join</button>
                }
                @if (s.participants.length >= 2) {
                  <button class="action-btn primary" (click)="startGame()" [disabled]="starting()">
                    {{ starting() ? 'Starting…' : 'Start Game' }}
                  </button>
                }
              } @else if (!alreadyJoined()) {
                <span>Waiting to start…</span>
                <button class="action-btn primary" (click)="joinGame()" [disabled]="joining()">
                  {{ joining() ? 'Joining…' : 'Join Game' }}
                </button>
              } @else {
                <span>Waiting for creator to start ({{ s.participants.length }}/4 joined)</span>
              }
            } @else if (s.status === 'inprogress') {
              @if (s.isMyTurn) {
                <span class="your-turn">Your turn — click a line to draw</span>
              } @else {
                @let currentPlayer = currentTurnPlayer();
                <span>{{ currentPlayer ? currentPlayer.displayName + "'s turn" : 'Waiting…' }}</span>
              }
            } @else {
              @let winner = gameWinner();
              @if (winner) {
                <span class="winner-msg">
                  🏆 {{ winner.isMe ? 'You win!' : winner.displayName + ' wins!' }}
                </span>
              } @else {
                <span>It's a draw!</span>
              }
            }
          </div>

          <!-- SVG Game Board -->
          @let g = s.gridSize;
          <div class="board-container">
            <svg
              [attr.viewBox]="boardViewBox()"
              class="game-board"
              [class.my-turn]="s.isMyTurn && s.status === 'inprogress'"
            >
              <!-- Boxes (filled) -->
              @for (entry of boxEntries(); track entry.key) {
                <rect
                  [attr.x]="entry.col * cellSize + dotR"
                  [attr.y]="entry.row * cellSize + dotR"
                  [attr.width]="cellSize"
                  [attr.height]="cellSize"
                  [attr.fill]="boxFill(entry.ownerId)"
                  class="box-fill"
                />
                <text
                  [attr.x]="entry.col * cellSize + dotR + cellSize / 2"
                  [attr.y]="entry.row * cellSize + dotR + cellSize / 2 + 5"
                  text-anchor="middle"
                  class="box-initial"
                  [attr.fill]="playerColor(entry.playerOrder)"
                >{{ entry.initial }}</text>
              }

              <!-- Horizontal lines (clickable) -->
              @for (row of dotRows(g + 1); track row) {
                @for (col of dotRows(g); track col) {
                  @let isDrawn = isLineDrawn('H', row, col);
                  @let lineOwner = drawnLineOwner('H', row, col);
                  <line
                    [attr.x1]="col * cellSize + dotR + lineGap"
                    [attr.y1]="row * cellSize + dotR"
                    [attr.x2]="(col + 1) * cellSize + dotR - lineGap"
                    [attr.y2]="row * cellSize + dotR"
                    [attr.stroke]="isDrawn ? playerColor(lineOwner) : 'rgba(255,255,255,0.08)'"
                    [class.line-clickable]="!isDrawn && s.isMyTurn && s.status === 'inprogress'"
                    [class.line-drawn]="isDrawn"
                    stroke-width="4"
                    stroke-linecap="round"
                    (click)="drawLine('H', row, col)"
                    (mouseenter)="hoverLine = {t:'H',r:row,c:col}"
                    (mouseleave)="hoverLine = null"
                    [class.line-hover]="isHovering('H', row, col) && !isDrawn && s.isMyTurn && s.status === 'inprogress'"
                  />
                }
              }

              <!-- Vertical lines (clickable) -->
              @for (row of dotRows(g); track row) {
                @for (col of dotRows(g + 1); track col) {
                  @let isDrawnV = isLineDrawn('V', row, col);
                  @let lineOwnerV = drawnLineOwner('V', row, col);
                  <line
                    [attr.x1]="col * cellSize + dotR"
                    [attr.y1]="row * cellSize + dotR + lineGap"
                    [attr.x2]="col * cellSize + dotR"
                    [attr.y2]="(row + 1) * cellSize + dotR - lineGap"
                    [attr.stroke]="isDrawnV ? playerColor(lineOwnerV) : 'rgba(255,255,255,0.08)'"
                    [class.line-clickable]="!isDrawnV && s.isMyTurn && s.status === 'inprogress'"
                    [class.line-drawn]="isDrawnV"
                    stroke-width="4"
                    stroke-linecap="round"
                    (click)="drawLine('V', row, col)"
                    (mouseenter)="hoverLine = {t:'V',r:row,c:col}"
                    (mouseleave)="hoverLine = null"
                    [class.line-hover]="isHovering('V', row, col) && !isDrawnV && s.isMyTurn && s.status === 'inprogress'"
                  />
                }
              }

              <!-- Dots -->
              @for (row of dotRows(g + 1); track row) {
                @for (col of dotRows(g + 1); track col) {
                  <circle
                    [attr.cx]="col * cellSize + dotR"
                    [attr.cy]="row * cellSize + dotR"
                    [attr.r]="dotR"
                    fill="rgba(255,255,255,0.85)"
                    class="board-dot"
                  />
                }
              }
            </svg>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .dab-page { max-width: 720px; margin: 0 auto; padding: 12px 12px 80px; }

    /* Lobby */
    .lobby-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .lobby-icon { font-size: 30px; width: 30px; height: 30px; color: #64b5f6; }
    .lobby-title { font-size: 1.3rem; font-weight: 700; color: rgba(255,255,255,0.9); margin: 0 0 2px; }
    .lobby-sub { font-size: 0.78rem; color: rgba(255,255,255,0.38); }
    .create-btn { margin-left: auto; display: flex; align-items: center; gap: 6px; padding: 7px 14px; background: rgba(100,181,246,0.12); border: 1px solid rgba(100,181,246,0.35); border-radius: 8px; color: #64b5f6; font-size: 0.82rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.12s; }
    .create-btn:hover, .create-btn.active { background: rgba(100,181,246,0.22); border-color: #64b5f6; }
    .create-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .create-form { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 16px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px; }
    .form-row { display: flex; gap: 8px; align-items: center; }
    .title-input { flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px 10px; color: rgba(255,255,255,0.85); font-size: 0.85rem; font-family: inherit; outline: none; }
    .title-input:focus { border-color: rgba(100,181,246,0.4); }
    .size-row { flex-wrap: wrap; }
    .size-label { font-size: 0.78rem; color: rgba(255,255,255,0.45); white-space: nowrap; }
    .size-btn { padding: 4px 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: rgba(255,255,255,0.55); font-size: 0.8rem; font-family: inherit; cursor: pointer; transition: all 0.12s; }
    .size-btn.active { background: rgba(100,181,246,0.15); border-color: rgba(100,181,246,0.4); color: #64b5f6; }
    .ai-toggle { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
    .ai-check { width: 16px; height: 16px; border: 1px solid rgba(255,255,255,0.2); border-radius: 3px; display: flex; align-items: center; justify-content: center; transition: all 0.12s; flex-shrink: 0; }
    .ai-check.checked { background: rgba(100,181,246,0.2); border-color: #64b5f6; }
    .ai-check mat-icon { font-size: 12px; width: 12px; height: 12px; color: #64b5f6; }
    .ai-icon { font-size: 16px; width: 16px; height: 16px; color: rgba(255,255,255,0.5); }
    .ai-label { font-size: 0.82rem; color: rgba(255,255,255,0.6); }
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
    .sc-grid { width: 38px; height: 38px; background: rgba(100,181,246,0.12); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 700; color: #64b5f6; flex-shrink: 0; }
    .sc-info { flex: 1; min-width: 0; }
    .sc-title { font-size: 0.9rem; font-weight: 600; color: rgba(255,255,255,0.85); }
    .sc-meta { font-size: 0.75rem; color: rgba(255,255,255,0.35); margin-top: 2px; }
    .sc-status { font-size: 0.72rem; font-weight: 600; padding: 3px 8px; border-radius: 10px; }
    .sc-status.waiting { background: rgba(100,181,246,0.12); color: #64b5f6; }
    .sc-status.inprogress { background: rgba(255,167,38,0.12); color: #ffa726; }

    /* Game */
    .game-wrap { display: flex; flex-direction: column; gap: 14px; }
    .game-header { display: flex; align-items: center; gap: 10px; }
    .back-btn { background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 6px; cursor: pointer; color: rgba(255,255,255,0.55); display: flex; align-items: center; transition: all 0.12s; }
    .back-btn:hover { border-color: rgba(255,255,255,0.2); color: rgba(255,255,255,0.8); }
    .back-btn mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .game-title { font-size: 1rem; font-weight: 700; color: rgba(255,255,255,0.85); }

    .scoreboard { display: flex; flex-wrap: wrap; gap: 8px; }
    .player-chip { display: flex; align-items: center; gap: 7px; padding: 6px 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; transition: all 0.2s; }
    .player-chip.active-turn { background: rgba(255,255,255,0.06); box-shadow: 0 0 0 1px currentColor; }
    .player-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .player-ai-icon { font-size: 14px; width: 14px; height: 14px; color: rgba(255,255,255,0.6); flex-shrink: 0; }
    .player-name { font-size: 0.8rem; color: rgba(255,255,255,0.7); }
    .player-score { font-size: 0.9rem; font-weight: 700; color: rgba(255,255,255,0.9); margin-left: 4px; }

    .status-bar { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 8px; font-size: 0.82rem; color: rgba(255,255,255,0.6); flex-wrap: wrap; }
    .your-turn { color: #64b5f6; font-weight: 600; }
    .winner-msg { font-size: 1rem; font-weight: 700; color: #ffa726; }
    .action-btn { padding: 5px 14px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: rgba(255,255,255,0.7); font-size: 0.8rem; font-family: inherit; cursor: pointer; margin-left: auto; }
    .action-btn.primary { background: rgba(100,181,246,0.15); border-color: rgba(100,181,246,0.4); color: #64b5f6; font-weight: 600; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .board-container { display: flex; justify-content: center; padding: 8px 0; }
    .game-board { width: 100%; max-width: 520px; touch-action: none; }
    .game-board.my-turn .line-clickable { cursor: pointer; }

    .line-clickable:hover, .line-hover { stroke: rgba(255,255,255,0.45) !important; }
    .line-drawn { cursor: default; }
    .board-dot { pointer-events: none; }
    .box-fill { transition: fill 0.15s; }
    .box-initial { font-size: 11px; font-weight: 700; pointer-events: none; font-family: inherit; }
  `]
})
export class DotsAndBoxesComponent implements OnInit, OnDestroy {
  private svc = inject(DotsAndBoxesService);
  private ws = inject(WebSocketService);
  private snackBar = inject(MatSnackBar);
  private featureAccess = inject(FeatureAccessService);
  private destroy$ = new Subject<void>();

  sessions = signal<DotsAndBoxesSessionSummary[]>([]);
  session = signal<DotsAndBoxesSession | null>(null);
  loading = signal(false);
  creating = signal(false);
  joining = signal(false);
  starting = signal(false);

  showCreate = false;
  newTitle = '';
  newGridSize = 4;
  withAi = false;
  gridSizes = [3, 4, 5, 6];
  hoverLine: { t: 'H' | 'V'; r: number; c: number } | null = null;

  readonly cellSize = 80;
  readonly dotR = 5;
  readonly lineGap = 8;

  canHost = computed(() => this.featureAccess.hasAccess('dots-and-boxes-host'));

  alreadyJoined = computed(() => {
    const s = this.session();
    return s?.participants.some(p => p.isMe) ?? false;
  });

  currentTurnPlayer = computed(() => {
    const s = this.session();
    if (!s) return null;
    return s.participants.find(p => p.id === s.currentParticipantId) ?? null;
  });

  gameWinner = computed(() => {
    const s = this.session();
    if (!s || s.status !== 'completed') return null;
    const sorted = [...s.participants].sort((a, b) => b.score - a.score);
    if (sorted.length === 0) return null;
    if (sorted.length > 1 && sorted[0].score === sorted[1].score) return null;
    return sorted[0];
  });

  boxEntries = computed(() => {
    const s = this.session();
    if (!s) return [];
    return Object.entries(s.boxes).map(([key, ownerId]) => {
      const [row, col] = key.split(',').map(Number);
      const player = s.participants.find(p => p.id === ownerId);
      return {
        key, row, col, ownerId,
        initial: player ? player.displayName.charAt(0).toUpperCase() : '',
        playerOrder: player?.order ?? 0,
      };
    });
  });

  ngOnInit() {
    this.loadSessions();
    this.ws.messages$.pipe(takeUntil(this.destroy$)).subscribe(msg => {
      if (!msg) return;
      if (msg.type === 'dots_boxes_update') {
        const currentSession = this.session();
        if (currentSession) {
          this.svc.getSession(currentSession.id).subscribe(s => this.session.set(s));
        } else {
          this.loadSessions();
        }
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSessions() {
    this.loading.set(true);
    this.svc.getSessions().subscribe({
      next: list => { this.sessions.set(list); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Failed to load games', 'OK', { duration: 3000 }); }
    });
  }

  openSession(id: string) {
    this.loading.set(true);
    this.svc.getSession(id).subscribe({
      next: s => { this.session.set(s); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Failed to load game', 'OK', { duration: 3000 }); }
    });
  }

  backToLobby() {
    this.session.set(null);
    this.loadSessions();
  }

  createGame() {
    this.creating.set(true);
    this.svc.createSession({ title: this.newTitle.trim() || undefined, gridSize: this.newGridSize, withAi: this.withAi }).subscribe({
      next: s => {
        this.creating.set(false);
        this.showCreate = false;
        this.newTitle = '';
        this.withAi = false;
        this.session.set(s);
      },
      error: () => { this.creating.set(false); this.snackBar.open('Failed to create game', 'OK', { duration: 3000 }); }
    });
  }

  joinGame() {
    const s = this.session();
    if (!s) return;
    this.joining.set(true);
    this.svc.joinSession(s.id).subscribe({
      next: updated => { this.session.set(updated); this.joining.set(false); },
      error: () => { this.joining.set(false); this.snackBar.open('Failed to join game', 'OK', { duration: 3000 }); }
    });
  }

  startGame() {
    const s = this.session();
    if (!s) return;
    this.starting.set(true);
    this.svc.startSession(s.id).subscribe({
      next: updated => { this.session.set(updated); this.starting.set(false); },
      error: (err) => {
        this.starting.set(false);
        const msg = err?.error?.error ?? 'Failed to start game';
        this.snackBar.open(msg, 'OK', { duration: 3000 });
      }
    });
  }

  drawLine(t: 'H' | 'V', r: number, c: number) {
    const s = this.session();
    if (!s || !s.isMyTurn || s.status !== 'inprogress') return;
    if (this.isLineDrawn(t, r, c)) return;

    this.svc.makeMove(s.id, t, r, c).subscribe({
      next: updated => this.session.set(updated),
      error: () => this.snackBar.open('Move failed', 'OK', { duration: 2000 })
    });
  }

  isLineDrawn(t: 'H' | 'V', r: number, c: number): boolean {
    const s = this.session();
    if (!s) return false;
    return s.lines.some(l => l.t === t && l.r === r && l.c === c);
  }

  drawnLineOwner(t: 'H' | 'V', r: number, c: number): number {
    const s = this.session();
    if (!s) return -1;
    // Look at adjacent boxes to infer which player drew this line
    const candidates = t === 'H'
      ? [`${r - 1},${c}`, `${r},${c}`]
      : [`${r},${c - 1}`, `${r},${c}`];
    for (const key of candidates) {
      const ownerId = s.boxes[key];
      if (ownerId) {
        const p = s.participants.find(p => p.id === ownerId);
        if (p) return p.order;
      }
    }
    // Line drawn but no adjacent box claimed — neutral
    return -1;
  }

  isHovering(t: 'H' | 'V', r: number, c: number): boolean {
    return this.hoverLine?.t === t && this.hoverLine.r === r && this.hoverLine.c === c;
  }

  boardViewBox(): string {
    const s = this.session();
    const g = s ? s.gridSize : 4;
    const size = g * this.cellSize + this.dotR * 2;
    return `0 0 ${size} ${size}`;
  }

  dotRows(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i);
  }

  playerColor(order: number): string {
    if (order < 0) return 'rgba(255,255,255,0.55)';
    return PLAYER_COLORS[order % PLAYER_COLORS.length];
  }

  boxFill(ownerId: string): string {
    const s = this.session();
    if (!s) return 'transparent';
    const p = s.participants.find(p => p.id === ownerId);
    if (!p) return 'rgba(255,255,255,0.05)';
    return PLAYER_COLORS_DIM[p.order % PLAYER_COLORS_DIM.length];
  }
}
